import type {GameContext} from '../../app/context';
import quizData from '../../../data/generated/quiz.json';
import {generationKey} from '../../domain/pokemon/settings';
import {readStored,writeStored,isScore} from '../../shared/storage';
import {escapeHtml,focusHeading} from '../../shared/ui';
import {ALPHABET,createRosco,answerLetter,passLetter,expireRosco,type RoscoState} from './rules';
import {ROSCO_SECONDS,remainingSeconds} from './timer';
import {attachPokemonAutocomplete} from '../../shared/autocomplete';
export function mount(root:HTMLElement,ctx:GameContext):()=>void{
  const species=ctx.catalog.species.filter(s=>ctx.settings.generations.includes(s.generation));
  const key=`${ctx.playerId||'jugador-1'}:pasapalabra:190s:${ctx.catalog.version}:${quizData.version}:g${generationKey(ctx.settings.generations)}`;
  let best=readStored(ctx.storage,key,0,isScore);let saved=true;let state:RoscoState;let feedback='';let interacted=false;
  let cleanupAutocomplete=()=>{};
  let deadline=0;let active=true;
  function updateTimer():boolean {
    if(!active||!ctx.alive())return false;
    const remaining=remainingSeconds(deadline,Date.now());
    const timer=root.querySelector('.rosco-timer');if(timer)timer.textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
    if(!state.finished&&remaining===0){state=expireRosco(state);feedback='Se agotaron los 190 segundos. Las letras pendientes quedan sin responder.';render();return false;}
    return !state.finished;
  }
  const entries=ctx.catalog.pokemon.filter(p=>p.kind==='default'&&species.some(s=>s.id===p.speciesId));
  function start():void{state=createRosco(species,quizData.questions,ctx.random);deadline=Date.now()+ROSCO_SECONDS*1000;feedback='';render();}
  function render():void{
    cleanupAutocomplete();
    const total=state.questions.filter(Boolean).length;const resolved=state.statuses.filter(s=>s==='correct'||s==='wrong').length;
    const question=state.questions[state.current];
    if(state.score>best){best=state.score;saved=writeStored(ctx.storage,key,best);}
    const letters=ALPHABET.map((letter,index)=>{const angle=(index/26)*Math.PI*2-Math.PI/2;const x=50+44*Math.cos(angle),y=50+44*Math.sin(angle);const status=state.statuses[index];return `<button class="rosco-letter ${status} ${index===state.current?'current':''}" type="button" style="left:${x}%;top:${y}%" data-letter="${index}" aria-label="Letra ${letter}: ${status==='correct'?'acertada':status==='wrong'?'fallada':status==='unavailable'?'sin pregunta disponible':status==='passed'?'pasada':'pendiente'}" ${state.finished||status==='correct'||status==='wrong'||status==='unavailable'?'disabled':''}>${letter}</button>`;}).join('');
    root.innerHTML=`<div class="game-heading"><div><a class="back-link" href="#/">Volver a los juegos</a><h1 tabindex="-1">Pasapalabra Pokémon</h1></div><div class="scoreboard"><span>Aciertos<strong>${state.score}/${total}</strong></span><span>Récord<strong>${best}</strong></span><span>Tiempo<strong class="rosco-timer" role="timer" aria-label="Tiempo restante">${Math.floor(remainingSeconds(deadline,Date.now())/60)}:${String(remainingSeconds(deadline,Date.now())%60).padStart(2,'0')}</strong></span></div></div><p class="game-instruction">Responde de la A a la Z. Puedes pasar y volver a las letras pendientes. Tienes 190 segundos para completar el rosco.</p><div class="rosco-layout"><section class="rosco" aria-label="Rosco de letras">${letters}<div class="rosco-center"><strong>${state.finished?'Fin':ALPHABET[state.current]}</strong><span>${resolved} de ${total} resueltas</span></div></section><section class="question-panel">${state.finished?`<div class="result ${state.score===total&&!state.timedOut?'success':'failure'}" role="status"><strong>${state.timedOut?'Tiempo agotado':state.score===total?'¡Rosco completo!':'Rosco terminado'}</strong><span>${state.score} aciertos, ${state.statuses.filter(s=>s==='wrong').length} fallos y ${total-resolved} pendientes.</span></div><button class="button primary restart">Nuevo rosco</button><details class="rosco-answers"><summary>Revisar respuestas</summary>${state.questions.map((q,i)=>q?`<p>${q.letter}: ${escapeHtml(q.species.name)} ${state.statuses[i]==='correct'?'✓':'×'}</p>`:'').join('')}</details>`:question?`<p class="letter-rule">${question.mode==='starts'?'Empieza por':'Contiene la'} <strong>${question.letter}</strong></p><h2>¿Qué Pokémon es?</h2><p class="question-clue" data-species="${question.species.id}">${escapeHtml(question.clue)}</p><form id="rosco-form"><label for="rosco-answer">Tu respuesta</label><input id="rosco-answer" name="answer" type="text" autocomplete="off" spellcheck="false" required><div class="rosco-actions"><button class="button primary" type="submit">Responder</button><button class="button pass" type="button">Pasapalabra</button></div></form>`:''}<p class="rosco-feedback" role="status">${escapeHtml(feedback)}</p>${total<26?`<p class="notice">${26-total} letras sin respuesta disponible en las generaciones elegidas. No cuentan como fallos.</p>`:''}${!saved?'<p class="notice">No se puede guardar el récord en este navegador.</p>':''}</section></div><details class="rules"><summary>Cómo jugar y procedencia de las preguntas</summary><p>Escribe el nombre del Pokémon. Cada letra indica si la respuesta empieza por ella o la contiene. Una respuesta incorrecta cierra esa letra; Pasapalabra la deja pendiente para la siguiente vuelta. Puedes elegir cualquier letra pendiente del rosco.</p><p>Las preguntas se generan a partir de tipos, estadísticas, generaciones, categorías y evoluciones del catálogo verificado. No se utiliza el número de Pokédex como pista. Se admiten diferencias de tildes, mayúsculas y los alias registrados. Las letras sin una especie disponible se omiten sin penalización.</p></details>`;
    root.querySelector('.restart')?.addEventListener('click',()=>{interacted=true;start();});
    const answerInput=root.querySelector<HTMLInputElement>('#rosco-answer');
    if(answerInput)cleanupAutocomplete=attachPokemonAutocomplete(answerInput,ctx.catalog,entries,()=>{answerInput.focus();});
    root.querySelector('.pass')?.addEventListener('click',()=>{if(!updateTimer())return;interacted=true;feedback=`La ${ALPHABET[state.current]} queda pendiente.`;state=passLetter(state);render();});
    root.querySelector<HTMLFormElement>('#rosco-form')?.addEventListener('submit',event=>{event.preventDefault();if(!updateTimer())return;const value=root.querySelector<HTMLInputElement>('#rosco-answer')!.value;const before=state;const after=answerLetter(state,value);if(after===before)return;interacted=true;feedback=after.score>before.score?`${ALPHABET[before.current]}: correcto.`:`${ALPHABET[before.current]}: la respuesta era ${before.questions[before.current]!.species.name}.`;state=after;if(after.score>before.score)ctx.onResult?.({game:'pasapalabra',correct:true,points:1,speciesIds:[before.questions[before.current]!.species.id]});render();});
    root.querySelectorAll<HTMLButtonElement>('[data-letter]:not([disabled])').forEach(button=>button.addEventListener('click',()=>{if(!updateTimer())return;state={...state,current:Number(button.dataset.letter)};interacted=true;feedback='';render();}));
    if((ctx.focusGame!==false||interacted)&&!state.finished)root.querySelector<HTMLInputElement>('#rosco-answer')?.focus({preventScroll:true});
    if(state.finished&&interacted)root.querySelector<HTMLButtonElement>('.restart')?.focus({preventScroll:true});
  }
  start();const interval=setInterval(updateTimer,250);const onVisible=()=>{updateTimer();};document.addEventListener('visibilitychange',onVisible);if(ctx.focusGame!==false)focusHeading(root);return()=>{active=false;clearInterval(interval);document.removeEventListener('visibilitychange',onVisible);cleanupAutocomplete();};
}
