import type { Pokemon } from '../../domain/pokemon/types';
import {selectPokemon} from '../../shared/random';
export function nextCry(entries:Pokemon[],history:number[],random=Math.random):{target:Pokemon;history:number[]}|null{
  const target=selectPokemon(entries,history,random)||selectPokemon(entries,history.slice(-1),random);
  if(!target)return null;
  return {target,history:[...(history.includes(target.speciesId)?history.slice(-1):history),target.speciesId]};
}
export function cryChoices(target: Pokemon, entries: Pokemon[], random = Math.random): Pokemon[] {
  const unique = [...new Map(entries.filter(p => p.speciesId !== target.speciesId).map(p => [p.speciesId,p])).values()];
  for (let i = unique.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [unique[i],unique[j]] = [unique[j],unique[i]]; }
  const choices = [target, ...unique.slice(0,2)];
  for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [choices[i],choices[j]] = [choices[j],choices[i]]; }
  return choices;
}
