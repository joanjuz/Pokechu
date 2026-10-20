import {test,expect,type Page} from '@playwright/test';
import catalogData from '../../data/generated/catalog.json' with {type:'json'};
import gridData from '../../data/generated/grid.json' with {type:'json'};
import type {Catalog,Pokemon} from '../../src/domain/pokemon/types';
import {createGrid,gridCandidates,solveGrid,type GridData} from '../../src/games/grid/rules';
import {seededRandom,selectPokemon} from '../../src/shared/random';
const catalog=catalogData as Catalog,data=gridData as GridData,entries=catalog.pokemon.filter(p=>p.kind==='default');
async function choose(page:Page,name:string){const input=page.getByLabel('Nombre del Pokémon');await input.fill(name);await input.press('ArrowDown');await input.press('Enter');}
async function audioSpy(page:Page){await page.addInitScript(()=>{window.testAudios=[];const Original=window.Audio;window.Audio=function(src?:string){const audio=new Original(src);window.testAudios.push(audio);return audio;} as unknown as typeof Audio;});}
async function cryId(page:Page){return page.evaluate(()=>Number(window.testAudios.at(-1)!.src.match(/\/(\d+)\.(ogg|mp3)/)![1]));}

test('aleatoria es predeterminada y modo infinito permanece al final en escritorio y móvil',async({page},info)=>{
  for(const width of [320,1280]){await page.setViewportSize({width,height:900});await page.goto('');await expect(page.locator('.game-tile')).toHaveCount(11);await expect(page.locator('.game-tile').last()).toHaveAttribute('href','#/infinito');await expect(page.getByLabel('Estadística para comparar')).toHaveValue('random');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.screenshot({path:info.outputPath('inicio-orden.png'),fullPage:true});
});

test('mayor o menor evalúa izquierda frente a derecha con la métrica visible',async({page})=>{
  await page.goto('?seed=42#/bst');await expect(page.locator('[data-answer="higher"]')).toBeEnabled();
  const metric=await page.locator('[data-metric]').getAttribute('data-metric'),metrics=['hp','attack','defense','specialAttack','specialDefense','speed'];
  const ids=await page.locator('.duel img').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLImageElement).src.match(/\/(\d+)\.webp/)![1])));
  const values=ids.map(id=>{const p=entries.find(p=>p.id===id)!;return metric==='bst'?p.stats.reduce((a,b)=>a+b,0):p.stats[metrics.indexOf(metric!)];});
  await expect(page.locator('.game-instruction')).toContainText('el valor de la izquierda');await expect(page.getByRole('button',{name:'Mayor',exact:true})).toBeVisible();
  await page.locator(`[data-answer="${values[0]>values[1]?'higher':values[0]<values[1]?'lower':'equal'}"]`).click();await expect(page.getByText('¡Correcto!',{exact:true})).toBeVisible();await expect(page.locator('.result')).toContainText(`${values[0]} frente a ${values[1]}`);
});

test('tabla pierde tres vidas y revela una solución válida sin premiar las respuestas mostradas',async({page},info)=>{
  await page.goto('?seed=42#/tabla');const board=createGrid(entries,catalog,data,seededRandom(42))!,solution=solveGrid(board,entries,catalog,data)!;
  await expect(page.locator('.grid-lives')).toHaveText('3/3');await choose(page,solution[0].name);const wrong=entries.find(p=>!gridCandidates(board,1,[p],catalog,data).length)!;
  for(let lives=2;lives>=0;lives--){await choose(page,wrong.name);await expect(page.locator('.grid-lives')).toHaveText(`${lives}/3`);if(lives)await expect(page.locator('[data-cell="0"]')).toHaveAttribute('data-pokemon',String(solution[0].id));}
  await expect(page.getByText('Esta es una posible combinación completa.',{exact:true})).toBeVisible();await expect(page.locator('[data-cell]:enabled')).toHaveCount(0);
  const ids=await page.locator('[data-cell]').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).dataset.pokemon)));expect(new Set(ids.map(id=>entries.find(p=>p.id===id)!.speciesId)).size).toBe(9);for(let i=0;i<9;i++)expect(gridCandidates(board,i,[entries.find(p=>p.id===ids[i])!],catalog,data)).toHaveLength(1);
  await expect(page.locator('.player-summary')).toContainText('1 punto');await page.screenshot({path:info.outputPath('tabla-solucion.png'),fullPage:true});await page.getByRole('button',{name:'Otra tabla',exact:true}).click();await expect(page.locator('.grid-lives')).toHaveText('3/3');await expect(page.locator('[data-cell][data-pokemon]')).toHaveCount(0);
});

test('gritos supera diez aciertos y el primer fallo termina la racha sin avanzar',async({page})=>{
  await audioSpy(page);await page.clock.install();await page.goto('?seed=42#/gritos');const ids:number[]=[];
  for(let i=0;i<11;i++){const id=await cryId(page);ids.push(id);await page.getByRole('button',{name:'Escuchar grito',exact:true}).click();await expect(page.locator(`[data-choice="${id}"]`)).toBeEnabled();await page.locator(`[data-choice="${id}"]`).click();await expect(page.locator('.scoreboard')).toContainText(`Racha${i+1}`);await page.getByRole('button',{name:'Siguiente grito',exact:true}).click();}
  expect(new Set(ids).size).toBe(11);await expect(page.locator('.round-header')).toContainText('Grito 12');const target=await cryId(page);await page.getByRole('button',{name:'Escuchar grito',exact:true}).click();const wrong=page.locator(`[data-choice]:not([data-choice="${target}"])`).first();await expect(wrong).toBeEnabled();await wrong.click();await expect(page.locator('.cry-result')).toContainText('Fin de la racha: 11 aciertos.');await page.clock.runFor(5000);await expect(page.locator('.round-header')).toContainText('Grito 12');await expect(page.locator('[data-choice]:enabled')).toHaveCount(0);await expect(page.locator('.player-summary')).toContainText('11 puntos');await page.getByRole('button',{name:'Volver a jugar',exact:true}).click();await expect(page.locator('.scoreboard')).toContainText('Racha0');await expect(page.locator('.scoreboard')).toContainText('Récord11');
});

test('Pokédle ofrece pistas sin revelar la respuesta evita repetidos y registra solo al acertar',async({page},info)=>{
  await page.setViewportSize({width:320,height:900});await page.goto('?seed=42#/pokedle');const target=selectPokemon(entries,[],seededRandom(42))!,wrong=entries.find(p=>p.speciesId!==target.speciesId)!;
  await expect(page.locator('.pokedle-result')).toHaveCount(0);await choose(page,wrong.name);await expect(page.locator('.pokedle-guess')).toHaveCount(1);await expect(page.locator('.pokedle-guess .clue')).toHaveCount(7);await expect(page.locator('.pokedle-guess .miss')).not.toHaveCount(0);await expect(page.locator('.player-summary')).toContainText('0 puntos');await choose(page,wrong.name);await expect(page.locator('.pokedle-feedback')).toContainText('Consulta sus pistas');await expect(page.locator('.pokedle-guess')).toHaveCount(1);await expect(page.locator('.scoreboard')).toContainText('Libre');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('pokedle-pistas.png'),fullPage:true});
  await choose(page,target.name);await expect(page.getByText('¡Pokémon encontrado!',{exact:true})).toBeVisible();await expect(page.locator('.pokedle-guess').first().locator('.match')).toHaveCount(7);await expect(page.locator('.player-summary')).toContainText('1 punto');await page.locator('.nav-dex').click();await expect(page.locator('.dex-entry.registered')).toHaveCount(1);
});

test('Pokédle permite seguir tras dieciséis propuestas cambiar de Pokémon y resolver sin límite',async({page})=>{
  await page.goto('?seed=42#/pokedle');const target=selectPokemon(entries,[],seededRandom(42))!;
  for(const p of entries.filter(p=>p.speciesId!==target.speciesId).slice(0,16))await choose(page,p.name);
  await expect(page.locator('.pokedle-guess')).toHaveCount(16);await expect(page.locator('.pokedle-result')).toHaveCount(0);await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();await expect(page.locator('.scoreboard')).toContainText('Libre');await expect(page.locator('.player-summary')).toContainText('0 puntos');
  await choose(page,target.name);await expect(page.getByText('¡Pokémon encontrado!',{exact:true})).toBeVisible();await expect(page.locator('.player-summary')).toContainText('1 punto');
  await page.getByRole('button',{name:'Otro Pokémon',exact:true}).click();await expect(page.locator('.pokedle-guess')).toHaveCount(0);await choose(page,target.name);await expect(page.locator('.pokedle-result')).toHaveCount(0);
  await page.getByRole('button',{name:'Cambiar Pokémon',exact:true}).click();await expect(page.locator('.pokedle-guess')).toHaveCount(0);await expect(page.getByLabel('Nombre del Pokémon')).toBeEnabled();await expect(page.locator('.player-summary')).toContainText('1 punto');
});

test('infinito conserva las vidas de tabla y termina solo al agotar las tres',async({page})=>{
  await page.goto('?seed=42#/infinito');for(const input of await page.locator('[name="infinite-game"]').all())await input.setChecked(await input.getAttribute('value')==='tabla');await page.getByRole('button',{name:'Empezar racha'}).click();
  const board=createGrid(entries,catalog,data,seededRandom(42))!,wrong=entries.find(p=>!gridCandidates(board,0,[p],catalog,data).length)!;
  for(let i=0;i<3;i++){await choose(page,wrong.name);if(i<2){await expect(page.locator('.infinite-challenge')).not.toHaveAttribute('inert');await expect(page.locator('.grid-lives')).toHaveText(`${2-i}/3`);}}
  await expect(page.locator('.infinite-status')).toHaveText('Fin de la racha: 0 puntos.');await expect(page.locator('.grid-lives')).toHaveText('0/3');await expect(page.locator('[data-cell][data-pokemon]')).toHaveCount(9);
});

test('Pokédle en infinito espera el acierto completo antes de sumar un punto',async({page})=>{
  await page.goto('?seed=42#/infinito');for(const input of await page.locator('[name="infinite-game"]').all())await input.setChecked(await input.getAttribute('value')==='pokedle');await page.getByRole('button',{name:'Empezar racha'}).click();const target=selectPokemon(entries,[],seededRandom(42))!;
  await choose(page,entries.find(p=>p.speciesId!==target.speciesId)!.name);await expect(page.locator('.infinite-score')).toHaveText('0');await expect(page.locator('.infinite-challenge')).not.toHaveAttribute('inert');await choose(page,target.name);await expect(page.locator('.infinite-score')).toHaveText('1');await expect(page.locator('.player-summary')).toContainText('1 punto');
});
