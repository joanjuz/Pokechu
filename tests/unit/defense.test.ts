import {it,expect} from 'vitest';
import imported from '../../data/generated/defense.json';
import catalog from '../../data/generated/catalog.json';
import {defenseProfile,defenseGroups,createDefense,guessDefense,hintCount,type DefenseData} from '../../src/games/defense/rules';
import {INFINITE_GAMES} from '../../src/games/infinite/rules';
import {typeBadge} from '../../src/games/defense/type-icons';
import type {Pokemon} from '../../src/domain/pokemon/types';
const data=imported as DefenseData,entries=catalog.pokemon as Pokemon[],p=(id:number)=>entries.find(p=>p.id===id)!;
it('reproduce la referencia de Hydreigon con Levitación y cubre los dieciocho tipos sin repetir',()=>{
  const profile=defenseProfile(p(635),26,data);expect(profile.Hada).toBe(4);for(const type of ['Hielo','Lucha','Bicho','Dragón'])expect(profile[type]).toBe(2);expect(profile.Tierra).toBe(0);expect(profile.Psíquico).toBe(0);for(const type of ['Fuego','Agua','Eléctrico','Planta','Fantasma','Siniestro'])expect(profile[type]).toBe(.5);
  const groups=defenseGroups(profile),types=groups.flatMap(g=>g.types);expect(types).toHaveLength(18);expect(new Set(types).size).toBe(18);expect(groups.find(g=>g.multiplier===.25)?.types).toEqual([]);
});
it('combina tipos con cuádruple debilidad doble resistencia y Superguarda',()=>{
  const scizor=defenseProfile(p(212),68,data);expect(scizor.Fuego).toBe(4);expect(scizor.Planta).toBe(.25);expect(scizor.Veneno).toBe(0);
  const shedinja=defenseProfile(p(292),25,data);expect(Object.keys(shedinja).filter(t=>shedinja[t]>0).sort()).toEqual(['Fuego','Volador','Roca','Fantasma','Siniestro'].sort());expect(shedinja.Agua).toBe(0);
});
it('aplica absorciones y modificadores permanentes sin perder multiplicadores no estándar',()=>{
  expect(defenseProfile(p(59),18,data).Fuego).toBe(0);expect(defenseProfile(p(134),11,data).Agua).toBe(0);expect(defenseProfile(p(135),10,data).Eléctrico).toBe(0);expect(defenseProfile(p(241),157,data).Planta).toBe(0);
  expect(defenseProfile(p(437),85,data).Fuego).toBe(1);expect(defenseProfile(p(143),47,data).Hielo).toBe(.5);expect(defenseProfile(p(454),87,data).Fuego).toBe(1.25);
  const filter=defenseProfile(p(464),116,data);expect(filter.Agua).toBe(3);expect(filter.Lucha).toBe(1.5);expect(defenseGroups(filter).map(g=>g.multiplier)).toContain(1.5);
  expect(defenseProfile(p(752),199,data).Fuego).toBe(.5);expect(defenseProfile(p(760),218,data).Fuego).toBe(2);expect(defenseProfile(p(934),272,data).Fantasma).toBe(.5);expect(defenseProfile(p(927),273,data).Fuego).toBe(0);expect(defenseProfile(p(968),297,data).Tierra).toBe(0);
});
it('abre tres pistas exactamente tras cuatro ocho y doce fallos distintos sin vidas ni fin por fallar',()=>{
  let state=createDefense(p(635),26);const wrong=entries.filter(p=>p.kind==='default'&&p.speciesId!==635).slice(0,20);
  for(let i=0;i<wrong.length;i++){state=guessDefense(state,wrong[i]);expect(state.misses).toBe(i+1);expect(hintCount(state.misses)).toBe(Math.min(3,Math.floor((i+1)/4)));expect(state.phase).toBe('answer');expect(guessDefense(state,{...wrong[i],id:99999})).toBe(state);}
  const win=guessDefense(state,p(635));expect(win.phase).toBe('won');expect(win.misses).toBe(20);expect(guessDefense(win,p(1))).toBe(win);expect(hintCount(0)).toBe(0);
});
it('mantiene la misma habilidad y respuesta al fallar y reinicia sin pistas',()=>{
  const initial=createDefense(p(635),26),failed=guessDefense(initial,p(1));expect(failed.target).toBe(initial.target);expect(failed.ability).toBe(26);expect(createDefense(p(212),68)).toMatchObject({ability:68,misses:0,guesses:[],phase:'answer'});
});
it('tiene un icono local con nombre para cada tipo y se puede elegir en infinito',()=>{
  for(const type of data.types){expect(typeBadge(type)).toContain(`<span>${type}</span>`);expect(typeBadge(type)).toContain('<svg');}expect(INFINITE_GAMES).toContain('debilidades');
});
