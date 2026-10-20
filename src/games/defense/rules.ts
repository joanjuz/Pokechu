import type {Pokemon} from '../../domain/pokemon/types';
export interface AbilityEffect {immune?:string[];factors?:Record<string,number>;superEffective?:number;wonderGuard?:boolean}
export interface DefenseData {version:string;catalogVersion:string;sourceRevision:string;types:string[];chart:Record<string,Record<string,number>>;effects:Record<string,AbilityEffect>}
export interface DefenseState {target:Pokemon;ability:number;guesses:Pokemon[];misses:number;phase:'answer'|'won'}
export function defenseProfile(pokemon:Pokemon,ability:number,data:DefenseData):Record<string,number>{
  const effect=data.effects[ability];
  return Object.fromEntries(data.types.map(type=>{
    let value=pokemon.types.reduce((result,defense)=>result*data.chart[type][defense],1);
    if(effect?.immune?.includes(type)||(effect?.wonderGuard&&value<=1))value=0;
    if(effect?.superEffective&&value>1)value*=effect.superEffective;
    value*=effect?.factors?.[type]??1;
    return [type,value];
  }));
}
export function defenseGroups(profile:Record<string,number>):{multiplier:number;types:string[]}[]{
  const values=[...new Set([4,2,1,.5,.25,0,...Object.values(profile)])].sort((a,b)=>b-a);
  return values.map(multiplier=>({multiplier,types:Object.keys(profile).filter(type=>profile[type]===multiplier)}));
}
export const hintCount=(misses:number):number=>Math.min(3,Math.floor(Math.max(0,misses)/4));
export function createDefense(target:Pokemon,ability:number):DefenseState{return {target,ability,guesses:[],misses:0,phase:'answer'};}
export function guessDefense(state:DefenseState,pokemon:Pokemon):DefenseState{
  if(state.phase!=='answer'||state.guesses.some(p=>p.speciesId===pokemon.speciesId))return state;
  const correct=state.target.speciesId===pokemon.speciesId;
  return {...state,guesses:[...state.guesses,pokemon],misses:state.misses+Number(!correct),phase:correct?'won':'answer'};
}
