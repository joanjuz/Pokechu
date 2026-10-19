import { pool } from '../domain/pokemon/catalog';
import { METRICS, type Catalog, type Settings } from '../domain/pokemon/types';
export function mountSidebar(root: HTMLElement, catalog: Catalog, initial: Settings, onChange: (settings: Settings) => boolean): void {
  root.innerHTML = `<div class="sidebar-heading"><h2>Ajustes de partida</h2><button class="drawer-close" type="button" aria-label="Cerrar ajustes">×</button></div><p class="sidebar-note">Los cambios se aplican al instante e inician una nueva partida. Tus récords se conservan.</p>
    <fieldset class="generations-field"><legend>Generaciones incluidas</legend><div class="generation-actions"><button class="text-button" id="select-all" type="button">Seleccionar todas</button><button class="text-button" id="clear-generations" type="button">Quitar todas</button></div><div class="generation-grid">${['Kanto','Johto','Hoenn','Sinnoh','Teselia','Kalos','Alola','Galar','Paldea'].map((region,i) => `<label class="generation-chip"><input type="checkbox" name="generations" value="${i+1}" ${initial.generations.includes(i+1) ? 'checked' : ''}><span><b>${i+1}</b> ${region}</span></label>`).join('')}</div></fieldset>
    <div class="generation-label"><label for="metric">Estadística para comparar</label><select id="metric">${METRICS.map(m=>`<option value="${m.id}">${m.id==='bst'?'BST · Suma de estadísticas':m.label}</option>`).join('')}<option value="random">Aleatoria</option></select><p class="field-help">Aleatoria: cambia en cada ronda de Mayor o menor. En pirámide se elige una para todo el tablero.</p></div>
    <fieldset class="forms-field"><legend>Formas en juegos de estadísticas</legend><label class="check-label"><input id="forms" type="checkbox" ${initial.forms?'checked':''}><span>Formas regionales</span></label><label class="check-label"><input id="battle" type="checkbox" ${initial.battle?'checked':''}><span>Megaevoluciones y primigenios</span></label></fieldset><p class="pool-count" role="status"></p>`;
  const generations = [...root.querySelectorAll<HTMLInputElement>('[name="generations"]')];
  const metric = root.querySelector<HTMLSelectElement>('#metric')!; metric.value=initial.metric;
  const forms = root.querySelector<HTMLInputElement>('#forms')!;
  const battle = root.querySelector<HTMLInputElement>('#battle')!;
  function display(settings: Settings, saved=true): void {
    const count=root.querySelector<HTMLElement>('.pool-count')!;
    count.dataset.empty=String(!settings.generations.length);
    count.textContent = !settings.generations.length ? 'Selecciona al menos una generación para jugar.' : `${pool(catalog,settings).length} Pokémon para comparar. Siluetas, ojos, gritos, tabla y pasapalabra usan las formas habituales.${saved?'':' No se pueden guardar los ajustes en este navegador.'}`;
  }
  function update(): void {
    const settings: Settings={generations:generations.filter(i=>i.checked).map(i=>Number(i.value)),metric:metric.value as Settings['metric'],forms:forms.checked,battle:battle.checked};
    display(settings,onChange(settings));
  }
  for(const control of [...generations,metric,forms,battle])control.addEventListener('change',update);
  root.querySelector('#select-all')!.addEventListener('click',()=>{generations.forEach(i=>i.checked=true);update();});
  root.querySelector('#clear-generations')!.addEventListener('click',()=>{generations.forEach(i=>i.checked=false);update();});
  display(initial);
}
