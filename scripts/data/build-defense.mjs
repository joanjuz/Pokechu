import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
const catalog=JSON.parse(await readFile('data/generated/catalog.json','utf8'));
const sources=JSON.parse(await readFile('data/sources.lock.json','utf8'));
const provenance=JSON.parse(await readFile('data/defense-sources.lock.json','utf8'));
if(provenance.sourceRevision!==sources.dataRevision)throw Error('Revisión de defensas incompatible');
const csv={},csvSha256={};
for(const name of ['type_efficacy','ability_prose','type_names']){
  const bytes=await readFile(`data/raw/${name}.csv`);
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(name==='type_names'?hash!==sources.csvSha256[name]:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==provenance.files[name].gitSha)throw Error(`Origen de defensas alterado: ${name}`);
  csvSha256[name]=hash;csv[name]=parse(bytes,{columns:true,skip_empty_lines:true,trim:true});
}
const types=csv.type_names.filter(t=>t.local_language_id==='7'&&Number(t.type_id)>=1&&Number(t.type_id)<=18).sort((a,b)=>Number(a.type_id)-Number(b.type_id));
if(types.length!==18)throw Error('Se necesitan los 18 tipos');
const names=new Map(types.map(t=>[Number(t.type_id),t.name])),chart=Object.fromEntries(types.map(t=>[t.name,{}]));
for(const row of csv.type_efficacy){const attack=names.get(Number(row.damage_type_id)),defense=names.get(Number(row.target_type_id));if(attack&&defense)chart[attack][defense]=Number(row.damage_factor)/100;}
if(Object.values(chart).some(row=>Object.keys(row).length!==18||Object.values(row).some(n=>![0,.5,1,2].includes(n))))throw Error('Tabla de tipos incompleta');
// Permanent type modifiers, for ordinary non-contact attacks and neutral battle conditions.
const effects={
  10:{immune:['Eléctrico']},11:{immune:['Agua']},18:{immune:['Fuego']},25:{wonderGuard:true},26:{immune:['Tierra']},31:{immune:['Eléctrico']},47:{factors:{Fuego:.5,Hielo:.5}},78:{immune:['Eléctrico']},85:{factors:{Fuego:.5}},87:{immune:['Agua'],factors:{Fuego:1.25}},111:{superEffective:.75},114:{immune:['Agua']},116:{superEffective:.75},157:{immune:['Planta']},199:{factors:{Fuego:.5}},218:{factors:{Fuego:2}},232:{superEffective:.75},272:{factors:{Fantasma:.5}},273:{immune:['Fuego']},297:{immune:['Tierra']},
};
for(const [id,effect] of Object.entries(effects)){const prose=csv.ability_prose.find(row=>row.ability_id===id&&row.local_language_id==='9');if(!prose?.short_effect)throw Error(`Efecto defensivo sin fuente: ${id}`);effect.sourceEffect=prose.short_effect;}
await writeFile('data/generated/defense.json',JSON.stringify({version:'defense-v1',catalogVersion:catalog.version,sourceRevision:sources.dataRevision,csvSha256,types:types.map(t=>t.name),chart,effects},null,2)+'\n');
console.log('18 tipos y 20 modificadores defensivos verificados.');
