export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function readStored<T>(storage: StoragePort | undefined, key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try { const raw = storage?.getItem(`pokejuegos:v1:${key}`); if (!raw) return fallback; const value: unknown = JSON.parse(raw); return validate(value) ? value : fallback; } catch { return fallback; }
}
export function writeStored(storage: StoragePort | undefined, key: string, value: unknown): boolean {
  try { if (!storage) return false; storage.setItem(`pokejuegos:v1:${key}`, JSON.stringify(value)); return true; } catch { return false; }
}
export const isScore = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
