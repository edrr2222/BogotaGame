const path = require('path');
const fsSync = require('fs');
const fs = require('fs/promises');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const RUNS_FILE = path.join(DATA_DIR, 'runs.json');
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
