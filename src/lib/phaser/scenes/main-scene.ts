import * as Phaser from 'phaser';
import { EventBus } from '@/lib/phaser/event-bus';

export class MainScene extends Phaser.Scene {
    // Remove properties related to spritesheet slicing
    // private playerFrameWidth = 231;
    // private playerFrameHeight = 355;
    // private characterVisualWidth = 180;
    // private characterLeftPadding = 40;

    // Keep gameplay properties
    private walkSpeed = 200;
    private runSpeed = 350;
    private jumpVelocity = -400;
    private platformScrollMargin = 400;
    private platformKillOffset = 800;
    private platformWidth = 300;
    private platformHeight = 32;
    private targetWorldWidth = 20000; // Target width for ~1 min run
    private playerCollisionWidth = 0; // Store player collision width for platform gap calculation
    private lastPlayerX = 0; // Track player position for scoring
    private scoringTimer = 0; // Timer for scoring when blocked
    private scoringInterval = 500; // Decrement score every 500ms when blocked
    private maxGapMultiplier = 2.0; // Maximum gap between platforms as a multiplier of platform width

    // --- New Time Management ---
    private gameTimeLeft = 60000; // 60 seconds in milliseconds
    private timerText?: Phaser.GameObjects.Text;
    private gameStartTime = 0;

    // Keep game objects and state
    private player?: Phaser.Physics.Arcade.Sprite;
    private platforms?: Phaser.Physics.Arcade.Group;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceBar?: Phaser.Input.Keyboard.Key;
    private shiftKey?: Phaser.Input.Keyboard.Key;
    private isRunning = false;
    private isAttacking = false;
    private furthestPlatformX = 0;
    private playerStartX = 100;
    private isPointerDown = false;
    private pointerStartX = 0;
    private pointerStartY = 0;
    private pointerMoveX = 0;
    private dragThreshold = 30;
    private tapMaxTime = 250;
    private pointerDownTime = 0;
    private touchMoveDirection: 'left' | 'right' | 'none' = 'none';
    private touchJump = false;
    private touchAttack = false;
    private pointer2PreviouslyDown = false;

    // --- New Gameplay State ---
    private score = 0;
    private lives!: number;
    private startTime = 0; 
    private scoreText?: Phaser.GameObjects.Text;
    private livesText?: Phaser.GameObjects.Text;
    private playerCharacterHeight = 0; // Store for platform height calculations

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        console.log('Preloading assets in MainScene...');

        // --- Load Individual Frame Images ---
        const framePath = '/assets/sprite-sheet-2/';
        for (let r = 1; r <= 3; r++) {
            for (let c = 1; c <= 4; c++) {
                const key = `player_r${r}_c${c}`;
                const file = `row-${r}-column-${c}.png`;
                this.load.image(key, `${framePath}${file}`);
            }
        }

        // --- Remove old spritesheet loading ---
        // this.load.spritesheet('player_sheet', ...);

        // Keep placeholder platform
        if (!this.textures.exists('platform_rect')) {
            const graphics = this.make.graphics();
            graphics.fillStyle(0x228b22);
            graphics.fillRect(0, 0, this.platformWidth, this.platformHeight);
            graphics.generateTexture('platform_rect', this.platformWidth, this.platformHeight);
            graphics.destroy();
        }
    }

    create() {
        console.log('Creating game objects in MainScene...');
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;

        // --- Retrieve lives and score from data manager ---
        this.lives = this.data.get('currentLives') ?? 3;
        this.score = this.data.get('currentScore') ?? 0; // Retrieve persisted score or start at 0
        this.data.reset(); // Optional: Clear data manager after retrieving if not needed elsewhere
        console.log(`CREATE - Retrieved/Set this.lives to: ${this.lives}, this.score to: ${this.score}`);

        // Initialize time management
        this.gameStartTime = this.time.now;
        this.gameTimeLeft = 60000; // Reset to full time

        // Initialize other state
        this.startTime = this.time.now;
        this.isAttacking = false; 
        this.isRunning = false; 

        // --- World Bounds (Set target width) --- 
        this.physics.world.setBounds(0, 0, this.targetWorldWidth, gameHeight + 200);
        this.cameras.main.setBounds(0, 0, this.targetWorldWidth, gameHeight); // Update camera bounds too

        // --- Define Animations from Individual Images --- 
        const idleFrames = [{ key: 'player_r1_c1' }]; // Use first walk frame as idle
        const walkFrames = [
            { key: 'player_r1_c1' }, { key: 'player_r1_c2' },
            { key: 'player_r1_c3' }, { key: 'player_r1_c4' }
        ];
        const runFrames = [
            { key: 'player_r2_c1' }, { key: 'player_r2_c2' },
            { key: 'player_r2_c3' }, { key: 'player_r2_c4' }
        ];
        const attackFrames = [
            { key: 'player_r3_c1' }, { key: 'player_r3_c2' },
            { key: 'player_r3_c3' }, { key: 'player_r3_c4' }
        ];

        if (!this.anims.exists('idle')) {
            this.anims.create({ key: 'idle', frames: idleFrames, frameRate: 5 });
        }
        if (!this.anims.exists('walk')) {
            this.anims.create({ key: 'walk', frames: walkFrames, frameRate: 10, repeat: -1 });
        }
        if (!this.anims.exists('run')) {
            this.anims.create({ key: 'run', frames: runFrames, frameRate: 15, repeat: -1 });
        }
        if (!this.anims.exists('attack')) {
            this.anims.create({ key: 'attack', frames: attackFrames, frameRate: 12 });
        }

        // --- Player Start Position --- 
        this.playerStartX = gameWidth / 4;
        const groundY = gameHeight - this.platformHeight / 2;
        // Get dimensions of the loaded idle frame texture
        const idleFrameTexture = this.textures.get('player_r1_c1');
        // Access height directly from the base image frame
        const playerUnscaledHeight = idleFrameTexture.getSourceImage().height ?? 355; 
        const playerScaledHeight = playerUnscaledHeight * 0.5;
        this.playerCharacterHeight = playerScaledHeight; // Store for platform generation
        const playerStartY = groundY - this.platformHeight / 2 - playerScaledHeight / 2 - 2;
        console.log(`Ground Y: ${groundY}, Player Start Y: ${playerStartY}, Scaled Height: ${playerScaledHeight}`);

        // --- Player --- 
        this.player = this.physics.add.sprite(this.playerStartX, playerStartY, 'player_r1_c1');
        this.player.setScale(0.5); // Apply scaling
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        // --- Adjust Physics Body After Scaling ---
        // Reset body to match the scaled sprite dimensions initially.
        // We might need to fine-tune size/offset later for better collision feel.
        if (this.player.body) {
            this.player.body.setSize(); // Reset to scaled frame dimensions
            this.player.body.setOffset(0, 0); // Reset offset
            this.playerCollisionWidth = this.player.body.width; // Store for platform generation
            console.log(`Body size after scale and reset: ${this.player.body.width}x${this.player.body.height}`);
        } else {
            console.warn("Player body not available immediately after creation!");
        }

        // Initialize the last player position
        this.lastPlayerX = this.playerStartX;
        this.scoringTimer = this.time.now;

        // --- Platforms & Initial Ground --- 
        this.platforms = this.physics.add.group({
            allowGravity: false,
            immovable: true,
        });
        let initialGroundX = 0;
        while (initialGroundX < gameWidth * 2) { 
            this.addPlatform(initialGroundX + this.platformWidth / 2, groundY);
            initialGroundX += this.platformWidth;
        }

        // --- Physics --- 
        this.physics.add.collider(this.player, this.platforms);

        // --- Continue Platform Generation (Start further ahead) --- 
        this.furthestPlatformX = initialGroundX; 
        // Generate slightly more in create to ensure buffer
        const initialGenerationEndX = gameWidth + this.platformScrollMargin * 2;
        while(this.furthestPlatformX < initialGenerationEndX) { 
            const platformY = groundY - (Math.random() * 150);
            this.addPlatform(this.furthestPlatformX + this.platformWidth / 2, platformY);
            if (Math.random() > 0.3) { 
                 this.furthestPlatformX += this.platformWidth;
             } else {
                 this.furthestPlatformX += this.platformWidth * Phaser.Math.Between(2, 4); 
             }
        }

        // --- UI Text --- 
        const textStyle = { fontSize: '24px', color: '#FFFF00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 };
        // Score Text (Top-Left)
        this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, textStyle)
            .setScrollFactor(0); // Fix text to camera
        // Lives Text (Top-Right)
        this.livesText = this.add.text(this.scale.width - 16, 16, `Lives: ${this.lives}`, textStyle)
            .setOrigin(1, 0) // Align to top-right
            .setScrollFactor(0); // Fix text to camera
        
        // --- Timer Text (Top-Center) ---
        const timerStyle = { 
            fontSize: '28px', 
            color: '#FF0000', 
            fontStyle: 'bold', 
            stroke: '#000000', 
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, stroke: true, fill: true }
        };
        this.timerText = this.add.text(this.scale.width / 2, 16, `1:00`, timerStyle)
            .setOrigin(0.5, 0) // Center-top alignment
            .setScrollFactor(0); // Fix to camera

        // --- Handle attack animation completion --- 
        if (this.player) {
            const completeEventName = `animationcomplete-attack`;
            this.player.on(completeEventName, () => {
                console.log("LOG: Attack animation complete event received.");
                this.isAttacking = false;
            });
        } else {
            console.warn("Player not defined when setting attack anim complete listener.");
        }

        // --- Input, Touch, Camera, Emit --- 
        this.cursors = this.input.keyboard?.createCursorKeys();
        this.spaceBar = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.input.addPointer(1);
        this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
            const pointer2IsDown = this.input.pointer2?.isDown ?? false;
            if (pointer2IsDown && !this.pointer2PreviouslyDown) {
                 console.log("Pointer 2 just pressed - Attack!");
                 this.touchAttack = true;
                 this.isPointerDown = false; 
                 this.pointer2PreviouslyDown = true; 
            }
             if (pointer.id !== 1 || this.touchAttack) return; 
             this.isPointerDown = true;
            this.pointerStartX = pointer.x;
            this.pointerStartY = pointer.y;
            this.pointerMoveX = pointer.x; 
            this.pointerDownTime = this.time.now;
            this.touchMoveDirection = 'none'; 
            this.touchJump = false;
            this.touchAttack = false; 
        });
        this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
            if (!this.isPointerDown || pointer.id !== 1) return; 
            this.pointerMoveX = pointer.x;
            const dragX = this.pointerMoveX - this.pointerStartX;
            if (Math.abs(dragX) > this.dragThreshold) {
                this.touchMoveDirection = dragX < 0 ? 'left' : 'right';
                 this.pointerDownTime = 0; 
            } else {
                this.touchMoveDirection = 'none';
            }
        });
        this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
             if (pointer.id !== 1) return; 
             const timeElapsed = this.time.now - this.pointerDownTime;
            const distanceMoved = Phaser.Math.Distance.Between(this.pointerStartX, this.pointerStartY, pointer.x, pointer.y);
            if (this.isPointerDown && 
                timeElapsed < this.tapMaxTime && 
                distanceMoved < this.dragThreshold) 
            {
                console.log("Tap detected - Jump!");
                this.touchJump = true;
            }
            this.isPointerDown = false;
            this.touchMoveDirection = 'none';
        });
        // --- Camera --- 
        // Follow player, keep them offset to the left
        const followOffsetX = - (gameWidth / 2) + 100; // Target 100px from left edge
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, followOffsetX, 0);
        this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, gameHeight);
        // Significantly reduce deadzone width so camera moves almost immediately
        this.cameras.main.setDeadzone(50, gameHeight); 

        // --- Emit Ready Event --- 
        EventBus.emit('current-scene-ready', this);

        console.log(`CREATE START - this.lives = ${this.lives}`);
        console.log(`CREATE - Initialized UI Text with Lives: ${this.lives}`);
    }

    // Helper function to add a platform
    addPlatform(x: number, y: number) {
        const platform = this.platforms?.get(x, y, 'platform_rect') as Phaser.Physics.Arcade.Sprite | undefined;
        if (platform) {
            platform.setActive(true);
            platform.setVisible(true);
            platform.setOrigin(0.5, 0.5);
            if (platform.body) {
                platform.body.enable = true;
            }
            platform.refreshBody();
        }
        return platform;
    }

    generatePlatforms() {
        if (!this.player || !this.platforms) return;

        const playerX = this.player.x;
        const cameraScrollX = this.cameras.main.scrollX;
        const generationLimitX = this.targetWorldWidth - this.platformWidth; // Ensure space for last platform
        const groundY = this.scale.height - this.platformHeight / 2;
        
        // Store the last platform's Y position for smoother transitions
        let lastPlatformY = groundY;

        // Generate new platforms ahead of the player, up to the limit
        while (this.furthestPlatformX < playerX + this.platformScrollMargin + this.scale.width && this.furthestPlatformX < generationLimitX) {
            let platformY = groundY;
            
            // Calculate maximum height difference as 60% of character height
            const maxHeightDelta = this.playerCharacterHeight * 0.6;
            
            // Add more variety: occasional higher platforms, never lower than ground level
            const randHeight = Math.random();
            if (randHeight < 0.3) { // 30% chance of higher platform
                // Ensure new platforms are never too far from the last one (smooth transition)
                const minHeight = Math.max(groundY - 250, lastPlatformY - maxHeightDelta);
                const maxHeight = Math.max(groundY - 100, lastPlatformY - 50);
                platformY = Phaser.Math.Between(minHeight, maxHeight);
            }
            
            // Never spawn platforms below ground level
            platformY = Math.min(platformY, groundY);
            
            this.addPlatform(this.furthestPlatformX + this.platformWidth / 2, platformY);
            lastPlatformY = platformY; // Update the last platform Y

            // Calculate minimum gap based on player collision width
            // Ensure gap is at least 1.5x the player's collision width
            const minGap = this.playerCollisionWidth * 1.5;
            const minGapMultiplier = Math.max(1.2, minGap / this.platformWidth);
            
            // Calculate a platform-width-based maximum gap
            // No more than 2 platform widths regardless of other factors
            const absoluteMaxGapMultiplier = this.maxGapMultiplier;
            
            // Vary gaps, ensuring minimum and maximum gap requirements are met
            if (Math.random() < 0.65) { 
                // Smaller gaps, but still respect minimum
                const gapMultiplier = Phaser.Math.FloatBetween(
                    minGapMultiplier, // Use calculated minimum
                    Math.min(minGapMultiplier + 0.5, absoluteMaxGapMultiplier) // Cap at max
                );
                this.furthestPlatformX += this.platformWidth * gapMultiplier;
            } else { 
                // Larger gaps, but still respect maximum
                const gapMultiplier = Phaser.Math.FloatBetween(
                    Math.min(minGapMultiplier + 0.3, absoluteMaxGapMultiplier - 0.1), // Don't go too close to max
                    absoluteMaxGapMultiplier // Cap at absolute maximum
                );
                this.furthestPlatformX += this.platformWidth * gapMultiplier;
            }
        }

        // --- Remove platforms far behind AND Destroy them ---
        const platformsToRemove: Phaser.GameObjects.GameObject[] = [];
        this.platforms.children.each((child) => {
            const platform = child as Phaser.Physics.Arcade.Sprite;
            // Check if platform is active before considering removal
            if (platform.active && platform.x < cameraScrollX - this.platformKillOffset) {
                platformsToRemove.push(platform);
            }
            return null; 
        });

        platformsToRemove.forEach(platformGameObject => {
            // Cast to the correct type to access x property
            const platform = platformGameObject as Phaser.Physics.Arcade.Sprite;
            console.log(`Destroying platform at x: ${platform.x}`);
            this.platforms?.remove(platform, true, true); 
        });
    }

    update() {
        // --- Player/System Checks --- 
        if (!this.player || !this.player.active) {
            console.warn("Player inactive or destroyed! Forcing GameOver.");
            this.handleGameOver(); // Use new handler
            return; 
        }
        if (!this.cursors || !this.player.body || !this.platforms || !this.spaceBar || 
            !this.shiftKey || !this.scoreText || !this.livesText || !this.timerText) {
            return; // Wait for all elements including UI text
        }

        // --- Update countdown timer ---
        const elapsedTime = this.time.now - this.gameStartTime;
        this.gameTimeLeft = Math.max(0, 60000 - elapsedTime);
        
        const secondsLeft = Math.ceil(this.gameTimeLeft / 1000);
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        
        // Format time as M:SS
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.timerText.setText(timeString);
        
        // Make timer text pulse red when time is running low (less than 15 seconds)
        if (secondsLeft <= 15) {
            const pulseFactor = 0.5 + Math.abs(Math.sin(this.time.now / 200)) * 0.5;
            this.timerText.setScale(pulseFactor);
            this.timerText.setColor('#FF0000');
        } else {
            this.timerText.setScale(1);
            this.timerText.setColor('#FFFFFF');
        }
        
        // Check for time-out game over
        if (this.gameTimeLeft <= 0) {
            console.log("TIME'S UP! Game Over!");
            this.handleGameOver();
            return;
        }

        // --- Update Score based on player progress --- 
        if (this.player && this.player.active && this.scoreText) {
            const currentPlayerX = this.player.x;
            const playerMakingProgress = currentPlayerX > this.lastPlayerX + 1; // +1 to ensure meaningful progress
            
            const currentTime = this.time.now;
            
            if (playerMakingProgress) {
                // Player is making forward progress - increase score
                this.score += 1;
                // Reset the scoring timer when making progress
                this.scoringTimer = currentTime;
            } else {
                // Player is not making progress - decrease score after delay
                if (currentTime - this.scoringTimer > this.scoringInterval) {
                    // Decrement score if player is stuck/not moving forward
                    this.score = Math.max(0, this.score - 3); // Decrease faster than increase, min 0
                    this.scoringTimer = currentTime; // Reset timer
                }
            }
            
            // Update the score display
            this.scoreText.setText(`Score: ${this.score}`);
            
            // Update last position for next frame comparison
            this.lastPlayerX = currentPlayerX;
        }

        // --- Input States --- 
        const keyboardUp = this.cursors.up.isDown;
        const keyboardAttack = Phaser.Input.Keyboard.JustDown(this.spaceBar);
        this.isRunning = this.shiftKey.isDown; 
        const doJump = keyboardUp || this.touchJump;
        const doAttack = keyboardAttack || this.touchAttack;
        this.touchJump = false;
        this.touchAttack = false;
        const currentSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
        if (doAttack && !this.isAttacking && this.player.body?.touching.down) {
            console.log("LOG: Attack conditions met. Playing 'attack'...");
            this.isAttacking = true;
            this.player.setVelocityX(0);
            this.player.anims.play('attack', false);
            console.log(`LOG: Called play('attack'). Current anim: ${this.player.anims.currentAnim?.key}`);
        }
        if (!this.isAttacking) {
            this.player.setVelocityX(currentSpeed);
            this.player.setFlipX(false);
            const animKey = this.isRunning ? 'run' : 'walk';
            if (this.player.body?.touching.down) { 
                if (this.player.anims.currentAnim?.key !== animKey) {
                    this.player.anims.play(animKey, true);
                }
            } else {
                if (this.player.anims.currentAnim?.key !== 'idle') {
                     this.player.anims.play('idle', true);
                }
            }
        }
        if (doJump && this.player.body?.touching.down && !this.isAttacking) {
            this.player.setVelocityY(this.jumpVelocity);
        }
        this.generatePlatforms();
        
        // --- Fall Check / Lose Life --- 
        const worldBottomThreshold = this.physics.world.bounds.height - 10;
        if (this.player.body.bottom > worldBottomThreshold) {
            this.loseLife(); 
            return; // Stop further processing this frame after losing life
        }

        // --- Update previous pointer states --- 
        this.pointer2PreviouslyDown = this.input.pointer2?.isDown ?? false;
    }

    // --- New Method: Lose Life / Game Over Check ---
    loseLife() {
        if (!this.player || !this.livesText) return;
        
        const livesBefore = this.lives;
        this.lives--;
        const livesAfter = this.lives;
        console.log(`LOSE LIFE - Before: ${livesBefore}, After: ${livesAfter}`);
        
        this.livesText.setText(`Lives: ${this.lives}`); 
        console.log(`LOSE LIFE - Updated UI Text to: ${this.lives}`);

        if (this.lives <= 0) {
            console.log("LOSE LIFE - Calling handleGameOver()");
            this.handleGameOver();
        } else {
            // --- Store lives and score in data manager before restart ---
            console.log(`LOSE LIFE - Storing lives: ${this.lives} and score: ${this.score} in data manager and restarting.`);
            this.data.set('currentLives', this.lives);
            this.data.set('currentScore', this.score);
            this.scene.restart(); // No need to pass data object now
        }
    }

    // --- New Method: Handle Game Over Transition ---
    handleGameOver() {
         console.log(`Game Over! Final Score: ${this.score}`);
         // Pass final score to GameOver scene
         this.scene.start('GameOver', { finalScore: this.score });
    }
} 