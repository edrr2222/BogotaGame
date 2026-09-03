const path = require('path');
const fsSync = require('fs');
const fs = require('fs/promises');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const RUNS_FILE = path.join(DATA_DIR, 'runs.json');
const ENTITY_CACHE_FILE = path.join(DATA_DIR, 'entity-comments.json');
const PORT = process.env.PORT || 3000;

// Lee .env.local (GEMINI_API_KEY=..., GOOGLE_MAPS_API_KEY=...) sin pisar una
// variable de entorno real que ya esté puesta — mismo mecanismo que usan los
// scripts de scripts/*.js.
function loadDotEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fsSync.existsSync(envPath)) return;
  for (const line of fsSync.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvLocal();

const app = express();
app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));
app.use('/assets', express.static(path.join(ROOT, 'assets')));

// La Maps JavaScript API key se usa desde el navegador (StreetViewScene) —
// no es secreta como GEMINI_API_KEY, se restringe por HTTP referrer en Cloud
// Console. Se sirve por este endpoint en vez de hornearla en un archivo
// estático para no tener que commitear la key ni regenerar JS por entorno.
app.get('/api/config', (req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || null });
});

// Caché de comentarios de la entidad, en disco — un mismo panoId (el
// mismo punto/foto real de Street View) SIEMPRE devuelve el comentario ya
// generado la primera vez, para cualquier jugador que llegue después, en
// vez de pagarle a Gemini de nuevo cada vez que alguien pasa por ahí.
let entityCacheQueue = Promise.resolve();

async function readEntityCache() {
  try {
    return JSON.parse(await fs.readFile(ENTITY_CACHE_FILE, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeEntityCacheEntry(panoId, entry) {
  entityCacheQueue = entityCacheQueue.then(async () => {
    const cache = await readEntityCache();
    cache[panoId] = entry;
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(ENTITY_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  });
  return entityCacheQueue;
}

// La "entidad" comenta sobre lo que realmente se ve en el panorama actual
// de Street View — captura una foto estática de ESE punto exacto (Street
// View Static API, misma key de Maps) y se la manda a Gemini para que
// genere un comentario/pregunta corto. Costó dinero solo la PRIMERA vez
// que se visita cada panoId — de ahí en más se sirve desde la caché.
const GEMINI_MODEL = 'gemini-flash-lite-latest';
app.post('/api/entity-comment', async (req, res) => {
  const { panoId, heading, pitch, locality, poiLabel } = req.body || {};
  if (typeof panoId !== 'string' || !panoId || panoId.length > 200) {
    return res.status(400).json({ error: 'panoId inválido' });
  }
  if (typeof heading !== 'number' || typeof pitch !== 'number') {
    return res.status(400).json({ error: 'heading/pitch inválidos' });
  }
  if (typeof locality !== 'string' || typeof poiLabel !== 'string' || locality.length > 60 || poiLabel.length > 60) {
    return res.status(400).json({ error: 'locality/poiLabel inválidos' });
  }

  const cache = await readEntityCache();
  if (cache[panoId]) {
    return res.json({ text: cache[panoId].text, cached: true });
  }

  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!mapsKey || !geminiKey) {
    return res.status(503).json({ error: 'Faltan credenciales del servidor' });
  }
  try {
    const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x400&pano=${encodeURIComponent(panoId)}&heading=${heading}&pitch=${pitch}&fov=90&key=${mapsKey}`;
    const imgRes = await fetch(svUrl);
    if (!imgRes.ok) throw new Error(`Street View Static respondió ${imgRes.status}`);
    const imgB64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');

    const prompt = `Eres "la entidad" — una presencia curiosa y observadora que acompaña a alguien caminando por ${locality}, Bogotá, cerca de "${poiLabel}". Mira esta foto REAL de la calle, tomada en este mismo instante, y en 1-2 frases MUY cortas (máximo 25 palabras en total), hazle al jugador un comentario o pregunta curiosa sobre algo ESPECÍFICO y concreto que se vea en la imagen (una persona, un letrero, un edificio, un vehículo, lo que sea) — como si de verdad lo estuvieras viendo ahora. Tono cálido y curioso, en español, sin saludos ni introducciones ("Mira,", "Oye,", etc. está bien, pero nada de "¡Hola!"). Responde solo con el comentario, nada más.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: imgB64 } }] }],
        }),
      }
    );
    if (!geminiRes.ok) throw new Error(`Gemini respondió ${geminiRes.status}`);
    const geminiJson = await geminiRes.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Gemini no devolvió texto');

    await writeEntityCacheEntry(panoId, { text, locality, poiLabel, createdAt: new Date().toISOString() });
    res.json({ text, cached: false });
  } catch (err) {
    console.error('entity-comment falló:', err.message);
    res.status(500).json({ error: 'No se pudo generar el comentario' });
  }
});

// Cola en memoria para serializar lecturas/escrituras de runs.json y evitar
// que dos partidas terminando al mismo tiempo se pisen entre sí.
let writeQueue = Promise.resolve();

async function readRuns() {
  try {
    const raw = await fs.readFile(RUNS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function appendRun(run) {
  writeQueue = writeQueue.then(async () => {
    const runs = await readRuns();
    runs.push(run);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), 'utf-8');
    return runs.length;
  });
  return writeQueue;
}

const STAT_ORDER = ['tolerancia', 'memoria', 'empatia', 'solidaridad', 'confianza', 'autenticidad', 'conciencia', 'legalidad'];

function isValidRun(body) {
  if (!body || typeof body !== 'object') return false;
  if (typeof body.playerName !== 'string' || !body.playerName.trim()) return false;
  if (typeof body.characterId !== 'string') return false;
  if (!body.stats || typeof body.stats !== 'object') return false;
  if (!STAT_ORDER.every(s => Number.isInteger(body.stats[s]))) return false;
  if (!Array.isArray(body.visitadas)) return false;
  return true;
}

app.post('/api/runs', async (req, res) => {
  if (!isValidRun(req.body)) {
    return res.status(400).json({ error: 'Payload de partida inválido' });
  }
  const run = {
    playerName: req.body.playerName.trim().slice(0, 60),
    characterId: req.body.characterId,
    stats: STAT_ORDER.reduce((acc, s) => { acc[s] = req.body.stats[s]; return acc; }, {}),
    total: STAT_ORDER.reduce((sum, s) => sum + req.body.stats[s], 0),
    visitadas: req.body.visitadas.filter(v => typeof v === 'string'),
    recorridoCompleto: req.body.visitadas.length >= 8,
    timestamp: new Date().toISOString(),
  };
  try {
    const count = await appendRun(run);
    res.status(201).json({ ok: true, count });
  } catch (err) {
    console.error('No se pudo guardar la partida:', err);
    res.status(500).json({ error: 'No se pudo guardar la partida' });
  }
});

app.get('/api/runs', async (req, res) => {
  try {
    res.json(await readRuns());
  } catch (err) {
    console.error('No se pudo leer runs.json:', err);
    res.status(500).json({ error: 'No se pudo leer las partidas guardadas' });
  }
});

app.listen(PORT, () => {
  console.log(`Ciudades Expandidas corriendo en http://localhost:${PORT}`);
});
