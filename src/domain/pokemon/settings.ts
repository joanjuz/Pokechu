import { ALL_GENERATIONS, DEFAULT_SETTINGS, METRICS, type Settings } from './types';
export const generationKey = (generations: number[]): string => [...new Set(generations)].sort((a,b) => a-b).join('-');
export function restoreSettings(value: unknown): Settings {
  const fallback = (): Settings => ({ ...DEFAULT_SETTINGS, generations: [...DEFAULT_SETTINGS.generations] });
  if (!value || typeof value !== 'object') return fallback();
  const s = value as Record<string, unknown>;
  if (typeof s.forms !== 'boolean' || typeof s.battle !== 'boolean') return fallback();
  if (Array.isArray(s.generations) && s.generations.every(g => typeof g === 'number' && ALL_GENERATIONS.includes(g)) && (s.metric === 'random' || METRICS.some(m => m.id === s.metric))) {
    return { generations: [...new Set(s.generations as number[])].sort((a,b) => a-b), metric: s.metric as Settings['metric'], forms: s.forms, battle: s.battle };
  }
  if (!('generations' in s) && Number.isInteger(s.generation) && Number(s.generation) >= 0 && Number(s.generation) <= 9) {
    return { generations: s.generation === 0 ? [...ALL_GENERATIONS] : [Number(s.generation)], metric: 'bst', forms: s.forms, battle: s.battle };
  }
  return fallback();
}
export function comparisonRecordKey(version: string, settings: Settings): string {
  return `comparison:${version}:g${generationKey(settings.generations)}:m${settings.metric}:f${Number(settings.forms)}:b${Number(settings.battle)}`;
}
