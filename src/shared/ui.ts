import { metricInfo, metricValue, statLabels, type Metric, type Pokemon } from '../domain/pokemon/types';
export const escapeHtml = (value: string | number): string => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path}`;
export function pokemonImage(p: Pokemon, hidden = false, className = ''): string {
  return `<img class="pokemon-art ${hidden ? 'silhouette' : ''} ${className}" src="${asset(p.image)}" alt="${hidden ? 'Silueta del Pokémon' : escapeHtml(p.name)}" width="320" height="320" draggable="false">`;
}
export function statsMarkup(p: Pokemon): string {
  return `<dl class="stats">${p.stats.map((v, i) => `<div><dt>${statLabels[i]}</dt><dd>${v}</dd><span style="--stat:${Math.min(100, v / 2.55)}%"></span></div>`).join('')}</dl>`;
}
export function pokemonCard(p: Pokemon, reveal: boolean, reference: boolean, metric: Metric = 'bst'): string {
  return `<article class="pokemon-panel ${reference ? 'reference' : 'challenger'}"><div class="panel-label">${reference ? 'Referencia' : 'Tu elección'}</div><div class="art-stage">${pokemonImage(p)}</div><h2>${escapeHtml(p.name)}</h2><p class="form-label">${escapeHtml(p.form || 'Forma habitual')}</p><div class="bst-value"><span>${metricInfo(metric).label}</span><strong>${reveal ? metricValue(p, metric) : '?'}</strong></div>${reveal ? `<details><summary>Ver estadísticas</summary>${statsMarkup(p)}</details>` : '<p class="hidden-stat">Se revela al responder</p>'}</article>`;
}
export async function imagesReady(container: HTMLElement): Promise<boolean> {
  const images = [...container.querySelectorAll('img')];
  const loaded = await Promise.all(images.map(img => img.decode().then(() => true).catch(() => false)));
  return loaded.every(Boolean);
}
export function focusHeading(container: HTMLElement): void { container.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); }
