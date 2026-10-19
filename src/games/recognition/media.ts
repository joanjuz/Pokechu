import type { Catalog, Settings, Pokemon } from '../../domain/pokemon/types';
import { pool } from '../../domain/pokemon/catalog';
export type RecognitionKind = 'eyes' | 'cries';
export interface MediaAsset { path: string; sha256: string }
export interface RecognitionMedia { version: string; catalogVersion: string; eyeVersion: string; cryRevision: string; eyes: Record<string, MediaAsset>; cries: Record<string, MediaAsset> }
export function recognitionPool(catalog: Catalog, settings: Settings, media: RecognitionMedia, kind: RecognitionKind): Pokemon[] {
  if (media.catalogVersion !== catalog.version) return [];
  return pool(catalog, { ...settings, forms: false, battle: false }).filter(p => p.kind === 'default' && !!media[kind][p.id]);
}
