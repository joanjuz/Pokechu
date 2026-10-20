import {escapeHtml} from '../../shared/ui';
const icons:Record<string,{color:string;path:string}>={
  Normal:{color:'#747a7e',path:'<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="4"/>'},
  Lucha:{color:'#a95036',path:'<path d="M5 12V8h3V4h3v4h2V3h3v6h2V6h3v8l-6 7H8l-4-6z"/>'},
  Volador:{color:'#567f9e',path:'<path d="M3 19C8 5 15 5 23 3L16 13l-4-1 2 4-5 1-1 4z"/>'},
  Veneno:{color:'#9455ac',path:'<circle cx="12" cy="7" r="4"/><circle cx="5" cy="14" r="3"/><circle cx="19" cy="14" r="3"/><ellipse cx="12" cy="20" rx="10" ry="2"/>'},
  Tierra:{color:'#a16d3a',path:'<path d="m2 17 5-3 5 2 5-2 5 3-10 5zM4 10l8-6 8 6-8 5z"/>'},
  Roca:{color:'#8d815a',path:'<path d="m7 3 11 1 4 10-7 8-11-3-3-9zm1 4-3 5 7 6 6-5-2-6z" fill-rule="evenodd"/>'},
  Bicho:{color:'#7a8b3b',path:'<ellipse cx="12" cy="14" rx="7" ry="8"/><path d="m4 2 4 6M20 2l-4 6M2 11l5 2M22 11l-5 2M2 20l5-3M22 20l-5-3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v14" stroke="#687b32" stroke-width="2"/>'},
  Fantasma:{color:'#715a91',path:'<path d="M3 20v-8a9 9 0 0 1 18 0v10l-5-3-4 3-4-3zm5-9v4h3v-4zm6 0v4h3v-4z" fill-rule="evenodd"/>'},
  Acero:{color:'#527e88',path:'<path d="m6 2 12 1 5 10-7 9-12-2-3-11zm6 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10" fill-rule="evenodd"/>'},
  Fuego:{color:'#b64438',path:'<path d="M13 1c2 7-5 8-3 13 2-1 3-3 3-5 6 3 8 8 5 12-4 4-11 1-12-3-2-7 5-10 7-17z"/>'},
  Agua:{color:'#3e78ae',path:'<path d="M12 1C9 7 4 11 4 16a8 8 0 0 0 16 0C20 11 15 7 12 1z"/>'},
  Planta:{color:'#528148',path:'<path d="M21 2C7 2 1 8 5 16c5 7 17 2 16-14zM2 23 17 7"/><path d="m3 22 14-14" fill="none" stroke="currentColor" stroke-width="2"/>'},
  Eléctrico:{color:'#ad8b28',path:'<path d="M12 1 3 14h8l-1 9L22 9h-9z"/>'},
  Psíquico:{color:'#b25278',path:'<path d="M20 17c-9 10-22-6-13-13 6-5 16 1 13 7-3 7-12 0-8-2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'},
  Hielo:{color:'#408e9e',path:'<path d="M12 1v22M2 6l20 12M2 18 22 6M8 3l4 4 4-4M8 21l4-4 4 4M2 11l6-1-2-5M22 13l-6 1 2 5" fill="none" stroke="currentColor" stroke-width="2.5"/>'},
  Dragón:{color:'#5d66a9',path:'<path d="m2 3 7 7 3-9 3 9 7-7-3 11-7 9-7-9zm7 10 3 4 3-4-3 1z" fill-rule="evenodd"/>'},
  Siniestro:{color:'#68616a',path:'<path d="M17 2c-10-3-20 13-9 19 9 6 18-5 13-12-1 11-15 9-13 1 1-4 5-6 9-8z"/>'},
  Hada:{color:'#ac619f',path:'<path d="m12 1 4 6 7 1-3 7 1 7-9-3-9 3 1-7-3-7 7-1z"/>'},
};
export function typeBadge(type:string):string{const icon=icons[type];return `<span class="defense-type" data-type="${escapeHtml(type)}" style="--type-color:${icon.color}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${icon.path}</svg><span>${escapeHtml(type)}</span></span>`;}
