import type {Pokemon} from '../../domain/pokemon/types';
export interface DraftState {deck:Pokemon[];choices:(number|null)[];cursor:number}
export function createDraft(deck:Pokemon[]):DraftState{
  if(deck.length!==6||new Set(deck.map(p=>p.speciesId)).size!==6)throw Error('Se necesitan seis especies diferentes');
  return {deck:[...deck],choices:Array(6).fill(null),cursor:0};
}
export function chooseStat(state:DraftState,stat:number):DraftState{
  if(state.cursor>=6||!Number.isInteger(stat)||stat<0||stat>5||state.choices.includes(stat))return state;
  const choices=[...state.choices];choices[state.cursor]=stat;return {...state,choices,cursor:state.cursor+1};
}
export function draftTotal(state:DraftState):number{return state.choices.reduce<number>((sum,stat,i)=>sum+(stat===null?0:state.deck[i].stats[stat]),0);}
export function perfectDraft(deck:Pokemon[]):{total:number;choices:number[]}{
  if(deck.length!==6)throw Error('El BST perfecto se calcula sobre seis Pokémon');
  const cache=new Map<number,{total:number;choices:number[]}>();
  function best(mask:number):{total:number;choices:number[]}{
    const row=mask.toString(2).replace(/0/g,'').length;if(row===6)return {total:0,choices:[]};
    const saved=cache.get(mask);if(saved)return saved;
    let result={total:-Infinity,choices:[] as number[]};
    for(let stat=0;stat<6;stat++)if(!(mask&(1<<stat))){const rest=best(mask|(1<<stat)),total=deck[row].stats[stat]+rest.total;if(total>result.total)result={total,choices:[stat,...rest.choices]};}
    cache.set(mask,result);return result;
  }return best(0);
}
