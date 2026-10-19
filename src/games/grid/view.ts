import type {GameContext} from '../../app/context';
import {pool} from '../../domain/pokemon/catalog';
import type {Pokemon} from '../../domain/pokemon/types';
import {attachPokemonAutocomplete} from '../../shared/autocomplete';
import {escapeHtml,focusHeading,pokemonImage} from '../../shared/ui';
import imported from '../../../data/generated/grid.json';
import {createGrid,placeGridPokemon,solveGrid,criterionLabel,type GridBoard,type GridData,type Criterion} from './rules';
const data=imported as GridData;
export function mount(root:HTMLElement,ctx:GameContext):()=>void{
  const entries=pool(ctx.catalog,{...ctx.settings,forms:false,battle:false});
  let board:GridBoard|null=null,selected=0,feedback='',active=true,finished=false,lives=3,lost=false;
  let solution:Pokemon[]=[];
  const rewarded=new Set<number>();let cleanup=()=>{};
  const kind=(c:Criterion)=>c.kind==='type'?'Tipo':c.kind==='ability'?'Habilidad':'Región / generación';
  const label=(c:Criterion)=>`<small>${kind(c)}</small><strong>${escapeHtml(criterionLabel(c,data))}</strong>`;
  function start(){cleanup();rewarded.clear();feedback='';selected=0;finished=false;lost=false;lives=3;board=createGrid(entries,ctx.catalog,data,ctx.random);solution=board?solveGrid(board,entries,ctx.catalog,data)||[]:[];render();}
  function render(){
    cleanup();
    if(!board){root.innerHTML='<div class="empty-state"><h1>Tabla de cruces Pokémon</h1><p>No se ha encontrado una tabla de 3×3 con nueve especies diferentes para estos filtros. Amplía las generaciones o prueba otra tabla.</p><button class="button primary new-grid">Probar otra tabla</button></div>';root.querySelector('.new-grid')!.addEventListener('click',start);return;}
    const current=lost?{...board,slots:solution}:board,filled=board.slots.filter(Boolean).length,solvable=finished||!!solveGrid(current,entries,ctx.catalog,data);
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Tabla de cruces Pokémon</h1></div><div class="scoreboard"><span>Casillas<strong>${filled}/9</strong></span><span>Vidas<strong class="grid-lives">${lives}/3</strong></span></div></div><p class="game-instruction">Une las pistas de la fila y la columna. Cada especie puede aparecer una sola vez en toda la tabla.</p><div class="grid-game-layout"><div class="pokemon-grid-wrap"><table class="pokemon-grid" aria-label="Cruces de tipos, habilidades y generaciones"><thead><tr><td></td>${current.columns.map(c=>`<th scope="col" data-kind="${c.kind}" data-value="${c.value}">${label(c)}</th>`).join('')}</tr></thead><tbody>${current.rows.map((row,r)=>`<tr><th scope="row" data-kind="${row.kind}" data-value="${row.value}">${label(row)}</th>${current.columns.map((column,c)=>{const i=r*3+c,p=current.slots[i];return `<td><button class="grid-cell ${selected===i&&!finished?'selected':''}" data-cell="${i}" ${p?`data-pokemon="${p.id}"`:''} ${finished?'disabled':''} aria-label="${escapeHtml(criterionLabel(row,data))} y ${escapeHtml(criterionLabel(column,data))}${p?': '+escapeHtml(p.name):', vacía'}">${p?`${pokemonImage(p)}<span>${escapeHtml(p.name)}</span>`:'<span class="grid-plus" aria-hidden="true">+</span>'}</button></td>`;}).join('')}</tr>`).join('')}</tbody></table></div><section class="grid-answer-panel">${finished?`<div class="result ${lost?'failure':'success'}" role="status"><strong>${lost?'Sin vidas':'¡Tabla completada!'}</strong><span>${lost?'Esta es una posible combinación completa.':'Nueve cruces y ninguna especie repetida.'}</span></div><button class="button primary new-grid">Otra tabla</button>`:`<h2>Busca un Pokémon</h2><p class="selected-cross">${escapeHtml(criterionLabel(current.rows[Math.floor(selected/3)],data))} + ${escapeHtml(criterionLabel(current.columns[selected%3],data))}</p><label for="grid-answer">Nombre del Pokémon</label><input id="grid-answer" type="search" autocomplete="off" spellcheck="false" placeholder="Escribe y elige una sugerencia"><p class="field-help">Al seleccionar el nombre se comprueba el cruce y aparece su imagen.</p>${current.slots[selected]?'<button class="text-button clear-grid-cell">Vaciar esta casilla</button>':''}<button class="text-button new-grid">Cambiar de tabla</button>`}<p class="grid-feedback" role="status">${escapeHtml(feedback)}</p>${!solvable?'<p class="notice">Estas elecciones dejan otros cruces sin una combinación posible. Cambia o borra alguna casilla para continuar sin repetir.</p>':''}</section></div><details class="rules"><summary>Cómo jugar</summary><p>Selecciona una casilla y busca una especie que cumpla las dos pistas. Por ejemplo, Fuego + Fantasma acepta a Chandelure. Las habilidades incluyen las ocultas y se comprueban como habilidades posibles de la especie. Las regiones indican la generación en la que apareció la especie, no todos los juegos donde se puede encontrar.</p><p>Se usan formas habituales de las generaciones elegidas. Puedes cambiar o borrar respuestas hasta completar la tabla. Cada respuesta inválida o especie repetida consume una de tres vidas. Al perderlas se muestra una posible solución completa. Un error no borra tus casillas mientras queden vidas. Cada casilla da un punto global como máximo por tabla; cambiar su contenido no suma otro. Cada tabla nueva se comprueba para garantizar una solución con nueve especies diferentes.</p>${ctx.singleRound?'<p>En infinito debes completar la tabla: la racha termina cuando pierdes las tres vidas.</p>':''}</details>`;
    root.querySelectorAll<HTMLButtonElement>('[data-cell]').forEach(button=>button.addEventListener('click',()=>{selected=Number(button.dataset.cell);feedback='';render();root.querySelector<HTMLInputElement>('#grid-answer')?.focus({preventScroll:true});}));
    const input=root.querySelector<HTMLInputElement>('#grid-answer');
    if(input)cleanup=attachPokemonAutocomplete(input,ctx.catalog,entries,submit,'grid-suggestions');
    root.querySelector('.clear-grid-cell')?.addEventListener('click',()=>{if(!board||finished)return;const slots=[...board.slots];slots[selected]=null;board={...board,slots};feedback='Casilla vaciada.';render();});
    root.querySelector('.new-grid')?.addEventListener('click',()=>{start();focusHeading(root);});
  }
  function submit(pokemon:Pokemon){
    if(!active||!ctx.alive()||!board||finished)return;
    const result=placeGridPokemon(board,selected,pokemon,entries,ctx.catalog,data);
    if(!result.ok){lives=Math.max(0,lives-1);lost=lives===0;finished=lost;feedback=result.reason==='duplicate'?'Esa especie ya está en otra casilla. No se puede repetir.':'Ese Pokémon no cumple las dos pistas de esta casilla.';render();if(lost)ctx.onResult?.({game:'tabla',correct:false,points:0,speciesIds:[]});return;}
    const previous=board.slots[selected];board=result.board;finished=board.slots.every(Boolean);feedback=`${pokemon.name} cumple el cruce.`;
    if(ctx.singleRound){if(finished)ctx.onResult?.({game:'tabla',correct:true,points:1,speciesIds:board.slots.map(p=>p!.speciesId)});}
    else if(!rewarded.has(selected)){rewarded.add(selected);ctx.onResult?.({game:'tabla',correct:true,points:1,speciesIds:[pokemon.speciesId]});}
    else if(previous?.speciesId!==pokemon.speciesId){ctx.onResult?.({game:'tabla',correct:true,points:0,speciesIds:[pokemon.speciesId]});feedback+=' Esta casilla ya había sumado su punto.';}
    if(!finished)selected=board.slots.findIndex(p=>!p);render();
    if(finished)root.querySelector<HTMLButtonElement>('.new-grid')?.focus({preventScroll:true});
  }
  start();if(ctx.focusGame!==false)focusHeading(root);return()=>{active=false;cleanup();};
}
