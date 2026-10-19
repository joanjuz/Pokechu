import type { Catalog } from '../domain/pokemon/types';
import { escapeHtml } from '../shared/ui';
import { achievements } from './rules';
import type { PlayerStore } from './store';
export function mountProgress(root: HTMLElement, catalog: Catalog, store: PlayerStore): () => void {
  function render() {
    const player = store.player(), progress = player.progress;
    const registered = new Set(progress.registered);
    root.innerHTML = `<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Progreso de ${escapeHtml(player.name)}</h1></div></div>
      <nav class="profile-sections" aria-label="Secciones del jugador"><a href="#/pokedex">Pokédex</a><a href="#/progreso" aria-current="page">Progreso y logros</a></nav><p class="game-instruction">Cada especie que aciertas se registra una sola vez. El progreso se guarda en este navegador y en este perfil.</p>
      <section class="progress-totals" aria-label="Progreso global"><div><strong>${progress.points}</strong><span>Puntos globales</span></div><div><strong>${registered.size} / ${catalog.species.length}</strong><span>Especies registradas</span></div><div><strong>${progress.bestStreak}</strong><span>Mejor racha infinita</span></div></section>
      <section class="player-management"><h2>Jugadores</h2><label for="player-select">Perfil activo</label><select id="player-select">${store.snapshot().players.map(p=>`<option value="${escapeHtml(p.id)}" ${p.id===player.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select><form class="new-player"><label for="player-name">Nombre del nuevo jugador</label><input id="player-name" maxlength="30" required placeholder="Nombre"><button class="button primary">Crear jugador</button></form><p class="player-feedback" role="status"></p></section>
      <section class="achievements"><h2>Logros</h2><ul>${achievements.map(a=>`<li class="${registered.size>=a.count?'unlocked':''}"><span aria-hidden="true">${registered.size>=a.count?'✓':'○'}</span><div><strong>${a.title}</strong><span>${Math.min(registered.size,a.count)} / ${a.count}</span></div></li>`).join('')}</ul></section>
${!store.saved()?'<p class="notice">No se puede guardar el progreso. Se conservará solo mientras esta página siga abierta.</p>':''}`;
    root.querySelector<HTMLSelectElement>('#player-select')!.addEventListener('change', e => store.select((e.target as HTMLSelectElement).value));
    root.querySelector('form')!.addEventListener('submit', e=>{e.preventDefault();const name=root.querySelector<HTMLInputElement>('#player-name')!.value;if(!store.create(name))root.querySelector('.player-feedback')!.textContent='Escribe un nombre. Se admiten hasta veinte jugadores.';});
  }
  const unsubscribe=store.subscribe(render);render();return unsubscribe;
}
