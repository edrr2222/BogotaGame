import { NODE_BY_ID } from './storyData.js';
import { buildPages } from './storyRuntime.js';
import { FONT_DISPLAY, FONT_BODY, FONT_MONO, PALETTE } from './gameConfig.js';

const BOX_H = 260;

// Ventana de diálogo chica y paginada (RPG clásico), en vez de una página
// larga de texto. La usan tanto DialogueScene (localidades sin caminar)
// como WalkScene (localidades caminables), sobre lo que cada una ya haya
// dibujado de fondo.
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
    this.panelY = H - BOX_H;
    this.container = this.scene.add.container(0, 0).setDepth(20);

    this.bg = this.scene.add.rectangle(0, this.panelY, W, BOX_H, PALETTE.panelNight, 0.95).setOrigin(0, 0);
    this.bg.on('pointerdown', () => this.advance());

    this.nameText = this.scene.add.text(24, this.panelY + 14, '', {
      fontFamily: FONT_DISPLAY, fontSize: '18px', color: '#f2a03d'
    });
    this.tagText = this.scene.add.text(W - 24, this.panelY + 14, '', {
      fontFamily: FONT_MONO, fontSize: '12px', color: '#8892b0'
    }).setOrigin(1, 0);
    this.bodyText = this.scene.add.text(24, this.panelY + 46, '', {
      fontFamily: FONT_BODY, fontSize: '15px', color: '#ece7dd',
      wordWrap: { width: W - 48 }, lineSpacing: 5
    });
    this.hintText = this.scene.add.text(W - 24, H - 14, '', {
      fontFamily: FONT_MONO, fontSize: '11px', color: '#8892b0'
    }).setOrigin(1, 1);

    this.container.add([this.bg, this.nameText, this.tagText, this.bodyText, this.hintText]);
    this.keySpace = this.scene.input.keyboard.addKey('SPACE');
    this.keyEnter = this.scene.input.keyboard.addKey('ENTER');
    this.setVisible(false);
  }

  setVisible(v) {
    this.visible = v;
    this.container.setVisible(v);
    if (v) this.bg.setInteractive(); else this.bg.disableInteractive();
  }

  isOpen() { return this.visible; }

  update() {
    if (!this.visible) return;
    if (Phaser.Input.Keyboard.JustDown(this.keySpace) || Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
      this.advance();
    }
  }

  // nodeId: nodo de arranque. onDone(type) se llama cuando la conversación
  // termina: type 'hub' -> volver al mapa; 'ending' -> ir a la revelación.
  open(nodeId, onDone) {
    this._onDone = onDone;
    this.state.currentNodeId = nodeId;
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
    this.nameText.setText(node.location ? node.location.toUpperCase() : 'BOGOTÁ');
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
    // fondo del panel a ciegas), para no pisar párrafos largos como el de
    // "Chapinero: Entrada" (texto base + extra_raw en una sola página).
    const bodyBottom = this.bodyText.y + this.bodyText.height;
    const maxY = this.scene.scale.height - 24 - (choices.length - 1) * 28;
    let y = Math.min(bodyBottom + 18, maxY);
    choices.forEach((c) => {
      const btn = this.scene.add.text(24, y, '→ ' + c.text, {
        fontFamily: FONT_DISPLAY, fontSize: '16px', color: '#4fd1c5'
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setColor('#f2a03d'));
      btn.on('pointerout', () => btn.setColor('#4fd1c5'));
      btn.on('pointerdown', () => this._choose(node, c));
      this.container.add(btn);
      this.choiceButtons.push(btn);
      y += 28;
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
