import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
const catalog=JSON.parse(await readFile('data/generated/catalog.json','utf8'));
const lock=JSON.parse(await readFile('data/sources.lock.json','utf8'));
const csv={};const csvSha256={};
let provenance={sourceRevision:lock.dataRevision,files:{}};
if(process.argv.includes('--cached')){provenance=JSON.parse(await readFile('data/grid-sources.lock.json','utf8'));if(provenance.sourceRevision!==lock.dataRevision)throw Error('La caché de habilidades es de otra revisión');}
await mkdir('data/raw',{recursive:true});
for(const name of ['ability_names','pokemon_abilities']){
  let original;
  if(process.argv.includes('--cached')){const cached=await readFile(`data/raw/${name}.csv`,'utf8');original=Buffer.from(provenance.files[name].lineEnding==='crlf'?cached.replace(/\r?\n/g,'\r\n'):cached);}
  else{const response=await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/${lock.dataRevision}/data/v2/csv/${name}.csv`);if(!response.ok)throw Error(`${response.status}: ${name}`);original=Buffer.from(await response.arrayBuffer());provenance.files[name]={gitSha:createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex'),lineEnding:original.includes(Buffer.from('\r\n'))?'crlf':'lf'};}
  const gitSha=createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
  if(gitSha!==provenance.files[name].gitSha)throw Error(`CSV no coincide con su blob de origen: ${name}`);
  const bytes=Buffer.from(original.toString('utf8').replace(/\r\n/g,'\n'));
  await writeFile(`data/raw/${name}.csv`,bytes);csvSha256[name]=createHash('sha256').update(bytes).digest('hex');
  csv[name]=parse(bytes,{columns:true,skip_empty_lines:true});
}
const abilities=Object.fromEntries(csv.ability_names.filter(row=>row.local_language_id==='7').map(row=>[row.ability_id,row.name]));
const pokemonAbilities={},excluded=[];
for(const p of catalog.pokemon){
  const values=csv.pokemon_abilities.filter(row=>Number(row.pokemon_id)===p.id).map(row=>({id:Number(row.ability_id),hidden:row.is_hidden==='1'}));
  if((!values.length||values.some(value=>!abilities[value.id]))&&p.kind!=='default'){excluded.push({id:p.id,reason:'Habilidad o nombre español pendiente en el origen'});continue;}
  if(!values.length||values.some(value=>!abilities[value.id]))throw Error(`Habilidades sin verificar: ${p.id}`);
  pokemonAbilities[p.id]=values;
}
await writeFile('data/generated/grid.json',JSON.stringify({version:'grid-v1',catalogVersion:catalog.version,sourceRevision:lock.dataRevision,csvSha256,abilities,pokemonAbilities,excluded},null,2)+'\n');
await writeFile('data/grid-sources.lock.json',JSON.stringify(provenance,null,2)+'\n');
console.log(`Habilidades verificadas para ${Object.keys(pokemonAbilities).length} variantes.`);
