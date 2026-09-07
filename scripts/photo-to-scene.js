// Convierte una foto real (Wikimedia Commons u otra fuente con licencia libre)
// en un streetscape de pixel art para el juego, y le extrae un "layout" —
// un arreglo de posiciones (banda caminable + puntos de interacción) leído
// de la propia imagen ya generada, para que WalkScene deje de usar una
// franja genérica y el jugador camine por la acera REAL de la escena.
//
// Reemplaza al streetscape "inventado" (texto libre a Gemini) por uno
// basado en composición real: mismos edificios, misma calle, mismo ángulo
// que la foto de origen — "sin inventos raros".
//
// Uso:
//   set GEMINI_API_KEY=tu-key
//   node scripts/photo-to-scene.js --photo=assets/Candelaria/referencia_real/foto_1_raw.jpg --out=assets/Candelaria/generado/streetscape_1_real.png --locality="La Candelaria"

const fs = require('fs');
const path = require('path');

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

const ROOT = path.join(__dirname, '..');
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VISION_MODEL = 'gemini-2.5-flash';
const IMAGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`;
const VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`;

const SCENE_STYLE = `Flat 2D pixel-art game background illustration, wide
landscape composition, front/side elevation view (NOT isometric, NOT
photorealistic, no 3D perspective rendering) — same simple flat cel-shaded
pixel-art style as a 16-bit RPG background. No text, no logos, no watermark,
no signature, no UI, no border, no captions baked into the image.`;

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'image/png';
}

async function generatePixelArtFromPhoto(photoPath, locality) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY.');

  const prompt = `This is a REAL photograph of a street in ${locality}, Bogotá, Colombia.
Redraw it as a flat 2D pixel-art video game background, converting it to the
following art style: ${SCENE_STYLE}
Keep the SAME buildings, the SAME street/plaza layout, the SAME camera angle
and composition as the photo — do not invent new buildings, do not move,
remove, or add structures that are not in the photo. This must be
recognizable as the same real place, just restyled as pixel art.
Simplify any people in the photo into at most 1-2 small flat background
silhouettes, or omit them entirely — the player's own character sprite will
be added separately by the game.
The street, sidewalk, or plaza pavement MUST remain clearly painted as a
walkable band across the lower portion of the image, in the same real
proportions/position it has in the source photo — this is the ground the
player will walk on.`;

  const photoBuf = fs.readFileSync(photoPath);
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeFor(photoPath), data: photoBuf.toString('base64') } },
      ],
    }],
    generationConfig: { imageConfig: { aspectRatio: '16:9' } },
  };

  const res = await fetch(`${IMAGE_URL}?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) { console.error(JSON.stringify(json, null, 2)); throw new Error(`Gemini image API ${res.status}`); }
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imgPart) { console.error(JSON.stringify(json, null, 2)); throw new Error('Sin imagen en la respuesta.'); }
  return Buffer.from(imgPart.inlineData.data, 'base64');
}

async function extractLayout(pixelArtPngPath) {
  const apiKey = process.env.GEMINI_API_KEY;
  const buf = fs.readFileSync(pixelArtPngPath);

  const prompt = `This is a flat 2D pixel-art street scene from a video game,
1344x768 pixels. A small character sprite (~40px tall) will walk across it.

Analyze the image and return STRICT JSON (no markdown fences, no commentary)
with this exact shape:
{
  "walkway": [ {"x": number, "yTop": number, "yBottom": number}, ... ],
  "interactables": [ {"label": string, "type": "npc_spot"|"door"|"landmark", "x": number, "y": number}, ... ]
}

"walkway": at least 8 sample columns spread evenly across the FULL width
(x from 0 to 1344), each giving the vertical pixel range [yTop, yBottom] of
the walkable ground (sidewalk/street/plaza pavement) at that x — i.e. where a
character standing at that x could have their feet, following the curb line
or perspective of the street as drawn. Do not include rooftops, sky, or
building walls in this range — only the actual ground plane.

"interactables": 2-4 points that are natural spots for an NPC to stand or for
the player to interact with — a doorway, a lamp post base, a corner, a bench
— each with a label and a point ON the walkway (not floating in a wall).

Return ONLY the JSON object.`;

  const body = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: buf.toString('base64') } }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  const res = await fetch(`${VISION_URL}?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) { console.error(JSON.stringify(json, null, 2)); throw new Error(`Gemini vision API ${res.status}`); }
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) { console.error(JSON.stringify(json, null, 2)); throw new Error('Sin texto en la respuesta.'); }
  return JSON.parse(text);
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([\w-]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  if (!args.photo || !args.out) {
    console.error('Uso: node scripts/photo-to-scene.js --photo=<ruta> --out=<ruta.png> --locality="Nombre"');
    process.exit(1);
  }
  const photoPath = path.join(ROOT, args.photo);
  const outPath = path.join(ROOT, args.out);
  const locality = args.locality || 'Bogotá';

  console.log(`→ Convirtiendo foto real a pixel art (${locality})...`);
  const pngBuf = await generatePixelArtFromPhoto(photoPath, locality);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pngBuf);
  console.log(`  guardado: ${path.relative(ROOT, outPath)}`);

  console.log('→ Extrayendo layout (caminable + interactuables)...');
  const layout = await extractLayout(outPath);
  const layoutPath = outPath.replace(/\.png$/, '.layout.json');
  fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 2));
  console.log(`  guardado: ${path.relative(ROOT, layoutPath)}`);
  console.log(JSON.stringify(layout, null, 2));
}

main().catch(err => { console.error('FALLÓ:', err.message); process.exit(1); });
