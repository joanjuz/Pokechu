import {test,expect,type Page} from '@playwright/test';
import catalog from '../../data/generated/catalog.json' with {type:'json'};
import type {Pokemon} from '../../src/domain/pokemon/types';
import {seededRandom,selectPokemon} from '../../src/shared/random';
const entries=catalog.pokemon.filter(p=>p.kind==='default') as Pokemon[];
async function choose(page:Page,pokemon:Pokemon){const input=page.getByLabel('Nombre del Pokémon');await input.fill(pokemon.name);await input.press('ArrowDown');await input.press('Enter');}

test('muestra sprites en sugerencias y propuestas sin duplicarlos al repetir un nombre',async({page})=>{
  await page.goto('?seed=1023#/debilidades');
  const input=page.getByLabel('Nombre del Pokémon');await input.fill('Bulba');
  const option=page.getByRole('option',{name:'Bulbasaur',exact:true});await expect(option.locator('img')).toHaveAttribute('alt','');await expect(option.locator('img')).toHaveAttribute('src',/1\.webp$/);
  await expect.poll(()=>option.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await option.click();await choose(page,entries.find(p=>p.id===4)!);
  const history=page.locator('.defense-history');await expect(history).toHaveAttribute('open','');await expect(history.locator('li')).toHaveCount(2);
  for(const id of [1,4]){const p=entries.find(p=>p.id===id)!;const image=history.getByRole('img',{name:p.name,exact:true});await expect(image).toBeVisible();await expect(image).toHaveAttribute('src',new RegExp(p.image.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'));await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);}
  await choose(page,entries.find(p=>p.id===1)!);await expect(history.locator('li')).toHaveCount(2);await expect(page.locator('.defense-misses')).toHaveText('2');
});

test('la portada muestra un Pokémon y sus defensas con los iconos originales',async({page},info)=>{
  await page.goto('#/');const tile=page.locator('.defense-tile');await tile.scrollIntoViewIfNeeded();
  await expect(tile.locator('.defense-preview>.pokemon-art')).toHaveAttribute('alt','Hydreigon');
  await expect.poll(()=>tile.locator('.defense-preview>.pokemon-art').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(tile.locator('.defense-preview-match')).toHaveCount(3);await expect(tile.locator('.defense-preview use')).toHaveCount(3);
  await expect(tile.locator('.weak')).toContainText('×4');await expect(tile.locator('.immune')).toContainText('×0');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await tile.screenshot({path:info.outputPath('portada-defensas.png')});await tile.click();await expect(page.locator('.game-instruction')).toContainText('siempre tiene dos tipos');
});

test('muestra las defensas de la referencia y los dieciocho tipos con iconos y nombres',async({page},info)=>{
  await page.goto('?seed=1023#/debilidades');await expect(page.locator('.defense-chart [data-type]')).toHaveCount(18);await expect(page.locator('.defense-chart svg')).toHaveCount(18);await expect(page.locator('.defense-chart use')).toHaveCount(18);const spriteLink=await page.locator('.defense-chart use').first().getAttribute('href');expect(spriteLink).toMatch(/type-icons\/pokemon-types\.svg#[a-z]+$/);const spriteResponse=await page.request.get(new URL(spriteLink!.split('#')[0],page.url()).toString());expect(spriteResponse.ok()).toBe(true);expect(await spriteResponse.text()).toContain('<symbol id="dragon"');
  await expect(page.locator('[data-multiplier="4"] [data-type]')).toHaveAttribute('data-type','Hada');await expect(page.locator('[data-multiplier="0"] [data-type]')).toHaveCount(2);await expect(page.locator('[data-multiplier="0"] [data-type="Tierra"]')).toBeVisible();await expect(page.locator('[data-multiplier="0"] [data-type="Psíquico"]')).toBeVisible();
  await expect(page.locator('.defense-hint-count')).toHaveText('0/3');await expect(page.locator('.defense-controls')).not.toContainText('Hydreigon');await expect(page.locator('.defense-result,.defense-hint-silhouette')).toHaveCount(0);await page.screenshot({path:info.outputPath('defensas-inicial.png'),fullPage:true});
});

test('desbloquea generación habilidad y silueta en cuatro ocho y doce fallos sin revelar el nombre',async({page},info)=>{
  await page.goto('?seed=1023#/debilidades');const wrong=entries.filter(p=>p.id!==635).slice(0,16);
  for(let i=0;i<16;i++){
    await choose(page,wrong[i]);await expect(page.locator('.defense-misses')).toHaveText(String(i+1));await expect(page.locator('.defense-hints .unlocked')).toHaveCount(Math.min(3,Math.floor((i+1)/4)));await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
    if(i===3){await expect(page.locator('[data-hint="1"]')).toContainText('generación 5: Teselia');await choose(page,wrong[0]);await expect(page.locator('.defense-misses')).toHaveText('4');await expect(page.locator('.defense-feedback')).toContainText('No suma otro fallo');}
    if(i===7)await expect(page.locator('[data-hint="2"]')).toContainText('Levitación');
    if(i===11){await expect(page.locator('[data-hint="3"] img')).toHaveAttribute('alt','Silueta del Pokémon');await expect(page.locator('[data-hint="3"] img')).toHaveClass(/silhouette/);await page.screenshot({path:info.outputPath('defensas-tres-pistas.png'),fullPage:true});}
  }
  await expect(page.locator('.defense-hints')).not.toContainText('Hydreigon');await expect(page.locator('.defense-result')).toHaveCount(0);await expect(page.locator('.player-summary')).toContainText('0 puntos');await page.locator('.nav-dex').click();await expect(page.locator('.dex-entry.registered')).toHaveCount(0);
});

test('acertar registra una sola especie y otro Pokémon reinicia fallos pistas y habilidad',async({page})=>{
  await page.goto('?seed=1023#/debilidades');const target=entries.find(p=>p.id===635)!;await choose(page,target);await expect(page.getByText('¡Pokémon encontrado!',{exact:true})).toBeVisible();await expect(page.locator('.defense-result img')).toHaveAttribute('alt','Hydreigon');await expect(page.locator('.player-summary')).toContainText('1 punto');await expect(page.getByLabel('Nombre del Pokémon')).toHaveCount(0);
  await page.getByRole('button',{name:'Otro Pokémon',exact:true}).click();await expect(page.locator('.defense-misses')).toHaveText('0');await expect(page.locator('.defense-hint-count')).toHaveText('0/3');await choose(page,target);await expect(page.locator('.defense-result')).toHaveCount(0);await expect(page.locator('.defense-misses')).toHaveText('1');
  await page.getByRole('button',{name:'Cambiar Pokémon',exact:true}).click();await expect(page.locator('.defense-misses')).toHaveText('0');await expect(page.locator('.defense-hints .unlocked')).toHaveCount(0);await page.locator('.nav-dex').click();await expect(page.locator('.dex-entry.registered')).toHaveCount(1);
});

test('respeta generaciones al instante funciona a 320 píxeles y mantiene infinito al final',async({page},info)=>{
  await page.setViewportSize({width:320,height:900});await page.goto('?seed=42#/debilidades');await expect(page.locator('.defense-chart')).toBeVisible();await page.getByRole('button',{name:'Ajustes',exact:true}).click();await page.getByRole('button',{name:'Quitar todas',exact:true}).click();await expect(page.getByRole('heading',{name:'Elige al menos una generación'})).toBeVisible();await page.getByRole('checkbox',{name:'9 Paldea',exact:true}).check();await page.getByRole('button',{name:'Cerrar ajustes',exact:true}).click();await expect(page.locator('.defense-chart')).toBeVisible();
  const paldea=entries.filter(p=>catalog.species.find(s=>s.id===p.speciesId)!.generation===9),target=selectPokemon(paldea.filter(p=>p.types.length===2),[],seededRandom(42))!;
  for(const p of paldea.filter(p=>p.speciesId!==target.speciesId).slice(0,4))await choose(page,p);await expect(page.locator('[data-hint="1"]')).toContainText('generación 9: Paldea');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('defensas-movil.png'),fullPage:true});
  await choose(page,target);await expect(page.locator('.defense-result img')).toHaveAttribute('alt',target.name);expect(target.types).toHaveLength(2);
  await page.locator('.nav-games').click();await expect(page.locator('.game-tile')).toHaveCount(11);await expect(page.locator('.game-tile').last()).toHaveAttribute('href','#/infinito');await expect(page.locator('.game-library')).not.toContainText('undefined');
});

test('infinito conserva las pistas y solo suma al resolver el Pokémon de defensas',async({page})=>{
  await page.goto('?seed=1023#/infinito');await expect(page.locator('[name="infinite-game"]')).toHaveCount(8);for(const checkbox of await page.locator('[name="infinite-game"]').all())await checkbox.setChecked(await checkbox.getAttribute('value')==='debilidades');await page.getByRole('button',{name:'Empezar racha',exact:true}).click();await expect(page.locator('.defense-chart')).toBeVisible();
  for(const p of entries.slice(0,4))await choose(page,p);await expect(page.locator('.defense-hint-count')).toHaveText('1/3');await expect(page.locator('.infinite-score')).toHaveText('0');await expect(page.locator('.infinite-challenge')).not.toHaveAttribute('inert');await choose(page,entries.find(p=>p.id===635)!);await expect(page.locator('.infinite-score')).toHaveText('1');await expect(page.locator('.player-summary')).toContainText('1 punto');
});
