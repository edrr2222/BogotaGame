import { STAT_ORDER } from './gameConfig.js';
import { LOCATIONS } from './gameConfig.js';

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
