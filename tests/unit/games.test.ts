import { describe, expect, it } from 'vitest';
import { answerBst, compare, type BstState } from '../../src/games/bst/rules';
import { answerSilhouette, type SilhouetteState } from '../../src/games/silhouette/rules';
import { normalizeName, pool, searchPokemon } from '../../src/domain/pokemon/catalog';
import { bst, type Catalog, type Pokemon } from '../../src/domain/pokemon/types';
import { seededRandom, selectPokemon } from '../../src/shared/random';
import { isScore, readStored, writeStored } from '../../src/shared/storage';
import imported from '../../data/generated/catalog.json';
const catalog = imported as Catalog;
const p = (id: number, speciesId = id, value = 50): Pokemon => ({ id, speciesId, name: `Pokemon ${id}`, slug: `pokemon-${id}`, form: '', kind: 'default', stats: [value,value,value,value,value,value], types: ['Normal'], image: `pokemon/${id}.webp`, silhouette: true });
const a = p(1); const b = p(2, 2, 60);
const state = (): BstState => ({ left: a, right: b, score: 3, phase: 'answer' });
const silhouette = (): SilhouetteState => ({ target: a, round: 1, total: 10, attempts: 0, guesses: [], score: 0, phase: 'answer' });
describe('BST rules', () => {
  it('compares all three outcomes including ties', () => { expect(compare(a,b)).toBe('lower'); expect(compare(b,a)).toBe('higher'); expect(compare(a,p(3))).toBe('equal'); });
  it('scores an equal answer without inventing a winner', () => { expect(answerBst({ ...state(), right: p(3) }, 'equal')).toMatchObject({ phase: 'reveal', correct: true, score: 4 }); });
  it('ends the streak on an incorrect answer without adding points', () => { expect(answerBst(state(), 'higher')).toMatchObject({ phase: 'over', correct: false, score: 3 }); });
  it('ignores a second submission after reveal or game over', () => { const win = answerBst(state(), 'lower'); const lose = answerBst(state(), 'higher'); expect(answerBst(win,'lower')).toBe(win); expect(answerBst(lose,'lower')).toBe(lose); });
  it('sums the six actual base statistics', () => { expect(bst({ stats: [35,55,40,50,50,90] })).toBe(320); });
});
describe('Silhouette rules', () => {
  it('awards three two and one points across the attempt boundaries', () => {
    expect(answerSilhouette(silhouette(),a,false)).toMatchObject({ score:3, phase:'reveal' });
    const second = answerSilhouette(silhouette(),b,false);
    expect(answerSilhouette(second,a,false)).toMatchObject({ score:2, attempts:2 });
    const third = answerSilhouette(second,p(3),false);
    expect(answerSilhouette(third,a,false)).toMatchObject({ score:1, attempts:3 });
  });
  it('reveals after three wrong guesses with zero new points', () => { let s = silhouette(); for (const id of [2,3,4]) s = answerSilhouette(s,p(id),false); expect(s).toMatchObject({ score:0, attempts:3, correct:false, phase:'reveal' }); });
  it('does not consume duplicate guesses or accept guesses after reveal', () => { const s = answerSilhouette(silhouette(),b,false); expect(answerSilhouette(s,b,false)).toBe(s); const win = answerSilhouette(s,a,false); expect(answerSilhouette(win,b,false)).toBe(win); });
  it('accepts species in classic mode and requires a variant in exact mode', () => { const variant = { ...p(10001,1), kind:'regional' as const }; expect(answerSilhouette(silhouette(),variant,false).correct).toBe(true); expect(answerSilhouette(silhouette(),variant,true)).toMatchObject({ correct:false, attempts:1, phase:'answer' }); });
  it('finishes on the last round for both success and failure', () => { const last = { ...silhouette(), round:10 }; expect(answerSilhouette(last,a,false).phase).toBe('over'); let s = last; for (const id of [2,3,4]) s = answerSilhouette(s,p(id),false); expect(s.phase).toBe('over'); });
});
describe('Pokemon catalog', () => {
  it('keeps modern statistics when filtering by introduction generation', () => { const entries = pool(catalog,{ generations:[1], metric:'bst', forms:false, battle:false }); expect(entries).toHaveLength(151); expect(entries.find(p => p.id === 25)?.stats).toEqual([35,55,40,50,50,90]); });
  it('separates regional forms and battle transformations', () => {
    const normal = pool(catalog,{ generations:[1], metric:'bst', forms:false, battle:false });
    const regional = pool(catalog,{ generations:[1], metric:'bst', forms:true, battle:false });
    const battle = pool(catalog,{ generations:[1], metric:'bst', forms:false, battle:true });
    expect(normal.every(p => p.kind === 'default')).toBe(true);
    expect(regional.some(p => p.speciesId === 26 && p.kind === 'regional')).toBe(true);
    expect(regional.every(p => p.kind !== 'battle')).toBe(true);
    expect(battle.some(p => p.slug === 'charizard-mega-x')).toBe(true);
    expect(battle.every(p => p.kind !== 'regional')).toBe(true);
  });
  it('excludes unreviewed alternative silhouettes even when forms are enabled', () => { const entries = pool(catalog,{ generations:[1,2,3,4,5,6,7,8,9], metric:'bst', forms:true, battle:true },true); expect(entries.length).toBeGreaterThan(1000); expect(entries.every(p => p.silhouette && p.kind === 'default')).toBe(true); });
  it('returns an empty pool for an unavailable generation', () => { expect(pool(catalog,{ generations:[99], metric:'bst', forms:false, battle:false })).toEqual([]); });
  it('normalizes accents punctuation gender and controlled aliases', () => {
    expect(normalizeName('CÓDIGO: Cero')).toBe('codigocero'); expect(normalizeName('Nidoran♀')).toBe('nidoranhembra');
    const entries = pool(catalog,{ generations:[1,2,3,4,5,6,7,8,9], metric:'bst', forms:false, battle:false });
    expect(searchPokemon(catalog,entries,'señor mime',false).map(p => p.speciesId)).toContain(122);
    expect(searchPokemon(catalog,entries,'nidoran f',false).map(p => p.speciesId)).toEqual([29]);
    expect(searchPokemon(catalog,entries,'',false)).toEqual([]);
    expect(searchPokemon(catalog,entries,'zzzzzz',false)).toEqual([]);
  });
  it('deduplicates species in search and retains variants in exact mode', () => { const entries = pool(catalog,{ generations:[1], metric:'bst', forms:true, battle:true }); expect(searchPokemon(catalog,entries,'charizard',false)).toHaveLength(1); expect(searchPokemon(catalog,entries,'charizard',true).length).toBeGreaterThan(1); });
  it('has unique identifiers valid species and six positive stats for every entry', () => { expect(new Set(catalog.pokemon.map(p => p.id)).size).toBe(catalog.pokemon.length); for (const entry of catalog.pokemon) { expect(catalog.species.some(s => s.id === entry.speciesId)).toBe(true); expect(entry.stats).toHaveLength(6); expect(entry.stats.every(v => Number.isInteger(v) && v > 0)).toBe(true); expect(entry.name).toBeTruthy(); } });
});
describe('Random selection', () => {
  it('reproduces seeded sequences', () => { const first = seededRandom(42); const second = seededRandom(42); expect(Array.from({length:20},first)).toEqual(Array.from({length:20},second)); });
  it('handles empty singleton and excluded pools', () => { expect(selectPokemon([],[])).toBeUndefined(); expect(selectPokemon([a],[],()=>0)).toBe(a); expect(selectPokemon([a],[1])).toBeUndefined(); expect(selectPokemon([a,b],[1],()=>0)).toBe(b); });
  it('selects a species before its variants', () => { const entries = [a,{...a,id:10001},{...a,id:10002},b]; const values = [.6,0]; expect(selectPokemon(entries,[],()=>values.shift()!)?.speciesId).toBe(2); });
});
describe('Local storage', () => {
  it('recovers from denied storage malformed JSON and invalid records', () => {
    const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readStored(denied,'record',0,isScore)).toBe(0); expect(writeStored(denied,'record',3)).toBe(false);
    expect(readStored({getItem:()=>'{broken',setItem:()=>{}},'record',0,isScore)).toBe(0);
    expect(readStored({getItem:()=>'-1',setItem:()=>{}},'record',0,isScore)).toBe(0);
    expect(writeStored(undefined,'record',3)).toBe(false);
  });
  it('round trips versioned records', () => { const values = new Map<string,string>(); const port = { getItem:(k:string)=>values.get(k) ?? null, setItem:(k:string,v:string)=>{values.set(k,v);} }; expect(writeStored(port,'bst:g1',12)).toBe(true); expect(values.has('pokejuegos:v1:bst:g1')).toBe(true); expect(readStored(port,'bst:g1',0,isScore)).toBe(12); expect(readStored(port,'bst:g2',0,isScore)).toBe(0); });
});
