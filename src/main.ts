import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/global.css';
import catalogData from '../data/generated/catalog.json';
import {metricInfo,metricValue,type Catalog,type Settings} from './domain/pokemon/types';
import {comparisonRecordKey,restoreSettings} from './domain/pokemon/settings';
import {games} from './games/registry';
import {seededRandom} from './shared/random';
import {readStored,writeStored,type StoragePort} from './shared/storage';
import {asset,escapeHtml,pokemonImage} from './shared/ui';
import {mountSidebar} from './app/sidebar';
import {createPlayerStore} from './progress/store';
import {mountProgress} from './progress/view';
import {mountDex} from './progress/dex';

const catalog=catalogData as Catalog;
let storage:StoragePort|undefined;try{storage=window.localStorage;}catch{}
const players=createPlayerStore(storage);
let settings=restoreSettings(readStored<unknown>(storage,'settings',undefined,(_v):_v is unknown=>true));
let dispose=()=>{};let routeVersion=0;
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header class="site-header"><a class="brand" href="#/" aria-label="Pokechu, inicio"><span class="brand-ball" aria-hidden="true"></span><span class="brand-wordmark"><span>Pokechu</span><small>Progressive minigames</small></span></a><nav aria-label="Navegación principal"><a href="#/" class="nav-games">Minijuegos</a><a href="#/pokedex" class="nav-dex">Pokédex</a><a href="#/progreso" class="nav-achievements">Logros</a><button class="filters-toggle" aria-expanded="false" aria-controls="game-settings">Ajustes</button><a class="player-summary" href="#/progreso" aria-label="Mi progreso"></a><button class="help-button" aria-haspopup="dialog">Ayuda</button><a class="hub-link" href="https://joanjuz.github.io/DefinitivePkm/">PokeJuz ↗</a></nav></header>
  <button class="drawer-backdrop" aria-label="Cerrar menú de ajustes" hidden></button><div class="app-layout"><aside id="game-settings" class="game-sidebar" aria-label="Ajustes de partida"></aside><div class="game-area"><p class="config-update" role="status" aria-live="polite"></p><main id="main" tabindex="-1"></main></div></div>
  <footer class="site-footer"><span>Pokechu · Minijuegos Pokémon en español.</span><div><button class="help-button footer-help">Ayuda</button><button class="credits-button">Datos y créditos</button><span>Proyecto de fans · Sin afiliación oficial</span></div></footer>
  <dialog class="info-dialog"><button class="dialog-close" aria-label="Cerrar">×</button><div class="dialog-content"></div></dialog>`;
const main=app.querySelector<HTMLElement>('main')!;
const sidebar=app.querySelector<HTMLElement>('.game-sidebar')!;
const toggle=app.querySelector<HTMLButtonElement>('.filters-toggle')!;
const backdrop=app.querySelector<HTMLButtonElement>('.drawer-backdrop')!;
const mobile=matchMedia('(max-width:1100px)');
let drawerOpen=false;
function setDrawer(open:boolean,restoreFocus=false):void{
  drawerOpen=mobile.matches&&open;sidebar.classList.toggle('drawer-open',drawerOpen);
  sidebar.inert=mobile.matches&&!drawerOpen;toggle.setAttribute('aria-expanded',String(drawerOpen));
  backdrop.hidden=!drawerOpen;document.body.style.overflow=drawerOpen?'hidden':'';
  if(drawerOpen){sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');sidebar.querySelector<HTMLButtonElement>('.drawer-close')?.focus();}
  else{sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');if(restoreFocus)toggle.focus();}
}
toggle.addEventListener('click',()=>setDrawer(!drawerOpen));
backdrop.addEventListener('click',()=>setDrawer(false,true));
mobile.addEventListener('change',()=>setDrawer(false));
sidebar.addEventListener('keydown',event=>{
  if(!drawerOpen)return;
  if(event.key==='Escape'){event.preventDefault();setDrawer(false,true);return;}
  if(event.key==='Tab'){const controls=[...sidebar.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,a[href]')].filter(el=>el.getClientRects().length>0);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
mountSidebar(sidebar,catalog,settings,next=>{
  const generationsChanged=next.generations.join(',')!==settings.generations.join(',');const formsChanged=next.forms!==settings.forms||next.battle!==settings.battle;
  settings=next;const saved=writeStored(storage,'settings',settings);
  const id=location.hash.replace(/^#\/?/,'');
  const affected=!id||generationsChanged||id==='bst'||id==='piramide'||id==='infinito'||(id==='estadisticas'&&formsChanged);
  if(affected){void route(false);app.querySelector('.config-update')!.textContent=settings.generations.length?(id?'Filtros actualizados. Nueva partida con la configuración elegida.':'Filtros actualizados.'):'Selecciona una generación para continuar.';}
  return saved;
});
sidebar.querySelector('.drawer-close')!.addEventListener('click',()=>setDrawer(false,true));
setDrawer(false);
document.querySelector('.skip')!.addEventListener('click',event=>{event.preventDefault();setDrawer(false);main.focus();});
const dialog=app.querySelector<HTMLDialogElement>('dialog')!;
function showInfo(credits:boolean):void{
  app.querySelector('.dialog-content')!.innerHTML=credits?`<h2>Datos y créditos</h2><p>Estadísticas, nombres, tipos y evoluciones: <a href="https://pokeapi.co/">PokéAPI</a>. Ilustraciones: <a href="https://github.com/PokeAPI/sprites">PokeAPI/sprites</a>.</p><p>Catálogo ${escapeHtml(catalog.version)}: ${catalog.species.length} especies y ${catalog.pokemon.length} variantes. Las preguntas se generan con datos de esta misma revisión. Los ojos son recortes de las ilustraciones originales. Gritos: <a href="https://github.com/PokeAPI/cries">PokeAPI/cries</a>, guardados localmente.</p><p>Pokémon y sus personajes pertenecen a sus titulares. Proyecto de fans sin afiliación oficial. Tus perfiles, récords, puntos y Pokédex se guardan solo en este navegador.</p>`:'<h2>Cómo jugar</h2><p><strong>Mayor o menor:</strong> compara la estadística elegida. Aleatoria sortea una en cada ronda.</p><p><strong>Siluetas:</strong> un sector como un reloj que amplía su ángulo tras cada fallo.</p><p><strong>Pirámide:</strong> coloca diez Pokémon de mayor a menor por filas. El resultado se revela al completar el tablero.</p><p><strong>Pasapalabra:</strong> completa el rosco en 190 segundos. Pasa para volver a una letra pendiente.</p><p><strong>Ojos:</strong> reconoce los ojos de los 27 iniciales de las nueve generaciones.</p><p><strong>Gritos:</strong> escucha y elige uno de los tres Pokémon. Una elección por grito.</p><p><strong>Tabla de cruces:</strong> completa nueve casillas combinando tipos, habilidades o generaciones, sin repetir especies.</p><p><strong>Construye tu BST:</strong> elige una estadística distinta de cada Pokémon y compara tu suma con la mejor asignación de esos mismos seis.</p><p>Los filtros están en Ajustes. Cambiar generaciones inicia una nueva partida al instante, conservando los récords.</p>';
  dialog.showModal();
}
app.querySelectorAll('.help-button').forEach(button=>button.addEventListener('click',()=>showInfo(false)));
app.querySelector('.credits-button')!.addEventListener('click',()=>showInfo(true));
app.querySelector('.dialog-close')!.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();const m=e as MouseEvent;if(m.clientX<r.left||m.clientX>r.right||m.clientY<r.top||m.clientY>r.bottom)dialog.close();}});

function home():void{
  const illustration=(id:number,hidden=false)=>pokemonImage(catalog.pokemon.find(p=>p.id===id)!,hidden);
  const metric=settings.metric==='random'?'bst':settings.metric;
  const cryPreview=`<div class="tile-art cries-preview" aria-hidden="true"><span class="cry-wave">${[22,48,31,72,100,53,88,42,64,28,46].map(height=>`<i style="--bar:${height}%"></i>`).join('')}</span></div>`;
  const previews=[
    `<div class="tile-art duel-preview">${illustration(6)}${illustration(9)}<span aria-hidden="true">VS</span><div class="preview-number first">${settings.metric==='random'?'Aleatoria':metricInfo(metric).label}<b>${settings.metric==='random'?'?':metricValue(catalog.pokemon.find(p=>p.id===6)!,metric)}</b></div><div class="preview-number second"><b>?</b></div></div>`,
    `<div class="tile-art silhouette-preview"><div class="preview-rings" aria-hidden="true"></div><div class="preview-silhouette-window">${illustration(94,true)}</div><span class="mystery-mark" aria-hidden="true">?</span></div>`,
    `<div class="tile-art pyramid-preview" aria-hidden="true"><div class="mini-pyramid"><span>▲</span><div><b>?</b><b>?</b></div><div><b>?</b><b>?</b><b>?</b></div></div>${illustration(248)}</div>`,
    `<div class="tile-art rosco-preview" aria-hidden="true"><div class="mini-rosco">${'ABCDEFGHIJKL'.split('').map((letter,i)=>`<span style="--angle:${i*30}deg">${letter}</span>`).join('')}<strong>A…Z</strong></div></div>`
  ];
  previews.push(`<div class="tile-art eyes-preview" aria-hidden="true"><img src="${asset('eyes/1.webp')}" alt="" draggable="false"></div>`,cryPreview,`<div class="tile-art infinite-preview" aria-hidden="true"><span>∞</span><div>↕　◉　♫　△</div></div>`);
  previews.push(`<div class="tile-art grid-preview" aria-hidden="true"><div class="mini-cross"><span>Fuego</span><span>Fantasma</span><div>${illustration(609)}</div><b>+</b><b>+</b><b>+</b></div></div>`,`<div class="tile-art draft-preview" aria-hidden="true">${illustration(149)}<div><span>PS <b>?</b></span><span>Ataque <b>?</b></span><span>Defensa <b>?</b></span><span>At. especial <b>?</b></span><span>Def. especial <b>?</b></span><span>Velocidad <b>?</b></span></div></div>`);
  previews.push('<div class="tile-art pokedle-preview" aria-hidden="true"><strong>?</strong><div>✓　≈　↑　↓</div></div>');
  const homeGames=games.map((game,i)=>({game,i})).sort((a,b)=>Number(a.game.id==='infinito')-Number(b.game.id==='infinito'));
  main.innerHTML=`<section class="home-intro"><div><span class="eyebrow"><span class="status-dot"></span> Minijuegos Pokémon</span><h1>¿Cuánto sabes <br>de Pokémon?</h1><p>Compara, ordena, reconoce y responde.</p><div class="home-profile-links"><a class="progress-link" href="#/pokedex">Pokédex</a><a class="progress-link" href="#/progreso">Progreso y logros</a></div></div></section><section class="game-library" aria-label="Elige un minijuego">${homeGames.map(({game,i})=>`<a class="game-tile ${i===0?'bst-tile':i===1?'silhouette-tile':i===2?'pyramid-tile':i===3?'rosco-tile':i===4?'eyes-tile':i===5?'cries-tile':i===6?'infinite-tile':i===7?'grid-tile':i===8?'draft-tile':'pokedle-tile'}" href="#/${game.id}" aria-disabled="${!settings.generations.length}"><div class="tile-top"><span class="game-tag">${['Estadísticas','Siluetas','Ordenación','Preguntas','Ojos','Gritos','Mezcla','Cruces','Combinación','Deducción'][i]}</span><span class="tile-icon" aria-hidden="true">${['↕','?','△','ABC','◉','♫','∞','▦','Σ','✓'][i]}</span></div>${previews[i]}<div class="tile-bottom"><h2>${game.title}</h2><p>${game.summary}</p><span class="tile-action">${game.action}<span aria-hidden="true">↗</span></span></div></a>`).join('')}</section><p class="local-note">Las generaciones y estadísticas se ajustan desde el menú lateral. Tus récords se guardan en este navegador.</p>`;
  main.querySelectorAll<HTMLAnchorElement>('.game-tile').forEach(link=>link.addEventListener('click',event=>{if(!settings.generations.length){event.preventDefault();if(mobile.matches)setDrawer(true);else sidebar.querySelector<HTMLInputElement>('[name="generations"]')?.focus();}}));
}
async function route(focusGame=true):Promise<void>{
  dispose();dispose=()=>{};const token=++routeVersion;
  const id=location.hash.replace(/^#\/?/,'')||'';const game=games.find(g=>g.id===id);
  if(focusGame){app.querySelector('.config-update')!.textContent='';if(drawerOpen)setDrawer(false);}
  app.querySelector('.nav-games')!.setAttribute('aria-current',!id||!!game?'page':'false');app.querySelector('.nav-dex')!.setAttribute('aria-current',id==='pokedex'?'page':'false');app.querySelector('.nav-achievements')!.setAttribute('aria-current',id==='progreso'?'page':'false');
  if(!id){document.title='Pokechu · Minijuegos Pokémon';home();return;}
  if(id==='pokedex'){dispose=mountDex(main,catalog,players);document.title='Pokédex · Pokechu';return;}
  if(id==='progreso'){dispose=mountProgress(main,catalog,players);document.title='Mi progreso · Pokechu';return;}
  if(!game){main.innerHTML='<div class="empty-state"><h1>Ese minijuego todavía no existe</h1><a class="button primary" href="#/">Ver minijuegos</a></div>';return;}
  document.title=`${game.title} · Pokechu`;
  if(!settings.generations.length){main.innerHTML='<div class="empty-state"><h1>Elige al menos una generación</h1><p>Marca las generaciones que quieres incluir en Ajustes. La partida se preparará automáticamente.</p><button class="button primary open-settings">Abrir ajustes</button></div>';main.querySelector('.open-settings')!.addEventListener('click',()=>{if(mobile.matches)setDrawer(true);else sidebar.querySelector<HTMLInputElement>('[name="generations"]')?.focus();});return;}
  main.innerHTML='<p class="loading-message" role="status">Preparando el juego…</p>';
  try{
    const module=await game.load();if(token!==routeVersion)return;
    const seed=new URLSearchParams(location.search).get('seed');const snapshot={...settings,generations:[...settings.generations]};
    dispose=module.mount(main,{catalog,settings:snapshot,random:seed!==null&&/^\d+$/.test(seed)?seededRandom(Number(seed)):Math.random,storage,playerId:players.player().id,onResult:result=>{if(token===routeVersion&&id!=='estadisticas')players.award(result);},alive:()=>token===routeVersion,focusGame,recordKey:name=>name==='bst'?players.player().id+':'+comparisonRecordKey(catalog.version,snapshot):`${players.player().id}:${name}:${comparisonRecordKey(catalog.version,snapshot)}`});
  }catch{if(token===routeVersion)main.innerHTML=`<div class="empty-state"><h1>No se pudo abrir el juego</h1><p>Recarga la página para volver a intentarlo.</p><a class="button primary" href="${asset('')}">Recargar</a></div>`;}
}
window.addEventListener('hashchange',()=>{void route();});
let activePlayer=players.player().id;
function playerSummary():void { const p=players.player();app.querySelector('.player-summary')!.innerHTML=`<span>${escapeHtml(p.name)}</span><strong>${p.progress.points} ${p.progress.points===1?'punto':'puntos'}</strong>`; }
players.subscribe(()=>{playerSummary();if(activePlayer!==players.player().id){activePlayer=players.player().id;void route(false);}});
playerSummary();
void route();
