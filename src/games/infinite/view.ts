import type { GameContext, GameResult } from '../../app/context';
import { games } from '../registry';
import { readStored, writeStored } from '../../shared/storage';
import { INFINITE_GAMES, selectedGames, shuffledCycle, type InfiniteGame } from './rules';
import { focusHeading } from '../../shared/ui';
export function mount(root:HTMLElement,ctx:GameContext):()=>void {
  let selected=readStored<unknown>(ctx.storage,'infinite-games', [...INFINITE_GAMES],(_v):_v is unknown=>true);
  let chosen=selectedGames(selected),bag:InfiniteGame[]=[],score=0,active=true,token=0,settled=false;
  let childDispose=()=>{},timer:ReturnType<typeof setTimeout>|undefined;
  function setup(){
    clearTimeout(timer);childDispose();childDispose=()=>{};token++;
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Modo infinito</h1></div></div><p class="game-instruction">Un acierto, un punto y otro minijuego. La racha termina al fallar. La tabla conserva tres vidas y Pokédle y Debilidades permiten propuestas sin límite; los demás retos se resuelven con una sola respuesta.</p><form class="infinite-config"><fieldset><legend>Juegos que pueden aparecer</legend>${INFINITE_GAMES.map(id=>`<label class="check-label"><input name="infinite-game" type="checkbox" value="${id}" ${chosen.includes(id)?'checked':''}> ${games.find(g=>g.id===id)!.title}</label>`).join('')}</fieldset><p>Pasapalabra y Construye tu BST se juegan por separado. La pirámide se confirma una sola vez; los juegos de reconocimiento tienen una respuesta por reto.</p><button class="button primary start-infinite" ${chosen.length?'':'disabled'}>Empezar racha</button><p class="infinite-config-status" role="status">${chosen.length?'':'Selecciona al menos un juego.'}</p></form>`;
    root.querySelector('form')!.addEventListener('change',()=>{chosen=selectedGames([...root.querySelectorAll<HTMLInputElement>('[name="infinite-game"]:checked')].map(input=>input.value));writeStored(ctx.storage,'infinite-games',chosen);root.querySelector<HTMLButtonElement>('.start-infinite')!.disabled=!chosen.length;root.querySelector('.infinite-config-status')!.textContent=chosen.length?'':'Selecciona al menos un juego.';});
    root.querySelector('form')!.addEventListener('submit',e=>{e.preventDefault();if(!chosen.length)return;score=0;bag=[];root.innerHTML='<section class="infinite-bar"><h1>Modo infinito</h1><p>Racha <strong class="infinite-score">0</strong></p><button class="text-button configure-infinite">Cambiar juegos</button></section><p class="infinite-status" role="status"></p><div class="infinite-challenge"></div><button class="button primary replay-infinite" hidden>Volver a configurar</button>';root.querySelector('.configure-infinite')!.addEventListener('click',setup);root.querySelector('.replay-infinite')!.addEventListener('click',setup);void next();});
  }
  async function next(){
    childDispose();childDispose=()=>{};const current=++token;settled=false;
    if(!bag.length)bag=shuffledCycle(chosen,ctx.random);
    const id=bag.pop()!,game=games.find(g=>g.id===id)!;
    const child=root.querySelector<HTMLElement>('.infinite-challenge')!;child.inert=false;
    root.querySelector('.infinite-status')!.textContent=`Reto ${score+1}: ${game.title}`;child.innerHTML='<p role="status">Preparando reto…</p>';
    try{
      const module=await game.load();if(!active||!ctx.alive()||current!==token)return;
      const result=(event:GameResult)=>{
        if(settled||!active||current!==token)return;settled=true;child.inert=true;
        if(event.correct){score++;root.querySelector('.infinite-score')!.textContent=String(score);ctx.onResult?.({...event,points:1,streak:score});root.querySelector('.infinite-status')!.textContent='¡Acertaste! Preparando el siguiente reto…';timer=setTimeout(()=>{if(active&&ctx.alive()&&current===token)void next();},1500);}
        else {root.querySelector('.infinite-status')!.textContent=`Fin de la racha: ${score} ${score===1?'punto':'puntos'}.`;root.querySelector<HTMLButtonElement>('.replay-infinite')!.hidden=false;root.querySelector<HTMLButtonElement>('.replay-infinite')!.focus({preventScroll:true});}
      };
      childDispose=module.mount(child,{...ctx,singleRound:true,onResult:result,alive:()=>active&&ctx.alive()&&current===token,recordKey:game=>`infinite:${ctx.recordKey(game)}`});
    }catch{if(active&&current===token){child.innerHTML='<p>No se pudo cargar este reto. La racha se conserva.</p><button class="button retry-challenge">Reintentar carga</button>';child.querySelector('button')!.addEventListener('click',()=>{bag.push(id);void next();});}}
  }
  setup();if(ctx.focusGame!==false)focusHeading(root);
  return()=>{active=false;token++;clearTimeout(timer);childDispose();};
}
