import * as Phaser from 'phaser';

export class WinScene extends Phaser.Scene {
    private finalScore = 0;
    private baseScore = 0;
    private distanceScore = 0;
    private lifeBonus = 0;

    constructor() {
        super({ key: 'WinScene' });
    }

    // Receive data from the scene that started this one
    init(data: { 
        finalScore?: number,
        baseScore?: number,
        distanceScore?: number,
        lifeBonus?: number
    }) {
        console.log("WinScene init received data:", data);
        this.finalScore = data.finalScore ?? 0;
        this.baseScore = data.baseScore ?? 0;
        this.distanceScore = data.distanceScore ?? 0;
        this.lifeBonus = data.lifeBonus ?? 0;
    }

    create() {
        console.log("WinScene created");
        const { width, height } = this.scale;

        // --- Styling ---
        this.cameras.main.setBackgroundColor('#002244'); // Dark blue background for nighttime city feel
        
        const titleStyle = { 
            fontSize: '58px', 
            color: '#00FF00', // Green for success
            fontStyle: 'bold', 
            fontFamily: 'Impact, sans-serif',
            padding: { x: 30, y: 30 },
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, stroke: true, fill: true }
        };
        
        const scoreStyle = { 
            fontSize: '32px', 
            color: '#FFFFFF',
            padding: { x: 25, y: 15 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
        };
        
        const detailStyle = { 
            fontSize: '24px', 
            color: '#CCCCCC',
            padding: { x: 15, y: 8 },
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, stroke: true, fill: true }
        };
        
        const restartStyle = { 
            fontSize: '28px', 
            color: '#FFFFFF',
            padding: { x: 25, y: 20 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
        };

        // Create a container for better positioning
        const container = this.add.container(width / 2, height / 2);
        container.setSize(width * 0.9, height * 0.9);
        
        // --- Text Elements ---
        // Win Title
        const titleText = this.add.text(0, -height * 0.25, 'MADE IT TO WORK ON TIME!', titleStyle)
            .setOrigin(0.5)
            .setShadow(3, 3, '#000000', 5);
        
        // Final Score
        const scoreText = this.add.text(0, -height * 0.1, `Final Score: ${this.finalScore}`, scoreStyle)
            .setOrigin(0.5);
        
        // Score breakdown
        const baseScoreText = this.add.text(0, -height * 0.02, `Base Score: ${this.baseScore}`, detailStyle)
            .setOrigin(0.5);
        
        const distanceText = this.add.text(0, height * 0.05, `Distance Bonus: ${this.distanceScore}`, detailStyle)
            .setOrigin(0.5);
        
        const lifeBonusText = this.add.text(0, height * 0.12, `Life Bonus: ${this.lifeBonus}`, detailStyle)
            .setOrigin(0.5);
        
        // Restart Text
        const restartText = this.add.text(0, height * 0.25, 'Tap to Play Again', restartStyle)
            .setOrigin(0.5);
        
        // Add all elements to container for unified positioning
        container.add([titleText, scoreText, baseScoreText, distanceText, lifeBonusText, restartText]);

        // Make entire screen interactive for restart
        this.input.on('pointerdown', () => {
            console.log("Restarting MainScene from WinScene...");
            
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