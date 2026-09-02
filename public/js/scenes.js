import { NODE_BY_ID } from './storyData.js';
import {
  PALETTE, FONT_DISPLAY, FONT_BODY, FONT_MONO,
  STAT_ORDER, LOCATIONS, STAT_BY_LOCATION, TRAITS,
  AVATAR_MANIFEST, BACKGROUND_MANIFEST, WALKABLE_SCENES, assetUrl, avatarById,
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
    AVATAR_MANIFEST.forEach(a => {
      Object.values(a.dirs).forEach(d => this.load.image(d.key, assetUrl(d.path)));
    });
    Object.values(BACKGROUND_MANIFEST).flat().forEach(b => this.load.image(b.key, assetUrl(b.path)));
    Object.values(WALKABLE_SCENES).forEach(cfg => {
      this.load.image(cfg.npc.key, assetUrl(cfg.npc.path));
      if (cfg.floorTile) this.load.image(cfg.floorTile.key, assetUrl(cfg.floorTile.path));
      cfg.props.forEach(p => this.load.image(p.key, assetUrl(p.path)));
    });
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
    if (WALKABLE_SCENES[loc]) {
      this.scene.start('WalkScene', { locality: loc });
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
    this.drawBackground(node, isNight);

    this.box = new DialogueBox(this, this.state);
    this.box.open(this.state.currentNodeId, (type) => {
      this.scene.start(type === 'ending' ? 'EndingScene' : 'MapScene');
    });
  }

  update() {
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

/* ============================================================
   ESCENA: CAMINAR — localidad como escenario poblado, movimiento
   con WASD/flechas, NPC fijo que abre la ventana de diálogo por
   proximidad (ver WALKABLE_SCENES en gameConfig.js).
   ============================================================ */
export class WalkScene extends Phaser.Scene {
  constructor() { super('WalkScene'); }

  init(data) { this.locality = data.locality; }

  create() {
    this.state = this.game.gState;
    const cfg = this.cfg = WALKABLE_SCENES[this.locality];
    const isNight = this.state.momento === 'Noche';
    const W = this.scale.width;

    this.cameras.main.setBackgroundColor(isNight ? cfg.groundColorNight : cfg.groundColorDay);
    this.drawSky(isNight, W);

    this.add.text(24, 16, this.locality.toUpperCase(), {
      fontFamily: FONT_DISPLAY, fontSize: '20px', color: isNight ? '#f2a03d' : '#c1440e'
    }).setDepth(6);
    this.add.text(W - 24, 16, isNight ? 'NOCHE' : 'DÍA', {
      fontFamily: FONT_MONO, fontSize: '12px', color: '#8892b0'
    }).setOrigin(1, 0).setDepth(6);
    this.add.text(W - 24, 38, 'WASD / flechas: moverse — ESC: volver al mapa', {
      fontFamily: FONT_MONO, fontSize: '10px', color: '#8892b0'
    }).setOrigin(1, 0).setDepth(6);

    if (cfg.floorTile && this.textures.exists(cfg.floorTile.key)) {
      this.add.tileSprite(cfg.bounds.x, cfg.bounds.y + cfg.bounds.h - 60, cfg.bounds.w, 60, cfg.floorTile.key)
        .setOrigin(0, 0).setDepth(0)
        .setTileScale(cfg.floorTile.tileScale || 1, cfg.floorTile.tileScale || 1);
    } else {
      const shade = isNight ? 0x232853 : 0xc9bd9e;
      this.add.rectangle(cfg.bounds.x, cfg.bounds.y + cfg.bounds.h - 60, cfg.bounds.w, 60, shade, 0.6)
        .setOrigin(0, 0).setDepth(0);
    }

    cfg.props.forEach(p => {
      if (!this.textures.exists(p.key)) return;
      this.add.image(p.x, p.y, p.key).setScale(p.scale || 1).setDepth(p.depth || 1);
    });

    this.npc = null;
    if (this.textures.exists(cfg.npc.key)) {
      this.npc = this.add.image(cfg.npc.x, cfg.npc.y, cfg.npc.key).setDepth(3);
      this.fitHeight(this.npc, 70);
    }

    this.avatar = avatarById(this.state.characterId);
    this.facing = 'front';
    const frontKey = this.avatar?.dirs.front.key;
    this.player = (frontKey && this.textures.exists(frontKey))
      ? this.add.image(cfg.playerSpawn.x, cfg.playerSpawn.y, frontKey)
      : this.add.rectangle(cfg.playerSpawn.x, cfg.playerSpawn.y, 26, 50, 0xece7dd);
    this.player.setDepth(4);
    if (frontKey && this.textures.exists(frontKey)) this.fitHeight(this.player, 76);

    this.prompt = this.add.text(0, 0, '[ESPACIO] hablar', {
      fontFamily: FONT_MONO, fontSize: '12px', color: '#f2a03d'
    }).setOrigin(0.5, 1).setDepth(5).setVisible(false);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ESC');

    this.box = new DialogueBox(this, this.state);
  }

  fitHeight(img, targetH) {
    const scale = targetH / img.height;
    img.setDisplaySize(img.width * scale, targetH);
  }

  // Cambia el sprite del jugador a la vista correspondiente (frente/espalda/
  // izquierda/derecha) generada para ese avatar, en vez de solo espejear la
  // imagen de frente.
  setFacing(dir) {
    if (!this.avatar || dir === this.facing) return;
    const d = this.avatar.dirs[dir];
    if (!d || !this.textures.exists(d.key)) return;
    this.facing = dir;
    this.player.setTexture(d.key);
    this.fitHeight(this.player, 76);
  }

  drawSky(isNight, W) {
    const skyH = 190;
    this.add.rectangle(0, 0, W, skyH, isNight ? 0x0b0e24 : 0x8ec9e8, 1).setOrigin(0, 0).setDepth(-2);

    if (isNight) {
      this.add.circle(W - 90, 60, 22, 0xf4f0e0, 1).setDepth(-1);
      this.add.circle(W - 80, 53, 18, 0x0b0e24, 1).setDepth(-1); // "muerde" la luna para dar forma de creciente
      const stars = [[40,30],[90,70],[150,25],[210,55],[260,20],[310,65],[360,35],[420,15],
        [460,60],[510,30],[560,50],[600,20],[30,90],[130,100],[240,95],[350,90],[450,100],[550,95],[620,80],[70,110]];
      stars.forEach(([sx, sy]) => this.add.circle(sx, sy, 1.5, 0xffffff, 0.9).setDepth(-1));
    } else {
      this.add.circle(W - 90, 55, 30, 0xffe27a, 1).setDepth(-1);
      this.add.circle(W - 90, 55, 22, 0xfff4c2, 1).setDepth(-1);
      const cloudAt = (cx, cy) => {
        const g = this.add.graphics().setDepth(-1);
        g.fillStyle(0xffffff, 0.9);
        g.fillEllipse(cx, cy, 46, 22);
        g.fillEllipse(cx - 22, cy + 4, 30, 16);
        g.fillEllipse(cx + 22, cy + 4, 30, 16);
      };
      cloudAt(140, 50);
      cloudAt(340, 35);
      cloudAt(500, 65);
    }

    // Filtro de opacamiento nocturno: capa oscura semitransparente sobre TODA
    // la escena (encima de props/NPC/jugador, debajo del panel de diálogo y
    // los textos de encabezado) para reforzar la sensación de noche.
    if (isNight) {
      this.add.rectangle(0, 0, W, this.scale.height, 0x0b0e24, 0.28).setOrigin(0, 0).setDepth(4.5);
    }
  }

  update(time, delta) {
    if (this.box.isOpen()) { this.box.update(); return; }

    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.ESC)) { this.scene.start('MapScene'); return; }

    const speed = 200 * (delta / 1000);
    let dx = 0, dy = 0;
    if (k.W.isDown || k.UP.isDown) dy -= 1;
    if (k.S.isDown || k.DOWN.isDown) dy += 1;
    if (k.A.isDown || k.LEFT.isDown) dx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const b = this.cfg.bounds;
      this.player.x = Phaser.Math.Clamp(this.player.x + (dx / len) * speed, b.x + 20, b.x + b.w - 20);
      this.player.y = Phaser.Math.Clamp(this.player.y + (dy / len) * speed, b.y + 20, b.y + b.h - 20);
      // Horizontal manda sobre vertical si se presionan a la vez (A/D
      // cambian a la vista de lado, W/S a espalda/frente).
      if (dx < 0) this.setFacing('left');
      else if (dx > 0) this.setFacing('right');
      else if (dy < 0) this.setFacing('back');
      else this.setFacing('front');
    }

    if (this.npc) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
      const inRange = dist < 70;
      this.prompt.setPosition(this.npc.x, this.npc.y - 55);
      this.prompt.setVisible(inRange);
      if (inRange && Phaser.Input.Keyboard.JustDown(k.SPACE)) {
        this.prompt.setVisible(false);
        this.box.open(`${this.locality}: Entrada`, (type) => {
          this.scene.start(type === 'ending' ? 'EndingScene' : 'MapScene');
        });
      }
    }
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
