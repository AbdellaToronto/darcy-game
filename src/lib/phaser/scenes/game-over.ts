import * as Phaser from 'phaser';

export class GameOver extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOver' });
    }

    create() {
        console.log("GameOver Scene created");
        const { width, height } = this.scale;

        // Simple dark background
        this.cameras.main.setBackgroundColor('#333333');

        // Game Over Text
        this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
            fontSize: '64px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Restart Text/Button
        const restartText = this.add.text(width / 2, height / 2 + 50, 'Tap or Click to Restart', {
            fontSize: '32px',
            color: '#eeeeee'
        }).setOrigin(0.5);

        // Make restart text interactive
        restartText.setInteractive({ useHandCursor: true });

        // Restart listener
        this.input.on('pointerdown', () => {
            console.log("Restarting MainScene from GameOver...");
            this.scene.start('MainScene'); 
        });
    }
} 