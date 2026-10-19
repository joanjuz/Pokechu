import {expect,test,type Page} from '@playwright/test';
import data from '../../data/generated/catalog.json' with {type:'json'};
const metrics=['bst','hp','attack','defense','specialAttack','specialDefense','speed'];
async function openSettings(page:Page){if(!await page.locator('.game-sidebar').isVisible())await page.getByRole('button',{name:'Ajustes',exact:true}).click();}
async function closeSettings(page:Page){const close=page.getByRole('button',{name:'Cerrar ajustes',exact:true});if(await close.isVisible())await close.click();}
test('menú lateral aplica generaciones al instante en los cuatro juegos',async({page})=>{
  for(const route of ['bst','silueta','piramide','pasapalabra']){
    await page.goto(`?seed=42#/${route}`);await expect(page.locator('h1')).toBeVisible();await openSettings(page);
    await page.getByRole('button',{name:'Quitar todas',exact:true}).click();await expect(page.getByRole('heading',{name:'Elige al menos una generación'})).toBeVisible();
    await page.getByRole('checkbox',{name:'6 Kalos',exact:true}).check();await expect(page.locator('.config-update')).toContainText('Nueva partida');
    await expect(page.getByRole('checkbox',{name:'6 Kalos',exact:true})).toBeFocused();await closeSettings(page);
    if(route==='bst'){await expect(page.locator('[data-answer="equal"]')).toBeEnabled();const ids=await page.locator('.duel img').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLImageElement).src.match(/\/(\d+)\.webp/)![1])));for(const id of ids)expect(data.species.find(s=>s.id===data.pokemon.find(p=>p.id===id)!.speciesId)!.generation).toBe(6);}
    if(route==='silueta'||route==='piramide'){const img=page.locator(route==='silueta'?'.silhouette-screen img':'.pyramid-pieces img').first();await expect(img).toBeVisible();const id=Number((await img.getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);expect(data.species.find(s=>s.id===data.pokemon.find(p=>p.id===id)!.speciesId)!.generation).toBe(6);}
    if(route==='pasapalabra'){await expect(page.locator('.question-clue')).toBeVisible();const id=Number(await page.locator('.question-clue').getAttribute('data-species'));expect(data.species.find(s=>s.id===id)!.generation).toBe(6);}
  }
});
test('modo aleatorio cambia la estadística entre comparaciones y conserva la ronda resuelta',async({page})=>{
  await page.goto('?seed=42#/bst');await openSettings(page);await page.getByLabel('Estadística para comparar').selectOption('random');await closeSettings(page);
  const seen=new Set<string>();
  for(let round=0;round<8;round++){
    await expect(page.locator('[data-answer="equal"]')).toBeEnabled();const metric=(await page.locator('[data-metric]').getAttribute('data-metric'))!;seen.add(metric);
    const ids=await page.locator('.duel img').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLImageElement).src.match(/\/(\d+)\.webp/)![1])));
    const values=ids.map(id=>{const stats=data.pokemon.find(p=>p.id===id)!.stats;return metric==='bst'?stats.reduce((a,b)=>a+b,0):stats[metrics.indexOf(metric)-1];});
    const answer=values[0]>values[1]?'higher':values[0]<values[1]?'lower':'equal';await page.locator(`[data-answer="${answer}"]`).click();
    await expect(page.locator('[data-metric]')).toHaveAttribute('data-metric',metric);await expect(page.getByText('¡Correcto!',{exact:true})).toBeVisible();
    if(round<7)await page.getByRole('button',{name:'Siguiente Pokémon'}).click();
  }
  expect(seen.size).toBeGreaterThan(1);await expect(page.locator('.scoreboard')).toContainText('Racha8');
});
test('completa la pirámide por casillas y revela valores y resultado',async({page},testInfo)=>{
  await page.goto('?seed=42#/piramide');await openSettings(page);await page.getByLabel('Estadística para comparar').selectOption('random');await closeSettings(page);
  const metric=(await page.locator('[data-metric]').getAttribute('data-metric'))!;
  const ids=await page.locator('.palette-piece').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.pokemon)));
  const value=(id:number)=>{const stats=data.pokemon.find(p=>p.id===id)!.stats;return metric==='bst'?stats.reduce((a,b)=>a+b,0):stats[metrics.indexOf(metric)-1];};
  ids.sort((a,b)=>value(b)-value(a));
  for(let i=0;i<10;i++){
    await page.locator(`.palette-piece[data-pokemon="${ids[i]}"]`).click();await page.locator(`[data-slot="${i}"]`).click();
    await expect(page.locator('.scoreboard')).toContainText(`Colocados${i+1}/10`);await expect(page.locator('.evaluated-stat')).toHaveCount(0);
    await expect(page.locator('[data-metric]')).toHaveAttribute('data-metric',metric);
  }
  await expect(page.getByRole('button',{name:'Confirmar pirámide',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Confirmar pirámide',exact:true}).click();
  await expect(page.getByText('Pirámide perfecta',{exact:true})).toBeVisible();await expect(page.locator('.evaluated-stat')).toHaveCount(10);
  await page.screenshot({path:testInfo.outputPath('piramide.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Nueva pirámide'}).click();await expect(page.locator('.scoreboard')).toContainText('Colocados0/10');await expect(page.locator('.palette-piece')).toHaveCount(10);
});
test('pasapalabra permite pasar volver a la letra y terminar el rosco',async({page},testInfo)=>{
  await page.goto('?seed=42#/pasapalabra');await expect(page.locator('.rosco-letter')).toHaveCount(26);await expect(page.locator('.rosco-letter.unavailable')).toHaveCount(0);
  await page.getByRole('button',{name:'Pasapalabra',exact:true}).click();await expect(page.locator('.rosco-letter.passed')).toHaveCount(1);
  await page.screenshot({path:testInfo.outputPath('pasapalabra.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(let i=0;i<26;i++){
    const id=Number(await page.locator('.question-clue').getAttribute('data-species'));
    await page.getByLabel('Tu respuesta').fill(data.species.find(s=>s.id===id)!.name);await page.getByRole('button',{name:'Responder',exact:true}).click();
  }
  await expect(page.getByText('¡Rosco completo!',{exact:true})).toBeVisible();await expect(page.locator('.scoreboard')).toContainText('Aciertos26/26');await expect(page.locator('.rosco-letter.correct')).toHaveCount(26);
  await page.reload();await expect(page.locator('.scoreboard')).toContainText('Récord26');
});
test('menú móvil conserva el foco al cambiar ajustes y se cierra con Escape',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('?seed=42#/silueta');await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  await openSettings(page);await expect(page.locator('.game-sidebar')).toHaveAttribute('aria-modal','true');
  await expect(page.getByRole('button',{name:'Cerrar ajustes',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(()=>!!document.activeElement?.closest('.game-sidebar'))).toBe(true);
  await page.getByRole('checkbox',{name:'1 Kanto',exact:true}).uncheck();await expect(page.getByRole('checkbox',{name:'1 Kanto',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Ajustes',exact:true})).toBeFocused();await expect(page.locator('.game-sidebar')).not.toBeVisible();
});
test('juegos nuevos se adaptan a 320 píxeles',async({page})=>{
  await page.setViewportSize({width:320,height:720});
  for(const route of ['piramide','pasapalabra']){await page.goto(`?seed=42#/${route}`);await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('pokejuegos:v1:settings'))localStorage.setItem('pokejuegos:v1:settings',JSON.stringify({generations:[1,2,3,4,5,6,7,8,9],metric:'bst',forms:false,battle:false}));});});
