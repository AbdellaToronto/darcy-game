import * as Phaser from 'phaser';
import { MainScene } from '@/lib/phaser/scenes/main-scene';
import { GameOver } from '@/lib/phaser/scenes/game-over';
import { WinScene } from '@/lib/phaser/scenes/win-scene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#87CEEB', // Sky blue
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 700 }, // Set to appropriate gravity for platformer
      // Force debug drawing ON for testing
      debug: false
    }
  },
  scene: [MainScene, GameOver, WinScene]
}; 