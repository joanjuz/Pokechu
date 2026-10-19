import type {Catalog,Pokemon} from '../../domain/pokemon/types';
export interface GridData {version:string;catalogVersion:string;sourceRevision:string;abilities:Record<string,string>;pokemonAbilities:Record<string,{id:number;hidden:boolean}[]>}
export type Criterion={kind:'type';value:string}|{kind:'ability';value:number}|{kind:'generation';value:number};
export interface GridBoard {rows:Criterion[];columns:Criterion[];slots:(Pokemon|null)[]}
export const REGIONS=['Kanto','Johto','Hoenn','Sinnoh','Teselia','Kalos','Alola','Galar','Paldea'];
export const criterionKey=(c:Criterion):string=>`${c.kind}:${c.value}`;
const generationIndexes=new WeakMap<Catalog,Map<number,number>>();
function generation(catalog:Catalog,speciesId:number):number|undefined{let index=generationIndexes.get(catalog);if(!index){index=new Map(catalog.species.map(s=>[s.id,s.generation]));generationIndexes.set(catalog,index);}return index.get(speciesId);}
export function criterionLabel(c:Criterion,data:GridData):string{return c.kind==='type'?c.value:c.kind==='ability'?data.abilities[c.value]:`${REGIONS[c.value-1]} · Gen. ${c.value}`;}
export function matchesCriterion(p:Pokemon,c:Criterion,catalog:Catalog,data:GridData):boolean{
  return c.kind==='type'?p.types.includes(c.value):c.kind==='ability'?!!data.pokemonAbilities[p.id]?.some(a=>a.id===c.value):generation(catalog,p.speciesId)===c.value;
}
export function gridCandidates(board:GridBoard,index:number,entries:Pokemon[],catalog:Catalog,data:GridData):Pokemon[]{
  const row=board.rows[Math.floor(index/3)],column=board.columns[index%3];
  return row&&column?entries.filter(p=>matchesCriterion(p,row,catalog,data)&&matchesCriterion(p,column,catalog,data)):[];
}
// Maximum bipartite matching: one different species per cell, including fixed choices.
export function solveGrid(board:GridBoard,entries:Pokemon[],catalog:Catalog,data:GridData):(Pokemon[])|null{
  if(board.rows.length!==3||board.columns.length!==3||board.slots.length!==9)return null;
  const fixed=board.slots.filter((p):p is Pokemon=>!!p),used=new Set(fixed.map(p=>p.speciesId));
  if(used.size!==fixed.length||board.slots.some((p,i)=>p&&!gridCandidates(board,i,[p],catalog,data).length))return null;
  const candidates=board.slots.map((p,i)=>p?[p]:gridCandidates(board,i,entries,catalog,data).filter(p=>!used.has(p.speciesId)));
  const owner=new Map<number,number>();const assigned=new Map<number,Pokemon>();
  function assign(cell:number,seen:Set<number>):boolean{
    for(const pokemon of candidates[cell]){
      if(seen.has(pokemon.speciesId))continue;seen.add(pokemon.speciesId);
      const previous=owner.get(pokemon.speciesId);
      if(previous===undefined||assign(previous,seen)){owner.set(pokemon.speciesId,cell);assigned.set(cell,pokemon);return true;}
    }return false;
  }
  const pending=candidates.map((_,i)=>i).sort((a,b)=>candidates[a].length-candidates[b].length);
  if(pending.some(i=>!assign(i,new Set())))return null;
  return Array.from({length:9},(_,i)=>assigned.get(i)!);
}
function shuffled<T>(values:T[],random:()=>number):T[]{const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
export function createGrid(entries:Pokemon[],catalog:Catalog,data:GridData,random=Math.random):GridBoard|null{
  if(data.catalogVersion!==catalog.version||new Set(entries.map(p=>p.speciesId)).size<9)return null;
  const types=[...new Set(entries.flatMap(p=>p.types))].map(value=>({kind:'type',value}) as Criterion);
  const abilities=[...new Set(entries.flatMap(p=>(data.pokemonAbilities[p.id]||[]).map(a=>a.id)))].map(value=>({kind:'ability',value}) as Criterion);
  const generations=catalog.species.filter(s=>entries.some(p=>p.speciesId===s.id)).map(s=>s.generation);
  const regions=[...new Set(generations)].map(value=>({kind:'generation',value}) as Criterion);
  for(let attempt=0;attempt<240;attempt++){
    const columns=[...shuffled(types,random).slice(0,2),regions[Math.floor(random()*regions.length)]];
    if(columns.length!==3)continue;
    const probe:GridBoard={columns,rows:[],slots:Array(9).fill(null)};
    const eligible=[...types,...abilities].filter(c=>!columns.some(other=>criterionKey(other)===criterionKey(c))&&columns.every(column=>entries.some(p=>matchesCriterion(p,c,catalog,data)&&matchesCriterion(p,column,catalog,data))));
    const ability=shuffled(eligible.filter(c=>c.kind==='ability'),random)[0];if(!ability)continue;
    const rows=[ability,...shuffled(eligible.filter(c=>criterionKey(c)!==criterionKey(ability)),random).slice(0,2)];if(rows.length!==3)continue;
    const board:GridBoard={...probe,rows};
    if(solveGrid(board,entries,catalog,data))return random()<.5?{...board,rows:columns,columns:rows}:board;
  }return null;
}
export type GridPlacement={ok:true;board:GridBoard}|{ok:false;reason:'invalid'|'duplicate'|'mismatch'};
export function placeGridPokemon(board:GridBoard,index:number,pokemon:Pokemon,entries:Pokemon[],catalog:Catalog,data:GridData):GridPlacement{
  if(!Number.isInteger(index)||index<0||index>8||!entries.some(p=>p.id===pokemon.id))return {ok:false,reason:'invalid'};
  if(board.slots.some((p,i)=>i!==index&&p?.speciesId===pokemon.speciesId))return {ok:false,reason:'duplicate'};
  if(!gridCandidates(board,index,[pokemon],catalog,data).length)return {ok:false,reason:'mismatch'};
  const slots=[...board.slots];slots[index]=pokemon;return {ok:true,board:{...board,slots}};
}
