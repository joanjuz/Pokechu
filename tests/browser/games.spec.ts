import { test, expect, type Page } from '@playwright/test';
import data from '../../data/generated/catalog.json' with { type: 'json' };
async function openSettings(page:Page):Promise<void>{if(!await page.locator('.game-sidebar').isVisible())await page.getByRole('button',{name:'Ajustes',exact:true}).click();}
async function closeSettings(page:Page):Promise<void>{const close=page.getByRole('button',{name:'Cerrar ajustes',exact:true});if(await close.isVisible())await close.click();}
async function answerFor(page: Page, statIndex = -1): Promise<'higher'|'lower'|'equal'> {
  const images = await page.locator('.duel img').evaluateAll(nodes => nodes.map(n => Number((n as HTMLImageElement).src.match(/\/(\d+)\.webp/)![1])));
  const totals = images.map(id => { const stats = data.pokemon.find(p => p.id === id)!.stats; return statIndex < 0 ? stats.reduce((a,b)=>a+b,0) : stats[statIndex]; });
  return totals[0] > totals[1] ? 'higher' : totals[0] < totals[1] ? 'lower' : 'equal';
}
test('plays BST handles double submission and preserves its record after reload', async ({page}) => {
  await page.goto('?seed=42#/bst');
  const answer = await answerFor(page);
  const button = page.locator(`[data-answer="${answer}"]`);
  await expect(button).toBeEnabled(); await button.evaluate(node => { const element = node as HTMLButtonElement; element.click(); element.click(); });
  await expect(page.getByRole('status').filter({hasText:'¡Correcto!'})).toBeVisible();
  await expect(page.locator('.scoreboard').first()).toContainText('Racha1');
  await page.getByRole('button',{name:'Siguiente Pokémon'}).click();
  await expect(page.locator('[data-answer="equal"]')).toBeEnabled();
  const right = await answerFor(page);
  await page.locator(`[data-answer="${right === 'higher' ? 'lower' : 'higher'}"]`).click();
  await expect(page.getByText('Fin de la racha',{exact:true})).toBeVisible();
  await page.reload(); await expect(page.locator('.scoreboard')).toContainText('Récord1');
});
test('answers silhouettes with keyboard and finishes all ten rounds', async ({page}) => {
  await page.goto('?seed=42#/silueta');
  for (let round = 1; round <= 10; round++) {
    const input = page.getByLabel('Nombre del Pokémon'); await expect(input).toBeEnabled();
    const art = page.locator('.silhouette-screen img'); await expect(art).toHaveAttribute('alt','Silueta del Pokémon');
    const src = await art.getAttribute('src'); const id = Number(src!.match(/\/(\d+)\.webp/)![1]);
    const target = data.pokemon.find(p => p.id === id)!;
    await input.fill(target.name); await input.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(page.getByText('¡Lo encontraste!',{exact:true})).toBeVisible();
    await expect(art).not.toHaveClass(/silhouette/);
    if (round < 10) await page.getByRole('button',{name:'Siguiente ronda'}).click();
  }
  await expect(page.getByText('Partida terminada: 30 de 30 puntos.')).toBeVisible();
  await page.getByRole('button',{name:'Volver a jugar'}).click();
  await expect(page.getByText('Ronda 1 de 10')).toBeVisible();
});
test('broken images block answers and can be replaced without spending attempts', async ({page}) => {
  let remaining = 1;
  await page.route('**/pokemon/*.webp', route => { if (remaining-- > 0) return route.abort(); return route.continue(); });
  await page.goto('?seed=42#/silueta');
  await expect(page.getByText('No se pudo cargar la silueta.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Nombre del Pokémon')).toBeDisabled();
  await page.getByRole('button',{name:'Cargar otra silueta'}).click();
  await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  await expect(page.getByText('3 intentos disponibles')).toBeVisible();
});
test('routes filters dialogs and small screens remain usable', async ({page},testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('');
  await openSettings(page);
  await page.getByRole('button',{name:'Quitar todas',exact:true}).click();
  await page.getByRole('checkbox',{name:'2 Johto',exact:true}).check();
  await page.getByLabel('Formas regionales').check();
  await closeSettings(page); await page.reload(); await openSettings(page); await expect(page.getByRole('checkbox',{name:'2 Johto',exact:true})).toBeChecked();
  await expect(page.getByRole('checkbox',{name:'1 Kanto',exact:true})).not.toBeChecked();
  await closeSettings(page); await page.getByRole('button',{name:'Ayuda',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await page.screenshot({path:testInfo.outputPath('inicio.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link',{name:/Mayor o menor/}).click();
  await expect(page.locator('[data-answer="equal"]')).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath('bst.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload(); await expect(page.getByRole('heading',{name:'Mayor o menor',exact:true})).toBeVisible();
  await page.goto('#/silueta'); await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  await page.screenshot({path:testInfo.outputPath('silueta.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('continues playing when browser storage is denied', async ({page}) => {
  await page.addInitScript(()=>{ Object.defineProperty(window,'localStorage',{ get(){ throw new Error('storage denied'); } }); });
  await page.goto('?seed=42#/bst'); const answer = await answerFor(page);
  await page.locator(`[data-answer="${answer}"]`).click();
  await expect(page.getByText('¡Correcto!',{exact:true})).toBeVisible();
  await expect(page.getByText('El navegador no permite guardar el récord. Puedes seguir jugando.')).toBeVisible();
});
test('broken BST images preserve the streak and replace the pair', async ({page}) => {
  let remaining = 1;
  await page.route('**/pokemon/*.webp', route => remaining-- > 0 ? route.abort() : route.continue());
  await page.goto('?seed=42#/bst');
  await expect(page.getByRole('button',{name:'Cambiar comparación'})).toBeVisible();
  await expect(page.locator('[data-answer="equal"]')).toBeDisabled();
  await page.getByRole('button',{name:'Cambiar comparación'}).click();
  await expect(page.locator('[data-answer="equal"]')).toBeEnabled();
  await expect(page.locator('.scoreboard')).toContainText('Racha0');
});
test('works at 320px with reduced motion and a keyboard skip link', async ({page}) => {
  await page.setViewportSize({width:320,height:720});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('');
  await page.keyboard.press('Tab'); await expect(page.getByRole('link',{name:'Saltar al contenido'})).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  await expect(page.getByRole('heading',{name:'¿Cuánto sabes de Pokémon?'})).toBeVisible();
  for (const route of ['', '#/bst', '#/silueta']) {
    await page.goto(route || '#/');
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
test('elige cualquier estadística y la conserva al avanzar', async ({page}) => {
  const metrics = ['bst','hp','attack','defense','specialAttack','specialDefense','speed'];
  const labels = ['BST','PS','Ataque','Defensa','Ataque Especial','Defensa Especial','Velocidad'];
  for (let i=0; i<metrics.length; i++) {
    await page.goto('?seed=42#/');
    await openSettings(page); await page.getByLabel('Estadística para comparar').selectOption(metrics[i]); await closeSettings(page);
    await page.getByRole('link',{name:/Mayor o menor/}).click();
    await expect(page.locator('.bst-value>span').first()).toHaveText(labels[i]);
    await expect(page.locator('.scoreboard')).toContainText('Récord0');
    const answer = await answerFor(page,i-1);
    await page.locator(`[data-answer="${answer}"]`).click();
    await expect(page.getByText('¡Correcto!',{exact:true})).toBeVisible();
    await expect(page.locator('.scoreboard')).toContainText('Racha1');
    await page.getByRole('button',{name:'Siguiente Pokémon'}).click();
    await expect(page.locator('.bst-value>span').last()).toHaveText(labels[i]);
    await page.reload();
    await expect(page.locator('.scoreboard')).toContainText('Récord1');
  }
});
test('selecciona varias generaciones y conserva solo las elegidas', async ({page}) => {
  await page.goto('');
  await openSettings(page);
  await page.getByRole('button',{name:'Quitar todas',exact:true}).click();
  await expect(page.getByText('Selecciona al menos una generación para jugar.')).toBeVisible();
  await expect(page.getByRole('link',{name:/Mayor o menor/})).toHaveAttribute('aria-disabled','true');
  for (const name of ['1 Kanto','3 Hoenn','6 Kalos']) await page.getByRole('checkbox',{name,exact:true}).check();
  await page.reload();
  await openSettings(page); await expect(page.locator('[name="generations"]:checked')).toHaveCount(3); await closeSettings(page);
  await page.getByRole('link',{name:/Mayor o menor/}).click();
  await expect(page.locator('[data-answer="equal"]')).toBeEnabled();
  const ids = await page.locator('.duel img').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLImageElement).src.match(/\/(\d+)\.webp/)![1])));
  for (const id of ids) expect([1,3,6]).toContain(data.species.find(s=>s.id===data.pokemon.find(p=>p.id===id)!.speciesId)!.generation);
  await page.getByRole('link',{name:'Volver a los juegos'}).click();
  await page.getByRole('link',{name:/¿Quién es este Pokémon/}).click();
  await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  const id = Number((await page.locator('.silhouette-screen img').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);
  expect([1,3,6]).toContain(data.species.find(s=>s.id===id)!.generation);
});
test('amplía la silueta con cada fallo y la revela al acertar', async ({page},testInfo) => {
  await page.goto('?seed=42#/silueta');
  const window = page.locator('.silhouette-window');
  await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  const id = Number((await window.locator('img').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);
  const target = data.pokemon.find(p=>p.id===id)!;
  const wrong = data.pokemon.filter(p=>p.kind==='default' && p.speciesId!==target.speciesId).slice(0,2);
  async function guess(name: string) { await page.getByLabel('Nombre del Pokémon').fill(name); await page.locator('#suggestions button').first().click(); }
  await expect(window).toHaveAttribute('data-reveal','120');
  const initial = await window.locator('img').evaluate(el=>getComputedStyle(el).maskImage);
  await page.screenshot({path:testInfo.outputPath('silueta-inicial.png'),fullPage:true});
  await guess(wrong[0].name);
  await expect(window).toHaveAttribute('data-reveal','210');
  await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  await guess(wrong[0].name);
  await expect(window).toHaveAttribute('data-reveal','210');
  await expect(page.getByText('Ya probaste ese Pokémon. Elige otro nombre.')).toBeVisible();
  await guess(wrong[1].name);
  await expect(window).toHaveAttribute('data-reveal','300');
  const expanded = await window.locator('img').evaluate(el=>getComputedStyle(el).maskImage);
  expect(expanded).not.toBe(initial);
  await page.screenshot({path:testInfo.outputPath('silueta-ampliada.png'),fullPage:true});
  await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  await guess(target.name);
  await expect(window).toHaveAttribute('data-reveal','360');
  await expect(window.locator('img')).not.toHaveClass(/silhouette/);
  await expect(page.locator('.scoreboard')).toContainText('Puntos1');
});
test('mantiene superficies oscuras y controles legibles', async ({page}) => {
  await page.goto('');
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(17, 20, 25)');
  await openSettings(page);
  const contrast = await page.locator('#select-all').evaluate(element => {
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(c => { const n=c/255; return n<=.04045 ? n/12.92 : ((n+.055)/1.055)**2.4; });
      return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
    };
    let background: Element = element;
    while (background.parentElement && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background=background.parentElement;
    const foreground = luminance(getComputedStyle(element).color);
    const surface = luminance(getComputedStyle(background).backgroundColor);
    return (Math.max(foreground,surface)+.05)/(Math.min(foreground,surface)+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await expect(page.getByLabel('Estadística para comparar')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('pokejuegos:v1:settings'))localStorage.setItem('pokejuegos:v1:settings',JSON.stringify({generations:[1,2,3,4,5,6,7,8,9],metric:'bst',forms:false,battle:false}));});});
