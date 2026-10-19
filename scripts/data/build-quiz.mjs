import {readFile,writeFile} from 'node:fs/promises';
import {parse} from 'csv-parse/sync';
const catalog=JSON.parse(await readFile('data/generated/catalog.json','utf8'));
const lock=JSON.parse(await readFile('data/sources.lock.json','utf8'));
const rows=parse(await readFile('data/raw/pokemon_species.csv','utf8'),{columns:true,skip_empty_lines:true});
const names=new Map(catalog.species.map(s=>[s.id,s.name]));
const labels=['PS','Ataque','Defensa','Ataque Especial','Defensa Especial','Velocidad'];
const descriptors=catalog.pokemon.filter(p=>p.kind==='default').map(p=>{
  const raw=rows.find(row=>Number(row.id)===p.speciesId);if(!raw)throw new Error('Especie sin fuente');
  const children=rows.filter(r=>Number(r.evolves_from_species_id)===p.speciesId).map(r=>Number(r.id)).filter(id=>names.has(id));
  const generation=catalog.species.find(s=>s.id===p.speciesId).generation;
  const parent=Number(raw.evolves_from_species_id)||0;
  return {p,parent,children,generation,bst:p.stats.reduce((a,b)=>a+b,0),type:[...p.types].sort().join('/'),baby:raw.is_baby==='1',legendary:raw.is_legendary==='1',mythical:raw.is_mythical==='1'};
});
function factsFor(d){
  const maximum=Math.max(...d.p.stats);const strongest=labels.filter((_,i)=>d.p.stats[i]===maximum);
  const facts=[
    {key:'type',value:d.type,text:`${d.p.types.length===1?'Su único tipo es':'Combina los tipos'} ${d.p.types.join(' y ')}.`},
    {key:'generation',value:d.generation,text:`Se introdujo en la generación ${d.generation}.`},
    {key:'bst',value:d.bst,text:`Sus seis estadísticas base suman ${d.bst}.`},
    {key:'maximum',value:strongest.join('/')+maximum,text:`${strongest.length===1?'Su estadística base más alta es':'Sus estadísticas base más altas son'} ${strongest.join(' y ')} (${maximum}).`},
  ];
  if(d.parent)facts.push({key:'parent',value:d.parent,text:`Evoluciona directamente de ${names.get(d.parent)}.`});
  if(d.children.length)facts.push({key:'children',value:d.children.join('/'),text:`Puede evolucionar directamente en ${d.children.map(id=>names.get(id)).join(', ')}.`});
  if(d.baby)facts.push({key:'baby',value:true,text:'Está clasificado como Pokémon bebé.'});
  if(d.legendary)facts.push({key:'legendary',value:true,text:'Es un Pokémon legendario.'});
  if(d.mythical)facts.push({key:'mythical',value:true,text:'Es un Pokémon singular.'});
  for(let i=0;i<6;i++)facts.push({key:`stat${i}`,value:d.p.stats[i],text:`Su estadística base de ${labels[i]} es ${d.p.stats[i]}.`});
  return facts;
}
const allFacts=new Map(descriptors.map(d=>[d.p.speciesId,new Map(factsFor(d).map(f=>[f.key,f.value]))]));
const questions=descriptors.map(d=>{
  const available=factsFor(d);const find=key=>available.find(f=>f.key===key);
  const patterns=[['parent','type'],['children','type'],['maximum','type'],['bst','type'],['mythical','legendary','baby','type'],['generation','type','stat5']];
  const selected=patterns[d.p.speciesId%patterns.length].map(find).filter(Boolean);
  if(selected.length<2)selected.push(find('bst'));
  const matches=()=>descriptors.filter(other=>selected.every(f=>allFacts.get(other.p.speciesId).get(f.key)===f.value));
  for(const fact of available){if(matches().length===1)break;if(!selected.some(f=>f.key===fact.key))selected.push(fact);}
  if(matches().length!==1)throw new Error(`Pista ambigua para ${d.p.name}`);
  return {speciesId:d.p.speciesId,clue:selected.map(f=>f.text).join(' '),factKeys:selected.map(f=>f.key)};
});
await writeFile('data/generated/quiz.json',JSON.stringify({version:'rosco-v2',catalogVersion:catalog.version,sourceRevision:lock.dataRevision,questions}));
console.log(`${questions.length} preguntas variadas, sin números de Pokédex y con respuesta única en el catálogo.`);
