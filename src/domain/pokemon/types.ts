export type Stats = [number, number, number, number, number, number];
export type FormKind = 'default' | 'regional' | 'variant' | 'battle';
export interface Species { id: number; name: string; slug: string; generation: number; aliases: string[] }
export interface Pokemon {
  id: number; speciesId: number; slug: string; name: string; form: string;
  kind: FormKind; stats: Stats; types: string[]; image: string;
  silhouette: boolean;
}
export interface Catalog {
  version: string; ruleset: string; species: Species[]; pokemon: Pokemon[];
}
export const METRICS = [
  { id: 'bst', label: 'BST', description: 'Suma de estadísticas base', index: -1 },
  { id: 'hp', label: 'PS', description: 'Puntos de salud', index: 0 },
  { id: 'attack', label: 'Ataque', description: 'Ataque', index: 1 },
  { id: 'defense', label: 'Defensa', description: 'Defensa', index: 2 },
  { id: 'specialAttack', label: 'Ataque Especial', description: 'Ataque Especial', index: 3 },
  { id: 'specialDefense', label: 'Defensa Especial', description: 'Defensa Especial', index: 4 },
  { id: 'speed', label: 'Velocidad', description: 'Velocidad', index: 5 },
] as const;
export type Metric = typeof METRICS[number]['id'];
export type MetricMode = Metric | 'random';
export interface Settings { generations: number[]; metric: MetricMode; forms: boolean; battle: boolean }
export const ALL_GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const DEFAULT_SETTINGS: Settings = { generations: [...ALL_GENERATIONS], metric: 'random', forms: false, battle: false };
export const statLabels = ['PS', 'Ataque', 'Defensa', 'At. especial', 'Def. especial', 'Velocidad'];
export const bst = (pokemon: Pick<Pokemon, 'stats'>): number => pokemon.stats.reduce((a, b) => a + b, 0);
export const metricInfo = (metric: Metric) => METRICS.find(m => m.id === metric)!;
export function metricValue(pokemon: Pick<Pokemon, 'stats'>, metric: Metric): number {
  const index = metricInfo(metric).index;
  return index === -1 ? bst(pokemon) : pokemon.stats[index];
}
export function chooseMetric(mode: MetricMode, random = Math.random): Metric {
  return mode === 'random' ? METRICS[Math.floor(random() * METRICS.length)].id : mode;
}
