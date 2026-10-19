import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const catalog = JSON.parse(await readFile('data/generated/catalog.json', 'utf8'));
const lock = JSON.parse(await readFile('data/sources.lock.json', 'utf8'));
const ids = new Set();
const species = new Map(catalog.species.map(s => [s.id, s]));
for (const p of catalog.pokemon) {
  if (ids.has(p.id) || !species.has(p.speciesId) || p.stats.length !== 6 || p.stats.some(n => !Number.isInteger(n) || n < 1) || !p.types.length) throw new Error(`Entrada inválida: ${p.id}`);
  if (!['default', 'regional', 'battle', 'variant'].includes(p.kind)) throw new Error(`Forma sin clasificar: ${p.id}`);
  ids.add(p.id);
  const hash = createHash('sha256').update(await readFile(`public/${p.image}`)).digest('hex');
  if (hash !== lock.imageSha256[p.image]) throw new Error(`Imagen alterada: ${p.image}`);
}
for (const [name, hash] of Object.entries(lock.csvSha256)) {
  if (createHash('sha256').update(await readFile(`data/raw/${name}.csv`)).digest('hex') !== hash) throw new Error(`CSV alterado: ${name}`);
}
console.log(`Catálogo válido: ${catalog.pokemon.length} entradas, imágenes y CSV verificados por SHA-256.`);
const quiz=JSON.parse(await readFile('data/generated/quiz.json','utf8'));
if(quiz.catalogVersion!==catalog.version||quiz.sourceRevision!==lock.dataRevision)throw new Error('Las preguntas no corresponden a la revisión del catálogo');
const quizIds=new Set();
for(const question of quiz.questions){if(!species.has(question.speciesId)||quizIds.has(question.speciesId)||!question.clue||question.clue.includes('Pokédex')||!Array.isArray(question.factKeys)||question.factKeys.length<2)throw new Error('Pregunta sin correspondencia válida');quizIds.add(question.speciesId);}
if(quiz.questions.length!==catalog.pokemon.filter(p=>p.kind==='default').length)throw new Error('Banco de preguntas incompleto');
console.log(`${quiz.questions.length} preguntas verificadas contra el catálogo y su revisión.`);
const media = JSON.parse(await readFile('data/generated/recognition.json', 'utf8'));
if (media.catalogVersion !== catalog.version || media.artworkRevision !== lock.spriteRevision || !/^[a-f0-9]{40}$/.test(media.cryRevision)) throw new Error('Recursos de reconocimiento sin revisión válida');
if (createHash('sha256').update(await readFile('data/eye-regions.json')).digest('hex') !== media.maskSha256) throw new Error('Regiones de ojos alteradas: regenerar recursos');
for (const kind of ['eyes', 'cries']) {
  for (const [id, entry] of Object.entries(media[kind])) {
    if (!catalog.pokemon.some(p => p.id === Number(id) && p.kind === 'default')) throw new Error(`Recurso sin Pokémon habitual: ${id}`);
    const bytes = await readFile(`public/${entry.path}`);
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Recurso alterado: ${entry.path}`);
    if (kind === 'cries' && bytes.subarray(0,4).toString() !== 'OggS' && bytes.subarray(0,3).toString() !== 'ID3' && !(bytes[0] === 255 && (bytes[1] & 224) === 224)) throw new Error(`Audio inválido: ${id}`);
  }
}
if (catalog.pokemon.filter(p => p.kind === 'default').some(p => !media.cries[p.id] && !media.unavailable.includes(p.id))) throw new Error('Faltan gritos sin documentar');
console.log(`${Object.keys(media.eyes).length} recortes de ojos y ${Object.keys(media.cries).length} gritos verificados por SHA-256.`);
const grid=JSON.parse(await readFile('data/generated/grid.json','utf8'));
if(grid.catalogVersion!==catalog.version||grid.sourceRevision!==lock.dataRevision)throw Error('Habilidades y catálogo no corresponden a la misma revisión');
for(const [name,hash] of Object.entries(grid.csvSha256)){if(createHash('sha256').update(await readFile(`data/raw/${name}.csv`)).digest('hex')!==hash)throw Error(`CSV de habilidades alterado: ${name}`);}
for(const p of catalog.pokemon){const values=grid.pokemonAbilities[p.id];if(!values?.length){if(p.kind==='default'||!grid.excluded.some(e=>e.id===p.id))throw Error(`Habilidades incompletas: ${p.id}`);}else if(values.some(a=>!grid.abilities[a.id]||typeof a.hidden!=='boolean'))throw Error(`Habilidades inválidas: ${p.id}`);}
console.log(`Habilidades españolas verificadas para ${Object.keys(grid.pokemonAbilities).length} variantes.`);
const pokedle=JSON.parse(await readFile('data/generated/pokedle.json','utf8'));
if(pokedle.catalogVersion!==catalog.version||pokedle.sourceRevision!==lock.dataRevision)throw Error('Pokédle no corresponde al catálogo');
for(const [name,hash] of Object.entries(pokedle.csvSha256))if(hash!==createHash('sha256').update(await readFile(`data/raw/${name}.csv`)).digest('hex')||(name!=='pokemon_colors'&&hash!==lock.csvSha256[name]))throw Error(`Origen de Pokédle incompatible: ${name}`);
const pokedleSources=JSON.parse(await readFile('data/pokedle-sources.lock.json','utf8')),colorBytes=await readFile('data/raw/pokemon_colors.csv');
if(pokedleSources.sourceRevision!==lock.dataRevision||createHash('sha1').update(`blob ${colorBytes.length}\0`).update(colorBytes).digest('hex')!==pokedleSources.colorsGitSha)throw Error('Origen de colores incompatible');
for(const p of catalog.pokemon.filter(p=>p.kind==='default')){const t=pokedle.traits[p.speciesId];if(!t||t.height<=0||t.weight<=0||!t.color||!Number.isInteger(t.stage)||t.stage<0||t.generation!==species.get(p.speciesId).generation)throw Error(`Rasgos inválidos de Pokédle: ${p.id}`);}
console.log(`Rasgos de Pokédle verificados para ${Object.keys(pokedle.traits).length} especies.`);
