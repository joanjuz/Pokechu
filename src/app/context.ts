import type { Catalog, Settings } from '../domain/pokemon/types';
import type { StoragePort } from '../shared/storage';
export interface GameResult { game: string; correct: boolean; points: number; speciesIds: number[]; streak?: number }
export interface GameContext {
  catalog: Catalog; settings: Settings; random: () => number; storage?: StoragePort;
  recordKey: (game: string) => string; alive: () => boolean;
  focusGame?: boolean;
  onResult?: (result: GameResult) => void;
  singleRound?: boolean;
  playerId?: string;
}
