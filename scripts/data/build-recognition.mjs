import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const catalog = JSON.parse(await readFile('data/generated/catalog.json', 'utf8'));
const source = JSON.parse(await readFile('data/sources.lock.json', 'utf8'));
const masks = JSON.parse(await readFile('data/eye-regions.json', 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir('public/eyes', { recursive: true });
await mkdir('public/cries', { recursive: true });
const eyes = {};
for (const [id, region] of Object.entries(masks.regions)) {
  const normalized = await sharp(`public/pokemon/${id}.webp`).resize(320, 320, { fit: 'contain', background: '#00000000' }).png().toBuffer();
  const mask = Buffer.from(`<svg width="320" height="320" xmlns="http://www.w3.org/2000/svg"><g fill="white">${region}</g></svg>`);
  let clipped = await sharp(normalized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  if (masks.inkOnly.includes(Number(id))) {
    const { data, info } = await sharp(clipped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 360) data[i + 3] = 0;
    clipped = await sharp(data, { raw: info }).png().toBuffer();
  }
  const output = await sharp(clipped).trim({ background: '#00000000', threshold: 1 }).webp({ lossless: true }).toBuffer();
  const path = `eyes/${id}.webp`;
  await writeFile(`public/${path}`, output);
  eyes[id] = { path, sha256: hash(output) };
}
async function fetchOk(url) { const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}: ${url}`); return res; }
let previous;
try { previous = JSON.parse(await readFile('data/generated/recognition.json', 'utf8')); } catch {}
const cryRevision = previous?.cryRevision ?? (await (await fetchOk('https://api.github.com/repos/PokeAPI/cries/commits/HEAD')).json()).sha;
const cries = {}, unavailable = [];
const queue = catalog.pokemon.filter(p => p.kind === 'default');
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const p = queue.shift();
    let path = previous?.cries[p.id]?.path ?? `cries/${p.id}.ogg`;
    let bytes;
    try { bytes = await readFile(`public/${path}`); if (hash(bytes) !== previous?.cries[p.id]?.sha256) bytes = undefined; } catch {}
    if (!bytes) {
      const url = `https://raw.githubusercontent.com/PokeAPI/cries/${cryRevision}/cries/pokemon/latest/${p.id}.ogg`;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(url);
          if (res.status === 404) break;
          if (!res.ok) throw new Error(`${res.status}: ${url}`);
          bytes = Buffer.from(await res.arrayBuffer()); break;
        } catch (error) { if (attempt === 2) throw error; }
      }
    }
    if (!bytes) { unavailable.push(p.id); continue; }
    const ogg = bytes.subarray(0, 4).toString() === 'OggS';
    const mp3 = bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224);
    if (!ogg && !mp3) throw new Error(`Audio inválido: ${p.id}`);
    path = `cries/${p.id}.${ogg ? 'ogg' : 'mp3'}`;
    await writeFile(`public/${path}`, bytes);
    cries[p.id] = { path, sha256: hash(bytes) };
  }
}));
await writeFile('data/generated/recognition.json', JSON.stringify({ version: 'recognition-v1', catalogVersion: catalog.version, artworkRevision: source.spriteRevision, eyeVersion: masks.version, maskSha256: hash(await readFile('data/eye-regions.json')), cryRevision, eyes, cries, unavailable }, null, 2) + '\n');
console.log(`${Object.keys(eyes).length} recortes de ojos y ${Object.keys(cries).length} gritos guardados; ${unavailable.length} gritos no disponibles.`);
