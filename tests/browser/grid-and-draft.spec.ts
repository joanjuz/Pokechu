import {test,expect,type Page} from '@playwright/test';
import imported from '../../data/generated/catalog.json' with {type:'json'};
import abilities from '../../data/generated/grid.json' with {type:'json'};
import type {Catalog,Pokemon} from '../../src/domain/pokemon/types';
import {solveGrid,gridCandidates,type Criterion,type GridBoard,type GridData} from '../../src/games/grid/rules';
const catalog=imported as Catalog,data=abilities as GridData,entries=catalog.pokemon.filter(p=>p.kind==='default');
async function readBoard(page:Page):Promise<GridBoard>{
  const criterion=(raw:{kind:string;value:string}):Criterion=>raw.kind==='type'?{kind:'type',value:raw.value}:{kind:raw.kind as 'ability'|'generation',value:Number(raw.value)};
  const rows=await page.locator('.pokemon-grid tbody th').evaluateAll(nodes=>nodes.map(node=>({kind:(node as HTMLElement).dataset.kind!,value:(node as HTMLElement).dataset.value!})));
  const columns=await page.locator('.pokemon-grid thead th').evaluateAll(nodes=>nodes.map(node=>({kind:(node as HTMLElement).dataset.kind!,value:(node as HTMLElement).dataset.value!})));
  const ids=await page.locator('[data-cell]').evaluateAll(nodes=>nodes.map(node=>Number((node as HTMLElement).dataset.pokemon)||null));return {rows:rows.map(criterion),columns:columns.map(criterion),slots:ids.map(id=>entries.find(p=>p.id===id)||null)};
}
async function place(page:Page,index:number,pokemon:Pokemon){await page.locator(`[data-cell="${index}"]`).click();const input=page.getByLabel('Nombre del Pokémon');await input.fill(pokemon.name);await input.press('ArrowDown');await input.press('Enter');}
function bruteOptimum(deck:Pokemon[]):number{function visit(row:number,used:number):number{if(row===6)return 0;let maximum=0;for(let stat=0;stat<6;stat++)if(!(used&(1<<stat)))maximum=Math.max(maximum,deck[row].stats[stat]+visit(row+1,used|(1<<stat)));return maximum;}return visit(0,0);}

test('navegación superior muestra Minijuegos Pokédex y Logros juntos también a 320 píxeles',async({page},info)=>{
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});await page.goto('');const nav=page.locator('.site-header nav');for(const name of ['Minijuegos','Pokédex','Logros'])await expect(nav.getByRole('link',{name,exact:true})).toBeVisible();const boxes=await Promise.all(['Minijuegos','Pokédex','Logros'].map(name=>nav.getByRole('link',{name,exact:true}).boundingBox()));expect(Math.max(...boxes.map(b=>b!.y))-Math.min(...boxes.map(b=>b!.y))).toBeLessThan(5);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await nav.getByRole('link',{name:'Pokédex',exact:true}).click();await expect(nav.getByRole('link',{name:'Pokédex',exact:true})).toHaveAttribute('aria-current','page');await nav.getByRole('link',{name:'Logros',exact:true}).click();await expect(page.locator('.achievements')).toBeVisible();await nav.getByRole('link',{name:'Minijuegos',exact:true}).click();await expect(page.locator('.game-tile')).toHaveCount(11);}
  await page.screenshot({path:info.outputPath('navegacion-superior.png')});
});

test('tabla rechaza cruces erróneos y especies repetidas y muestra el sprite al elegir',async({page},info)=>{
  await page.goto('?seed=42#/tabla');await expect(page.locator('[data-cell]')).toHaveCount(9);const board=await readBoard(page),solution=solveGrid(board,entries,catalog,data)!;
  await place(page,0,solution[0]);await expect(page.locator('[data-cell="0"]')).toHaveAttribute('data-pokemon',String(solution[0].id));await expect(page.locator('[data-cell="0"] img')).toHaveAttribute('alt',solution[0].name);await expect(page.locator('.player-summary')).toContainText('1 punto');
  await place(page,1,solution[0]);await expect(page.locator('.grid-feedback')).toContainText('No se puede repetir');await expect(page.locator('[data-cell][data-pokemon]')).toHaveCount(1);
  const wrong=entries.find(p=>!gridCandidates(board,1,[p],catalog,data).length)!;await place(page,1,wrong);await expect(page.locator('.grid-feedback')).toContainText('no cumple las dos pistas');await expect(page.locator('.player-summary')).toContainText('1 punto');
  await page.locator('[data-cell="0"]').click();await page.getByRole('button',{name:'Vaciar esta casilla'}).click();await expect(page.locator('[data-cell="0"]')).not.toHaveAttribute('data-pokemon');await place(page,0,solution[0]);await expect(page.locator('.player-summary')).toContainText('1 punto');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('tabla-cruces.png'),fullPage:true});
});

test('tabla completa nueve cruces sin repetir y registra las especies por perfil',async({page})=>{
  await page.goto('?seed=42#/tabla');await expect(page.locator('[data-cell]')).toHaveCount(9);const solution=solveGrid(await readBoard(page),entries,catalog,data)!;
  for(let i=0;i<9;i++)await place(page,i,solution[i]);await expect(page.getByText('¡Tabla completada!',{exact:true})).toBeVisible();await expect(page.locator('[data-cell]:enabled')).toHaveCount(0);await expect(page.locator('.player-summary')).toContainText('9 puntos');
  await page.locator('.site-header .nav-dex').click();await expect(page.locator('.dex-entry.registered')).toHaveCount(9);
});

test('tabla participa en infinito y solo cambia de reto al completar las nueve casillas',async({page})=>{
  await page.goto('?seed=42#/infinito');await expect(page.locator('[name="infinite-game"]')).toHaveCount(8);for(const input of await page.locator('[name="infinite-game"]').all())await input.setChecked(await input.getAttribute('value')==='tabla');await page.getByRole('button',{name:'Empezar racha'}).click();await expect(page.locator('[data-cell]')).toHaveCount(9);const solution=solveGrid(await readBoard(page),entries,catalog,data)!;
  await place(page,0,solution[0]);await expect(page.locator('.infinite-score')).toHaveText('0');for(let i=1;i<9;i++)await place(page,i,solution[i]);await expect(page.locator('.infinite-score')).toHaveText('1');await expect(page.locator('.player-summary')).toContainText('1 punto');await expect(page.locator('.infinite-status')).toContainText('Reto 2:');
});

test('constructor asigna una stat distinta por turno y compara el BST con el óptimo real sin premios',async({page},info)=>{
  await page.goto('?seed=42#/estadisticas');const deck:Pokemon[]=[];
  for(let stat=0;stat<6;stat++){await expect(page.locator('.draft-current img')).toBeVisible();const id=Number((await page.locator('.draft-current img').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);deck.push(entries.find(p=>p.id===id)!);await expect(page.locator('.draft-option:disabled')).toHaveCount(stat);if(stat===0)await page.screenshot({path:info.outputPath('construye-bst.png'),fullPage:true});await page.locator(`[data-stat="${stat}"]`).evaluate(node=>{const button=node as HTMLButtonElement;button.click();button.click();});}
  await expect(page.getByText('Combinación terminada',{exact:true})).toBeVisible();await expect(page.locator('.draft-total')).toHaveText(String(deck.reduce((sum,p,i)=>sum+p.stats[i],0)));await expect(page.locator('.perfect-total')).toHaveText(String(bruteOptimum(deck)));for(let stat=0;stat<6;stat++)await expect(page.locator('.draft-slot>strong').nth(stat)).toHaveText(String(deck[stat].stats[stat]));await expect(page.locator('.player-summary')).toContainText('0 puntos');await expect(page.locator('.draft-comparison tbody tr')).toHaveCount(6);await page.screenshot({path:info.outputPath('bst-optimo.png'),fullPage:true});
  await page.locator('.site-header .nav-dex').click();await expect(page.locator('.dex-entry.registered')).toHaveCount(0);await page.goto('#/infinito');await expect(page.locator('[name="infinite-game"][value="estadisticas"]')).toHaveCount(0);await expect(page.locator('[name="infinite-game"][value="tabla"]')).toBeVisible();
});

test('constructor oculta todos los valores hasta terminar los seis turnos',async({page})=>{
  await page.goto('?seed=42#/estadisticas');
  for(let turn=0;turn<6;turn++){
    await expect(page.locator('.draft-option strong')).toHaveText(Array(6).fill('?'));
    await expect(page.locator('.draft-slot.assigned>strong')).toHaveText(Array(turn).fill('?'));
    await expect(page.locator('.draft-total,.perfect-total,.draft-comparison')).toHaveCount(0);
    await page.locator(`[data-stat="${turn}"]`).click();
  }
  await expect(page.locator('.draft-slot>strong')).toHaveText(['80','125','40','65','115','55']);
  await expect(page.locator('.draft-total')).toHaveText('480');await expect(page.locator('.perfect-total')).toHaveText('600');
});

test('tabla y constructor aplican generaciones al instante y caben a 320 píxeles',async({page})=>{
  await page.setViewportSize({width:320,height:900});
  for(const route of ['tabla','estadisticas']){
    await page.goto(`?seed=42#/${route}`);await expect(page.locator('h1')).toBeVisible();
    await page.getByRole('button',{name:'Ajustes',exact:true}).click();await page.getByRole('button',{name:'Quitar todas',exact:true}).click();await expect(page.getByRole('heading',{name:'Elige al menos una generación'})).toBeVisible();
    await page.getByRole('checkbox',{name:'6 Kalos',exact:true}).check();await expect(page.locator('.config-update')).toContainText('Nueva partida');await page.getByRole('button',{name:'Cerrar ajustes',exact:true}).click();
    if(route==='tabla'){await expect(page.locator('[data-cell]')).toHaveCount(9);const filtered=entries.filter(p=>catalog.species.find(s=>s.id===p.speciesId)!.generation===6);const solution=solveGrid(await readBoard(page),filtered,catalog,data)!;expect(solution).toHaveLength(9);await place(page,0,solution[0]);await expect(page.locator('[data-cell="0"]')).toHaveAttribute('data-pokemon',String(solution[0].id));}
    else{await expect(page.locator('.draft-current img')).toBeVisible();const id=Number((await page.locator('.draft-current img').getAttribute('src'))!.match(/\/(\d+)\.webp/)![1]);expect(catalog.species.find(s=>s.id===entries.find(p=>p.id===id)!.speciesId)!.generation).toBe(6);await page.locator('[data-stat="0"]').click();await expect(page.locator('.draft-option:disabled')).toHaveCount(1);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
