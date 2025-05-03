import * as Phaser from 'phaser';

export class SplashScene extends Phaser.Scene {
    private titleText?: Phaser.GameObjects.Text;
    private controlsText?: Phaser.GameObjects.Text;
    private startText?: Phaser.GameObjects.Text;
    private backgroundImage?: Phaser.GameObjects.TileSprite;

    constructor() {
        super({ key: 'SplashScene' });
    }

    preload() {
        // Preload any assets needed for this scene
        if (!this.textures.exists('bg_stars')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            
            // Fill with deep blue
            graphics.fillStyle(0x0a0a2a);
            graphics.fillRect(0, 0, this.scale.width, this.scale.height);
            
            // Add stars
            graphics.fillStyle(0xffffff);
            for (let i = 0; i < 200; i++) {
                const x = Phaser.Math.Between(0, this.scale.width);
                const y = Phaser.Math.Between(0, this.scale.height);
                const size = Phaser.Math.FloatBetween(0.5, 2);
                graphics.fillCircle(x, y, size);
            }
            
            // Generate texture
            graphics.generateTexture('bg_stars', this.scale.width, this.scale.height);
            graphics.destroy();
        }
    }

    create() {
        const { width, height } = this.scale;

        // Add background
        this.backgroundImage = this.add.tileSprite(0, 0, width, height, 'bg_stars')
            .setOrigin(0, 0);

        // Add a dim overlay to make text more readable
        this.add.rectangle(0, 0, width, height, 0x000000, 0.5)
            .setOrigin(0, 0);

        // Title text
        const titleStyle = { 
            fontSize: '38px',
            color: '#ff0066',
            fontStyle: 'bold',
            fontFamily: 'Impact, sans-serif',
            align: 'center',
            padding: { x: 20, y: 20 },
            wordWrap: { width: width * 0.8 },
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, stroke: true, fill: true }
        };

        this.titleText = this.add.text(
            width / 2, 
            height * 0.2,
            "YOU'RE ALMOST LATE!\n1 MINUTE TO GET TO WORK\nFOR DISCO NIGHT!!! FOR DELLA!!", 
            titleStyle
        ).setOrigin(0.5);

        // Subtitle - Role description
        const subtitleStyle = {
            fontSize: '26px',
            color: '#00ffff',
            fontStyle: 'bold',
            padding: { x: 15, y: 15 },
            align: 'center',
            wordWrap: { width: width * 0.8 }
        };
        
        this.add.text(
            width / 2,
            height * 0.4,
            "You're both the bartender AND the main attraction!",
            subtitleStyle
        ).setOrigin(0.5);

        // Controls text
        const controlsStyle = {
            fontSize: '22px',
            color: '#ffffff',
            padding: { x: 15, y: 10 },
            align: 'center',
            wordWrap: { width: width * 0.8 },
            lineSpacing: 8
        };

        this.controlsText = this.add.text(
            width / 2, 
            height * 0.58,
            "CONTROLS:\n" +
            "- TAP to JUMP\n" + 
            "- TWO-FINGER TAP to ATTACK\n" +
            "- Avoid or attack Canadian geese\n" +
            "- Collect tequila shots for SUPERSTAR MODE",
            controlsStyle
        ).setOrigin(0.5);

        // Start text with pulsing effect
        const startStyle = {
            fontSize: '32px',
            color: '#ffff00',
            fontStyle: 'bold',
            padding: { x: 20, y: 20 }
        };

        this.startText = this.add.text(
            width / 2, 
            height * 0.85,
            "TAP ANYWHERE TO START", 
            startStyle
        ).setOrigin(0.5);

        // Add pulsing effect to start text
        this.tweens.add({
            targets: this.startText,
            alpha: { from: 1, to: 0.5 },
            scale: { from: 1, to: 1.1 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Make the scene interactive - start game on tap
        this.input.on('pointerdown', () => {
            // Transition to the main game scene
            this.scene.start('MainScene');
        });

        // Add background animation
        this.tweens.add({
            targets: this.backgroundImage,
            tilePositionX: { from: 0, to: 100 },
            duration: 20000,
            repeat: -1
        });
    }

    update() {
        // Any updates needed for this scene
    }
} 