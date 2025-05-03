import * as Phaser from 'phaser';

export class GameOver extends Phaser.Scene {
    private finalScore = 0;

    constructor() {
        super({ key: 'GameOver' });
    }

    // Receive data from the scene that started this one
    init(data: { finalScore?: number }) {
        console.log("GameOver init received data:", data);
        this.finalScore = data.finalScore ?? 0; // Default to 0 if score isn't passed
    }

    create() {
        console.log("GameOver Scene created");
        const { width, height } = this.scale;

        // --- Styling (Placeholders - enhance later) ---
        this.cameras.main.setBackgroundColor('#2c1d3b'); // Dark purple/grunge placeholder
        const titleStyle = { fontSize: '72px', color: '#e43a19', fontStyle: 'bold', fontFamily: 'Impact, sans-serif' };
        const scoreStyle = { fontSize: '40px', color: '#f0d5a8' };
        const restartStyle = { fontSize: '32px', color: '#c8b69a' };

        // --- Text Elements ---
        // Game Over Title (Grunge vibe)
        this.add.text(width / 2, height * 0.3, 'YOU WIPED OUT!', titleStyle)
            .setOrigin(0.5)
            .setShadow(3, 3, '#000000', 5);

        // Final Score
        this.add.text(width / 2, height * 0.5, `Final Score: ${this.finalScore}`, scoreStyle)
            .setOrigin(0.5);

        // Restart Text (Just display it, no interaction needed on the text itself)
        this.add.text(width / 2, height * 0.7, 'Tap Stage to Retry', restartStyle)
            .setOrigin(0.5);

        // Make entire screen interactive for restart
        this.input.on('pointerdown', () => {
            console.log("Restarting MainScene from GameOver...");
             // Reset any relevant game state if needed before restarting
             // For example, if using a global state manager.
            this.scene.start('MainScene');
        });
    }
} 