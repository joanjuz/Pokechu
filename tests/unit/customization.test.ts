import { expect, it } from 'vitest';
import { ALL_GENERATIONS, METRICS, metricValue, type Catalog, type Pokemon } from '../../src/domain/pokemon/types';
import { pool } from '../../src/domain/pokemon/catalog';
import { comparisonRecordKey, generationKey, restoreSettings } from '../../src/domain/pokemon/settings';
import { compare, answerBst } from '../../src/games/bst/rules';
import { answerSilhouette, type SilhouetteState } from '../../src/games/silhouette/rules';
import { revealAngle } from '../../src/games/silhouette/reveal';
import imported from '../../data/generated/catalog.json';
const catalog = imported as Catalog;
const a = catalog.pokemon.find(p => p.id === 1)!;
it.each(METRICS.filter(m => m.index >= 0))('compara $label sin usar el BST', metric => {
  const index = metric.index;
  if (index === -1) throw new Error('La tabla solo incluye estadísticas individuales');
  const left: Pokemon = { ...a, stats: [90,90,90,90,90,90] };
  const right: Pokemon = { ...a, id:2, stats:[200,200,200,200,200,200] };
  right.stats[index] = 89;
  expect(metricValue(right,metric.id)).toBe(89);
  expect(compare(left,right,metric.id)).toBe('higher');
  expect(answerBst({left,right,metric:metric.id,score:2,phase:'answer'},'higher')).toMatchObject({score:3,correct:true,phase:'reveal'});
  right.stats[index] = 90;
  expect(compare(left,right,metric.id)).toBe('equal');
  expect(answerBst({left,right,metric:metric.id,score:2,phase:'answer'},'equal')).toMatchObject({score:3,correct:true});
  right.stats[index] = 91;
  expect(compare(left,right,metric.id)).toBe('lower');
});
it('incluye exactamente las generaciones elegidas en ambos juegos', () => {
  const settings = { generations:[1,3,6],metric:'speed' as const,forms:false,battle:false };
  const expected = catalog.species.filter(s => [1,3,6].includes(s.generation)).map(s => s.id).sort((a,b)=>a-b);
  expect(pool(catalog,settings).map(p => p.speciesId).sort((a,b)=>a-b)).toEqual(expected);
  expect(pool(catalog,settings,true).map(p => p.speciesId).sort((a,b)=>a-b)).toEqual(expected);
  expect(pool(catalog,{...settings,generations:[]})).toEqual([]);
  expect(pool(catalog,{...settings,generations:ALL_GENERATIONS}).filter(p => p.kind==='default')).toHaveLength(1025);
});
it('migra los ajustes anteriores y valida los nuevos', () => {
  expect(restoreSettings({generation:3,forms:true,battle:false})).toEqual({generations:[3],metric:'bst',forms:true,battle:false});
  expect(restoreSettings({generation:0,forms:false,battle:false}).generations).toEqual(ALL_GENERATIONS);
  expect(restoreSettings({generations:[6,1,6],metric:'speed',forms:false,battle:true})).toEqual({generations:[1,6],metric:'speed',forms:false,battle:true});
  expect(restoreSettings({generations:[],metric:'hp',forms:false,battle:false}).generations).toEqual([]);
  for (const bad of [null,{}, {generations:[10],metric:'speed',forms:false,battle:false}, {generations:[1],metric:'unknown',forms:false,battle:false}]) {
    expect(restoreSettings(bad)).toEqual({generations:ALL_GENERATIONS,metric:'random',forms:false,battle:false});
  }
});
it('separa los récords por estadística y combinación de generaciones', () => {
  const settings = {generations:[1,3],metric:'hp' as const,forms:false,battle:false};
  const original = comparisonRecordKey('v1',settings);
  expect(comparisonRecordKey('v1',{...settings,generations:[3,1,1]})).toBe(original);
  expect(comparisonRecordKey('v1',{...settings,metric:'attack'})).not.toBe(original);
  expect(comparisonRecordKey('v1',{...settings,generations:[1]})).not.toBe(original);
  expect(comparisonRecordKey('v1',{...settings,forms:true})).not.toBe(original);
  expect(comparisonRecordKey('v2',settings)).not.toBe(original);
  expect(generationKey([6,1,3,1])).toBe('1-3-6');
});
it('descubre la silueta solo con fallos nuevos y la muestra completa al resolver', () => {
  let state: SilhouetteState = {target:a,round:1,total:10,attempts:0,guesses:[],score:0,phase:'answer'};
  expect(revealAngle(state.attempts,false)).toBe(120);
  const wrong = catalog.pokemon.find(p => p.id===4)!;
  state = answerSilhouette(state,wrong,false);
  expect(revealAngle(state.attempts,state.phase!=='answer')).toBe(210);
  const duplicate = answerSilhouette(state,wrong,false);
  expect(duplicate).toBe(state);
  expect(revealAngle(duplicate.attempts,false)).toBe(210);
  state = answerSilhouette(state,catalog.pokemon.find(p => p.id===7)!,false);
  expect(revealAngle(state.attempts,false)).toBe(300);
  const lost = answerSilhouette(state,catalog.pokemon.find(p => p.id===25)!,false);
  expect(revealAngle(lost.attempts,lost.phase!=='answer')).toBe(360);
  const won = answerSilhouette(state,a,false);
  expect(revealAngle(won.attempts,won.phase!=='answer')).toBe(360);
  expect(won.score).toBe(1);
});
