import type { GameResult } from '../app/context';
export interface Progress { points: number; registered: number[]; games: string[]; bestStreak: number }
export interface ProgressEvent { id: string; game: string; points: number; speciesIds: number[]; streak: number }
export const emptyProgress = (): Progress => ({ points: 0, registered: [], games: [], bestStreak: 0 });
export function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false;
  const p = value as Progress;
  return Number.isSafeInteger(p.points) && p.points >= 0 && Array.isArray(p.registered) && p.registered.every(id => Number.isInteger(id) && id > 0 && id <= 1025) && new Set(p.registered).size === p.registered.length && Array.isArray(p.games) && p.games.every(g => typeof g === 'string') && Number.isSafeInteger(p.bestStreak) && p.bestStreak >= 0;
}
export function progressEvent(result: GameResult, id: string): ProgressEvent | null {
  if (!result.correct || !Number.isInteger(result.points) || result.points < 0 || result.points > 10 || (result.points===0&&result.game!=='tabla')) return null;
  return { id, game: result.game, points: result.points, speciesIds: [...new Set(result.speciesIds.filter(n => Number.isInteger(n) && n > 0 && n <= 1025))], streak: Math.max(0, Math.floor(result.streak || 0)) };
}
export function applyProgress(progress: Progress, event: ProgressEvent): Progress {
  return { points: progress.points + event.points, registered: [...new Set([...progress.registered, ...event.speciesIds])].sort((a,b) => a-b), games: [...new Set([...progress.games, event.game])], bestStreak: Math.max(progress.bestStreak, event.streak) };
}
export const achievements = [1,10,25,50,100,250,500,1025].map(count => ({ id: `dex-${count}`, count, title: count === 1025 ? 'Pokédex completa' : count === 1 ? 'Primer registro' : `${count} especies registradas` }));
