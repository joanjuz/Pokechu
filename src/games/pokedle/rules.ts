import type {Pokemon} from '../../domain/pokemon/types';
export interface PokedleTraits {height:number;weight:number;color:string;stage:number;generation:number}
export interface PokedleData {version:string;catalogVersion:string;sourceRevision:string;traits:Record<string,PokedleTraits>}
export type ClueStatus='match'|'partial'|'miss';
export interface Clue {label:string;value:string;status:ClueStatus;direction?:'up'|'down'}
export interface PokedleState {target:Pokemon;guesses:Pokemon[];phase:'answer'|'won'}
export function createPokedle(target:Pokemon):PokedleState{return {target,guesses:[],phase:'answer'};}
export function guessPokedle(state:PokedleState,pokemon:Pokemon):PokedleState{
  if(state.phase!=='answer'||state.guesses.some(p=>p.speciesId===pokemon.speciesId))return state;
  const guesses=[...state.guesses,pokemon];return {...state,guesses,phase:pokemon.speciesId===state.target.speciesId?'won':'answer'};
}
export function pokedleClues(guess:Pokemon,target:Pokemon,data:PokedleData):Clue[]{
  const own=data.traits[guess.speciesId],secret=data.traits[target.speciesId];
  const numeric=(label:string,value:number,wanted:number,display=String(value)):Clue=>({label,value:display,status:value===wanted?'match':'miss',...(value===wanted?{}:{direction:value<wanted?'up' as const:'down' as const})});
  const type=(index:number):Clue=>{const value=guess.types[index]||'—',wanted=target.types[index]||'—';return {label:`Tipo ${index+1}`,value,status:value===wanted?'match':target.types.includes(value)?'partial':'miss'};};
  return [type(0),type(1),numeric('Generación',own.generation,secret.generation),{label:'Color',value:own.color,status:own.color===secret.color?'match':'miss'},numeric('Evolución',own.stage,secret.stage,['Base','Primera','Segunda'][own.stage]||String(own.stage)),numeric('Altura',own.height,secret.height,`${(own.height/10).toLocaleString('es')} m`),numeric('Peso',own.weight,secret.weight,`${(own.weight/10).toLocaleString('es')} kg`)];
}
