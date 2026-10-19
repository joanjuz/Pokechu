import {expect,it} from 'vitest';
import {createPyramid,placePokemon,evaluatePyramid} from '../../src/games/pyramid/rules';
import {ALPHABET,createRosco,answerLetter,passLetter,nextPending} from '../../src/games/pasapalabra/rules';
import {chooseMetric,METRICS,type Pokemon,type Catalog} from '../../src/domain/pokemon/types';
import {restoreSettings} from '../../src/domain/pokemon/settings';
import {seededRandom} from '../../src/shared/random';
import data from '../../data/generated/catalog.json';
import quiz from '../../data/generated/quiz.json';
const catalog=data as Catalog;
const deck=(values:number[]):Pokemon[]=>values.map((value,i)=>({...catalog.pokemon[0],id:i+1,speciesId:i+1,stats:[value,value,value,value,value,value]}));
it('pirámide valida las filas y acepta empates entre sus límites',()=>{
  const entries=deck([100,90,90,90,80,80,70,60,50,40]);let state=createPyramid(entries,'hp');
  const order=[0,3,2,1,5,4,9,8,7,6];
  for(const slot of order)state=placePokemon(state,slot);
  expect(evaluatePyramid(state)).toEqual({score:10,correct:Array(10).fill(true)});
});
it('pirámide cuenta posiciones incorrectas sin imponer orden dentro de la fila',()=>{
  let state=createPyramid(deck([1,2,3,4,5,6,7,8,9,10]),'hp');for(let i=0;i<10;i++)state=placePokemon(state,i);
  expect(evaluatePyramid(state)?.score).toBe(2);
  expect(evaluatePyramid(state)?.correct).toEqual([false,false,false,false,true,true,false,false,false,false]);
});
it('pirámide no revela ni puntúa el tablero incompleto o una casilla duplicada',()=>{
  const initial=createPyramid(deck([10,9,8,7,6,5,4,3,2,1]),'speed');
  const placed=placePokemon(initial,0);expect(evaluatePyramid(placed)).toBeUndefined();expect(placed.cursor).toBe(1);
  expect(placePokemon(placed,0)).toBe(placed);expect(placePokemon(placed,-1)).toBe(placed);expect(placePokemon(placed,10)).toBe(placed);expect(placePokemon(placed,1.5)).toBe(placed);
  expect(()=>createPyramid([], 'bst')).toThrow('diez especies');expect(()=>createPyramid(Array(10).fill(initial.deck[0]),'bst')).toThrow('diez especies');
});
it('pirámide evalúa la estadística elegida aunque contradiga el BST',()=>{
  const entries=deck([100,90,80,70,60,50,40,30,20,10]);for(let i=0;i<10;i++)entries[i].stats=[entries[i].stats[0],i*100+1,1,1,1,1];
  let state=createPyramid(entries,'hp');for(let i=0;i<10;i++)state=placePokemon(state,i);
  expect(evaluatePyramid(state)?.score).toBe(10);expect(evaluatePyramid({...state,metric:'bst'})?.score).toBeLessThan(10);
});
it('modo aleatorio sortea estadísticas reales y conserva los ajustes',()=>{
  expect(chooseMetric('random',()=>0)).toBe('bst');expect(chooseMetric('random',()=>.9999)).toBe('speed');expect(chooseMetric('attack',()=>0)).toBe('attack');
  const random=seededRandom(42);const values=Array.from({length:20},()=>chooseMetric('random',random));expect(new Set(values).size).toBeGreaterThan(1);expect(values.every(v=>METRICS.some(m=>m.id===v))).toBe(true);
  expect(restoreSettings({generations:[1],metric:'random',forms:false,battle:false}).metric).toBe('random');
});
it('rosco genera la A a la Z con respuestas distintas y pistas del catálogo',()=>{
  const state=createRosco(catalog.species,quiz.questions,seededRandom(42));expect(state.questions).toHaveLength(26);expect(state.questions.every(Boolean)).toBe(true);
  expect(new Set(state.questions.map(q=>q?.species.id)).size).toBe(26);
  for(let i=0;i<26;i++){const q=state.questions[i]!;expect(q.letter).toBe(ALPHABET[i]);const name=q.species.name.toLowerCase();expect(q.mode==='starts'?name.startsWith(q.letter.toLowerCase()):name.includes(q.letter.toLowerCase())).toBe(true);expect(q.clue).toBe(quiz.questions.find(c=>c.speciesId===q.species.id)!.clue);}
});
it('rosco respeta generaciones y omite letras imposibles sin penalizar',()=>{
  const species=catalog.species.filter(s=>s.generation===6);const state=createRosco(species,quiz.questions,seededRandom(42));
  expect(state.questions.filter(Boolean).length).toBeGreaterThan(0);expect(state.questions.filter(Boolean).every(q=>q!.species.generation===6)).toBe(true);
  expect(state.statuses.filter(s=>s==='unavailable').length).toBe(26-state.questions.filter(Boolean).length);expect(state.score).toBe(0);
  const empty=createRosco([],quiz.questions);expect(empty.finished).toBe(true);expect(empty.current).toBe(-1);expect(empty.statuses.every(s=>s==='unavailable')).toBe(true);
});
it('pasapalabra deja la letra pendiente y vuelve a ella tras una vuelta',()=>{
  const start=createRosco(catalog.species,quiz.questions,seededRandom(42));let state=passLetter(start);expect(state.statuses[0]).toBe('passed');expect(state.current).toBe(1);
  for(let i=1;i<26;i++)state=answerLetter(state,state.questions[state.current]!.species.name);
  expect(state.current).toBe(0);expect(state.finished).toBe(false);expect(state.score).toBe(25);
  state=answerLetter(state,state.questions[0]!.species.name);expect(state.finished).toBe(true);expect(state.score).toBe(26);expect(passLetter(state)).toBe(state);expect(answerLetter(state,'otra')).toBe(state);
});
it('rosco acepta alias y mayúsculas y cierra una respuesta errónea',()=>{
  const base=createRosco(catalog.species,quiz.questions,seededRandom(1));
  const target={...catalog.species.find(s=>s.id===29)!,aliases:['Nidoran hembra']};
  const state={...base,questions:[{letter:'N',mode:'starts' as const,species:target,clue:'Prueba'}],statuses:['pending' as const],current:0};
  expect(answerLetter(state,'  NIDORAN HEMBRA ').score).toBe(1);expect(answerLetter(state,'').score).toBe(0);expect(answerLetter(state,'')).toBe(state);
  const wrong=answerLetter(state,'Pikachu');expect(wrong.statuses).toEqual(['wrong']);expect(wrong.finished).toBe(true);expect(wrong.score).toBe(0);
  expect(nextPending(['correct','wrong','unavailable'],0)).toBe(-1);
});
