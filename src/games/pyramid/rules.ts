import { metricValue, type Metric, type Pokemon } from '../../domain/pokemon/types';
export const ROWS = [1,2,3,4];
export const PYRAMID_LIVES = 7;
export interface PyramidState { deck: Pokemon[]; slots: (Pokemon|null)[]; cursor: number; metric: Metric; lives:number; phase:'editing'|'won'|'lost'; result?:{correct:boolean[];score:number} }
export function createPyramid(deck: Pokemon[],metric: Metric): PyramidState {
  if(deck.length!==10 || new Set(deck.map(p=>p.speciesId)).size!==10) throw new Error('La pirámide necesita diez especies distintas');
  return {deck:[...deck],slots:Array.from({length:10},()=>null),cursor:0,metric,lives:PYRAMID_LIVES,phase:'editing'};
}
export function placePokemon(state: PyramidState,index: number): PyramidState {
  if(state.phase!=='editing'||!Number.isInteger(index)||index<0||index>=10||state.slots[index]||state.cursor>=10)return state;
  const slots=[...state.slots]; slots[index]=state.deck[state.cursor];
  return {...state,slots,cursor:state.cursor+1};
}
export function movePokemon(state:PyramidState,pokemonId:number,target:number|null):PyramidState{
  if(state.phase!=='editing'||(target!==null&&(!Number.isInteger(target)||target<0||target>=10)))return state;
  const pokemon=state.deck.find(p=>p.id===pokemonId);if(!pokemon)return state;
  const source=state.slots.findIndex(p=>p?.id===pokemonId);
  if(source===target||(source<0&&target===null))return state;
  const slots=[...state.slots];
  if(source>=0)slots[source]=target===null?null:slots[target];
  if(target!==null)slots[target]=pokemon;
  return {...state,slots,cursor:slots.filter(Boolean).length,result:undefined};
}
export function confirmPyramid(state:PyramidState):PyramidState{
  if(state.phase!=='editing')return state;
  const result=evaluatePyramid(state);if(!result)return state;
  if(result.score===10)return {...state,phase:'won',result};
  const lives=state.lives-1;
  return {...state,lives,result,phase:lives===0?'lost':'editing'};
}
export function evaluatePyramid(state: PyramidState): {correct:boolean[];score:number} | undefined {
  if(state.cursor!==10||state.slots.some(p=>!p))return undefined;
  const sorted=state.deck.map(p=>metricValue(p,state.metric)).sort((a,b)=>b-a);
  let offset=0; const correct:boolean[]=[];
  for(const length of ROWS){const maximum=sorted[offset],minimum=sorted[offset+length-1];for(let i=0;i<length;i++){const value=metricValue(state.slots[offset+i]!,state.metric);correct.push(value>=minimum&&value<=maximum);}offset+=length;}
  return {correct,score:correct.filter(Boolean).length};
}
