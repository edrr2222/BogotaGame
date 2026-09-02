// Genera piezas de arte con la API de Gemini (Google) y las guarda en
// assets/, ya recortadas por chroma-key (los prompts piden fondo magenta
// sólido). Se corre una sola vez por tanda de piezas — no en tiempo de
// juego — porque cuesta dinero y porque así se revisa la calidad antes de
// que quede en el juego.
//
// Uso:
//   set GEMINI_API_KEY=tu-key   (o export en bash)
//   node scripts/generate-art.js --only=ai_candelaria_fachada   # probar una sola
//   node scripts/generate-art.js                                 # todas las de art-jobs.js

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { JOBS } = require('./art-jobs');

// Lee .env.local (GEMINI_API_KEY=...) si existe, sin pisar una variable de
// entorno real que ya esté puesta. Evita depender de que el proceso que
// corre este script haya heredado un setx hecho después de que arrancó.
function loadDotEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvLocal();

const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

function chromaKeyMagentaToTransparent(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // El modelo no devuelve el fondo en magenta puro (255,0,255) sino algo
    // como (227,46,140) -> magentaness ~92. El arte en sí (pixel art, bordes
    // duros, sin antialiasing real) cae en negativo. Calibrado con muestras
    // reales del fondo vs. el borde de un edificio generado.
    const magentaness = Math.min(r, b) - g;
    if (magentaness > 60) {
      data[i + 3] = 0;
    } else if (magentaness > 20) {
      const t = (magentaness - 20) / (60 - 20);
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
    }
  }
  return PNG.sync.write(png);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateOne(job) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Falta la variable de entorno GEMINI_API_KEY.');
  }

  console.log(`\n→ Generando "${job.key}" (${job.locality}, tipo=${job.type})${job.refImage ? ' [con imagen de referencia]' : ''}...`);

  const requestParts = [{ text: job.prompt }];
  if (job.refImage) {
    const refPath = path.join(ASSETS_DIR, job.refImage);
    if (!fs.existsSync(refPath)) throw new Error(`refImage no existe: ${job.refImage}`);
    requestParts.push({
      inlineData: { mimeType: 'image/png', data: fs.readFileSync(refPath).toString('base64') },
    });
  }

  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: requestParts }] }),
  });

  const body = await res.json();
  if (!res.ok) {
    console.error('Respuesta de error completa:', JSON.stringify(body, null, 2));
    throw new Error(`Gemini API respondió ${res.status}`);
  }

  const responseParts = body?.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('image/'));
  if (!imagePart) {
    console.error('Respuesta completa (sin imagen):', JSON.stringify(body, null, 2));
    throw new Error('La respuesta no trajo ninguna imagen.');
  }

  const rawBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const outPath = path.join(ASSETS_DIR, job.outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (job.type === 'scene') {
    // Fondos de escena: se guardan tal cual, sin fondo magenta que recortar.
    fs.writeFileSync(outPath, rawBuffer);
    console.log(`  guardado: ${path.relative(ASSETS_DIR, outPath)}`);
  } else {
    const rawPath = outPath.replace(/\.png$/, '_raw.png');
    fs.writeFileSync(rawPath, rawBuffer);
    const cleanBuffer = chromaKeyMagentaToTransparent(rawBuffer);
    fs.writeFileSync(outPath, cleanBuffer);
    console.log(`  guardado: ${path.relative(ASSETS_DIR, outPath)} (+ _raw.png de referencia)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;
  const force = args.includes('--force');
  const delayMs = 4000;

  let jobs = only ? JOBS.filter(j => only.includes(j.key)) : JOBS;
  if (only && jobs.length === 0) {
    console.error(`Ningún job coincide con --only=${only.join(',')}. Keys disponibles:\n${JOBS.map(j => ' - ' + j.key).join('\n')}`);
    process.exit(1);
  }

  if (!force) {
    const before = jobs.length;
    jobs = jobs.filter(j => !fs.existsSync(path.join(ASSETS_DIR, j.outFile)));
    const skipped = before - jobs.length;
    if (skipped > 0) console.log(`(saltando ${skipped} que ya existen — usa --force para regenerarlas)`);
  }

  console.log(`Generando ${jobs.length} pieza(s)...`);
  let ok = 0, failed = 0;
  for (const job of jobs) {
    try {
      await generateOne(job);
      ok++;
    } catch (err) {
      console.error(`  FALLÓ "${job.key}":`, err.message);
      failed++;
      process.exitCode = 1;
    }
    await sleep(delayMs);
  }
  console.log(`\nListo: ${ok} generadas, ${failed} fallidas.`);
}

main();
