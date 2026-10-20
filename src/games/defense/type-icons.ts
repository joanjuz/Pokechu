import {escapeHtml} from '../../shared/ui';
const icons:Record<string,string>={
  Normal:'normal',Lucha:'fighting',Volador:'flying',Veneno:'poison',
  Tierra:'ground',Roca:'rock',Bicho:'bug',Fantasma:'ghost',
  Acero:'steel',Fuego:'fire',Agua:'water',Planta:'grass',
  Eléctrico:'electric',Psíquico:'psychic',Hielo:'ice',Dragón:'dragon',
  Siniestro:'dark',Hada:'fairy',
};
export function typeBadge(type:string):string{
  const icon=icons[type];
  return `<span class="defense-type" data-type="${escapeHtml(type)}"><svg viewBox="0 0 128 128" aria-hidden="true" focusable="false"><use href="${import.meta.env.BASE_URL}type-icons/pokemon-types.svg#${icon}"></use></svg><span>${escapeHtml(type)}</span></span>`;
}
