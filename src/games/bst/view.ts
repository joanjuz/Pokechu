import type { GameContext } from '../../app/context';
import { pool } from '../../domain/pokemon/catalog';
import { chooseMetric, metricInfo, metricValue } from '../../domain/pokemon/types';
import { selectPokemon } from '../../shared/random';
import { isScore, readStored, writeStored } from '../../shared/storage';
import { focusHeading, imagesReady, pokemonCard } from '../../shared/ui';
import { answerBst, compare, type Answer, type BstState } from './rules';

export function mount(root: HTMLElement, ctx: GameContext): () => void {
  let entries = pool(ctx.catalog, ctx.settings);
  let state: BstState;
  let version = 0;
  let active = true;
  let best = readStored(ctx.storage, ctx.recordKey('bst'), 0, isScore);
  let saved = true;
  let metric = chooseMetric(ctx.settings.metric, ctx.random);
  function start(score = 0): void {
    const left = selectPokemon(entries, [], ctx.random);
    const right = selectPokemon(entries, left ? [left.speciesId] : [], ctx.random);
    if (!left || !right) { root.innerHTML = '<div class="empty-state"><h1 tabindex="-1">Faltan Pokémon para comparar</h1><p>Prueba con otra generación o cambia los filtros.</p><a class="button primary" href="#/">Elegir filtros</a></div>'; return; }
    state = { left, right, metric, score, phase: 'answer' };
    void render();
  }
  async function render(): Promise<void> {
    const current = ++version;
    const revealed = state.phase !== 'answer';
    const label = metricInfo(metric).label;
    const result = compare(state.left, state.right, metric);
    const relation = result === 'higher' ? 'mayor' : result === 'lower' ? 'menor' : 'igual';
    root.innerHTML = `<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Mayor o menor</h1></div><div class="scoreboard"><span>Racha<strong>${state.score}</strong></span><span>Récord<strong>${best}</strong></span></div></div>
      <p class="game-instruction">Compara <strong data-metric="${metric}">${label}</strong>: ¿el valor de la izquierda es mayor, menor o igual que el de la derecha? <span class="game-config-note">Generaciones: ${ctx.settings.generations.join(', ')}.${ctx.settings.metric === 'random' ? ' Estadística aleatoria en cada ronda.' : ''}</span></p>
      <div class="duel">${pokemonCard(state.left, true, true, metric)}<span class="versus" aria-hidden="true">VS</span>${pokemonCard(state.right, revealed, false, metric)}</div>
      <div class="answer-zone">${revealed ? `<div class="result ${state.correct ? 'success' : 'failure'}" role="status"><strong>${state.correct ? '¡Correcto!' : 'Fin de la racha'}</strong><span>El valor izquierdo de ${label} es ${relation}: ${metricValue(state.left, metric)} frente a ${metricValue(state.right, metric)}.</span></div><button class="button primary next">${state.correct ? 'Siguiente Pokémon' : 'Volver a jugar'}</button>` : `<div class="answer-buttons" aria-label="Comparar ${label}"><button class="button answer" data-answer="lower" disabled><span aria-hidden="true">↓</span> Menor</button><button class="button answer" data-answer="equal" disabled><span aria-hidden="true">=</span> Igual</button><button class="button answer" data-answer="higher" disabled><span aria-hidden="true">↑</span> Mayor</button></div>`}
      <p class="image-status" role="status">${revealed ? '' : 'Preparando imágenes…'}</p></div>
      ${!saved ? '<p class="notice">El navegador no permite guardar el récord. Puedes seguir jugando.</p>' : ''}
      <details class="rules"><summary>Cómo jugar y elegir estadística</summary><p>Puedes comparar BST, PS, Ataque, Defensa, Ataque Especial, Defensa Especial o Velocidad. Elige la estadística en Ajustes. Aleatoria sortea una entre las siete opciones en cada ronda y la conserva hasta responder. BST suma las seis estadísticas base.</p><p>Responde «Igual» si los valores coinciden. Cada acierto suma uno; un fallo termina la racha. Los récords se separan por modo, generaciones y formas. Cambiar los filtros inicia una nueva partida.</p><p>Las generaciones filtran la especie, no las estadísticas históricas. Usamos ${ctx.catalog.ruleset.toLowerCase()}. Las formas se identifican por su nombre.</p></details>`;
    root.querySelector<HTMLButtonElement>('.next')?.addEventListener('click', () => {
      if (state.phase === 'over') { metric = chooseMetric(ctx.settings.metric, ctx.random); start(); return; }
      const next = selectPokemon(entries, [state.left.speciesId, state.right.speciesId], ctx.random)
        || selectPokemon(entries, [state.right.speciesId], ctx.random);
      if (!next) { start(state.score); return; }
      metric = chooseMetric(ctx.settings.metric, ctx.random);
      state = { left: state.right, right: next, metric, score: state.score, phase: 'answer' }; void render();
    });
    root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => button.addEventListener('click', () => {
      const before = state;
      state = answerBst(state, button.dataset.answer as Answer);
      if (before === state) return;
      ctx.onResult?.({ game: 'bst', correct: !!state.correct, points: Number(state.correct), speciesIds: state.correct ? [state.right.speciesId] : [] });
      if (state.score > best) { best = state.score; saved = writeStored(ctx.storage, ctx.recordKey('bst'), best); }
      void render();
    }));
    const ready = await imagesReady(root);
    if (!active || !ctx.alive() || current !== version) return;
    const status = root.querySelector<HTMLElement>('.image-status')!;
    if (ready) { status.textContent = ''; root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b => b.disabled = false); }
    else {
      status.innerHTML = 'No se pudo cargar una imagen. No perderás la racha. <button class="text-button retry">Cambiar comparación</button>';
      root.querySelector('.retry')?.addEventListener('click', () => {
        entries = entries.filter(p => p.id !== state.left.id && p.id !== state.right.id); start(state.score);
      });
    }
    if (revealed) root.querySelector<HTMLButtonElement>('.next')?.focus({ preventScroll: true });
  }
  start(); if (ctx.focusGame !== false) focusHeading(root);
  return () => { active = false; version++; };
}
