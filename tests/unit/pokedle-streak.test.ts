import {it,expect} from 'vitest';
import catalog from '../../data/generated/catalog.json';
import imported from '../../data/generated/pokedle.json';
import {createPokedle,guessPokedle,pokedleClues,type PokedleData} from '../../src/games/pokedle/rules';
import {compare,answerBst} from '../../src/games/bst/rules';
import {nextCry} from '../../src/games/cries/rules';
import {restoreSettings} from '../../src/domain/pokemon/settings';
import type {Pokemon} from '../../src/domain/pokemon/types';
const entries=catalog.pokemon as Pokemon[],data=imported as PokedleData,bulba=entries.find(p=>p.id===1)!,charmander=entries.find(p=>p.id===4)!;
it('izquierda con 510 frente a derecha con 410 se responde mayor y admite el empate',()=>{
  const left={...bulba,stats:[85,85,85,85,85,85] as Pokemon['stats']},right={...charmander,stats:[60,70,70,70,70,70] as Pokemon['stats']};
  expect(compare(left,right)).toBe('higher');expect(compare(right,left)).toBe('lower');expect(compare(left,left)).toBe('equal');expect(answerBst({left,right,score:0,phase:'answer'},'higher')).toMatchObject({correct:true,score:1});
});
it('aleatoria es el valor predeterminado y conserva una estadística elegida expresamente',()=>{
  expect(restoreSettings(null).metric).toBe('random');expect(restoreSettings({generations:[1],metric:'speed',forms:false,battle:false}).metric).toBe('speed');
});
it('Pokédle indica tipos parciales flechas hacia el objetivo y coincidencias exactas',()=>{
  const clues=pokedleClues(charmander,bulba,data);expect(clues.find(c=>c.label==='Altura')).toMatchObject({value:'0,6 m',direction:'up',status:'miss'});expect(clues.find(c=>c.label==='Peso')).toMatchObject({direction:'down'});expect(clues.find(c=>c.label==='Generación')).toMatchObject({status:'match'});
  const swapped={...bulba,types:[...bulba.types].reverse()};expect(pokedleClues(swapped,bulba,data).slice(0,2).map(c=>c.status)).toEqual(['partial','partial']);expect(pokedleClues(bulba,bulba,data).every(c=>c.status==='match'&&!c.direction)).toBe(true);expect(pokedleClues(charmander,charmander,data)[1]).toMatchObject({value:'—',status:'match'});
});
it('Pokédle admite más de ocho propuestas y solo termina al acertar',()=>{
  let state=createPokedle(bulba);state=guessPokedle(state,charmander);expect(guessPokedle(state,charmander)).toBe(state);
  for(const p of entries.filter(p=>p.kind==='default'&&p.speciesId!==1&&p.speciesId!==4).slice(0,15))state=guessPokedle(state,p);
  expect(state.guesses).toHaveLength(16);expect(state.phase).toBe('answer');
  const win=guessPokedle(state,bulba);expect(win.phase).toBe('won');expect(win.guesses).toHaveLength(17);expect(guessPokedle(win,charmander)).toBe(win);
});
it('gritos sigue eligiendo al agotar su catálogo sin repetir el último grito',()=>{
  const small=[bulba,charmander,entries.find(p=>p.id===7)!];let history:number[]=[],last=0;
  for(let i=0;i<20;i++){const selection=nextCry(small,history,()=>0)!;expect(selection.target.speciesId).not.toBe(last);history=selection.history;last=selection.target.speciesId;expect(history.length).toBeLessThanOrEqual(3);}expect(nextCry([],[],()=>0)).toBeNull();
});
