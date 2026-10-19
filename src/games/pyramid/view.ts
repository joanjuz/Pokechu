import type {GameContext} from '../../app/context';
import {pool} from '../../domain/pokemon/catalog';
import {chooseMetric,metricInfo,metricValue,type Pokemon} from '../../domain/pokemon/types';
import {selectPokemon} from '../../shared/random';
import {isScore,readStored,writeStored} from '../../shared/storage';
import {escapeHtml,focusHeading,imagesReady,pokemonImage} from '../../shared/ui';
import {createPyramid,movePokemon,confirmPyramid,ROWS,PYRAMID_LIVES,type PyramidState} from './rules';
export function mount(root:HTMLElement,ctx:GameContext):()=>void{
  const entries=pool(ctx.catalog,ctx.settings);const controller=new AbortController();const options={signal:controller.signal};
  const recordKey=`seven-lives:${ctx.recordKey('pyramid')}`;
  let state:PyramidState;let selected:number|null=null;let active=true;let version=0;let focusSelector='';
  let best=readStored(ctx.storage,recordKey,0,isScore);let saved=true;let dragId:number|null=null;
  let touch:{id:number;pointer:number;x:number;y:number;currentX:number;currentY:number;moved:boolean}|undefined;let ghost:HTMLElement|undefined;let suppressClickUntil=0;let scrollFrame=0;
  function start():void{
    selected=null;const deck:Pokemon[]=[];
    while(deck.length<10){const p=selectPokemon(entries,deck.map(p=>p.speciesId),ctx.random);if(!p)break;deck.push(p);}
    if(deck.length<10){root.innerHTML='<div class="empty-state"><h1>Pirámide Pokémon</h1><p>Se necesitan diez especies. Amplía las generaciones en Ajustes.</p></div>';return;}
    state=createPyramid(deck,chooseMetric(ctx.settings.metric,ctx.random));if(ctx.singleRound)state={...state,lives:1};void render();
  }
  function piece(p:Pokemon,slot?:number):string{
    const final=state.phase==='won'||state.phase==='lost';
    return `${pokemonImage(p)}<span>${escapeHtml(p.name)}</span>${final&&slot!==undefined?`<b class="evaluated-stat">${metricInfo(state.metric).label}: ${metricValue(p,state.metric)} ${state.result!.correct[slot]?'✓':'×'}</b>`:''}`;
  }
  async function render():Promise<void>{
    const token=++version;const final=state.phase==='won'||state.phase==='lost';const editable=state.phase==='editing';const label=metricInfo(state.metric).label;
    if(state.result&&state.result.score>best){best=state.result.score;saved=writeStored(ctx.storage,recordKey,best);}
    let offset=0;
    const rows=ROWS.map((length,row)=>`<div class="pyramid-row">${Array.from({length},()=>{
      const index=offset++;const p=state.slots[index];return `<button type="button" class="pyramid-cell ${state.result?(state.result.correct[index]?'right':'wrong'):''} ${p?.id===selected?'selected-piece':''}" data-slot="${index}" ${p?`data-pokemon="${p.id}" draggable="${editable}"`:''} ${!editable?'disabled':''} aria-label="Fila ${row+1}, casilla ${index-row*(row+1)/2+1}${p?`, ${escapeHtml(p.name)}`:', vacía'}" ${p?`aria-pressed="${p.id===selected}"`:''}>${p?piece(p,index):`<span class="empty-slot">+</span><small>Fila ${row+1}</small>`}</button>`;
    }).join('')}</div>`).join('');
    const available=state.deck.filter(p=>!state.slots.some(s=>s?.id===p.id));
    let result='';
    if(state.phase==='editing'&&state.result)result=`<div class="result failure" role="status"><strong>${state.result.score} de 10 posiciones correctas</strong><span>Te ${state.lives===1?'queda una vida':'quedan '+state.lives+' vidas'}. Puedes mover los Pokémon directamente y volver a confirmar.</span></div>`;
    if(final)result=`<div class="result ${state.phase==='won'?'success':'failure'}" role="status"><strong>${state.phase==='won'?'Pirámide perfecta':'Sin vidas'}</strong><span>${state.result!.score} de 10 posiciones correctas. Puedes revisar el valor de ${label} bajo cada Pokémon.</span></div><button class="button primary restart">Nueva pirámide</button><details class="solution"><summary>Ver el orden por filas</summary>${solution()}</details>`;
    const selection=state.deck.find(p=>p.id===selected);
    const trayHelp=final?'Tablero terminado. Revisa los valores bajo cada Pokémon.':state.result?'Corrige las posiciones arrastrando los Pokémon. El tablero sigue activo.':available.length?'Arrastra cualquiera a una casilla. También puedes seleccionarlo y tocar una posición.':'Los diez Pokémon están colocados. Puedes arrastrarlos entre casillas para intercambiarlos.';
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Pirámide Pokémon</h1></div><div class="scoreboard"><span>Vidas<strong>${state.lives}/${ctx.singleRound?1:PYRAMID_LIVES}</strong></span><span>Colocados<strong>${state.cursor}/10</strong></span><span>Récord<strong>${best}/10</strong></span></div></div><p class="game-instruction">Ordena por <strong data-metric="${state.metric}">${label}</strong>: los mayores arriba y los menores abajo. ${ctx.settings.metric==='random'?'La estadística se mantiene en todo el tablero.':''}</p>
      <div class="pyramid-workspace"><section class="pyramid-board" aria-label="Casillas de la pirámide">${rows}</section><section class="pyramid-palette" data-tray aria-label="Pokémon disponibles"><h2>Pokémon disponibles</h2><p>${trayHelp}</p><div class="pyramid-pieces">${available.map(p=>`<button type="button" class="palette-piece ${p.id===selected?'selected-piece':''}" data-pokemon="${p.id}" draggable="${editable}" aria-pressed="${p.id===selected}" aria-label="Seleccionar ${escapeHtml(p.name)}" ${!editable?'disabled':''}>${piece(p)}</button>`).join('')}</div>${editable?`<p class="selection-status" role="status">${selection?`${escapeHtml(selection.name)} seleccionado. Elige una casilla.`:'Puedes mover y cambiar los Pokémon antes de confirmar.'}</p>${selection&&state.slots.some(p=>p?.id===selected)?'<button class="text-button return-piece">Devolver a disponibles</button>':''}<button class="button primary confirm-pyramid" ${state.cursor<10?'disabled':''}>Confirmar pirámide</button>`:''}<div class="pyramid-result">${result}</div>${!saved?'<p class="notice">No se puede guardar el récord en este navegador.</p>':''}</section></div><p class="image-status" role="status"></p><details class="rules"><summary>Cómo colocar los Pokémon</summary><p>Tienes los diez Pokémon disponibles desde el inicio y siete vidas para resolver la misma pirámide. Arrástralos a las casillas, muévelos o intercámbialos libremente antes de confirmar. También puedes seleccionar un Pokémon con clic, toque o Enter y después elegir una casilla. Para devolverlo, arrástralo al panel de disponibles o utiliza el botón correspondiente.</p><p>La fila superior recibe el valor mayor, la siguiente los dos siguientes, después los tres siguientes y abajo los cuatro menores. El orden dentro de una fila no importa y los empates se aceptan.</p><p>Solo Confirmar pirámide evalúa el tablero. Un intento incorrecto consume una vida. Puedes corregir directamente las posiciones y volver a confirmar, conservando los Pokémon y la estadística. Los valores se muestran bajo cada Pokémon únicamente al ganar o agotar las siete vidas.</p></details>`;
    if(focusSelector){root.querySelector<HTMLElement>(focusSelector)?.focus({preventScroll:true});focusSelector='';}
    const ready=await imagesReady(root);
    if(!active||!ctx.alive()||token!==version)return;
    if(!ready)root.querySelector('.image-status')!.textContent='Algunas imágenes no se pudieron cargar. Puedes seguir usando los nombres; no se consume ninguna vida.';
  }
  function solution():string{const sorted=[...state.deck].sort((a,b)=>metricValue(b,state.metric)-metricValue(a,state.metric));let start=0;return ROWS.map((length,row)=>{const group=sorted.slice(start,start+length);start+=length;return `<p>Fila ${row+1}: ${group.map(p=>`${escapeHtml(p.name)} (${metricValue(p,state.metric)})`).join(', ')}.</p>`;}).join('');}
  function move(id:number,slot:number|null):void{const next=movePokemon(state,id,slot);if(next===state)return;state=next;selected=null;focusSelector=slot===null?`[data-pokemon="${id}"]`:`[data-slot="${slot}"]`;void render();}
  root.addEventListener('click',event=>{
    if(Date.now()<suppressClickUntil)return;
    const target=event.target as HTMLElement;
    if(target.closest('.restart')){start();return;}
    if(target.closest('.confirm-pyramid')){const next=confirmPyramid(state);if(next!==state){state=next;selected=null;focusSelector=state.phase==='editing'?'[data-slot="0"]':'.restart';if(state.phase==='won'||state.phase==='lost')ctx.onResult?.({game:'piramide',correct:state.phase==='won',points:state.phase==='won'?10:0,speciesIds:state.phase==='won'?state.deck.map(p=>p.speciesId):[]});void render();}return;}
    if(state.phase!=='editing')return;
    if(target.closest('.return-piece')&&selected!==null){move(selected,null);return;}
    const cell=target.closest<HTMLElement>('[data-slot]');const source=target.closest<HTMLElement>('[data-pokemon]');
    if(cell&&selected!==null&&source?.dataset.pokemon!==String(selected)){move(selected,Number(cell.dataset.slot));return;}
    if(source){const id=Number(source.dataset.pokemon);selected=selected===id?null:id;focusSelector=`[data-pokemon="${id}"]`;void render();}
  },options);
  root.addEventListener('dragstart',event=>{
    const source=(event.target as HTMLElement).closest<HTMLElement>('[data-pokemon]');if(!source||state.phase!=='editing')return;
    dragId=Number(source.dataset.pokemon);event.dataTransfer?.setData('text/plain',String(dragId));if(event.dataTransfer)event.dataTransfer.effectAllowed='move';source.classList.add('dragging');
  },options);
  root.addEventListener('dragover',event=>{if(state.phase==='editing'&&(event.target as HTMLElement).closest('[data-slot],[data-tray]')){event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';}},options);
  root.addEventListener('drop',event=>{event.preventDefault();const raw=event.dataTransfer?.getData('text/plain');const id=raw?Number(raw):dragId;const cell=(event.target as HTMLElement).closest<HTMLElement>('[data-slot]');if(id!==null&&id!==undefined){if(cell)move(id,Number(cell.dataset.slot));else if((event.target as HTMLElement).closest('[data-tray]'))move(id,null);}dragId=null;},options);
  root.addEventListener('dragend',()=>{dragId=null;root.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));},options);
  function dragScroll(){if(!touch?.moved)return;const y=touch.currentY;const dy=y>innerHeight-60?14:y<60?-14:0;if(dy){window.scrollBy(0,dy);root.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));document.elementFromPoint(touch.currentX,y)?.closest('[data-slot]')?.classList.add('drop-target');}scrollFrame=requestAnimationFrame(dragScroll);}
  function clearTouch(){cancelAnimationFrame(scrollFrame);ghost?.remove();ghost=undefined;touch=undefined;root.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));}
  root.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||state.phase!=='editing')return;
    const source=(event.target as HTMLElement).closest<HTMLElement>('[data-pokemon]');if(!source)return;
    touch={id:Number(source.dataset.pokemon),pointer:event.pointerId,x:event.clientX,y:event.clientY,currentX:event.clientX,currentY:event.clientY,moved:false};
  },options);
  root.addEventListener('pointermove',event=>{
    if(!touch||event.pointerId!==touch.pointer)return;
    if(!touch.moved&&Math.hypot(event.clientX-touch.x,event.clientY-touch.y)<7)return;
    event.preventDefault();touch.currentX=event.clientX;touch.currentY=event.clientY;if(!touch.moved){root.setPointerCapture(event.pointerId);touch.moved=true;scrollFrame=requestAnimationFrame(dragScroll);}
    if(!ghost){ghost=root.querySelector<HTMLElement>(`[data-pokemon="${touch.id}"]`)!.cloneNode(true) as HTMLElement;ghost.classList.add('pyramid-drag-ghost');ghost.removeAttribute('id');ghost.setAttribute('aria-hidden','true');document.body.append(ghost);}
    ghost.style.left=`${event.clientX-45}px`;ghost.style.top=`${event.clientY-45}px`;
    root.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-slot]')?.classList.add('drop-target');
  },options);
  root.addEventListener('pointerup',event=>{if(!touch||event.pointerId!==touch.pointer)return;const current=touch;const target=document.elementFromPoint(event.clientX,event.clientY);clearTouch();if(current.moved){suppressClickUntil=Date.now()+400;const cell=target?.closest<HTMLElement>('[data-slot]');if(cell)move(current.id,Number(cell.dataset.slot));else if(target?.closest('[data-tray]'))move(current.id,null);}},options);
  root.addEventListener('pointercancel',clearTouch,options);
  start();if(ctx.focusGame!==false)focusHeading(root);
  return()=>{active=false;version++;controller.abort();clearTouch();};
}
