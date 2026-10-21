import type {GameContext} from '../../app/context';
import {pool} from '../../domain/pokemon/catalog';
import type {Pokemon} from '../../domain/pokemon/types';
import {selectPokemon} from '../../shared/random';
import {attachPokemonAutocomplete} from '../../shared/autocomplete';
import {escapeHtml,focusHeading,pokemonImage} from '../../shared/ui';
import imported from '../../../data/generated/defense.json';
import abilities from '../../../data/generated/grid.json';
import {REGIONS} from '../grid/rules';
import {defenseCandidates,createDefense,guessDefense,defenseProfile,defenseGroups,hintCount,type DefenseState,type DefenseData} from './rules';
import {typeBadge} from './type-icons';
const data=imported as DefenseData;
const labels:Record<string,string>={4:'Muy débil',2:'Débil',1:'Daño normal',0.5:'Resistente',0.25:'Muy resistente',0:'Inmune'};
export function mount(root:HTMLElement,ctx:GameContext):()=>void{
  const entries=pool(ctx.catalog,{...ctx.settings,forms:false,battle:false});
  const targets=defenseCandidates(entries);
  let state:DefenseState,active=true,feedback='',last:number|undefined,cleanup=()=>{};
  function start(){
    const target=selectPokemon(targets,last?[last]:[],ctx.random)||targets[0];
    if(!target||data.catalogVersion!==ctx.catalog.version||abilities.catalogVersion!==ctx.catalog.version){root.innerHTML='<div class="empty-state"><h1>Faltan Pokémon para comparar defensas</h1><p>Elige una generación con Pokémon de dos tipos en Ajustes.</p></div>';return;}
    const possible=abilities.pokemonAbilities[String(target.id) as keyof typeof abilities.pokemonAbilities];
    const ability=possible[Math.floor(ctx.random()*possible.length)].id;
    last=target.speciesId;state=createDefense(target,ability);feedback='';render();
  }
  function submit(pokemon:Pokemon){
    if(!active||!ctx.alive()||state.phase!=='answer')return;
    const previous=state,next=guessDefense(state,pokemon);
    if(next===state){feedback='Ya probaste esa especie. No suma otro fallo ni adelanta las pistas.';render();root.querySelector<HTMLInputElement>('#defense-answer')?.focus({preventScroll:true});return;}
    state=next;
    if(state.phase==='won'){feedback='';render();ctx.onResult?.({game:'debilidades',correct:true,points:1,speciesIds:[state.target.speciesId]});return;}
    const targetProfile=defenseProfile(state.target,state.ability,data),possible=abilities.pokemonAbilities[String(pokemon.id) as keyof typeof abilities.pokemonAbilities];
    const same=possible.some(a=>{const profile=defenseProfile(pokemon,a.id,data);return data.types.every(type=>profile[type]===targetProfile[type]);});
    feedback=same?'Esa especie puede tener la misma tabla, pero buscamos otra. Las pistas te ayudarán a distinguirla.':'No es ese Pokémon. Sigue comparando sus defensas.';
    if(hintCount(state.misses)>hintCount(previous.misses))feedback+=' Se ha desbloqueado una pista.';
    render();root.querySelector<HTMLInputElement>('#defense-answer')?.focus({preventScroll:true});
  }
  function render(){
    cleanup();const finished=state.phase==='won',hints=hintCount(state.misses),species=ctx.catalog.species.find(s=>s.id===state.target.speciesId)!;
    const abilityName=abilities.abilities[String(state.ability) as keyof typeof abilities.abilities];
    const hintMarkup=[
      `Pertenece a la generación ${species.generation}: ${REGIONS[species.generation-1]}.`,
      `En esta partida tiene la habilidad ${escapeHtml(abilityName)}.`,
      pokemonImage(state.target,true,'defense-hint-silhouette'),
    ];
    const chart=defenseGroups(defenseProfile(state.target,state.ability,data)).map(group=>`<section class="defense-group" data-multiplier="${group.multiplier}" aria-label="${labels[group.multiplier]||'Daño modificado'} por ${group.multiplier.toLocaleString('es')}"><h2>${labels[group.multiplier]||(group.multiplier>1?'Daño aumentado':'Daño reducido')} <span>×${group.multiplier.toLocaleString('es')}</span></h2><div class="defense-types">${group.types.length?group.types.map(typeBadge).join(''):'<span class="defense-none">Ninguno</span>'}</div></section>`).join('');
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Debilidades y resistencias</h1></div><div class="scoreboard"><span>Fallos<strong class="defense-misses">${state.misses}</strong></span><span>Pistas<strong class="defense-hint-count">${hints}/3</strong></span></div></div><p class="game-instruction">¿Qué Pokémon recibe este daño? La respuesta siempre tiene dos tipos. Observa sus defensas y propone una especie.</p><div class="defense-layout"><section class="defense-chart" aria-label="Daño recibido por tipo">${chart}</section><section class="defense-controls">${finished?`<div class="defense-result result success" role="status">${pokemonImage(state.target)}<strong>¡Pokémon encontrado!</strong><span>${escapeHtml(state.target.name)} · ${escapeHtml(abilityName)}</span></div>${ctx.singleRound?'':'<button class="button primary new-defense">Otro Pokémon</button>'}`:`<label for="defense-answer">Nombre del Pokémon</label><input id="defense-answer" type="search" autocomplete="off" spellcheck="false" placeholder="Escribe y elige una sugerencia"><p class="field-help">Sin límite de propuestas. Una pista nueva cada cuatro fallos distintos.</p>${ctx.singleRound?'':'<button class="text-button new-defense">Cambiar Pokémon</button>'}`}<p class="defense-feedback" role="status">${escapeHtml(feedback)}</p><section class="defense-hints" aria-label="Pistas desbloqueadas"><h2>Pistas</h2><ol>${hintMarkup.map((content,i)=>`<li class="${hints>i?'unlocked':'locked'}" data-hint="${i+1}">${hints>i?content:`<span>Pista ${i+1}</span><small>Se abre con ${(i+1)*4} fallos</small>`}</li>`).join('')}</ol></section>${state.guesses.length?`<details class="defense-history" open><summary>Propuestas (${state.guesses.length})</summary><ol>${state.guesses.map(p=>`<li>${pokemonImage(p).replace('<img ','<img loading="lazy" ')}<span>${escapeHtml(p.name)}</span></li>`).join('')}</ol></details>`:''}</section></div><details class="rules"><summary>Cómo se calculan las defensas</summary><p>Se combinan los tipos de la forma habitual con los efectos permanentes de una de sus habilidades posibles, incluidas las ocultas. Se consideran ataques normales sin contacto, sin clima, objetos, teracristalización ni cambios de estado o PS. No se aplican las habilidades del atacante ni efectos que dependan del movimiento. Por ejemplo, Levitación da inmunidad a Tierra; las habilidades condicionadas por los PS no se activan en esta tabla.</p><p>Distintas especies pueden compartir defensas: buscamos una concreta. Tras 4, 8 y 12 fallos distintos se muestran su generación, la habilidad usada y su silueta. Acertar suma un punto y registra la especie. No hay vidas ni límite de propuestas, y las pistas nunca dan su nombre.</p></details>`;
    const input=root.querySelector<HTMLInputElement>('#defense-answer');if(input)cleanup=attachPokemonAutocomplete(input,ctx.catalog,entries,submit,'defense-suggestions',true);
    root.querySelector('.new-defense')?.addEventListener('click',()=>{start();focusHeading(root);});
    if(finished&&!ctx.singleRound)root.querySelector<HTMLButtonElement>('.new-defense')?.focus({preventScroll:true});
  }
  start();if(ctx.focusGame!==false)focusHeading(root);return()=>{active=false;cleanup();};
}
