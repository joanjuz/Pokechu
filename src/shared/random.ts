import type { Pokemon } from '../domain/pokemon/types';
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function selectPokemon(entries: Pokemon[], excludeSpecies: number[], random = Math.random): Pokemon | undefined {
  const groups = new Map<number, Pokemon[]>();
  for (const p of entries) if (!excludeSpecies.includes(p.speciesId)) groups.set(p.speciesId, [...(groups.get(p.speciesId) || []), p]);
  const species = [...groups.values()];
  if (!species.length) return undefined;
  const variants = species[Math.floor(random() * species.length)];
  return variants[Math.floor(random() * variants.length)];
}
