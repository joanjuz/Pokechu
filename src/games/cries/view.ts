import type { GameContext } from '../../app/context';
import imported from '../../../data/generated/recognition.json';
import { recognitionPool, type RecognitionMedia } from '../recognition/media';
import { cryChoices,nextCry } from './rules';

import { asset, escapeHtml, imagesReady, pokemonImage, focusHeading } from '../../shared/ui';
import { readStored, writeStored, isScore } from '../../shared/storage';
import { generationKey } from '../../domain/pokemon/settings';
import type { Pokemon } from '../../domain/pokemon/types';
const media=imported as RecognitionMedia;
export function mount(root:HTMLElement,ctx:GameContext):()=>void {
  let entries=recognitionPool(ctx.catalog,ctx.settings,media,'cries');
  let target:Pokemon,choices:Pokemon[]=[],history:number[]=[],round=0,score=0;
  let active=true,version=0,heard=false,ready=false,resolved=false,playing=false;
  let audio:HTMLAudioElement|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  const key=`${ctx.playerId||'jugador-1'}:cries:streak-v3:${ctx.catalog.version}:g${generationKey(ctx.settings.generations)}`;
  let best=readStored(ctx.storage,key,0,isScore);
  let volume=readStored(ctx.storage,'audio-volume',.5,(v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1);
  const alive=()=>active&&ctx.alive();
  function stop(){if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();audio=undefined;}playing=false;}
  function controls(message='') {
    if(!alive())return;
    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b=>b.disabled=resolved||!heard||!ready);
    const button=root.querySelector<HTMLButtonElement>('.play-cry');
    if(button){button.textContent=playing?'Detener grito':heard?'Volver a escuchar':'Escuchar grito';button.setAttribute('aria-pressed',String(playing));}
    const status=root.querySelector('.media-status');if(status)status.textContent=message;
  }
  function next(reset=false) {
    clearTimeout(timer);stop();
    if(reset){round=0;score=0;history=[];}
    const selection=nextCry(entries,history,ctx.random);const selected=selection?.target;
    if(!selected||entries.length<3){root.innerHTML='<div class="empty-state"><h1>Faltan gritos disponibles</h1><p>Amplía las generaciones en Ajustes.</p></div>';return;}
    target=selected;history=selection!.history;round++;heard=false;ready=false;resolved=false;
    choices=cryChoices(target,entries,ctx.random);
    const token=++version;
    audio=new Audio(asset(media.cries[target.id].path));audio.preload='auto';
    audio.volume=volume;audio.muted=volume===0;
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">¿Quién da este grito?</h1></div><div class="scoreboard"><span>Racha<strong>${score}</strong></span><span>Récord<strong>${best}</strong></span></div></div><div class="round-header"><span>Grito ${round}</span><span>Una elección por grito</span></div><section class="cry-question"><div class="cry-emblem" aria-hidden="true">♫</div><button class="button primary play-cry" aria-pressed="false">Escuchar grito</button><p>Escucha y elige uno de estos tres Pokémon.</p><div class="cry-choices">${choices.map(p=>`<button class="cry-choice" data-choice="${p.id}" disabled>${pokemonImage(p)}<span>${escapeHtml(p.name)}</span><span class="choice-mark" aria-hidden="true"></span></button>`).join('')}</div><p class="cry-result" role="status"></p><p class="media-status" role="status"></p><button class="text-button skip-media" hidden>Cambiar grito sin gastar intento</button><button class="button primary next" hidden>Siguiente grito</button></section><details class="rules"><summary>Cómo jugar</summary><p>Una racha sin límite de gritos, tres opciones y una sola respuesta por ronda. Un acierto suma un punto y carga otro grito. El primer fallo termina la racha. El grito puede repetirse antes de elegir. Los fallos de carga no cuentan como respuestas.</p></details>`;
    root.querySelector('.play-cry')!.insertAdjacentHTML('afterend',`<div class="cry-volume"><label for="cry-volume">Volumen</label><input id="cry-volume" type="range" min="0" max="100" step="1" value="${Math.round(volume*100)}" aria-label="Volumen de los gritos"><output for="cry-volume">${volume===0?'Silenciado':Math.round(volume*100)+' %'}</output></div>`);
    root.querySelector<HTMLInputElement>('#cry-volume')!.addEventListener('input',event=>{volume=Number((event.target as HTMLInputElement).value)/100;if(audio){audio.volume=volume;audio.muted=volume===0;}root.querySelector('.cry-volume output')!.textContent=volume===0?'Silenciado':Math.round(volume*100)+' %';writeStored(ctx.storage,'audio-volume',volume);});
    const showError=(message:string)=>{if(!alive()||token!==version||resolved)return;heard=false;playing=false;controls(message);root.querySelector<HTMLButtonElement>('.skip-media')!.hidden=false;};
    audio.onended=()=>{if(alive()&&token===version){playing=false;controls();}};
    audio.onerror=()=>showError('No se pudo cargar el grito. Puedes reintentarlo o cambiarlo.');
    root.querySelector('.play-cry')!.addEventListener('click',async()=>{
      const current=audio;if(!current||resolved)return;
      if(playing){current.pause();playing=false;controls();return;}
      try{if(current.error)current.load();current.currentTime=0;await current.play();if(!alive()||token!==version||audio!==current){current.pause();return;}heard=true;playing=!current.ended;controls();root.querySelector<HTMLButtonElement>('.skip-media')!.hidden=true;}
      catch{showError('No se pudo reproducir el grito. Pulsa Escuchar para reintentar o cambia de grito.');}
    });
    root.querySelector('.skip-media')!.addEventListener('click',()=>{entries=entries.filter(p=>p.id!==target.id);history.pop();round--;next();});
    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button=>button.addEventListener('click',()=>{
      if(!alive()||token!==version||resolved||!heard||!ready)return;resolved=true;
      const correct=Number(button.dataset.choice)===target.id;score+=Number(correct);stop();
      if(score>best){best=score;writeStored(ctx.storage,key,best);}
      root.querySelector('.scoreboard span:first-child strong')!.textContent=String(score);root.querySelector('.scoreboard span:last-child strong')!.textContent=String(best);
      root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b=>{b.disabled=true;b.classList.toggle('correct',Number(b.dataset.choice)===target.id);b.classList.toggle('wrong',b===button&&!correct);b.querySelector('.choice-mark')!.textContent=Number(b.dataset.choice)===target.id?'✓':b===button?'×':'';});
      const final=!correct;
      root.querySelector('.cry-result')!.textContent=`${correct?'¡Correcto!':'Incorrecto.'} Era ${target.name}.${final?` Fin de la racha: ${score} ${score===1?'acierto':'aciertos'}.`:''}`;
      const nextButton=root.querySelector<HTMLButtonElement>('.next')!;nextButton.hidden=!!ctx.singleRound;nextButton.textContent=final?'Volver a jugar':'Siguiente grito';
      const play=root.querySelector<HTMLButtonElement>('.play-cry')!;play.disabled=true;play.textContent='Grito respondido';
      ctx.onResult?.({game:'gritos',correct,points:Number(correct),speciesIds:correct?[target.speciesId]:[]});
      if(!ctx.singleRound&&!final)timer=setTimeout(()=>{if(alive()&&token===version)next();},1500);
    }));
    root.querySelector('.next')!.addEventListener('click',()=>next(!!root.querySelector('.cry-choice.wrong')));
    void imagesReady(root).then(loaded=>{if(!alive()||token!==version)return;ready=loaded;if(!loaded)showError('No se pudieron cargar las opciones. Cambia de grito sin penalización.');else controls();});
  }
  next();if(ctx.focusGame!==false)focusHeading(root);
  return()=>{active=false;version++;clearTimeout(timer);stop();};
}
