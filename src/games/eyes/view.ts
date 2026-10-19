import type { GameContext } from '../../app/context';
import { mountRecognition } from '../recognition/view';
export const mount = (root: HTMLElement, ctx: GameContext): (() => void) => mountRecognition(root, ctx, 'eyes');
