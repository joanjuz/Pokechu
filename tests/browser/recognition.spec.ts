import { test, expect, type Page } from '@playwright/test';
import data from '../../data/generated/catalog.json' with { type: 'json' };
import media from '../../data/generated/recognition.json' with { type: 'json' };
declare global { interface Window { testAudios: HTMLAudioElement[] } }
async function choose(page: Page, id: number) {
  const name = data.pokemon.find(p => p.id === id)!.name;
  const input = page.getByLabel('Nombre del Pokémon');
  await input.fill(name); await input.press('ArrowDown'); await input.press('Enter');
  await expect(input).toHaveValue(name);
  await page.getByRole('button', { name: 'Responder', exact: true }).click();
}
async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    window.testAudios = [];
    const NativeAudio = window.Audio;
    window.Audio = function(src?: string) { const audio = new NativeAudio(src); window.testAudios.push(audio); return audio; } as unknown as typeof Audio;
  });
}
async function openSettings(page: Page) { if (!await page.locator('.game-sidebar').isVisible()) await page.getByRole('button', { name: 'Ajustes', exact: true }).click(); }
async function closeSettings(page: Page) { const close = page.getByRole('button', { name: 'Cerrar ajustes', exact: true }); if (await close.isVisible()) await close.click(); }

test('mueve imágenes transparentes en la pirámide sin fondos ni bordes de carta', async ({ page }, info) => {
  await page.goto('?seed=42#/piramide');
  const piece = page.locator('.palette-piece').first(); const id = await piece.getAttribute('data-pokemon');
  await expect(piece).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(piece).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await piece.click(); await page.locator('[data-slot="0"]').click();
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-pokemon', id!);
  await expect(page.locator('[data-slot="0"]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('[data-slot="0"]')).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  await page.locator('[data-slot="1"]').scrollIntoViewIfNeeded();
  await page.locator('[data-slot="0"]').dragTo(page.locator('[data-slot="1"]'));
  await expect(page.locator('[data-slot="1"]')).toHaveAttribute('data-pokemon', id!);
  await page.screenshot({ path: info.outputPath('piramide-sin-cartas.png'), fullPage: true });
});

test('muestra solo ojos permite autocompletar y completa diez rondas sin repetir', async ({ page }, info) => {
  await page.goto('?seed=42#/ojos'); const seen = new Set<number>();
  for (let round = 1; round <= 10; round++) {
    const input = page.getByLabel('Nombre del Pokémon'); await expect(input).toBeEnabled();
    await expect(page.locator('main img')).toHaveCount(1);
    await expect(page.locator('.eye-clue')).toHaveAttribute('alt', 'Ojos del Pokémon que debes identificar');
    const id = Number((await page.locator('.eye-clue').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);
    expect(seen.has(id)).toBe(false); seen.add(id);
    if (round === 1) await page.screenshot({ path: info.outputPath('ojos.png'), fullPage: true });
    await choose(page, id); await expect(page.getByText('¡Acertaste!', { exact: true })).toBeVisible();
    await expect(page.locator('.recognition-screen img')).toHaveAttribute('alt', data.pokemon.find(p => p.id === id)!.name);
    if (round < 10) await page.getByRole('button', { name: 'Siguiente ronda' }).click();
  }
  await expect(page.getByText('Partida terminada: 30 de 30 puntos.')).toBeVisible();
  await page.reload(); await expect(page.locator('.scoreboard')).toContainText('Récord30');
});

test('no gasta intentos al repetir y revela el Pokémon después de tres fallos', async ({ page }) => {
  await page.goto('?seed=42#/ojos'); await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  const target = Number((await page.locator('.eye-clue').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);
  const wrong = data.pokemon.filter(p => p.kind === 'default' && p.id !== target).slice(0, 3);
  await choose(page, wrong[0].id); await expect(page.locator('.round-header')).toContainText('2 intentos');
  await choose(page, wrong[0].id); await expect(page.getByText('Ya probaste ese Pokémon. Elige otro nombre.')).toBeVisible();
  await expect(page.locator('.round-header')).toContainText('2 intentos');
  await choose(page, wrong[1].id); await choose(page, wrong[2].id);
  await expect(page.getByText(`Era ${data.pokemon.find(p => p.id === target)!.name}`, { exact: true })).toBeVisible();
  await expect(page.locator('.scoreboard')).toContainText('Puntos0'); await expect(page.locator('.eye-clue')).toHaveCount(0);
});

test('permite cambiar ojos que no cargan sin consumir intentos', async ({ page }) => {
  let broken = true;
  await page.route('**/eyes/*.webp', route => { if (broken) { broken = false; return route.abort(); } return route.continue(); });
  await page.goto('?seed=42#/ojos'); await expect(page.getByLabel('Nombre del Pokémon')).toBeDisabled();
  await page.getByRole('button', { name: 'Cambiar ojos sin gastar intento' }).click();
  await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();
  await expect(page.locator('.round-header')).toContainText('Ronda 1 de 10'); await expect(page.locator('.round-header')).toContainText('3 intentos');
});

test('actualiza generaciones en ojos y gritos durante una partida', async ({ page }) => {
  await observeAudio(page);
  for (const route of ['ojos', 'gritos']) {
    await page.goto(`?seed=42#/${route}`); await expect(page.locator(route==='ojos'?'.eye-clue':'.cry-choices')).toBeVisible();
    await openSettings(page); await page.getByRole('button', { name: 'Quitar todas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elige al menos una generación' })).toBeVisible();
    await page.getByRole('checkbox', { name: '9 Paldea', exact: true }).check(); await closeSettings(page);
    await expect(page.locator('.round-header')).toContainText(route === 'ojos' ? 'Ronda 1 de 3' : 'Grito 1');
    if(route==='gritos')await expect.poll(()=>page.evaluate(()=>window.testAudios.at(-1)?.getAttribute('src')||'')).toMatch(/\/cries\/\d+\.(ogg|mp3)$/);
    const id = route === 'ojos' ? Number((await page.locator('.eye-clue').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]) : await page.evaluate(() => Number(window.testAudios.at(-1)!.src.match(/\/(\d+)\.(ogg|mp3)/)![1]));
    expect(data.species.find(s => s.id === data.pokemon.find(p => p.id === id)!.speciesId)!.generation).toBe(9);
    await expect(page.locator('.round-header')).toContainText(route === 'ojos' ? 'Ronda 1 de 3' : 'Grito 1');
  }
});

test('reproduce y repite un grito real con tres opciones de Pokémon y permite acertar', async ({ page }, info) => {
  await observeAudio(page); await page.goto('?seed=42#/gritos');
  await expect(page.locator('main img')).toHaveCount(3); await expect(page.locator('[data-choice]').first()).toBeDisabled();
  expect(await page.evaluate(() => window.testAudios[0].played.length)).toBe(0);
  await page.getByRole('button', { name: 'Escuchar grito', exact: true }).click();
  await expect(page.locator('[data-choice]').first()).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.testAudios[0].played.length)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Volver a escuchar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Volver a escuchar', exact: true }).click();
  await expect(page.locator('.round-header')).toContainText('Una elección');
  await page.screenshot({ path: info.outputPath('gritos.png'), fullPage: true });
  const id = await page.evaluate(() => Number(window.testAudios[0].src.match(/\/(\d+)\.(ogg|mp3)/)![1]));
  await page.locator(`[data-choice="${id}"]`).click(); await expect(page.locator('.cry-result')).toContainText('¡Correcto!');
  await expect(page.locator('.scoreboard')).toContainText('Racha1');
  expect(await page.evaluate(() => window.testAudios[0].paused && !window.testAudios[0].getAttribute('src'))).toBe(true);
});

test('recupera un bloqueo de reproducción sin penalizar y detiene el audio al salir', async ({ page }) => {
  await observeAudio(page);
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play; let blocked = true;
    HTMLMediaElement.prototype.play = function() { if (blocked) { blocked = false; return Promise.reject(new DOMException('Blocked', 'NotAllowedError')); } return play.call(this); };
  });
  await page.goto('?seed=42#/gritos'); await page.getByRole('button', { name: 'Escuchar grito', exact: true }).click();
  await expect(page.locator('.media-status')).toContainText('No se pudo reproducir');
  await expect(page.locator('[data-choice]').first()).toBeDisabled(); await expect(page.locator('.round-header')).toContainText('Una elección');
  await page.getByRole('button', { name: 'Escuchar grito', exact: true }).click(); await expect(page.locator('[data-choice]').first()).toBeEnabled();
  await page.getByRole('link', { name: 'Volver a los juegos', exact: true }).click();
  await expect(page.locator('.game-tile')).toHaveCount(11);
  expect(await page.evaluate(() => window.testAudios.every(a => a.paused && !a.getAttribute('src')))).toBe(true);
});

test('cambia un archivo de audio roto manteniendo ronda y oportunidades', async ({ page }) => {
  await observeAudio(page); let broken = true;
  await page.route('**/cries/*', route => { if (broken) return route.abort(); return route.continue(); });
  await page.goto('?seed=42#/gritos'); await expect(page.getByRole('button', { name: 'Cambiar grito sin gastar intento' })).toBeVisible();
  broken = false; await page.getByRole('button', { name: 'Cambiar grito sin gastar intento' }).click();
  await expect(page.locator('.round-header')).toContainText('Grito 1'); await expect(page.locator('.round-header')).toContainText('Una elección');
  await page.getByRole('button', { name: 'Escuchar grito', exact: true }).click(); await expect(page.locator('[data-choice]').first()).toBeEnabled();
});

test('los archivos de gritos Ogg y MP3 se decodifican en el navegador', async ({ page }) => {
  await page.goto('');
  const files = [media.cries['1'].path, media.cries['25'].path, media.cries['906'].path];
  const results = await page.evaluate(async paths => Promise.all(paths.map(path => new Promise<boolean>(resolve => {
    const audio = new Audio('/PokeJuegos/' + path);
    audio.onloadedmetadata = () => { resolve(Number.isFinite(audio.duration) && audio.duration > 0); audio.removeAttribute('src'); audio.load(); };
    audio.onerror = () => resolve(false);
  }))), files);
  expect(results).toEqual([true, true, true]);
});

test('presenta los once juegos sin desbordamiento en pantallas pequeñas', async ({ page }, info) => {
  await page.goto(''); await expect(page.locator('.game-tile')).toHaveCount(11);
  await expect(page.locator('.game-library')).not.toContainText('undefined');
  for (const route of ['ojos', 'gritos']) {
    await page.locator(`a[href="#/${route}"]`).click(); await expect(page.locator(route==='ojos'?'.recognition-screen':'.cry-question')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Volver a los juegos', exact: true }).click();
  }
  await page.screenshot({ path: info.outputPath('seis-juegos.png'), fullPage: true });
});
