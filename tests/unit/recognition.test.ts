import { describe, expect, it } from 'vitest';
import imported from '../../data/generated/catalog.json';
import resources from '../../data/generated/recognition.json';
import { recognitionPool } from '../../src/games/recognition/media';
import { answerIdentification, type IdentificationState } from '../../src/shared/identification';
import type { Catalog, Settings } from '../../src/domain/pokemon/types';
const catalog = imported as Catalog;
const settings: Settings = { generations: [1,2,3,4,5,6,7,8,9], forms: true, battle: true, metric: 'random' };
const target = catalog.pokemon.find(p => p.id === 1)!;
const wrong = catalog.pokemon.find(p => p.id === 4)!;
const state = (): IdentificationState => ({ target, attempts: 0, guesses: [], score: 0, round: 1, total: 10, phase: 'answer' });

describe('recognition resources and rounds', () => {
  it('limits eyes to three reviewed starters per generation and excludes alternate forms', () => {
    expect(recognitionPool(catalog, settings, resources, 'eyes')).toHaveLength(27);
    for (let generation = 1; generation <= 9; generation++) {
      const entries = recognitionPool(catalog, { ...settings, generations: [generation] }, resources, 'eyes');
      expect(entries).toHaveLength(3);
      expect(entries.every(p => p.kind === 'default' && catalog.species.find(s => s.id === p.speciesId)!.generation === generation)).toBe(true);
    }
  });
  it('offers all 1025 default cries and only the selected generations', () => {
    expect(recognitionPool(catalog, settings, resources, 'cries')).toHaveLength(1025);
    const paldea = recognitionPool(catalog, { ...settings, generations: [9] }, resources, 'cries');
    expect(paldea).toHaveLength(catalog.species.filter(s => s.generation === 9).length);
    expect(paldea.every(p => p.kind === 'default' && catalog.species.find(s => s.id === p.speciesId)!.generation === 9)).toBe(true);
  });
  it('rejects mismatched revisions missing resources and empty generation selections', () => {
    expect(recognitionPool(catalog, settings, { ...resources, catalogVersion: 'obsolete' }, 'eyes')).toEqual([]);
    expect(recognitionPool(catalog, settings, { ...resources, eyes: {} }, 'eyes')).toEqual([]);
    expect(recognitionPool(catalog, { ...settings, generations: [] }, resources, 'cries')).toEqual([]);
  });
  it('scores first second and third attempt wins with three two and one points', () => {
    expect(answerIdentification(state(), target)).toMatchObject({ score: 3, phase: 'reveal', attempts: 1 });
    const first = answerIdentification(state(), wrong);
    expect(first).toMatchObject({ score: 0, attempts: 1, phase: 'answer' });
    expect(answerIdentification(first, target)).toMatchObject({ score: 2, attempts: 2, correct: true });
    const second = answerIdentification(first, catalog.pokemon.find(p => p.id === 7)!);
    expect(answerIdentification({ ...second, round: 10 }, target)).toMatchObject({ score: 1, attempts: 3, phase: 'over', correct: true });
  });
  it('ignores duplicate species and locks resolved rounds without spending extra attempts', () => {
    const first = answerIdentification(state(), wrong);
    expect(answerIdentification(first, { ...wrong, id: 99999 })).toBe(first);
    const resolved = answerIdentification(first, target);
    expect(answerIdentification(resolved, wrong)).toBe(resolved);
    const second = answerIdentification(first, catalog.pokemon.find(p => p.id === 7)!);
    const lost = answerIdentification({ ...second, round: 10 }, catalog.pokemon.find(p => p.id === 25)!);
    expect(lost).toMatchObject({ phase: 'over', attempts: 3, score: 0, correct: false });
  });
});
