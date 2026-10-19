import type { GameContext } from '../../app/context';
import type { Pokemon } from '../../domain/pokemon/types';
import { pool } from '../../domain/pokemon/catalog';
import { generationKey } from '../../domain/pokemon/settings';
import { attachPokemonAutocomplete } from '../../shared/autocomplete';
import { answerIdentification, type IdentificationState } from '../../shared/identification';
import { selectPokemon } from '../../shared/random';
import { readStored, writeStored, isScore } from '../../shared/storage';
import { asset, escapeHtml, focusHeading, imagesReady, pokemonImage } from '../../shared/ui';
import imported from '../../../data/generated/recognition.json';
import { recognitionPool, type RecognitionKind, type RecognitionMedia } from './media';

const media = imported as RecognitionMedia;
const wave = '<span class="cry-wave" aria-hidden="true">' + [22, 48, 31, 72, 100, 53, 88, 42, 64, 28, 46].map(height => `<i style="--bar:${height}%"></i>`).join('') + '</span>';

export function mountRecognition(root: HTMLElement, ctx: GameContext, kind: RecognitionKind): () => void {
  const eyes = kind === 'eyes';
  const title = eyes ? '¿De quién son estos ojos?' : '¿Quién da este grito?';
  let entries = recognitionPool(ctx.catalog, ctx.settings, media, kind);
  const answers = pool(ctx.catalog, { ...ctx.settings, forms: false, battle: false });
  let history: number[] = [];
  let state: IdentificationState;
  let active = true, version = 0, interacted = false, mediaReady = false, heard = false;
  let audio: HTMLAudioElement | undefined;
  let playing = false;
  let selected: Pokemon | undefined;
  let cleanupAutocomplete = () => {};
  const key = `${ctx.playerId||'jugador-1'}:${kind}:${ctx.catalog.version}:${media.version}:${eyes ? media.eyeVersion : media.cryRevision}:g${generationKey(ctx.settings.generations)}`;
  let best = readStored(ctx.storage, key, 0, isScore), saved = true;
  const alive = () => active && ctx.alive();

  function stopAudio(): void {
    if (!audio) return;
    audio.onended = null; audio.onerror = null;
    audio.pause(); audio.removeAttribute('src'); audio.load(); audio = undefined;
    playing = false;
  }
  function playbackUI(message = ''): void {
    const button = root.querySelector<HTMLButtonElement>('.play-cry');
    if (button) { button.textContent = playing ? 'Detener grito' : heard ? 'Volver a escuchar' : 'Escuchar grito'; button.setAttribute('aria-pressed', String(playing)); }
    root.querySelector('.cry-stage')?.classList.toggle('playing', playing);
    const status = root.querySelector('.media-status'); if (status) status.textContent = message;
    const input = root.querySelector<HTMLInputElement>('#recognition-guess'); if (input) input.disabled = !mediaReady;
    const submit = root.querySelector<HTMLButtonElement>('.submit-guess'); if (submit) submit.disabled = !mediaReady;
  }
  function next(round = 1, score = 0): void {
    stopAudio();
    if (round === 1) history = [];
    const target = selectPokemon(entries, history, ctx.random);
    if (!target) {
      cleanupAutocomplete(); version++;
      root.innerHTML = `<div class="empty-state"><h1 tabindex="-1">No quedan ${eyes ? 'recortes de ojos' : 'gritos'} disponibles</h1><p>Prueba con otras generaciones en Ajustes.</p><a class="button primary" href="#/">Volver a los juegos</a></div>`;
      return;
    }
    history.push(target.speciesId); heard = false; mediaReady = false;
    const total = Math.min(10, round + entries.filter(p => !history.includes(p.speciesId)).length);
    state = { target, round, total, attempts: 0, guesses: [], score, phase: 'answer' };
    if (!eyes) { audio = new Audio(asset(media.cries[target.id].path)); audio.preload = 'auto'; }
    void render();
  }
  async function render(): Promise<void> {
    cleanupAutocomplete(); selected = undefined;
    const current = ++version, revealed = state.phase !== 'answer';
    const medium = revealed ? pokemonImage(state.target) : eyes
      ? `<img class="eye-clue" src="${asset(media.eyes[state.target.id].path)}" alt="Ojos del Pokémon que debes identificar" draggable="false">`
      : `<div class="cry-stage">${wave}<span>Grito misterioso</span></div>`;
    root.innerHTML = `<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">${title}</h1></div><div class="scoreboard"><span>Puntos<strong>${state.score}</strong></span><span>Récord<strong>${best}</strong></span></div></div>
      <div class="round-header"><span>Ronda ${state.round} de ${state.total}</span><span>${3 - state.attempts} intentos disponibles</span></div>
      <div class="recognition-layout"><div class="recognition-screen ${eyes ? 'eyes-screen' : 'cries-screen'}">${medium}${revealed ? `<span class="screen-caption">${escapeHtml(state.target.name)}</span>` : ''}</div>
      <div class="guess-panel">${revealed ? `<div class="result ${state.correct ? 'success' : 'failure'}" role="status"><strong>${state.correct ? '¡Acertaste!' : `Era ${escapeHtml(state.target.name)}`}</strong><span>${state.phase === 'over' ? `Partida terminada: ${state.score} de ${state.total * 3} puntos.` : state.correct ? `Sumas ${4 - state.attempts} puntos.` : 'Esta ronda no suma puntos.'}</span></div><button class="button primary next">${state.phase === 'over' ? 'Volver a jugar' : 'Siguiente ronda'}</button>` : `
      ${eyes ? '<h2>Mira sus ojos</h2><p>Solo se muestran los ojos recortados de la imagen original.</p>' : `<h2>Escucha y reconoce</h2><p>Puedes repetir el grito las veces que necesites.</p><button class="button primary play-cry" aria-pressed="false">${heard ? 'Volver a escuchar' : 'Escuchar grito'}</button>`}
      <form class="recognition-form"><label for="recognition-guess">Nombre del Pokémon</label><input id="recognition-guess" type="search" autocomplete="off" spellcheck="false" placeholder="Empieza a escribir un nombre" disabled><button class="button secondary submit-guess" disabled>Responder</button></form>
      <p class="guess-feedback" role="status">${state.attempts ? `No es ese Pokémon. Quedan ${3 - state.attempts} intentos.` : eyes ? '' : 'Escucha el grito antes de responder.'}</p>`}
      <p class="media-status" role="status"></p>${!revealed ? `<button class="text-button skip-media" hidden>Cambiar ${eyes ? 'ojos' : 'grito'} sin gastar intento</button>` : ''}
      ${!saved ? '<p class="notice">No se puede guardar el récord en este navegador.</p>' : ''}</div></div>
      <details class="rules"><summary>Cómo jugar</summary><p>Hasta diez Pokémon sin repetir por partida, tres intentos por ronda. Un acierto vale tres, dos o un punto según el intento. Repetir una respuesta no consume intentos.</p><p>${eyes ? 'Colección inicial: los 27 iniciales de las nueve generaciones, con recortes de ojos revisados. Solo entran los de las generaciones que hayas elegido.' : 'Gritos originales guardados en la página. El audio comienza al pulsar Escuchar; no hay límite de reproducciones.'} Se pide la especie en su forma habitual.</p><p>${entries.length} Pokémon disponibles con tus generaciones actuales. Los errores de carga no gastan intentos.</p></details>`;
    root.querySelector('.next')?.addEventListener('click', () => { interacted = true; state.phase === 'over' ? next() : next(state.round + 1, state.score); });
    if (revealed) { if (ctx.focusGame !== false || interacted) root.querySelector<HTMLButtonElement>('.next')?.focus({ preventScroll: true }); return; }
    const input = root.querySelector<HTMLInputElement>('#recognition-guess')!;
    cleanupAutocomplete = attachPokemonAutocomplete(input, ctx.catalog, answers, p => { selected = p; }, 'recognition-options');
    input.addEventListener('input', () => { selected = undefined; });
    root.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault(); if (!mediaReady) return;
      if (!selected) { root.querySelector('.guess-feedback')!.textContent = 'Elige un Pokémon de las sugerencias antes de responder.'; return; }
      const updated = answerIdentification(state, selected);
      if (updated === state) { root.querySelector('.guess-feedback')!.textContent = 'Ya probaste ese Pokémon. Elige otro nombre.'; return; }
      interacted = true; state = updated;
      if(ctx.singleRound && state.phase==='answer') state={...state,phase:'reveal'};
      if (state.phase !== 'answer') ctx.onResult?.({game:'ojos',correct:!!state.correct,points:Number(state.correct),speciesIds:state.correct?[state.target.speciesId]:[]});
      if (state.phase !== 'answer') stopAudio();
      if (state.score > best) { best = state.score; saved = writeStored(ctx.storage, key, best); }
      void render();
    });
    root.querySelector('.skip-media')!.addEventListener('click', () => {
      entries = entries.filter(p => p.id !== state.target.id); history = history.filter(id => id !== state.target.speciesId);
      interacted = true; next(state.round, state.score);
    });
    if (eyes) {
      const ready = await imagesReady(root);
      if (!alive() || current !== version) return;
      mediaReady = ready;
      root.querySelector('.media-status')!.textContent = ready ? '' : 'No se pudieron cargar los ojos.';
      root.querySelector<HTMLButtonElement>('.skip-media')!.hidden = ready;
      input.disabled = !ready; root.querySelector<HTMLButtonElement>('.submit-guess')!.disabled = !ready;
      if (ready && (ctx.focusGame !== false || interacted)) input.focus({ preventScroll: true });
    } else {
      mediaReady = heard;
      const fail = (message: string) => {
        if (!alive() || current !== version) return;
        playing = false; mediaReady = false;
        playbackUI(message); root.querySelector<HTMLButtonElement>('.skip-media')!.hidden = false;
      };
      if (audio) {
        audio.onended = () => { if (alive() && current === version) { playing = false; playbackUI(); } };
        audio.onerror = () => fail('No se pudo cargar el grito. Puedes volver a intentarlo o cambiarlo.');
      }
      root.querySelector('.play-cry')!.addEventListener('click', async () => {
        if (!audio) return;
        if (playing) { audio.pause(); playing = false; playbackUI(); return; }
        const currentAudio = audio;
        try {
          if (currentAudio.error) currentAudio.load();
          currentAudio.currentTime = 0;
          await currentAudio.play();
          if (!alive() || current !== version || audio !== currentAudio) { currentAudio.pause(); return; }
          heard = true; playing = !currentAudio.ended; mediaReady = true; playbackUI();
          root.querySelector<HTMLButtonElement>('.skip-media')!.hidden = true;
          root.querySelector('.guess-feedback')!.textContent = state.attempts ? `Quedan ${3 - state.attempts} intentos.` : 'Elige el Pokémon que acabas de escuchar.';
        } catch { fail('No se pudo reproducir el grito. Pulsa Escuchar para reintentar o cambia de grito.'); }
      });
      playbackUI();
    }
  }
  next(); if (ctx.focusGame !== false) focusHeading(root);
  return () => { active = false; version++; cleanupAutocomplete(); stopAudio(); };
}
