import type { Catalog, Pokemon, Settings } from './types';
export function pool(catalog: Catalog, settings: Settings, silhouette = false): Pokemon[] {
  const ids = new Set(catalog.species.filter(s => settings.generations.includes(s.generation)).map(s => s.id));
  return catalog.pokemon.filter(p => ids.has(p.speciesId)
    && (p.kind === 'default' || (p.kind === 'battle' ? settings.battle : settings.forms))
    && (!silhouette || p.silhouette));
}
export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/♀/g, ' hembra ').replace(/♂/g, ' macho ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').trim();
}
export function searchPokemon(catalog: Catalog, entries: Pokemon[], query: string, exactForms: boolean): Pokemon[] {
  const term = normalizeName(query);
  if (!term) return [];
  const seen = new Set<number>();
  return entries.filter(p => {
    const species = catalog.species.find(s => s.id === p.speciesId)!;
    if (!exactForms && seen.has(p.speciesId)) return false;
    const names = [p.name, species.name, species.slug, ...species.aliases];
    const matches = names.some(n => normalizeName(n).includes(term));
    if (matches) seen.add(p.speciesId);
    return matches;
  }).sort((a,b)=>{
    const rank=(p:Pokemon)=>normalizeName(p.name)===term?0:normalizeName(p.name).startsWith(term)?1:2;
    return rank(a)-rank(b);
  }).slice(0, 8);
}
