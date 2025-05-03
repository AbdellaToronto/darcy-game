import * as Phaser from 'phaser';

export class GameOver extends Phaser.Scene {
    private finalScore = 0;
    private baseScore = 0;
    private distanceScore = 0;
    private lifeBonus = 0;

    constructor() {
        super({ key: 'GameOver' });
    }

    // Receive data from the scene that started this one
    init(data: { 
        finalScore?: number,
        baseScore?: number,
        distanceScore?: number,
        lifeBonus?: number
    }) {
        console.log("GameOver init received data:", data);
        this.finalScore = data.finalScore ?? 0;
        this.baseScore = data.baseScore ?? 0;
        this.distanceScore = data.distanceScore ?? 0;
        this.lifeBonus = data.lifeBonus ?? 0;
    }

    create() {
        console.log("GameOver Scene created");
        const { width, height } = this.scale;

        // --- Styling ---
        this.cameras.main.setBackgroundColor('#2c1d3b'); // Dark purple/grunge placeholder
        
        const titleStyle = { 
            fontSize: '64px', 
            color: '#e43a19', 
            fontStyle: 'bold', 
            fontFamily: 'Impact, sans-serif',
            padding: { x: 30, y: 30 },
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, stroke: true, fill: true }
        };
        
        const scoreStyle = { 
            fontSize: '32px', 
            color: '#f0d5a8',
            padding: { x: 25, y: 15 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
        };
        
        const detailStyle = { 
            fontSize: '24px', 
            color: '#c8b69a',
            padding: { x: 15, y: 8 },
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, stroke: true, fill: true }
        };
        
        const restartStyle = { 
            fontSize: '28px', 
            color: '#c8b69a',
            padding: { x: 25, y: 20 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
        };

        // Create a container for better positioning
        const container = this.add.container(width / 2, height / 2);
        container.setSize(width * 0.9, height * 0.9);
        
        // --- Text Elements ---
        // Game Over Title
        const titleText = this.add.text(0, -height * 0.25, 'NIGHT RUINED!', titleStyle)
            .setOrigin(0.5)
            .setShadow(3, 3, '#000000', 5);
        
        // Final Score
        const scoreText = this.add.text(0, -height * 0.1, `Final Score: ${this.finalScore}`, scoreStyle)
            .setOrigin(0.5);
        
        // Score breakdown
        const baseScoreText = this.add.text(0, -height * 0.02, `Bartending Skills: ${this.baseScore}`, detailStyle)
            .setOrigin(0.5);
        
        const distanceText = this.add.text(0, height * 0.05, `Travel Bonus: ${this.distanceScore}`, detailStyle)
            .setOrigin(0.5);
        
        const lifeBonusText = this.add.text(0, height * 0.12, `Style Points: ${this.lifeBonus}`, detailStyle)
            .setOrigin(0.5);
        
        // Add message about being late
        const lateMessage = this.add.text(0, height * 0.19, "You didn't make it to work on time!", {
            fontSize: '20px',
            color: '#FF6666',
            fontStyle: 'italic',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5);
        
        // Restart Text
        const restartText = this.add.text(0, height * 0.3, 'Tap to Try Again', restartStyle)
            .setOrigin(0.5);
        
        // Add all elements to container for unified positioning
        container.add([titleText, scoreText, baseScoreText, distanceText, lifeBonusText, lateMessage, restartText]);

        // Make entire screen interactive for restart
        this.input.on('pointerdown', () => {
            console.log("Restarting MainScene from GameOver...");
            
            // Reset game state in data manager
            const mainScene = this.scene.get('MainScene');
            
            // Clear any persistent data to ensure a fresh start
            mainScene.data.set('currentLives', 3); // Reset to default lives
            mainScene.data.set('currentScore', 0); // Reset score to 0
            mainScene.data.set('timeLeft', 60000); // Reset timer
            mainScene.data.set('maxDistance', 0); // Reset distance
            
            this.scene.start('MainScene');
        });
    }
} 