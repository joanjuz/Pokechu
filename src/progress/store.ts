import { readStored, writeStored, type StoragePort } from '../shared/storage';
import { applyProgress, emptyProgress, isProgress, progressEvent, type Progress } from './rules';
import type { GameResult } from '../app/context';
export interface Player { id: string; name: string; progress: Progress }
export interface Players { active: string; players: Player[] }
const initial = (): Players => ({ active: 'jugador-1', players: [{ id: 'jugador-1', name: 'Jugador 1', progress: emptyProgress() }] });
export function isPlayers(value: unknown): value is Players {
  if (!value || typeof value !== 'object') return false;
  const state = value as Players;
  return typeof state.active === 'string' && Array.isArray(state.players) && state.players.length > 0 && state.players.length <= 20 && new Set(state.players.map(p => p.id)).size === state.players.length && state.players.every(p => typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 30 && isProgress(p.progress)) && state.players.some(p => p.id === state.active);
}
export function createPlayerStore(storage?: StoragePort) {
  let state = readStored(storage, 'players:v1', initial(), isPlayers);
  const listeners = new Set<() => void>();
  const player = () => state.players.find(p => p.id === state.active)!;
  let saved = true;
  function persist() { saved = writeStored(storage, 'players:v1', state); listeners.forEach(fn => fn()); }
  return {
    snapshot: () => state, player, saved: () => saved,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    select(id: string) { if (!state.players.some(p => p.id === id)) return; state = { ...state, active: id }; persist(); },
    create(name: string) {
      const cleaned = name.trim().slice(0,30); if (!cleaned || state.players.length >= 20) return false;
      const next = { id: crypto.randomUUID(), name: cleaned, progress: emptyProgress() };
      state = { active: next.id, players: [...state.players, next] }; persist(); return true;
    },
    award(result: GameResult) {
      const event = progressEvent(result, crypto.randomUUID()); if (!event) return;
      const current = player();
      state = { ...state, players: state.players.map(p => p.id === current.id ? { ...p, progress: applyProgress(p.progress, event) } : p) }; persist();
    },
  };
}
export type PlayerStore = ReturnType<typeof createPlayerStore>;
