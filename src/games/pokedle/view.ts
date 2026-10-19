import type {GameContext} from '../../app/context';
import {pool} from '../../domain/pokemon/catalog';
import type {Pokemon} from '../../domain/pokemon/types';
import {selectPokemon} from '../../shared/random';
import {attachPokemonAutocomplete} from '../../shared/autocomplete';
import {escapeHtml,focusHeading,pokemonImage} from '../../shared/ui';
import imported from '../../../data/generated/pokedle.json';
import {createPokedle,guessPokedle,pokedleClues,type PokedleData,type PokedleState} from './rules';
const data=imported as PokedleData;
export function mount(root:HTMLElement,ctx:GameContext):()=>void{
  const entries=pool(ctx.catalog,{...ctx.settings,forms:false,battle:false});
  let state:PokedleState,active=true,feedback='',last:number|undefined,cleanup=()=>{};
  function start(){const target=selectPokemon(entries,last?[last]:[],ctx.random)||entries[0];if(!target||data.catalogVersion!==ctx.catalog.version){root.innerHTML='<div class="empty-state"><h1>Faltan Pokémon para Pokédle</h1><p>Amplía las generaciones en Ajustes.</p></div>';return;}last=target.speciesId;state=createPokedle(target);feedback='';render();}
  function submit(pokemon:Pokemon){
    if(!active||!ctx.alive()||state.phase!=='answer')return;
    const next=guessPokedle(state,pokemon);if(next===state){feedback='Ya probaste esa especie. Consulta sus pistas.';render();return;}
    state=next;feedback='';render();
    if(state.phase==='won')ctx.onResult?.({game:'pokedle',correct:true,points:1,speciesIds:[state.target.speciesId]});
  }
  function render(){
    cleanup();const finished=state.phase!=='answer';
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Pokédle</h1></div><div class="scoreboard"><span>Modo<strong>Libre</strong></span></div></div><p class="game-instruction">Encuentra el Pokémon oculto. Cada propuesta revela en qué se parece tu Pokémon a la respuesta.</p>${finished?`<section class="pokedle-result result success" role="status">${pokemonImage(state.target)}<div><strong>¡Pokémon encontrado!</strong><span>Era ${escapeHtml(state.target.name)}.</span></div></section>${ctx.singleRound?'':'<button class="button primary new-pokedle">Otro Pokémon</button>'}`:`<section class="pokedle-answer"><label for="pokedle-answer">Nombre del Pokémon</label><input id="pokedle-answer" type="search" autocomplete="off" spellcheck="false" placeholder="Escribe y elige una sugerencia"><p class="field-help">Seleccionar un nombre añade una propuesta.</p>${ctx.singleRound?'':'<button class="text-button new-pokedle">Cambiar Pokémon</button>'}</section>`}<p class="pokedle-feedback" role="status">${escapeHtml(feedback)}</p><div class="clue-legend"><span>✓ Coincide</span><span>≈ Tipo en otra posición</span><span>× No coincide</span><span>↑ La respuesta es mayor · ↓ Es menor</span></div><div class="pokedle-history" aria-label="Pistas de tus propuestas">${state.guesses.length?[...state.guesses].reverse().map((p,index)=>`<article class="pokedle-guess"><header><span>${state.guesses.length-index}</span>${pokemonImage(p)}<strong>${escapeHtml(p.name)}</strong></header><dl>${pokedleClues(p,state.target,data).map(c=>`<div class="clue ${c.status}"><dt>${c.label}</dt><dd>${escapeHtml(c.value)} <b aria-label="${c.direction==='up'?'La respuesta es mayor':c.direction==='down'?'La respuesta es menor':c.status==='match'?'Coincide':c.status==='partial'?'Coincide en otra posición':'No coincide'}">${c.direction==='up'?'↑':c.direction==='down'?'↓':c.status==='match'?'✓':c.status==='partial'?'≈':'×'}</b></dd></div>`).join('')}</dl></article>`).join(''):'<p class="pokedle-empty">Las pistas aparecerán aquí con tu primera propuesta.</p>'}</div><details class="rules"><summary>Cómo leer las pistas</summary><p>Verde y ✓ indican coincidencia. El ámbar y ≈ indican que ese tipo está en la otra posición. Las flechas señalan si el valor del Pokémon oculto es mayor o menor que el propuesto. «Base», «Primera» y «Segunda» son la posición en su cadena de evolución; no cuentan megaevoluciones ni formas de combate.</p><p>Puedes proponer Pokémon sin límite, sin vidas ni derrota. Repetir una especie conserva sus pistas. Solo se usan las formas habituales de las generaciones elegidas. Cada partida tiene una nueva respuesta, sin límite diario. Solo encontrarla registra la especie y suma un punto global.</p></details>`;
    const input=root.querySelector<HTMLInputElement>('#pokedle-answer');if(input)cleanup=attachPokemonAutocomplete(input,ctx.catalog,entries,submit,'pokedle-suggestions');
    root.querySelector('.new-pokedle')?.addEventListener('click',start);
    if(state.guesses.length)input?.focus({preventScroll:true});
  }
  start();if(ctx.focusGame!==false)focusHeading(root);return()=>{active=false;cleanup();};
}
