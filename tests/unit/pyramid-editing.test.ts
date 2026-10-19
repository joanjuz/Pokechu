import {expect,it} from 'vitest';
import {createPyramid,movePokemon,confirmPyramid} from '../../src/games/pyramid/rules';
import type {Pokemon} from '../../src/domain/pokemon/types';
import {searchPokemon} from '../../src/domain/pokemon/catalog';
import data from '../../data/generated/catalog.json';
import quiz from '../../data/generated/quiz.json';
const deck:Pokemon[]=Array.from({length:10},(_,i)=>({id:i+1,speciesId:i+1,slug:`p-${i}`,name:`Pokemon ${i}`,form:'',kind:'default',stats:[100-i,10,10,10,10,10],types:['Normal'],image:'',silhouette:true}));
it('permite mover intercambiar y devolver sin duplicar Pokémon ni consumir vidas',()=>{
  let state=createPyramid(deck,'hp');state=movePokemon(state,1,0);state=movePokemon(state,2,1);state=movePokemon(state,1,1);
  expect(state.slots.slice(0,2).map(p=>p?.id)).toEqual([2,1]);expect(state.cursor).toBe(2);expect(state.lives).toBe(7);
  state=movePokemon(state,3,1);expect(state.slots.slice(0,2).map(p=>p?.id)).toEqual([2,3]);expect(state.cursor).toBe(2);
  state=movePokemon(state,2,null);expect(state.slots[0]).toBeNull();expect(state.cursor).toBe(1);
  expect(movePokemon(state,999,0)).toBe(state);expect(movePokemon(state,1,10)).toBe(state);expect(movePokemon(state,1,-1)).toBe(state);expect(movePokemon(state,1,.5)).toBe(state);
  expect(confirmPyramid(state)).toBe(state);expect(state.lives).toBe(7);
});
it('mantiene siete intentos editables sobre el mismo tablero y congela la derrota final',()=>{
  let state=createPyramid(deck,'hp');for(let i=0;i<10;i++)state=movePokemon(state,10-i,i);
  const positions=state.slots;
  for(let attempt=1;attempt<=7;attempt++){
    state=confirmPyramid(state);expect(state.lives).toBe(7-attempt);expect(state.phase).toBe(attempt===7?'lost':'editing');expect(state.deck).toEqual(deck);expect(state.metric).toBe('hp');expect(state.slots).toBe(positions);
    if(attempt<7){const moved=movePokemon(state,1,0);expect(moved).not.toBe(state);expect(moved.lives).toBe(state.lives);expect(moved.result).toBeUndefined();}
  }
  expect(confirmPyramid(state)).toBe(state);expect(movePokemon(state,1,0)).toBe(state);expect(state.result?.score).toBeLessThan(10);
});
it('confirma una victoria corregida sin gastar otra vida',()=>{
  let state=createPyramid(deck,'hp');for(let i=0;i<10;i++)state=movePokemon(state,10-i,i);state=confirmPyramid(state);
  for(let i=0;i<10;i++)state=movePokemon(state,i+1,i);
  expect(state.phase).toBe('editing');expect(state.result).toBeUndefined();state=confirmPyramid(state);
  expect(state.phase).toBe('won');expect(state.lives).toBe(6);expect(state.result?.score).toBe(10);expect(movePokemon(state,1,9)).toBe(state);
});
it('sugiere Basculegion al escribir bascu y prioriza coincidencias exactas',()=>{
  const catalog=data as unknown as import('../../src/domain/pokemon/types').Catalog;const entries=catalog.pokemon.filter(p=>p.kind==='default');
  expect(searchPokemon(catalog,entries,'bascu',false).map(p=>p.name)).toContain('Basculegion');
  expect(searchPokemon(catalog,entries,'mew',false)[0].name).toBe('Mew');
  expect(searchPokemon(catalog,entries.filter(p=>p.speciesId<152),'bascu',false)).toEqual([]);
});
it('las preguntas varían sus pistas y no usan el número de Pokédex',()=>{
  expect(quiz.questions).toHaveLength(1025);expect(quiz.questions.every(q=>!q.clue.includes('Pokédex'))).toBe(true);
  expect(new Set(quiz.questions.map(q=>q.clue)).size).toBe(1025);
  expect(quiz.questions.some(q=>q.clue.includes('Evoluciona directamente'))).toBe(true);
  expect(quiz.questions.some(q=>q.clue.includes('Puede evolucionar directamente'))).toBe(true);
  expect(quiz.questions.some(q=>q.clue.includes('estadística base más alta'))).toBe(true);
  expect(quiz.questions.some(q=>q.clue.includes('singular'))).toBe(true);
});
