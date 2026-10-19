import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import sharp from 'sharp';

// Explicitly reviewed initial form support. New suffixes are excluded, never guessed.
const regional = new Map([['alola', 'de Alola'], ['galar', 'de Galar'], ['hisui', 'de Hisui'], ['paldea', 'de Paldea']]);
const battle = new Map([['mega', 'Mega'], ['mega-x', 'Mega X'], ['mega-y', 'Mega Y'], ['primal', 'Primigenio']]);
const files = ['pokemon', 'pokemon_species', 'pokemon_species_names', 'pokemon_stats', 'pokemon_types', 'type_names'];
await mkdir('data/raw', { recursive: true });
await mkdir('data/generated', { recursive: true });
await mkdir('public/pokemon', { recursive: true });
async function fetchOk(url) { const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}: ${url}`); return res; }
async function revision(repo) { return (await (await fetchOk(`https://api.github.com/repos/PokeAPI/${repo}/commits/HEAD`)).json()).sha; }
let lock;
try { lock = JSON.parse(await readFile('data/sources.lock.json', 'utf8')); } catch {}
const cachedRevision = lock?.spriteRevision;
if (!lock || process.argv.includes('--update')) lock = { dataRevision: await revision('pokeapi'), spriteRevision: await revision('sprites'), importedAt: new Date().toISOString() };
const raw = {};
const checksums = {};
for (const name of files) {
  const path = `data/raw/${name}.csv`;
  const text = await (await fetchOk(`https://raw.githubusercontent.com/PokeAPI/pokeapi/${lock.dataRevision}/data/v2/csv/${name}.csv`)).text();
  await writeFile(path, text);
  checksums[name] = createHash('sha256').update(text).digest('hex');
  raw[name] = parse(text, { columns: true, skip_empty_lines: true });
}
const names = new Map(raw.pokemon_species_names.filter(r => r.local_language_id === '7').map(r => [+r.pokemon_species_id, r.name]));
const typeNames = new Map(raw.type_names.filter(r => r.local_language_id === '7').map(r => [r.type_id, r.name]));
const alias = { 29: ['Nidoran hembra', 'Nidoran f'], 32: ['Nidoran macho', 'Nidoran m'], 83: ['Farfetchd'], 122: ['Mr Mime', 'Señor Mime'], 439: ['Mime Jr'], 772: ['Codigo Cero', 'Tipo Cero', 'Type Null'] };
const species = raw.pokemon_species.filter(r => names.has(+r.id) && +r.generation_id <= 9).map(r => ({ id: +r.id, slug: r.identifier, name: names.get(+r.id), generation: +r.generation_id, aliases: alias[r.id] || [] }));
const speciesMap = new Map(species.map(s => [s.id, s]));
const stats = new Map();
for (const row of raw.pokemon_stats) { if (+row.stat_id > 6) continue; const values = stats.get(row.pokemon_id) || []; values[+row.stat_id - 1] = +row.base_stat; stats.set(row.pokemon_id, values); }
const types = new Map();
for (const row of raw.pokemon_types) { const values = types.get(row.pokemon_id) || []; values[+row.slot - 1] = typeNames.get(row.type_id); types.set(row.pokemon_id, values); }
const excluded = [];
const pokemon = [];
for (const row of raw.pokemon) {
  const s = speciesMap.get(+row.species_id); if (!s) continue;
  const suffix = row.identifier.startsWith(`${s.slug}-`) ? row.identifier.slice(s.slug.length + 1) : '';
  let kind, form = '';
  if (row.is_default === '1') kind = 'default';
  else if (regional.has(suffix)) { kind = 'regional'; form = `Forma ${regional.get(suffix)}`; }
  else if (battle.has(suffix)) { kind = 'battle'; form = battle.get(suffix); }
  else { excluded.push({ id: +row.id, slug: row.identifier, reason: 'Variante pendiente de clasificación e imagen revisadas' }); continue; }
  const values = stats.get(row.id);
  if (!values || values.length !== 6 || values.some(v => !Number.isInteger(v) || v <= 0)) throw new Error(`Estadísticas inválidas: ${row.identifier}`);
  pokemon.push({ id: +row.id, speciesId: s.id, slug: row.identifier, name: form ? `${s.name} (${form})` : s.name, form, kind, stats: values, types: types.get(row.id), image: `pokemon/${row.id}.webp`, silhouette: kind === 'default' });
}
// Forms are available in BST. Exact-form silhouettes remain excluded until a contour audit.
let completed = 0;
const missing = new Set();
const queue = [...pokemon];
await Promise.all(Array.from({ length: 10 }, async () => {
  while (queue.length) {
    const p = queue.shift();
    try {
      try { if (cachedRevision !== lock.spriteRevision) throw new Error('Nueva revisión de imágenes'); await access(`public/${p.image}`); } catch {
        const url = `https://raw.githubusercontent.com/PokeAPI/sprites/${lock.spriteRevision}/sprites/pokemon/other/official-artwork/${p.id}.png`;
        const response = await fetch(url);
        if (response.status === 404) { missing.add(p.id); continue; }
        if (!response.ok) throw new Error(`Imagen ${p.id}: HTTP ${response.status}`);
        const input = Buffer.from(await response.arrayBuffer());
        await sharp(input).resize(320, 320, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(`public/${p.image}`);
      }
      completed++;
      if (completed % 100 === 0) console.log(`${completed} imágenes preparadas`);
    } catch (error) { throw new Error(`No se pudo importar ${p.slug}: ${error.message}`); }
  }
}));
const available = pokemon.filter(p => !missing.has(p.id));
for (const p of pokemon.filter(p => missing.has(p.id))) excluded.push({ id: p.id, slug: p.slug, reason: 'Sin ilustración oficial en la revisión fijada' });
const catalog = { version: `v1-${lock.dataRevision.slice(0, 10)}`, ruleset: 'Estadísticas modernas de la instantánea v1', species, pokemon: available };
await writeFile('data/generated/catalog.json', JSON.stringify(catalog));
await writeFile('data/generated/excluded.json', JSON.stringify(excluded, null, 2));
const imageChecksums = {};
for (const p of available) imageChecksums[p.image] = createHash('sha256').update(await readFile(`public/${p.image}`)).digest('hex');
await writeFile('data/sources.lock.json', JSON.stringify({ ...lock, csvSha256: checksums, imageSha256: imageChecksums, imageSource: 'PokeAPI/sprites/sprites/pokemon/other/official-artwork', transform: 'sharp; 320px inside; WebP quality 82' }, null, 2));
console.log(`${available.length} variantes; ${species.length} especies; ${excluded.length} exclusiones documentadas.`);
