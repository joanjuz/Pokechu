import { metricValue, type Metric, type Pokemon } from '../../domain/pokemon/types';
export type Answer = 'higher' | 'lower' | 'equal';
export interface BstState { left: Pokemon; right: Pokemon; metric?: Metric; score: number; phase: 'answer' | 'reveal' | 'over'; correct?: boolean; answer?: Answer }
export function compare(left: Pokemon, right: Pokemon, metric: Metric = 'bst'): Answer { return metricValue(left, metric) > metricValue(right, metric) ? 'higher' : metricValue(left, metric) < metricValue(right, metric) ? 'lower' : 'equal'; }
export function answerBst(state: BstState, answer: Answer): BstState {
  if (state.phase !== 'answer') return state;
  const correct = compare(state.left, state.right, state.metric) === answer;
  return { ...state, answer, correct, score: state.score + (correct ? 1 : 0), phase: correct ? 'reveal' : 'over' };
}
