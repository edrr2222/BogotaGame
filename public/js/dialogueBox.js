import { NODE_BY_ID } from './storyData.js';
import { buildPages, isConvergenceNode } from './storyRuntime.js';
import { FONT_DISPLAY, FONT_BODY, FONT_MONO, PALETTE } from './gameConfig.js';

const BOX_H = 220;
const MARGIN = 16;
const RADIUS = 22;

// Ventana de diálogo chica, paginada y con forma de burbuja de cómic (no un
// panel rectangular a lo RPG viejo) — cada página es un párrafo corto, para
// que no se sienta pesado estar leyendo. La usan tanto DialogueScene
// (respaldo sin Street View) como StreetViewScene (localidad real), sobre
// lo que cada una ya haya dibujado/mostrado de fondo.
export class DialogueBox {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.visible = false;
    this.choiceButtons = [];
    this._onDone = null;
    this._build();
  }

  _build() {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    this.bx = MARGIN;
    this.by = H - BOX_H;
    this.bw = W - MARGIN * 2;
    this.bh = BOX_H - MARGIN;
    this.container = this.scene.add.container(0, 0).setDepth(20);

    this.bg = this.scene.add.graphics();
    this._drawBubble();
    this.bg.setInteractive(new Phaser.Geom.Rectangle(this.bx, this.by, this.bw, this.bh), Phaser.Geom.Rectangle.Contains);
    this.bg.on('pointerdown', () => this.advance());

    this.nameText = this.scene.add.text(this.bx + 22, this.by + 16, '', {
      fontFamily: FONT_DISPLAY, fontSize: '17px', color: '#f2a03d'
    });
    this.tagText = this.scene.add.text(this.bx + this.bw - 20, this.by + 16, '', {
      fontFamily: FONT_MONO, fontSize: '11px', color: '#8892b0'
    }).setOrigin(1, 0);
    this.bodyText = this.scene.add.text(this.bx + 22, this.by + 46, '', {
      fontFamily: FONT_BODY, fontSize: '15px', color: '#ece7dd',
      wordWrap: { width: this.bw - 44 }, lineSpacing: 5
    });
    this.hintText = this.scene.add.text(this.bx + this.bw - 20, this.by + this.bh - 12, '', {
      fontFamily: FONT_MONO, fontSize: '11px', color: '#8892b0'
    }).setOrigin(1, 1);

    this.container.add([this.bg, this.nameText, this.tagText, this.bodyText, this.hintText]);
    this.keySpace = this.scene.input.keyboard.addKey('SPACE');
    this.keyEnter = this.scene.input.keyboard.addKey('ENTER');
    this.setVisible(false);
  }

  // Panel redondeado con una colita apuntando hacia arriba, como una
  // burbuja de historieta — reemplaza el rectángulo duro de antes.
  _drawBubble() {
    const { bx, by, bw, bh } = this;
    this.bg.clear();
    this.bg.fillStyle(PALETTE.panelNight, 0.95);
    this.bg.fillRoundedRect(bx, by, bw, bh, RADIUS);
    this.bg.fillTriangle(bx + 30, by + 1, bx + 54, by + 1, bx + 34, by - 14);
    this.bg.lineStyle(2, 0xf2a03d, 0.55);
    this.bg.strokeRoundedRect(bx, by, bw, bh, RADIUS);
    this.bg.beginPath();
    this.bg.moveTo(bx + 30, by + 1);
    this.bg.lineTo(bx + 34, by - 14);
    this.bg.lineTo(bx + 54, by + 1);
    this.bg.strokePath();
  }

  setVisible(v) {
    this.visible = v;
    this.container.setVisible(v);
    if (v) this.bg.setInteractive(new Phaser.Geom.Rectangle(this.bx, this.by, this.bw, this.bh), Phaser.Geom.Rectangle.Contains);
    else this.bg.disableInteractive();
  }

  isOpen() { return this.visible; }

  update() {
    if (!this.visible) return;
    if (Phaser.Input.Keyboard.JustDown(this.keySpace) || Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
      this.advance();
    }
  }

  // nodeId: nodo de arranque. onDone(type) se llama cuando la conversación
  // termina o se pausa: 'hub' -> localidad terminada; 'ending' -> ir a la
  // revelación; 'checkpoint' -> se pausó en un nodo de convergencia, se
  // retoma después. `placeLabel`: nombre del punto real donde se abrió
  // (ej. "Plaza de Bolívar") — se muestra junto al nombre de la localidad
  // para que el diálogo se sienta anclado al lugar concreto, no genérico.
  open(nodeId, onDone, placeLabel) {
    this._onDone = onDone;
    this._placeLabel = placeLabel || null;
    this.state.currentNodeId = nodeId;
    // Si el nodo de arranque YA es un nodo de cierre (hub/ending) — puede
    // pasar si algo vuelve a llamar a open() sobre una localidad cuya
    // historia ya terminó — no hay nada que renderizar: se resuelve de
    // una, como haría _advanceToCurrent() con cualquier otro nodo así.
    const node = NODE_BY_ID[nodeId];
    if (node && node.type === 'hub') { this._finish('hub'); return; }
    if (node && (node.type === 'ending' || nodeId === 'Revelación final')) { this._finish('ending'); return; }
    this._loadNode();
    this.setVisible(true);
  }

  _loadNode() {
    const node = NODE_BY_ID[this.state.currentNodeId];
    this.node = node;
    this.pages = buildPages(node, this.state.momento, this.state.stats);
    this.pageIndex = 0;
    this._clearChoices();
    this._renderPage();
  }

  _renderPage() {
    const node = this.node;
    const place = node.location ? node.location.toUpperCase() : 'BOGOTÁ';
    this.nameText.setText(this._placeLabel ? `${place} — ${this._placeLabel}` : place);
    this.tagText.setText(this.state.momento ? this.state.momento.toUpperCase() : '');
    this.bodyText.setText(this.pages[this.pageIndex]);
    this._clearChoices();

    const isLastPage = this.pageIndex === this.pages.length - 1;
    if (!isLastPage) {
      this.hintText.setText('[ESPACIO] seguir ▸');
      return;
    }

    const choices = node.choices || [];
    if (choices.length === 0) {
      this.hintText.setText('');
      this.scene.time.delayedCall(400, () => this._advanceToCurrent());
      return;
    }

    this.hintText.setText('');
    // Las opciones arrancan justo debajo del texto real (no ancladas al
    // fondo del panel a ciegas), sin pasarse del borde de abajo de la
    // burbuja aunque el párrafo sea un poco más largo de lo normal.
    const bodyBottom = this.bodyText.y + this.bodyText.height;
    const maxY = this.by + this.bh - 20 - (choices.length - 1) * 26;
    let y = Math.min(bodyBottom + 14, maxY);
    choices.forEach((c) => {
      const btn = this.scene.add.text(this.bx + 22, y, '→ ' + c.text, {
        fontFamily: FONT_DISPLAY, fontSize: '15px', color: '#4fd1c5'
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setColor('#f2a03d'));
      btn.on('pointerout', () => btn.setColor('#4fd1c5'));
      btn.on('pointerdown', () => this._choose(node, c));
      this.container.add(btn);
      this.choiceButtons.push(btn);
      y += 26;
    });
  }

  _clearChoices() {
    this.choiceButtons.forEach(b => b.destroy());
    this.choiceButtons = [];
  }

  advance() {
    if (!this.visible) return;
    if (this.pageIndex < this.pages.length - 1) {
      this.pageIndex++;
      this._renderPage();
    }
  }

  _choose(node, choice) {
    if (node.effects) {
      if (node.effects.day || node.effects.night) {
        this.state.applyEffects(this.state.momento === 'Noche' ? node.effects.night : node.effects.day);
      } else {
        this.state.applyEffects(node.effects);
      }
    }
    this.state.currentNodeId = choice.target;
    this._advanceToCurrent();
  }

  _advanceToCurrent() {
    const next = NODE_BY_ID[this.state.currentNodeId];
    if (next && next.type === 'hub') {
      this._finish('hub');
    } else if (next && (next.type === 'ending' || this.state.currentNodeId === 'Revelación final')) {
      this._finish('ending');
    } else if (next && isConvergenceNode(this.state.currentNodeId)) {
      // Nodo de convergencia (2+ caminos llevan acá): pausa la
      // conversación acá en vez de seguir de largo — el jugador la
      // retoma exactamente donde quedó (state.currentNodeId ya apunta
      // acá) desde cualquier punto de interés físico, más adelante. Así
      // una sesión de diálogo dura 1-2 nodos, no los 6 de la localidad
      // entera de una sentada.
      this._finish('checkpoint');
    } else {
      this._loadNode();
    }
  }

  _finish(type) {
    this.setVisible(false);
    this._clearChoices();
    const cb = this._onDone;
    this._onDone = null;
    if (cb) cb(type);
  }

  destroy() {
    this.container.destroy();
  }
}
