import { BootScene, MapScene, DialogueScene, WalkScene, EndingScene } from './scenes.js';
import { GameState } from './gameState.js';
import { initSetupOverlay } from './setupOverlay.js';

initSetupOverlay();

const config = {
  type: Phaser.AUTO,
  width: 720,
  height: 720,
  parent: 'game-root',
  backgroundColor: '#0e1024',
  scene: [BootScene, MapScene, DialogueScene, WalkScene, EndingScene],
};

const game = new Phaser.Game(config);
game.gState = new GameState();
