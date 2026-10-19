import type { Pokemon } from '../domain/pokemon/types';
export interface IdentificationState { target: Pokemon; round: number; total: number; attempts: number; guesses: number[]; score: number; phase: 'answer' | 'reveal' | 'over'; correct?: boolean }
export function answerIdentification(state: IdentificationState, guess: Pokemon, exactForms = false): IdentificationState {
  const guessKey = exactForms ? guess.id : guess.speciesId;
  if (state.phase !== 'answer' || state.guesses.includes(guessKey)) return state;
  const correct = exactForms ? guess.id === state.target.id : guess.speciesId === state.target.speciesId;
  const attempts = state.attempts + 1;
  const resolved = correct || attempts === 3;
  return { ...state, attempts, guesses: [...state.guesses, guessKey], correct, score: state.score + (correct ? 4 - attempts : 0), phase: resolved ? (state.round === state.total ? 'over' : 'reveal') : 'answer' };
}
