import { STAT_ORDER } from './gameConfig.js';
import { LOCATIONS, STREETVIEW_POINTS } from './gameConfig.js';

export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class GameState {
  constructor() { this.reset(); }

  reset() {
    this.stats = {};
    STAT_ORDER.forEach(s => this.stats[s] = 0);
    this.visitadas = [];
    this.pool = shuffled(LOCATIONS);
    this.momento = null;
    this.currentNodeId = "Inicio";
    this.playerName = '';
    this.characterId = null;
    this.runSaved = false;
  }

  applyEffects(effObj) {
    if (!effObj) return;
    Object.entries(effObj).forEach(([k, v]) => { this.stats[k] = (this.stats[k] || 0) + v; });
  }

  // Usado por la parada de bus/Transmilenio al final de una localidad: toma
  // la siguiente localidad ya barajada en $pool (sin dejar que el jugador
  // elija), la marca visitada y arranca su diálogo — igual que hacía
  // "Siguiente Localidad" en el twee original. Con Street View real
  // (STREETVIEW_POINTS) las 8 localidades tienen coordenadas propias, así
  // que ya no hace falta filtrar por localidades "sin arte configurado".
  // Devuelve null si ya no queda ninguna localidad por visitar.
  nextRandomFromPool() {
    if (this.pool.length === 0) return null;
    const loc = this.pool.splice(0, 1)[0];
    this.momento = Math.random() < 0.5 ? 'Día' : 'Noche';
    this.visitadas.push(loc);
    this.currentNodeId = `${loc}: Entrada`;
    return loc;
  }

  visitedCount() { return this.visitadas.length; }
  total() { return STAT_ORDER.reduce((a, s) => a + this.stats[s], 0); }
}

/* Polygon "entity" shape driven by the 8 stats — the visual mirror
   the concept doc describes: no numbers shown to the player, only form. */
export function entityPolygonPoints(stats, baseRadius, cx, cy) {
  const n = STAT_ORDER.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const v = stats[STAT_ORDER[i]] || 0;
    const r = baseRadius + v * (baseRadius * 0.18);
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}
