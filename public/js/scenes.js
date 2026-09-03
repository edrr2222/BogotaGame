import { NODE_BY_ID } from './storyData.js';
import {
  PALETTE, FONT_DISPLAY, FONT_BODY, FONT_MONO,
  STAT_ORDER, LOCATIONS, STAT_BY_LOCATION, TRAITS,
  AVATAR_MANIFEST, BACKGROUND_MANIFEST, STREETVIEW_POINTS, assetUrl, avatarById,
} from './gameConfig.js';
import { entityPolygonPoints } from './gameState.js';
import { DialogueBox } from './dialogueBox.js';

/* ============================================================
   ESCENA: BOOT — precarga assets + título + arranca el overlay
   de configuración (nombre + avatar) antes de entrar al mapa.
   ============================================================ */
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Solo la vista de frente: era la única realmente usada fuera del
    // sistema caminable con sprites direccionales (WalkScene), que se
    // reemplazó por Street View real (StreetViewScene) — cargar
    // back/left/right acá ya no tiene para qué.
    AVATAR_MANIFEST.forEach(a => this.load.image(a.dirs.front.key, assetUrl(a.dirs.front.path)));
    Object.values(BACKGROUND_MANIFEST).flat().forEach(b => this.load.image(b.key, assetUrl(b.path)));
  }

  create() {
    this.game.gState.reset();
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor(PALETTE.night);
    this.add.text(W / 2, H / 2 - 40, 'CIUDADES EXPANDIDAS', {
      fontFamily: FONT_DISPLAY, fontSize: '34px', color: '#ece7dd', letterSpacing: 3
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2, 'Bogotá como cuerpo rizomático', {
      fontFamily: FONT_BODY, fontStyle: 'italic', fontSize: '16px', color: '#b9b3a6'
    }).setOrigin(0.5);
    const start = this.add.text(W / 2, H / 2 + 60, '[ Empezar a caminar ]', {
      fontFamily: FONT_MONO, fontSize: '14px', color: '#f2a03d'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    start.on('pointerover', () => start.setColor('#4fd1c5'));
    start.on('pointerout', () => start.setColor('#f2a03d'));
    start.on('pointerdown', () => {
      window.showSetupOverlay(({ playerName, characterId }) => {
        this.game.gState.playerName = playerName;
        this.game.gState.characterId = characterId;
        this.scene.start('MapScene');
      });
    });
  }
}

/* ============================================================
   ESCENA: MAPA — racimos alrededor de la entidad central
   ============================================================ */
export class MapScene extends Phaser.Scene {
  constructor() { super('MapScene'); }
  create() {
    this.state = this.game.gState;
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor(PALETTE.night);

    this.add.text(W / 2, 24, 'BOGOTÁ — CUERPO RIZOMÁTICO', {
      fontFamily: FONT_DISPLAY, fontSize: '22px', color: '#ece7dd', letterSpacing: 2
    }).setOrigin(0.5);

    const avatar = avatarById(this.state.characterId);
    if (avatar && this.textures.exists(avatar.dirs.front.key)) {
      this.add.image(30, 30, avatar.dirs.front.key).setOrigin(0, 0).setDisplaySize(28, 28);
    }
    this.add.text(64, 24, this.state.playerName || 'Caminante', {
      fontFamily: FONT_MONO, fontSize: '13px', color: '#f2a03d'
    }).setOrigin(0, 0.5);

    this.add.text(W / 2, 60,
      this.state.visitedCount() === 0
        ? 'La ciudad todavía no tiene forma. Elige una localidad para empezar a caminar.'
        : `Localidades caminadas: ${this.state.visitedCount()} / 8`,
      { fontFamily: FONT_MONO, fontSize: '13px', color: '#b9b3a6' }
    ).setOrigin(0.5);

    const cx = W / 2, cy = H / 2 + 16, baseR = 46;
    this.entityGfx = this.add.graphics();
    this.drawEntity(cx, cy, baseR);

    const radius = Math.min(W, H) * 0.34;
    LOCATIONS.forEach((loc, i) => {
      const angle = (Math.PI * 2 * i / 8) - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      this.drawLocationNode(loc, x, y);
    });

    const finishBtn = this.add.text(W / 2, H - 30, this.state.visitedCount() > 0 ? '[ Terminar aquí el recorrido ]' : '',
      { fontFamily: FONT_MONO, fontSize: '13px', color: '#f2a03d' }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    if (this.state.visitedCount() > 0) {
      finishBtn.on('pointerdown', () => this.scene.start('EndingScene'));
      finishBtn.on('pointerover', () => finishBtn.setColor('#4fd1c5'));
      finishBtn.on('pointerout', () => finishBtn.setColor('#f2a03d'));
    }
  }

  drawEntity(cx, cy, baseR) {
    this.entityGfx.clear();
    const pts = entityPolygonPoints(this.state.stats, baseR, cx, cy);
    const total = this.state.total();
    const color = total > 0 ? PALETTE.accentCool : (total < 0 ? PALETTE.accentRust : 0x8892b0);
    this.entityGfx.lineStyle(2, color, 1);
    this.entityGfx.fillStyle(color, 0.12);
    this.entityGfx.beginPath();
    pts.forEach((p, i) => i === 0 ? this.entityGfx.moveTo(p.x, p.y) : this.entityGfx.lineTo(p.x, p.y));
    this.entityGfx.closePath();
    this.entityGfx.fillPath();
    this.entityGfx.strokePath();
    this.entityGfx.fillStyle(0xece7dd, 1);
    this.entityGfx.fillCircle(cx, cy, 4);
  }

  drawLocationNode(loc, x, y) {
    const visited = this.state.visitadas.includes(loc);
    const canVisit = this.state.pool.includes(loc);
    const stat = STAT_BY_LOCATION[loc];
    const val = this.state.stats[stat];

    let fill = 0x2b2f57, stroke = 0x565c8f;
    if (visited) {
      fill = val > 0 ? PALETTE.accentCool : (val < 0 ? PALETTE.accentRust : 0x8892b0);
      stroke = fill;
    }

    const r = 22;
    const circle = this.add.circle(x, y, r, fill, visited ? 0.85 : 0.5).setStrokeStyle(2, stroke, 1);
    this.add.text(x, y + r + 12, loc, {
      fontFamily: FONT_DISPLAY, fontSize: '14px', color: visited ? '#ece7dd' : '#8892b0'
    }).setOrigin(0.5);

    if (canVisit) {
      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerover', () => circle.setStrokeStyle(3, PALETTE.accentWarm, 1));
      circle.on('pointerout', () => circle.setStrokeStyle(2, stroke, 1));
      circle.on('pointerdown', () => this.visitLocation(loc));
    }
  }

  visitLocation(loc) {
    this.state.pool = this.state.pool.filter(l => l !== loc);
    this.state.momento = Math.random() < 0.5 ? 'Día' : 'Noche';
    this.state.visitadas.push(loc);
    this.state.currentNodeId = `${loc}: Entrada`;
    if (STREETVIEW_POINTS[loc] && this.game.mapsReady) {
      this.scene.start('StreetViewScene', { locality: loc });
    } else {
      this.scene.start('DialogueScene');
    }
  }
}

/* ============================================================
   ESCENA: DIÁLOGO — localidades sin escenario caminable. Dibuja
   el fondo/collage (o color liso) y delega texto/decisiones a
   la ventana de diálogo chica compartida (DialogueBox).
   ============================================================ */
export class DialogueScene extends Phaser.Scene {
  constructor() { super('DialogueScene'); }

  create() {
    this.state = this.game.gState;
    const node = NODE_BY_ID[this.state.currentNodeId];
    const isNight = this.state.momento === 'Noche';
    const W = this.scale.width;
    this.drawBackground(node, isNight);

    this.add.text(W - 24, 12, 'ESC: volver al mapa', {
      fontFamily: FONT_MONO, fontSize: '10px', color: isNight ? '#8892b0' : '#6b6455'
    }).setOrigin(1, 0).setDepth(6);

    this.escKey = this.input.keyboard.addKey('ESC');

    this.box = new DialogueBox(this, this.state);
    this.box.open(this.state.currentNodeId, (type) => {
      this.scene.start(type === 'ending' ? 'EndingScene' : 'MapScene');
    });
  }

  update() {
    // Salida de emergencia al mapa, igual que en WalkScene — importante
    // sobre todo para Chapinero/Kennedy, a las que se puede llegar sin
    // querer por la parada de bus de otra localidad.
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) { this.scene.start('MapScene'); return; }
    this.box.update();
  }

  drawBackground(node, isNight) {
    const W = this.scale.width, H = this.scale.height;
    const layers = node.location ? BACKGROUND_MANIFEST[node.location] : null;
    this.cameras.main.setBackgroundColor(isNight ? PALETTE.night : PALETTE.day);
    if (!layers || !layers.length) return;
    layers.forEach((layer, i) => {
      if (!this.textures.exists(layer.key)) return;
      const img = this.add.image(W / 2, H / 2, layer.key);
      const scale = Math.max(W / img.width, H / img.height);
      img.setScale(scale).setAlpha(i === 0 ? 0.55 : 0.35);
    });
    this.add.rectangle(0, 0, W, H, isNight ? PALETTE.night : PALETTE.day, isNight ? 0.55 : 0.4).setOrigin(0, 0);
  }
}

// Un solo google.maps.StreetViewPanorama compartido entre visitas — crearlo
// de nuevo cada vez que se entra a una localidad es innecesario (es un
// objeto pesado) y no hace falta: alcanza con reposicionarlo.
let sharedPanorama = null;
function getStreetViewContainer() {
  return document.getElementById('streetview-container');
}

// Distancia en metros entre dos puntos lat/lng (haversine) — para saber si
// el jugador ya navegó, dentro de Street View, hasta el punto real donde
// se activa el diálogo o la parada de bus.
function metersBetween(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* ============================================================
   ESCENA: STREET VIEW REAL — el jugador explora Google Street View de
   verdad dentro de la localidad elegida en el mapa (arrastra/usa las
   flechas del propio visor de Google para moverse por las calles reales),
   y se dispara diálogo o la parada de bus al acercarse navegando a un
   punto real específico (una plaza, una estación) en vez de a un sprite
   dibujado. El <div id="streetview-container"> vive DEBAJO del canvas de
   Phaser (mismo rectángulo, ver css/style.css) — el canvas se vuelve
   transparente a los clics mientras se explora libremente, y solo los
   recupera mientras la ventana de diálogo está abierta.
   ============================================================ */
export class StreetViewScene extends Phaser.Scene {
  constructor() { super('StreetViewScene'); }

  init(data) {
    this.locality = data.locality;
  }

  create() {
    this.state = this.game.gState;
    const points = this.points = STREETVIEW_POINTS[this.locality];
    const W = this.scale.width;
    const isNight = this.state.momento === 'Noche';

    // A diferencia de las demás escenas, NO se llama a setBackgroundColor
    // — una cámara nueva ya nace transparente, y con `transparent:true` en
    // el config de Phaser (main.js) eso deja ver el Street View real de
    // abajo en todo lo que este canvas no pinte explícitamente.
    this.game.canvas.style.pointerEvents = 'none';

    this.add.text(24, 16, this.locality.toUpperCase(), {
      fontFamily: FONT_DISPLAY, fontSize: '20px', color: isNight ? '#f2a03d' : '#c1440e'
    }).setDepth(6).setShadow(0, 0, '#0e1024', 6, false, true);
    this.add.text(W - 24, 16,
      'Arrastra: mirar alrededor — ESPACIO: hablar — T: viajar — ESC: volver al mapa', {
      fontFamily: FONT_MONO, fontSize: '10px', color: '#ece7dd'
    }).setOrigin(1, 0).setDepth(6).setShadow(0, 0, '#0e1024', 6, false, true);

    this.prompt = this.add.text(W / 2, this.scale.height - 40, '', {
      fontFamily: FONT_MONO, fontSize: '13px', color: '#f2a03d', backgroundColor: '#14162bcc',
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setDepth(6).setVisible(false);

    this.statusText = this.add.text(W / 2, this.scale.height / 2, 'Buscando cobertura de Street View…', {
      fontFamily: FONT_MONO, fontSize: '13px', color: '#ece7dd', backgroundColor: '#14162bcc',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(6);

    this.keys = this.input.keyboard.addKeys('SPACE,ESC,T');
    this.box = new DialogueBox(this, this.state);
    this.currentPos = null;
    this.nearestPoi = null; // poi de `points.pois` en rango de "hablar", si hay
    this.nearViajar = false; // si está en rango del punto de "viajar"
    // Se pone en true cuando la conversación de esta localidad llega a
    // 'Cierre'->Selector (type 'hub') — mientras sea false, "viajar" hace
    // fast-travel entre los puntos de interés de ESTA localidad; una vez
    // terminada, "viajar" pasa a otra localidad al azar.
    this.storyDone = false;
    // Phaser no llama solo un método `shutdown()` — hay que engancharlo al
    // evento de la escena (a diferencia de create/update, que sí son
    // especiales) para que el <div> se oculte al salir de esta escena.
    this.events.once('shutdown', this.shutdown, this);

    const container = getStreetViewContainer();
    container.style.display = 'block';

    if (!sharedPanorama) {
      sharedPanorama = new google.maps.StreetViewPanorama(container, {
        addressControl: false, fullscreenControl: false, motionTracking: false,
        motionTrackingControl: false, showRoadLabels: false,
      });
    } else {
      sharedPanorama.setOptions({ visible: true });
      // Reengancha el panorama compartido al contenedor de ESTA escena (por
      // si Phaser recreó el DOM entre escenas, aunque normalmente no pasa).
      if (sharedPanorama.getContainer && sharedPanorama.getContainer() !== container) {
        sharedPanorama = new google.maps.StreetViewPanorama(container, {
          addressControl: false, fullscreenControl: false, motionTracking: false,
          motionTrackingControl: false, showRoadLabels: false,
        });
      }
    }
    this.panorama = sharedPanorama;

    this.posListener = this.panorama.addListener('position_changed', () => {
      const pos = this.panorama.getPosition();
      if (pos) this.currentPos = { lat: pos.lat(), lng: pos.lng() };
    });

    this.seekTo(points.pois[0]);
  }

  // Busca el panorama real más cercano a `point` (lat/lng) y salta ahí —
  // usado tanto para entrar por primera vez a la localidad como para el
  // fast-travel de "viajar" entre puntos de interés.
  seekTo(point) {
    this.statusText.setText('Buscando cobertura de Street View…').setVisible(true);
    const svService = new google.maps.StreetViewService();
    const trySearch = (radius, onFail) => {
      svService.getPanorama({ location: point, radius, source: google.maps.StreetViewSource.OUTDOOR }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK) {
          this.statusText.setVisible(false);
          this.panorama.setPano(data.location.pano);
          this.panorama.setPov({ heading: 0, pitch: 0 });
        } else if (onFail) {
          onFail();
        } else {
          this.statusText.setText('No se encontró Street View cerca de este punto.\nESC: volver al mapa');
        }
      });
    };
    trySearch(300, () => trySearch(1500, null));
  }

  updateInteractable() {
    if (!this.currentPos) { this.prompt.setVisible(false); return; }
    const RANGE = 60;
    // Una vez terminada la historia de esta localidad (llegó a Cierre ->
    // Selector), ya no hay más que "hablar" acá — solo queda viajar.
    this.nearestPoi = this.storyDone ? null : (this.points.pois.find(p => metersBetween(this.currentPos, p) < RANGE) || null);
    this.nearViajar = metersBetween(this.currentPos, this.points.viajar) < RANGE;

    if (this.nearestPoi) {
      const viajarHint = this.nearViajar ? '  —  [T] viajar' : '';
      this.prompt.setText(`[ESPACIO] hablar — ${this.nearestPoi.label}${viajarHint}`).setVisible(true);
    } else if (this.nearViajar) {
      this.prompt.setText(`[T] viajar — ${this.points.viajar.label}`).setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  talkToNpc() {
    const placeLabel = this.nearestPoi ? this.nearestPoi.label : null;
    this.box.open(this.state.currentNodeId, (type) => {
      if (type === 'ending') this.scene.start('EndingScene');
      else if (type === 'hub') this.storyDone = true;
      // type 'checkpoint': la conversación se pausa acá — se retoma en
      // cualquier punto de interés más adelante, no hace falta nada más.
    }, placeLabel);
  }

  viajar() {
    if (!this.storyDone) {
      // Fast-travel a otro punto de interés de la MISMA localidad —
      // evita tener que arrastrar Street View a mano hasta encontrarlo.
      const others = this.points.pois.filter(p => p !== this.nearestPoi);
      const target = others[Math.floor(Math.random() * others.length)] || this.points.pois[0];
      this.seekTo(target);
      return;
    }
    const nextLoc = this.state.nextRandomFromPool();
    if (!nextLoc) { this.scene.start('EndingScene'); return; }
    this.scene.start('StreetViewScene', { locality: nextLoc });
  }

  update() {
    if (this.box.isOpen()) {
      this.game.canvas.style.pointerEvents = 'auto';
      this.box.update();
      return;
    }
    this.game.canvas.style.pointerEvents = 'none';

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) { this.scene.start('MapScene'); return; }

    this.updateInteractable();
    if (this.nearestPoi && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.prompt.setVisible(false);
      this.talkToNpc();
    } else if (this.nearViajar && Phaser.Input.Keyboard.JustDown(this.keys.T)) {
      this.prompt.setVisible(false);
      this.viajar();
    }
  }

  shutdown() {
    if (this.posListener) this.posListener.remove();
    const container = getStreetViewContainer();
    if (container) container.style.display = 'none';
    // Se restaura a 'auto' (no 'none'): las demás escenas (MapScene,
    // DialogueScene...) necesitan que el canvas SÍ reciba clics de nuevo.
    this.game.canvas.style.pointerEvents = 'auto';
  }
}

/* ============================================================
   ESCENA: REVELACIÓN FINAL — guarda la partida en el backend
   ============================================================ */
export class EndingScene extends Phaser.Scene {
  constructor() { super('EndingScene'); }
  create() {
    const state = this.state = this.game.gState;
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor(PALETTE.night);

    this.saveRun();

    this.add.text(W / 2, 40, 'REVELACIÓN', {
      fontFamily: FONT_DISPLAY, fontSize: '28px', color: '#ece7dd', letterSpacing: 2
    }).setOrigin(0.5);

    const cx = W / 2, cy = 150, baseR = 60;
    const gfx = this.add.graphics();
    const pts = entityPolygonPoints(state.stats, baseR, cx, cy);
    const total = state.total();
    const color = total > 0 ? PALETTE.accentCool : (total < 0 ? PALETTE.accentRust : 0x8892b0);
    gfx.lineStyle(2, color, 1); gfx.fillStyle(color, 0.15);
    gfx.beginPath(); pts.forEach((p, i) => i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y));
    gfx.closePath(); gfx.fillPath(); gfx.strokePath();

    const traits = [];
    STAT_ORDER.forEach(s => {
      const v = state.stats[s];
      if (v > 0) traits.push(TRAITS[s].pos);
      else if (v < 0) traits.push(TRAITS[s].neg);
    });

    let desc = traits.length
      ? `Se puede describir, hoy, como alguien ${traits.join(', ')}.`
      : 'No terminó de inclinarse hacia ningún lado — todavía es, sobre todo, una posibilidad.';

    let totalTxt = total >= 4
      ? 'Es, sobre todo, un reflejo amable de la ciudad: la parte de Bogotá que se detiene, que escucha, que confía un poco más de lo que le enseñaron.'
      : (total <= -4
        ? 'Es, sobre todo, un reflejo áspero de la ciudad: la parte que aprendió a no detenerse, a no confiar, a mirar para otro lado cuando algo incomoda.'
        : 'Es, sobre todo, un reflejo mixto — como la ciudad misma, que no es una sola cosa, sino muchas decisiones pequeñas superpuestas.');

    let completionTxt = state.visitedCount() >= 8
      ? 'Y así, sin buscarlo, terminaste de construir algo con cada esquina en la que decidiste algo, de día o de noche. Bogotá no te enseñó una lección — te dejó ocho, y tú decidiste cuáles aprender.'
      : `Y así, sin terminar de recorrerla toda (${state.visitedCount()} de 8 localidades), la ciudad ya alcanzó a dejar algo en ti.`;

    this.add.text(30, 230, `${desc}\n\n${totalTxt}\n\n${completionTxt}`, {
      fontFamily: FONT_BODY, fontSize: '15px', color: '#ece7dd', wordWrap: { width: W - 60 }, lineSpacing: 6
    });

    const again = this.add.text(W / 2, H - 30, '[ Volver a empezar ]', {
      fontFamily: FONT_MONO, fontSize: '13px', color: '#f2a03d'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => { this.scene.start('BootScene'); });
  }

  async saveRun() {
    if (this.state.runSaved) return;
    this.state.runSaved = true;
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: this.state.playerName,
          characterId: this.state.characterId,
          stats: this.state.stats,
          visitadas: this.state.visitadas,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn('No se pudo guardar la partida en el servidor (¿está corriendo `npm start`?):', err);
    }
  }
}
