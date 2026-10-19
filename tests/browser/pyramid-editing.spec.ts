import {expect,test,type Page} from '@playwright/test';
import data from '../../data/generated/catalog.json' with {type:'json'};
async function fillWrong(page:Page){
  const ids=await page.locator('.palette-piece').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.pokemon)));
  ids.sort((a,b)=>data.pokemon.find(p=>p.id===a)!.stats.reduce((x,y)=>x+y,0)-data.pokemon.find(p=>p.id===b)!.stats.reduce((x,y)=>x+y,0));
  for(let i=0;i<10;i++){await page.locator(`.palette-piece[data-pokemon="${ids[i]}"]`).click();await page.locator(`[data-slot="${i}"]`).click();}
  return ids;
}
test('arrastra intercambia y devuelve Pokémon antes de confirmar',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:1200});
  await page.goto('?seed=42#/piramide');await expect(page.locator('.palette-piece')).toHaveCount(10);
  await expect(page.getByRole('button',{name:'Confirmar pirámide',exact:true})).toBeDisabled();
  const first=Number(await page.locator('.palette-piece').nth(0).getAttribute('data-pokemon'));const second=Number(await page.locator('.palette-piece').nth(1).getAttribute('data-pokemon'));
  await page.locator(`.palette-piece[data-pokemon="${first}"]`).dragTo(page.locator('[data-slot="0"]'));
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-pokemon',String(first));
  await page.locator(`.palette-piece[data-pokemon="${second}"]`).dragTo(page.locator('[data-slot="1"]'));
  await page.locator('[data-slot="0"]').dragTo(page.locator('[data-slot="1"]'));
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-pokemon',String(second));await expect(page.locator('[data-slot="1"]')).toHaveAttribute('data-pokemon',String(first));
  await page.locator('[data-slot="1"]').click();await page.getByRole('button',{name:'Devolver a disponibles'}).click();
  await expect(page.locator('.palette-piece')).toHaveCount(9);await expect(page.locator('.scoreboard')).toContainText('Vidas7/7');await expect(page.locator('.evaluated-stat')).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('piramide-editable.png'),fullPage:true});
});
test('agota siete vidas sin reintentar y revela los valores solo al final',async({page},testInfo)=>{
  await page.goto('?seed=42#/piramide');const ids=await fillWrong(page);
  for(let attempt=1;attempt<=7;attempt++){
    await expect(page.locator('.evaluated-stat')).toHaveCount(0);await page.getByRole('button',{name:'Confirmar pirámide',exact:true}).click();
    await expect(page.locator('.scoreboard')).toContainText(`Vidas${7-attempt}/7`);
    const positions=await page.locator('[data-slot]').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.pokemon)));expect(positions).toEqual(ids);
    if(attempt<7){await expect(page.locator('.evaluated-stat')).toHaveCount(0);await expect(page.getByRole('button',{name:'Reintentar',exact:true})).toHaveCount(0);await expect(page.locator('[data-slot="0"]')).toBeEnabled();await expect(page.locator('[data-slot="0"]')).toHaveAttribute('draggable','true');}
  }
  await expect(page.getByText('Sin vidas',{exact:true})).toBeVisible();await expect(page.locator('.evaluated-stat')).toHaveCount(10);
  await expect(page.locator('[data-slot]').first()).toBeDisabled();await page.screenshot({path:testInfo.outputPath('piramide-final.png'),fullPage:true});
});
test('arrastra Pokémon con eventos táctiles reales del navegador',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('?seed=42#/piramide');
  const source=page.locator('.palette-piece').first();await source.scrollIntoViewIfNeeded();const id=await source.getAttribute('data-pokemon');
  const a=await source.boundingBox();const b=await page.locator('[data-slot="0"]').boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();
  const session=await context.newCDPSession(page);await session.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const x=a!.x+a!.width/2,y=a!.y+a!.height/2,tx=b!.x+b!.width/2,ty=820;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/12,y:y+(ty-y)*i/12}]});
  await expect.poll(async()=>{const box=await page.locator('[data-slot="0"]').boundingBox();return !!box&&box.y>0&&box.y+box.height<800;}).toBe(true);
  const destination=(await page.locator('[data-slot="0"]').boundingBox())!;await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:destination.x+destination.width/2,y:destination.y+destination.height/2}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-pokemon',id!);await expect(page.locator('.pyramid-drag-ghost')).toHaveCount(0);
});
test('autocompleta nombres en pasapalabra sin responder al elegir una sugerencia',async({page})=>{
  await page.goto('?seed=42#/pasapalabra');const input=page.getByLabel('Tu respuesta');await input.fill('bascu');
  await expect(page.getByRole('option',{name:'Basculegion',exact:true})).toBeVisible();
  await page.getByRole('option',{name:'Basculegion',exact:true}).click();await expect(input).toHaveValue('Basculegion');
  await expect(page.locator('.scoreboard')).toContainText('Aciertos0/26');await expect(page.locator('.rosco-letter.wrong')).toHaveCount(0);
  await input.fill('mew');await input.press('ArrowDown');await input.press('Enter');await expect(input).toHaveValue('Mew');await expect(page.locator('.rosco-letter.wrong')).toHaveCount(0);
});
test('autocompleta también en siluetas y no repite números de Pokédex en preguntas',async({page})=>{
  await page.goto('?seed=42#/silueta');await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();await page.getByLabel('Nombre del Pokémon').fill('bascu');await expect(page.getByRole('option',{name:'Basculegion',exact:true})).toBeVisible();
  await page.goto('?seed=42#/pasapalabra');const clues=new Set<string>();
  for(let i=0;i<8;i++){const clue=await page.locator('.question-clue').innerText();expect(clue).not.toContain('Pokédex');clues.add(clue);await page.getByRole('button',{name:'Pasapalabra',exact:true}).click();}
  expect(clues.size).toBe(8);
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('pokejuegos:v1:settings'))localStorage.setItem('pokejuegos:v1:settings',JSON.stringify({generations:[1,2,3,4,5,6,7,8,9],metric:'bst',forms:false,battle:false}));});});
