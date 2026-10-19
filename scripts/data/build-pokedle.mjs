import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
const catalog=JSON.parse(await readFile('data/generated/catalog.json','utf8'));
const lock=JSON.parse(await readFile('data/sources.lock.json','utf8'));
const csv={};
for(const name of ['pokemon','pokemon_species']){
  const bytes=await readFile(`data/raw/${name}.csv`);
  if(createHash('sha256').update(bytes).digest('hex')!==lock.csvSha256[name])throw Error(`Origen alterado: ${name}`);
  csv[name]=parse(bytes,{columns:true,skip_empty_lines:true});
}
const species=new Map(csv.pokemon_species.map(s=>[Number(s.id),s]));
const variants=new Map(csv.pokemon.map(p=>[Number(p.id),p]));
const colors=['Negro','Azul','Marrón','Gris','Verde','Rosa','Morado','Rojo','Blanco','Amarillo'];
const provenance=JSON.parse(await readFile('data/pokedle-sources.lock.json','utf8'));
const colorBytes=await readFile('data/raw/pokemon_colors.csv');
if(provenance.sourceRevision!==lock.dataRevision||createHash('sha1').update(`blob ${colorBytes.length}\0`).update(colorBytes).digest('hex')!==provenance.colorsGitSha)throw Error('Origen de colores alterado');
function stage(id,seen=new Set()){
  if(seen.has(id))throw Error('Ciclo de evolución');seen.add(id);
  const s=species.get(id);if(!s)throw Error(`Especie sin origen: ${id}`);
  return s.evolves_from_species_id?1+stage(Number(s.evolves_from_species_id),seen):0;
}
const traits={};
for(const p of catalog.pokemon.filter(p=>p.kind==='default')){
  const source=variants.get(p.id),s=species.get(p.speciesId);
  if(!source||!s||!colors[Number(s.color_id)-1]||Number(source.height)<=0||Number(source.weight)<=0)throw Error(`Rasgos incompletos: ${p.id}`);
  traits[p.speciesId]={height:Number(source.height),weight:Number(source.weight),color:colors[Number(s.color_id)-1],stage:stage(p.speciesId),generation:Number(s.generation_id)};
}
await writeFile('data/generated/pokedle.json',JSON.stringify({version:'pokedle-v1',catalogVersion:catalog.version,sourceRevision:lock.dataRevision,csvSha256:{...Object.fromEntries(['pokemon','pokemon_species'].map(name=>[name,lock.csvSha256[name]])),pokemon_colors:createHash('sha256').update(colorBytes).digest('hex')},traits},null,2)+'\n');
console.log(`Rasgos de Pokédle verificados para ${Object.keys(traits).length} especies.`);
