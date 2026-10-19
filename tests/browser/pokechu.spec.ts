import {test,expect,type Page} from '@playwright/test';
import data from '../../data/generated/catalog.json' with {type:'json'};
async function bstAnswer(page:Page){const ids=await page.locator('.duel img').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLImageElement).src.match(/\/(\d+)\.webp/)![1])));const totals=ids.map(id=>data.pokemon.find(p=>p.id===id)!.stats.reduce((a,b)=>a+b,0));return totals[0]>totals[1]?'higher':totals[0]<totals[1]?'lower':'equal';}
async function audioSpy(page:Page){await page.addInitScript(()=>{window.testAudios=[];const Original=window.Audio;window.Audio=function(src?:string){const audio=new Original(src);window.testAudios.push(audio);return audio;} as unknown as typeof Audio;});}
async function infiniteSelection(page:Page,ids:string[]){await page.goto('?seed=42#/infinito');for(const input of await page.locator('[name="infinite-game"]').all()){await input.setChecked(ids.includes((await input.getAttribute('value'))!));}await page.getByRole('button',{name:'Empezar racha'}).click();}

test('gritos ofrece tres imágenes y un fallo bloquea la respuesta y termina la racha',async({page})=>{
  await audioSpy(page);await page.goto('?seed=42#/gritos');await expect(page.locator('[data-choice]')).toHaveCount(3);await expect(page.locator('.cry-choice img')).toHaveCount(3);
  const target=await page.evaluate(()=>Number(window.testAudios[0].src.match(/\/(\d+)\.(ogg|mp3)/)![1]));
  const ids=await page.locator('[data-choice]').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.choice)));expect(new Set(ids).size).toBe(3);expect(ids).toContain(target);
  await page.getByRole('button',{name:'Escuchar grito',exact:true}).click();const wrong=page.locator(`[data-choice="${ids.find(id=>id!==target)}"]`);await expect(wrong).toBeEnabled();await wrong.click();
  await expect(page.locator('.cry-result')).toContainText('Incorrecto.');await expect(page.locator('.cry-choice.wrong')).toHaveCount(1);await expect(page.locator('.cry-choice.correct')).toHaveCount(1);await expect(page.locator('[data-choice]:enabled')).toHaveCount(0);
  await expect(page.locator('.cry-result')).toContainText('Fin de la racha: 0 aciertos.');await expect(page.getByRole('button',{name:'Volver a jugar',exact:true})).toBeVisible();await expect(page.locator('.scoreboard')).toContainText('Racha0');await expect(page.locator('.player-summary')).toContainText('0 puntos');
});

test('pasapalabra comparte 190 segundos entre letras y termina al agotarlos',async({page})=>{
  await page.clock.install();await page.goto('?seed=42#/pasapalabra');await expect(page.getByRole('timer')).toHaveText('3:10');
  await page.clock.runFor(10000);await expect(page.getByRole('timer')).toHaveText('3:00');await page.getByRole('button',{name:'Pasapalabra',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3:00');
  const id=Number(await page.locator('.question-clue').getAttribute('data-species'));await page.getByLabel('Tu respuesta').fill(data.species.find(s=>s.id===id)!.name);await page.getByRole('button',{name:'Responder',exact:true}).click();await expect(page.getByRole('timer')).toHaveText('3:00');
  await page.clock.fastForward(179000);await expect(page.getByRole('timer')).toHaveText('0:01');await expect(page.getByLabel('Tu respuesta')).toBeEnabled();await page.clock.runFor(1000);
  await expect(page.getByText('Tiempo agotado',{exact:true})).toBeVisible();await expect(page.getByRole('timer')).toHaveText('0:00');await expect(page.getByLabel('Tu respuesta')).toHaveCount(0);await expect(page.locator('.rosco-letter:enabled')).toHaveCount(0);await expect(page.locator('.scoreboard')).toContainText('Aciertos1/26');
  await page.getByRole('button',{name:'Nuevo rosco'}).click();await expect(page.getByRole('timer')).toHaveText('3:10');
});

test('rechaza respuestas fuera de plazo aunque el temporizador haya quedado suspendido',async({page})=>{
  await page.clock.install();await page.goto('?seed=42#/pasapalabra');const id=Number(await page.locator('.question-clue').getAttribute('data-species'));await page.getByLabel('Tu respuesta').fill(data.species.find(s=>s.id===id)!.name);
  await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+191000;document.querySelector<HTMLFormElement>('#rosco-form')!.requestSubmit();Date.now=original;});await expect(page.getByText('Tiempo agotado',{exact:true})).toBeVisible();await expect(page.locator('.player-summary')).toContainText('0 puntos');
});

test('los aciertos completan una Pokédex única desbloquean logros y persisten por jugador',async({page},info)=>{
  await page.goto('?seed=42#/ojos');await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();const target=Number((await page.locator('.eye-clue').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);const name=data.pokemon.find(p=>p.id===target)!.name;
  await page.getByLabel('Nombre del Pokémon').fill(name);await page.getByLabel('Nombre del Pokémon').press('ArrowDown');await page.getByLabel('Nombre del Pokémon').press('Enter');await page.getByRole('button',{name:'Responder',exact:true}).click();
  await expect(page.locator('.player-summary')).toContainText('1 punto');await page.reload();await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();await page.getByLabel('Nombre del Pokémon').fill(name);await page.getByLabel('Nombre del Pokémon').press('ArrowDown');await page.getByLabel('Nombre del Pokémon').press('Enter');await page.getByRole('button',{name:'Responder',exact:true}).click();
  await page.getByRole('link',{name:'Mi progreso'}).click();await expect(page.locator('.progress-totals')).toContainText('2');await expect(page.locator('.achievements .unlocked')).toContainText('Primer registro');
  await page.locator('.profile-sections').getByRole('link',{name:'Pokédex',exact:true}).click();await expect(page.locator('.dex-entry.registered')).toHaveCount(1);await expect(page.locator('.dex-entry.registered')).toContainText(name);await page.getByRole('link',{name:'Progreso y logros',exact:true}).click();
  await page.getByLabel('Nombre del nuevo jugador').fill('Joan');await page.getByRole('button',{name:'Crear jugador'}).click();await expect(page.locator('h1')).toContainText('Joan');await expect(page.locator('.player-summary')).toContainText('0 puntos');
  await page.locator('.profile-sections').getByRole('link',{name:'Pokédex',exact:true}).click();await expect(page.locator('.dex-entry.registered')).toHaveCount(0);await expect(page.locator('.dex-entry.unregistered')).toHaveCount(1025);await page.getByRole('link',{name:'Progreso y logros',exact:true}).click();
  await page.getByLabel('Perfil activo').selectOption('jugador-1');await page.reload();await page.locator('.profile-sections').getByRole('link',{name:'Pokédex',exact:true}).click();await expect(page.locator('.dex-entry.registered')).toHaveCount(1);await expect(page.locator('.player-summary')).toContainText('2 puntos');await page.getByLabel('Solo registrados').check();await page.screenshot({path:info.outputPath('pokedex.png'),fullPage:true});
});

test('modo infinito cambia de reto al acertar y termina la racha al fallar',async({page})=>{
  await infiniteSelection(page,['bst']);await expect(page.locator('[data-answer="equal"]')).toBeEnabled();const answer=await bstAnswer(page);await page.locator(`[data-answer="${answer}"]`).click();await expect(page.locator('.infinite-score')).toHaveText('1');await expect(page.locator('.infinite-status')).toContainText('Reto 2:');await expect(page.locator('[data-answer="equal"]')).toBeEnabled();
  const next=await bstAnswer(page);await page.locator(`[data-answer="${next==='higher'?'lower':'higher'}"]`).click();await expect(page.locator('.infinite-status')).toHaveText('Fin de la racha: 1 punto.');await expect(page.locator('.infinite-challenge')).toHaveAttribute('inert','');await expect(page.locator('.player-summary')).toContainText('1 punto');
  await page.getByRole('link',{name:'Mi progreso'}).click();await expect(page.locator('.progress-totals')).toContainText('Mejor racha infinita');expect(await page.locator('.progress-totals>div').nth(2).innerText()).toContain('1');
});

test('modo infinito respeta la mezcla elegida y excluye pasapalabra',async({page})=>{
  await page.goto('?seed=42#/infinito');await expect(page.locator('[name="infinite-game"]')).toHaveCount(7);await expect(page.locator('[name="infinite-game"][value="pasapalabra"]')).toHaveCount(0);
  for(const input of await page.locator('[name="infinite-game"]').all())await input.uncheck();await expect(page.getByRole('button',{name:'Empezar racha'})).toBeDisabled();
  await infiniteSelection(page,['bst','ojos']);const first=await page.locator('.infinite-challenge h1').innerText();
  if(first==='Mayor o menor'){await expect(page.locator('[data-answer="equal"]')).toBeEnabled();await page.locator(`[data-answer="${await bstAnswer(page)}"]`).click();}
  else{await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();const id=Number((await page.locator('.eye-clue').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);const input=page.getByLabel('Nombre del Pokémon');await input.fill(data.pokemon.find(p=>p.id===id)!.name);await input.press('ArrowDown');await input.press('Enter');await page.getByRole('button',{name:'Responder',exact:true}).click();}
  await expect(page.locator('.infinite-status')).toContainText('Reto 2:');expect(await page.locator('.infinite-challenge h1').innerText()).not.toBe(first);
});

test('Pokechu muestra su subtítulo y un tema musgo legible en móvil',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('');await expect(page).toHaveTitle('Pokechu · Minijuegos Pokémon');await expect(page.locator('.brand')).toContainText('Pokechu');await expect(page.locator('.brand small')).toHaveText('Progressive minigames');await expect(page.locator('.site-header')).toHaveCSS('background-color','rgb(52, 68, 60)');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('pokechu-inicio.png'),fullPage:true});
  await page.goto('#/gritos');await expect(page.locator('.cry-choices')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('gritos-opciones.png'),fullPage:true});
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('pokejuegos:v1:settings'))localStorage.setItem('pokejuegos:v1:settings',JSON.stringify({generations:[1,2,3,4,5,6,7,8,9],metric:'bst',forms:false,battle:false}));});});
