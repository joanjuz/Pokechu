import {describe,it,expect} from 'vitest';
import imported from '../../data/generated/catalog.json';
import abilities from '../../data/generated/grid.json';
import type {Catalog,Pokemon} from '../../src/domain/pokemon/types';
import {pool} from '../../src/domain/pokemon/catalog';
import {seededRandom} from '../../src/shared/random';
import {createGrid,gridCandidates,solveGrid,placeGridPokemon,matchesCriterion,criterionLabel,type GridBoard,type GridData} from '../../src/games/grid/rules';
import {createDraft,chooseStat,draftTotal,perfectDraft} from '../../src/games/stat-builder/rules';
import {INFINITE_GAMES,selectedGames} from '../../src/games/infinite/rules';
import {emptyProgress,applyProgress,progressEvent} from '../../src/progress/rules';
const catalog=imported as Catalog,data=abilities as GridData;
const entries=catalog.pokemon.filter(p=>p.kind==='default');
describe('tabla de cruces',()=>{
  it('acepta Chandelure en fuego fantasma y comprueba habilidades ocultas y generación real',()=>{
    const p=entries.find(p=>p.id===609)!;
    expect(matchesCriterion(p,{kind:'type',value:'Fuego'},catalog,data)).toBe(true);expect(matchesCriterion(p,{kind:'type',value:'Fantasma'},catalog,data)).toBe(true);expect(matchesCriterion(p,{kind:'generation',value:5},catalog,data)).toBe(true);expect(matchesCriterion(p,{kind:'generation',value:1},catalog,data)).toBe(false);
    const hidden=data.pokemonAbilities[p.id].find(a=>a.hidden)!;expect(hidden.id).toBe(151);expect(matchesCriterion(p,{kind:'ability',value:151},catalog,data)).toBe(true);expect(criterionLabel({kind:'ability',value:151},data)).toBe('Allanamiento');
  });
  it('genera tablas con nueve especies distintas y presencia de tipos habilidades y generaciones',()=>{
    for(let seed=1;seed<=8;seed++){const board=createGrid(entries,catalog,data,seededRandom(seed));expect(board).not.toBeNull();const solution=solveGrid(board!,entries,catalog,data)!;expect(solution).toHaveLength(9);expect(new Set(solution.map(p=>p.speciesId)).size).toBe(9);expect(new Set([...board!.rows,...board!.columns].map(c=>c.kind))).toEqual(new Set(['type','ability','generation']));for(let i=0;i<9;i++)expect(gridCandidates(board!,i,[solution[i]],catalog,data)).toHaveLength(1);}
  });
  it('rechaza tablas aparentemente válidas sin una asignación global de nueve especies',()=>{
    const board:GridBoard={rows:Array(3).fill({kind:'type',value:'Fuego'}),columns:Array(3).fill({kind:'type',value:'Fantasma'}),slots:Array(9).fill(null)};const p=entries.find(p=>p.id===609)!;const scarce=Array.from({length:8},(_,i)=>({...p,id:2000+i,speciesId:2000+i}));expect(gridCandidates(board,0,scarce,catalog,data)).toHaveLength(8);expect(solveGrid(board,scarce,catalog,data)).toBeNull();
  });
  it('bloquea especies repetidas aunque cambie la forma y permite reemplazar la misma casilla',()=>{
    const board=createGrid(entries,catalog,data,seededRandom(3))!,solution=solveGrid(board,entries,catalog,data)!;const placed=placeGridPokemon(board,0,solution[0],entries,catalog,data);expect(placed.ok).toBe(true);if(!placed.ok)throw Error('No se colocó');
    const alternate={...solution[0],id:99999};expect(placeGridPokemon(placed.board,1,alternate,[...entries,alternate],catalog,data)).toMatchObject({ok:false,reason:'duplicate'});expect(placeGridPokemon(placed.board,0,solution[0],entries,catalog,data).ok).toBe(true);expect(placeGridPokemon(board,-1,solution[0],entries,catalog,data)).toMatchObject({ok:false,reason:'invalid'});
    const wrong=entries.find(p=>!gridCandidates(board,0,[p],catalog,data).length)!;expect(placeGridPokemon(board,0,wrong,entries,catalog,data)).toMatchObject({ok:false,reason:'mismatch'});
  });
  it('no genera tablas con revisiones incompatibles ni catálogos insuficientes',()=>{
    expect(createGrid(entries.slice(0,8),catalog,data,()=>0)).toBeNull();expect(createGrid(entries,catalog,{...data,catalogVersion:'old'},()=>0)).toBeNull();const kanto=pool(catalog,{generations:[1],metric:'bst',forms:false,battle:false});const board=createGrid(kanto,catalog,data,seededRandom(42));expect(board).not.toBeNull();expect(solveGrid(board!,kanto,catalog,data)!.every(p=>p.speciesId<=151)).toBe(true);
  });
  it('los reemplazos de una casilla pueden registrar especies sin dar otro punto',()=>{
    const initial=applyProgress(emptyProgress(),progressEvent({game:'tabla',correct:true,points:1,speciesIds:[1]},'a')!);const next=applyProgress(initial,progressEvent({game:'tabla',correct:true,points:0,speciesIds:[4]},'b')!);expect(next.points).toBe(1);expect(next.registered).toEqual([1,4]);
  });
});
describe('constructor de estadísticas',()=>{
  it('elige seis estadísticas distintas en orden e ignora selecciones repetidas o posteriores al final',()=>{
    const deck=entries.slice(0,6);let state=createDraft(deck);state=chooseStat(state,2);expect(state.cursor).toBe(1);expect(draftTotal(state)).toBe(deck[0].stats[2]);expect(chooseStat(state,2)).toBe(state);expect(chooseStat(state,6)).toBe(state);expect(chooseStat(state,.5)).toBe(state);for(const stat of [0,1,3,4,5])state=chooseStat(state,stat);expect(state.cursor).toBe(6);expect(state.choices).toEqual([2,0,1,3,4,5]);expect(draftTotal(state)).toBe(deck.reduce((sum,p,i)=>sum+p.stats[state.choices[i]!],0));expect(chooseStat(state,0)).toBe(state);expect(()=>createDraft(deck.slice(0,5))).toThrow();expect(()=>createDraft(Array(6).fill(deck[0]))).toThrow();
  });
  it('calcula el óptimo como asignación uno a uno y no como elecciones codiciosas',()=>{
    const rows=[[100,99,1,1,1,1],[99,1,1,1,1,1],[1,1,80,1,1,1],[1,1,1,70,1,1],[1,1,1,1,60,1],[1,1,1,1,1,50]];
    const deck=entries.slice(0,6).map((p,i)=>({...p,stats:rows[i] as Pokemon['stats']}));expect(perfectDraft(deck)).toEqual({total:458,choices:[1,0,2,3,4,5]});
  });
  it('admite empates y conserva seis posiciones y seis Pokémon en la combinación perfecta',()=>{
    const deck=entries.slice(0,6).map(p=>({...p,stats:[10,10,10,10,10,10] as Pokemon['stats']}));const result=perfectDraft(deck);expect(result.total).toBe(60);expect(new Set(result.choices).size).toBe(6);expect(()=>perfectDraft(deck.slice(0,5))).toThrow();
  });
  it('el constructor queda fuera de infinito y la tabla sí puede elegirse',()=>{
    expect([...INFINITE_GAMES]).toContain('tabla');expect([...INFINITE_GAMES]).not.toContain('estadisticas');expect(selectedGames(['estadisticas','pasapalabra','tabla'])).toEqual(['tabla']);
  });
});
