import * as Phaser from 'phaser';
import { MainScene } from '@/lib/phaser/scenes/main-scene';

const gameWidth = 800; // Keep track of base width
const gameHeight = 600; // Keep track of base height

// Define the game configuration
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO, // Automatically choose WebGL or Canvas
    width: gameWidth,       // Game width in pixels
    height: gameHeight,      // Game height in pixels
    // parent: 'game-container', // Parent is set in StartGame now
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 500 }, // Increased gravity
            debug: process.env.NODE_ENV === 'development', // Debug in dev
            // worldBounds will be set in the scene create method
        }
    },
    scene: [
        // Add other scenes like Boot, Preloader here if needed
        MainScene
    ],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH // Keep centering within the resized canvas
    },
    pixelArt: true, // Essential for crisp pixel art
    backgroundColor: '#6bb6ff', // Moved background color here
};

// Function to initialize the game
const StartGame = (parentId: string): Phaser.Game => {
    console.log('Starting Phaser game with parent ID:', parentId);
    return new Phaser.Game({ ...config, parent: parentId });
}

export default StartGame; 