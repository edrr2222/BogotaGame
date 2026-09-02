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
      (cfg.pathTiles || []).forEach(t => this.load.image(t.key, assetUrl(t.path)));
      (cfg.screens || [cfg]).forEach(screen => {
        if (screen.streetscape) this.load.image(screen.streetscape.key, assetUrl(screen.streetscape.path));
        if (screen.npc) this.load.image(screen.npc.key, assetUrl(screen.npc.path));
        if (screen.busStop) this.load.image(screen.busStop.key, assetUrl(screen.busStop.path));
        (screen.props || []).forEach(p => this.load.image(p.key, assetUrl(p.path)));
      });
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

/* ============================================================
   ESCENA: CAMINAR — localidad como secuencia de pantallas conectadas
   por los bordes (screens[] en WALKABLE_SCENES). La pantalla 0 tiene
   el NPC que abre el diálogo de "Entrada"; la última tiene la parada
   de bus/Transmilenio que manda a otra localidad al azar (o a la
   revelación si ya no queda ninguna).
   ============================================================ */
export class WalkScene extends Phaser.Scene {
  constructor() { super('WalkScene'); }

  init(data) {
    this.locality = data.locality;
    this.screenIndex = data.screenIndex || 0;
    this.enterFrom = data.enterFrom || null; // 'left' | 'right' | null (primer ingreso)
  }

  create() {
    this.state = this.game.gState;
    const cfg = this.cfg = WALKABLE_SCENES[this.locality];
    const screens = cfg.screens || [cfg]; // compat: localidad sin migrar a screens[] todavía
    this.totalScreens = screens.length;
    const screen = this.screen = screens[this.screenIndex];
    const isNight = this.state.momento === 'Noche';
    const W = this.scale.width;
    const b = cfg.bounds;

    this.cameras.main.setBackgroundColor(isNight ? cfg.groundColorNight : cfg.groundColorDay);
    this.drawSky(isNight, W);

    this.add.text(24, 16, this.locality.toUpperCase(), {
      fontFamily: FONT_DISPLAY, fontSize: '20px', color: isNight ? '#f2a03d' : '#c1440e'
    }).setDepth(6);
    this.add.text(W - 24, 16, isNight ? 'NOCHE' : 'DÍA', {
      fontFamily: FONT_MONO, fontSize: '12px', color: '#8892b0'
    }).setOrigin(1, 0).setDepth(6);
    this.add.text(W - 24, 38,
      `Pantalla ${this.screenIndex + 1}/${this.totalScreens} — WASD: moverse — ESC: volver al mapa`, {
      fontFamily: FONT_MONO, fontSize: '10px', color: '#8892b0'
    }).setOrigin(1, 0).setDepth(6);

    if (screen.streetscape && this.textures.exists(screen.streetscape.key)) {
      const bg = this.add.image(0, 0, screen.streetscape.key).setOrigin(0, 0).setDepth(-1);
      const bgScale = W / bg.width;
      bg.setDisplaySize(W, bg.height * bgScale);
      if (isNight) bg.setTint(0x8891c8);
    }

    this.drawPath(cfg, isNight);

    (screen.props || []).forEach(p => {
      if (!this.textures.exists(p.key)) return;
      this.add.image(p.x, p.y, p.key).setScale(p.scale || 1).setDepth(p.depth || 1);
    });

    // Un solo "interactuable" por pantalla: el NPC de diálogo (pantalla 0) o
    // la parada de bus (última pantalla) — nunca los dos a la vez.
    this.interactable = null;
    if (screen.npc && this.textures.exists(screen.npc.key)) {
      const npc = this.add.image(screen.npc.x, screen.npc.y, screen.npc.key).setDepth(3);
      this.fitHeight(npc, 70);
      this.interactable = { obj: npc, promptText: '[ESPACIO] hablar', onTrigger: () => this.talkToNpc() };
    } else if (screen.busStop && this.textures.exists(screen.busStop.key)) {
      const bs = this.add.image(screen.busStop.x, screen.busStop.y, screen.busStop.key).setDepth(3);
      this.fitHeight(bs, 90);
      this.interactable = { obj: bs, promptText: '[ESPACIO] tomar el bus', onTrigger: () => this.takeBus() };
    }

    this.avatar = avatarById(this.state.characterId);
    this.facing = 'front';
    const frontKey = this.avatar?.dirs.front.key;
    const walkMidY = (cfg.walkY.min + cfg.walkY.max) / 2;
    let spawnX;
    if (this.enterFrom === 'left') spawnX = b.x + 40;
    else if (this.enterFrom === 'right') spawnX = b.x + b.w - 40;
    else spawnX = (screen.playerSpawn && screen.playerSpawn.x) || b.x + 120;
    this.player = (frontKey && this.textures.exists(frontKey))
      ? this.add.image(spawnX, walkMidY, frontKey)
      : this.add.rectangle(spawnX, walkMidY, 26, 50, 0xece7dd);
    this.player.setDepth(4);
    if (frontKey && this.textures.exists(frontKey)) this.fitHeight(this.player, 76);

    this.prompt = this.add.text(0, 0, '', {
      fontFamily: FONT_MONO, fontSize: '12px', color: '#f2a03d'
    }).setOrigin(0.5, 1).setDepth(5).setVisible(false);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ESC');

    this.box = new DialogueBox(this, this.state);
  }

  talkToNpc() {
    this.box.open(`${this.locality}: Entrada`, (type) => {
      if (type === 'ending') this.scene.start('EndingScene');
      // type 'hub': el hilo de diálogo de esta localidad terminó, pero se
      // sigue caminando en la misma pantalla hacia las siguientes / la
      // parada de bus, no se vuelve al mapa automáticamente.
    });
  }

  takeBus() {
    const nextLoc = this.state.nextRandomFromPool();
    if (!nextLoc) { this.scene.start('EndingScene'); return; }
    if (WALKABLE_SCENES[nextLoc]) {
      this.scene.start('WalkScene', { locality: nextLoc, screenIndex: 0 });
    } else {
      this.scene.start('DialogueScene');
    }
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

  // Carril caminable real: en vez de una sola baldosa repetida al infinito,
  // va alternando entre las variantes de acera generadas para que se vea
  // como una acera real y no una textura clonada.
  drawPath(cfg, isNight) {
    const tiles = (cfg.pathTiles || []).filter(t => this.textures.exists(t.key));
    const y = (cfg.walkY.min + cfg.walkY.max) / 2;
    if (tiles.length === 0) {
      const shade = isNight ? 0x232853 : 0xc9bd9e;
      this.add.rectangle(cfg.bounds.x, cfg.walkY.min, cfg.bounds.w, cfg.walkY.max - cfg.walkY.min, shade, 0.6)
        .setOrigin(0, 0).setDepth(0);
      return;
    }
    const tileSize = 60;
    const count = Math.ceil(cfg.bounds.w / tileSize) + 1;
    for (let i = 0; i < count; i++) {
      const t = tiles[i % tiles.length];
      this.add.image(cfg.bounds.x + i * tileSize, y, t.key)
        .setDisplaySize(tileSize, tileSize).setDepth(0);
    }
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
      const newX = this.player.x + (dx / len) * speed;
      const newY = this.player.y + (dy / len) * speed;

      // Al llegar al borde de una pantalla que sí continúa hacia otra, se
      // transiciona en vez de quedar clavado contra el límite — así se
      // "sigue hasta el borde del mapa y se muestra la continuación".
      const canGoRight = this.screenIndex < this.totalScreens - 1;
      const canGoLeft = this.screenIndex > 0;
      if (canGoRight && newX > b.x + b.w - 15) {
        this.scene.start('WalkScene', { locality: this.locality, screenIndex: this.screenIndex + 1, enterFrom: 'left' });
        return;
      }
      if (canGoLeft && newX < b.x + 15) {
        this.scene.start('WalkScene', { locality: this.locality, screenIndex: this.screenIndex - 1, enterFrom: 'right' });
        return;
      }

      // El jugador queda confinado al carril de la acera (walkY), no a toda
      // la escena — así no camina sobre los techos ni flotando en el cielo.
      // Cuando SÍ hay pantalla siguiente/anterior, no se topa el clamp en
      // ese lado (si no, el jugador quedaba atrapado un par de píxeles antes
      // del umbral de transición y este nunca llegaba a dispararse).
      const minX = canGoLeft ? -100000 : b.x + 20;
      const maxX = canGoRight ? 100000 : b.x + b.w - 20;
      this.player.x = Phaser.Math.Clamp(newX, minX, maxX);
      this.player.y = Phaser.Math.Clamp(newY, this.cfg.walkY.min, this.cfg.walkY.max);
      // Horizontal manda sobre vertical si se presionan a la vez (A/D
      // cambian a la vista de lado, W/S a espalda/frente).
      if (dx < 0) this.setFacing('left');
      else if (dx > 0) this.setFacing('right');
      else if (dy < 0) this.setFacing('back');
      else this.setFacing('front');
    }

    if (this.interactable) {
      const { obj, promptText, onTrigger } = this.interactable;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y);
      const inRange = dist < 70;
      this.prompt.setText(promptText);
      this.prompt.setPosition(obj.x, obj.y - 55);
      this.prompt.setVisible(inRange);
      if (inRange && Phaser.Input.Keyboard.JustDown(k.SPACE)) {
        this.prompt.setVisible(false);
        onTrigger();
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
