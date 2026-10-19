import type { GameContext } from '../../app/context';
import { pool } from '../../domain/pokemon/catalog';
import type { Pokemon } from '../../domain/pokemon/types';
import { selectPokemon } from '../../shared/random';
import { isScore, readStored, writeStored } from '../../shared/storage';
import { escapeHtml, focusHeading, imagesReady, pokemonImage } from '../../shared/ui';
import { answerSilhouette, type SilhouetteState } from './rules';
import { revealAngle } from './reveal';
import { generationKey } from '../../domain/pokemon/settings';
import { attachPokemonAutocomplete } from '../../shared/autocomplete';

export function mount(root: HTMLElement, ctx: GameContext): () => void {
  const settings = { ...ctx.settings, forms: false, battle: false };
  let entries = pool(ctx.catalog, settings, true);
  const totalRounds = Math.min(10, new Set(entries.map(p => p.speciesId)).size);
  let state: SilhouetteState;
  let active = true;
  let version = 0;
  let history: number[] = [];
  const key = `${ctx.playerId||'jugador-1'}:silueta:${ctx.catalog.version}:g${generationKey(settings.generations)}:progresivav2`;
  let best = readStored(ctx.storage, key, 0, isScore);
  let saved = true;
  let interacted = false;
  let cleanupAutocomplete = () => {};
  let startAngle = 0;
  function next(round = 1, score = 0): void {
    if (round === 1) history = [];
    const target = selectPokemon(entries, history, ctx.random);
    if (!target) { root.innerHTML = '<div class="empty-state"><h1 tabindex="-1">No quedan siluetas disponibles</h1><p>Elige otra generación para seguir jugando.</p><a class="button primary" href="#/">Elegir filtros</a></div>'; return; }
    history.push(target.speciesId);
    startAngle = Math.floor(ctx.random() * 360);
    state = { target, round, total: totalRounds, attempts: 0, score, phase: 'answer', guesses: [] };
    void render();
  }
  async function render(): Promise<void> {
    cleanupAutocomplete();
    const current = ++version;
    const revealed = state.phase !== 'answer';
    const visible = revealAngle(state.attempts, revealed);
    root.innerHTML = `<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">¿Quién es este Pokémon?</h1></div><div class="scoreboard"><span>Puntos<strong>${state.score}</strong></span><span>Récord<strong>${best}</strong></span></div></div>
      <div class="round-header"><span>Ronda ${state.round} de ${state.total}</span><span>${3 - state.attempts} ${state.attempts === 2 ? 'intento disponible' : 'intentos disponibles'}</span></div>
      <div class="round-track" aria-hidden="true">${Array.from({ length: state.total }, (_, i) => `<span class="${i + 1 <= state.round ? 'filled' : ''}"></span>`).join('')}</div>
      <div class="silhouette-layout"><div class="silhouette-screen"><div class="radar" aria-hidden="true"></div><div class="silhouette-window ${revealed ? 'resolved' : 'partial'}" style="--reveal-angle:${visible}deg;--reveal-start:${startAngle}deg" data-reveal="${visible}">${pokemonImage(state.target, !revealed)}</div><span class="screen-caption">${revealed ? escapeHtml(state.target.name) : `Sector visible: ${visible}°`}</span></div>
      <div class="guess-panel">${revealed ? `<div class="result ${state.correct ? 'success' : 'failure'}" role="status"><strong>${state.correct ? '¡Lo encontraste!' : 'Era ' + escapeHtml(state.target.name)}</strong><span>${state.phase === 'over' ? `Partida terminada: ${state.score} de ${state.total * 3} puntos.` : state.correct ? `Sumas ${4 - state.attempts} puntos en esta ronda.` : 'No se suman puntos en esta ronda.'}</span></div><button class="button primary next">${state.phase === 'over' ? 'Volver a jugar' : 'Siguiente ronda'}</button>` : `<h2>Escribe su nombre</h2><p>Elige un Pokémon de la lista para responder.</p><label for="guess">Nombre del Pokémon</label><div class="search-field"><span aria-hidden="true">⌕</span><input id="guess" type="search" placeholder="Ej.: Bulbasaur" autocomplete="off" spellcheck="false" aria-describedby="guess-help" disabled></div><p id="guess-help" class="field-help">Usa las flechas para recorrer las sugerencias y Enter para elegir.</p><ul id="suggestions" class="suggestions" aria-label="Sugerencias"></ul><p class="guess-feedback" role="status">${state.attempts ? `Respuesta incorrecta. ${state.attempts === 2 ? 'Queda un intento.' : 'Quedan dos intentos.'}` : ''}</p>`}
      <p class="image-status" role="status">${revealed ? '' : 'Preparando silueta…'}</p>${!saved ? '<p class="notice">No se puede guardar el récord en este navegador.</p>' : ''}</div></div>
      <details class="rules"><summary>Cómo jugar</summary><p>Empiezas viendo un sector de 120°, como una porción de un reloj. El ángulo aumenta a 210° después del primer fallo y a 300° después del segundo. La orientación inicial cambia en cada ronda. Al acertar o agotar los tres intentos se muestra la imagen completa.</p><p>Son hasta diez siluetas sin repetir. Acierta al primer intento para sumar tres puntos, al segundo para sumar dos o al tercero para sumar uno. Una respuesta repetida no consume otro intento ni descubre más imagen.</p><p>Se pide la especie y se utiliza una apariencia habitual por Pokémon. No hay límite de tiempo. Generaciones elegidas: ${settings.generations.join(', ')}.</p></details>`;
    root.querySelector('.next')?.addEventListener('click', () => { interacted = true; state.phase === 'over' ? next() : next(state.round + 1, state.score); });
    const input = root.querySelector<HTMLInputElement>('#guess');
    function submit(guess: Pokemon): void {
      interacted = true;
      const updated = answerSilhouette(state, guess, false);
      if (updated === state) { const message = root.querySelector('.guess-feedback'); if (message) message.textContent = 'Ya probaste ese Pokémon. Elige otro nombre.'; return; }
      state = updated;
      if(ctx.singleRound && state.phase==='answer') state={...state,phase:'reveal'};
      if (state.phase !== 'answer') ctx.onResult?.({game:'silueta',correct:!!state.correct,points:Number(state.correct),speciesIds:state.correct?[state.target.speciesId]:[]});
      if (state.score > best) { best = state.score; saved = writeStored(ctx.storage, key, best); }
      void render();
    }
    if(input) cleanupAutocomplete = attachPokemonAutocomplete(input, ctx.catalog, entries, submit, 'suggestions');
    const ready = await imagesReady(root);
    if (!active || !ctx.alive() || current !== version) return;
    const status = root.querySelector<HTMLElement>('.image-status')!;
    if (ready) { status.textContent = ''; if (input) { input.disabled = false; if (ctx.focusGame !== false || interacted) input.focus({ preventScroll: true }); } }
    else {
      status.innerHTML = 'No se pudo cargar la silueta. No consume intentos. <button class="text-button retry">Cargar otra silueta</button>';
      root.querySelector('.retry')?.addEventListener('click', () => { entries = entries.filter(p => p.id !== state.target.id); history = history.filter(id => id !== state.target.speciesId); next(state.round, state.score); });
    }
    if (revealed) root.querySelector<HTMLButtonElement>('.next')?.focus({ preventScroll: true });
  }
  next(); if (ctx.focusGame !== false) focusHeading(root);
  return () => { active = false; version++; cleanupAutocomplete(); };
}
