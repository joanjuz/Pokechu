import type { Catalog } from '../domain/pokemon/types';
import { normalizeName } from '../domain/pokemon/catalog';
import { escapeHtml, focusHeading, pokemonImage } from '../shared/ui';
import type { PlayerStore } from './store';

export function mountDex(root:HTMLElement,catalog:Catalog,store:PlayerStore):()=>void {
  let onlyRegistered=false,query='';
  const artwork=new Map(catalog.pokemon.filter(p=>p.kind==='default').map(p=>[p.speciesId,p]));
  function render(){
    const player=store.player(),registered=new Set(player.progress.registered),term=normalizeName(query);
    const entries=catalog.species.filter(s=>(!onlyRegistered||registered.has(s.id))&&(!term||normalizeName(s.name).includes(term)||String(s.id)===term));
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Pokédex de ${escapeHtml(player.name)}</h1></div><div class="scoreboard"><span>Registrados<strong>${registered.size}/${catalog.species.length}</strong></span></div></div><nav class="profile-sections" aria-label="Secciones del jugador"><a href="#/pokedex" aria-current="page">Pokédex</a><a href="#/progreso">Progreso y logros</a></nav><p class="game-instruction">Las siluetas se convierten en Pokémon a color cuando aciertas su especie. Cada jugador tiene su propia Pokédex.</p><section class="collection" aria-label="Colección de Pokémon"><div class="collection-filters"><label class="check-label"><input class="registered-only" type="checkbox" ${onlyRegistered?'checked':''}> Solo registrados</label><label for="dex-search">Buscar por nombre o número</label><input id="dex-search" type="search" value="${escapeHtml(query)}" autocomplete="off"></div><p class="collection-count" role="status">${entries.length} ${entries.length===1?'especie':'especies'}</p><div class="dex-grid">${entries.length?entries.map(s=>{
      const found=registered.has(s.id),p=artwork.get(s.id)!;
      const image=pokemonImage(p,!found).replace('<img ','<img loading="lazy" decoding="async" ');
      return `<article class="dex-entry ${found?'registered':'unregistered'}" data-species="${s.id}">${image}<strong>${found?escapeHtml(s.name):'Sin registrar'}</strong><span>N.º ${String(s.id).padStart(4,'0')}</span></article>`;
    }).join(''):'<p class="empty-collection">No hay especies que coincidan con estos filtros.</p>'}</div></section>${!store.saved()?'<p class="notice">No se puede guardar el progreso en este navegador.</p>':''}`;
    root.querySelector<HTMLInputElement>('.registered-only')!.addEventListener('change',event=>{onlyRegistered=(event.target as HTMLInputElement).checked;render();root.querySelector<HTMLInputElement>('.registered-only')!.focus({preventScroll:true});});
    root.querySelector<HTMLInputElement>('#dex-search')!.addEventListener('input',event=>{query=(event.target as HTMLInputElement).value;render();root.querySelector<HTMLInputElement>('#dex-search')!.focus({preventScroll:true});});
  }
  const unsubscribe=store.subscribe(render);render();focusHeading(root);return unsubscribe;
}
