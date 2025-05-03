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
        
        // Adjust styles to prevent text cutoff
        const titleStyle = { 
            fontSize: '64px', // Reduced from 72px
            color: '#e43a19', 
            fontStyle: 'bold', 
            fontFamily: 'Impact, sans-serif',
            padding: { x: 30, y: 30 }, // Increased padding
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, stroke: true, fill: true }
        };
        
        const scoreStyle = { 
            fontSize: '36px', // Reduced from 40px
            color: '#f0d5a8',
            padding: { x: 25, y: 20 }, // Increased padding
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
        };
        
        const restartStyle = { 
            fontSize: '30px', // Reduced from 32px
            color: '#c8b69a',
            padding: { x: 25, y: 20 }, // Increased padding
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
        };

        // Create a container for better positioning
        const container = this.add.container(width / 2, height / 2);
        container.setSize(width * 0.8, height * 0.8); // Container smaller than screen
        
        // --- Text Elements within container (adjust spacing) ---
        // Game Over Title (Grunge vibe)
        const titleText = this.add.text(0, -height * 0.25, 'YOU WIPED OUT!', titleStyle)
            .setOrigin(0.5)
            .setShadow(3, 3, '#000000', 5);
        
        // Final Score
        const scoreText = this.add.text(0, 0, `Final Score: ${this.finalScore}`, scoreStyle)
            .setOrigin(0.5);
        
        // Restart Text
        const restartText = this.add.text(0, height * 0.25, 'Tap Stage to Retry', restartStyle)
            .setOrigin(0.5);
        
        // Add all elements to container for unified positioning
        container.add([titleText, scoreText, restartText]);

        // Make entire screen interactive for restart
        this.input.on('pointerdown', () => {
            console.log("Restarting MainScene from GameOver...");
            
            // Reset game state in data manager
            const mainScene = this.scene.get('MainScene');
            
            // Clear any persistent data to ensure a fresh start
            mainScene.data.set('currentLives', 3); // Reset to default lives
            mainScene.data.set('currentScore', 0); // Reset score to 0
            
            this.scene.start('MainScene');
        });
    }
} 