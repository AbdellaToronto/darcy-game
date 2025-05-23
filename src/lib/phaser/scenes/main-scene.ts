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
    private jumpVelocity = -400;
    private platformScrollMargin = 400;
    private platformKillOffset = 800;
    private platformHeight = 32;
    private basePlatformWidth = 300; // Base width for calculations
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
    private maxDistanceReached = 0; // Track maximum distance for final scoring

    // --- Audio Management ---
    private backgroundMusic?: Phaser.Sound.BaseSound;
    private powerupMusic?: Phaser.Sound.BaseSound;

    // --- Powerup Management ---
    private powerups?: Phaser.Physics.Arcade.Group;
    private powerupSpawnChance = 0.2; // 20% chance per platform section
    private isPoweredUp = false;
    private powerupDuration = 15000; // 15 seconds in milliseconds
    private powerupTimer = 0;
    private normalRunSpeed = 250; 
    private powerupRunSpeed = 300; 
    private powerupScoreMultiplier = 2; // 2x points during powerup
    private powerupIndicator?: Phaser.GameObjects.Text; // Visual indicator for powerup status

    // --- Obstacle Management ---
    private obstacles?: Phaser.Physics.Arcade.Group;
    private obstacleSpawnChance = 0.5; // Increased from 0.3 to 0.5 (50% chance per platform)
    private obstacleBlockedPenalty = 5; // Extra points lost when blocked by obstacle
    private obstacleSize = 120; // Size increased to 3x (was 40)
    private isBlockedByObstacle = false;
    private obstacleKillBonus = 200; // Points awarded for defeating a goose
    private scorePopups: Phaser.GameObjects.Text[] = []; // Array to store score popup texts

    // --- Background Management ---
    private backgroundStars?: Phaser.GameObjects.TileSprite;
    private midgroundBuildings?: Phaser.GameObjects.TileSprite;
    private foregroundCity?: Phaser.GameObjects.TileSprite;

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

    // --- Coyote Time for Airborne Animation ---
    private airborneTimer = 0; 
    private coyoteTimeThreshold = 100; // Milliseconds grace period

    // --- Jump Buffering --- 
    private jumpBufferTimer = 0;
    private jumpBufferDuration = 150; // Milliseconds to buffer jump input

    // --- Multi-Jump State --- 
    // Rename/Repurpose: Track count of active powerups
    private activePowerupCount = 0; 
    // Track jumps used since last grounded
    private midAirJumpsUsed = 0;
    private jumpIndicators?: Phaser.GameObjects.Group; 
    private lastPlacedPlatformY: number = 0; // Track Y position globally

    // --- Gameplay State ---
    private score = 0;
    private lives!: number;
    private startTime = 0; 
    private scoreText?: Phaser.GameObjects.Text;
    private livesText?: Phaser.GameObjects.Text;
    private playerCharacterHeight = 0; // Store for platform height calculations
    private attackEffectSprite?: Phaser.GameObjects.Sprite; // Add sprite property

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

        // --- Load Audio Files ---
        this.load.audio('background-music', '/assets/chiptune-1.mp3');
        this.load.audio('powerup-music', '/assets/mighty-real.mp3');

        // Load goose obstacle image
        this.load.image('obstacle', '/assets/goose.png');
        
        // Load powerup image or create a placeholder
        this.load.image('powerup', '/assets/powerup.png');
        
        // Load background assets
        // Create star background if it doesn't exist
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
        
        // Create city skyline if it doesn't exist
        if (!this.textures.exists('bg_buildings')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0x1a1a3a);
            
            // Draw simple buildings
            const width = this.scale.width;
            const height = this.scale.height;
            
            // Draw several buildings with different heights
            for (let x = 0; x < width; x += 150) {
                const buildingWidth = Phaser.Math.Between(80, 120);
                const buildingHeight = Phaser.Math.Between(100, 250);
                graphics.fillRect(x, height - buildingHeight, buildingWidth, buildingHeight);
                
                // Add windows
                graphics.fillStyle(0xffffaa);
                for (let wx = x + 10; wx < x + buildingWidth - 10; wx += 20) {
                    for (let wy = height - buildingHeight + 20; wy < height - 20; wy += 40) {
                        if (Math.random() > 0.3) { // Some windows are dark
                            graphics.fillRect(wx, wy, 10, 15);
                        }
                    }
                }
                graphics.fillStyle(0x1a1a3a);
            }
            
            // Generate texture
            graphics.generateTexture('bg_buildings', width, height);
            graphics.destroy();
        }

        // Create foreground city if it doesn't exist
        if (!this.textures.exists('fg_city')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0x0a0a1a);
            
            // Draw closer buildings (silhouettes)
            const width = this.scale.width;
            const height = this.scale.height;
            
            for (let x = 0; x < width; x += 100) {
                const buildingWidth = Phaser.Math.Between(60, 100);
                const buildingHeight = Phaser.Math.Between(50, 150);
                graphics.fillRect(x, height - buildingHeight, buildingWidth, buildingHeight);
            }
            
            // Generate texture
            graphics.generateTexture('fg_city', width, height);
            graphics.destroy();
        }

        // Keep placeholder platform
        if (!this.textures.exists('platform_rect')) {
            const graphics = this.make.graphics();
            graphics.fillStyle(0x228b22);
            graphics.fillRect(0, 0, this.basePlatformWidth, this.platformHeight);
            graphics.generateTexture('platform_rect', this.basePlatformWidth, this.platformHeight);
            graphics.destroy();
        }

        // Load the attack effect spritesheet
        this.load.spritesheet('attack_effect', '/assets/attack.png', {
            frameWidth: 320,
            frameHeight: 400
        });
    }

    create() {
        console.log('Creating game objects in MainScene...');
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;

        // --- Create Parallax Background ---
        this.backgroundStars = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'bg_stars')
            .setOrigin(0, 0)
            .setScrollFactor(0, 0); // Fixed to camera
        
        this.midgroundBuildings = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'bg_buildings')
            .setOrigin(0, 0)
            .setScrollFactor(0, 0); // Fixed to camera
        
        this.foregroundCity = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'fg_city')
            .setOrigin(0, 0)
            .setScrollFactor(0, 0); // Fixed to camera
        
        // --- Retrieve game state from data manager ---
        this.lives = this.data.get('currentLives') ?? 3;
        this.score = this.data.get('currentScore') ?? 0;
        this.gameTimeLeft = this.data.get('timeLeft') ?? 60000;
        this.maxDistanceReached = this.data.get('maxDistance') ?? 0;
        this.isPoweredUp = false; // Always reset powerup status on scene create
        this.powerupTimer = 0;

        this.data.reset(); // Clear data manager after retrieving
        console.log(`CREATE - Retrieved/Set lives: ${this.lives}, score: ${this.score}, time: ${this.gameTimeLeft}`);

        // Initialize time tracking - use current time for countdown
        this.gameStartTime = this.time.now;

        // --- Initialize Audio ---
        this.backgroundMusic = this.sound.add('background-music', { 
            loop: true,
            volume: 0.5
        });
        this.powerupMusic = this.sound.add('powerup-music', {
            loop: true,
            volume: 0.7
        });

        // Start background music if not already playing
        if (this.sound.get('background-music')?.isPlaying) {
            console.log("Background music already playing");
        } else {
            console.log("Starting background music");
            this.backgroundMusic.play();
        }

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
            this.anims.create({ key: 'idle', frames: idleFrames, frameRate: 5, repeat: -1 });
        }
        if (!this.anims.exists('walk')) {
            this.anims.create({ key: 'walk', frames: walkFrames, frameRate: 10, repeat: -1 });
        }
        if (!this.anims.exists('run')) {
            this.anims.create({ key: 'run', frames: runFrames, frameRate: 12, repeat: -1 });
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
        if (this.player.body) {
            // Explicitly set body size to match the sprite's current scaled dimensions
            const scaledWidth = this.player.width; 
            const scaledHeight = this.player.height;
            this.player.body.setSize(scaledWidth, scaledHeight); 
            this.player.body.setOffset(0, 0); // Reset offset
            // Store the explicitly set width
            this.playerCollisionWidth = this.player.body.width; 
            console.log(`Explicitly set body size: ${this.player.body.width}x${this.player.body.height}`);
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
        
        // --- Obstacles ---
        this.obstacles = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });
        
        // --- Powerups ---
        this.powerups = this.physics.add.group({
            allowGravity: false,
        });
        
        let currentX = 0;
        const flatGroundEndX = gameWidth * 2 - this.basePlatformWidth;
        while (currentX < flatGroundEndX) { 
            const platformCenterX = currentX + this.basePlatformWidth / 2;
            this.addPlatform(platformCenterX, groundY, this.basePlatformWidth);
            currentX += this.basePlatformWidth;
            // Note: lastPlacedPlatformY remains groundY here
        }

        // --- Manually add the last initial platform with a small gap ---
        const firstGapDistance = 50; 
        // Position relative to the end of the last contiguous platform (currentX)
        const lastInitialPlatformX = currentX + firstGapDistance + (this.basePlatformWidth / 2);
        this.addPlatform(lastInitialPlatformX, groundY, this.basePlatformWidth);

        // Update global state after placing the last initial platform
        this.lastPlacedPlatformY = groundY; // It's still at ground level
        this.furthestPlatformX = lastInitialPlatformX + (this.basePlatformWidth / 2);

        // --- Physics --- 
        this.physics.add.collider(this.player, this.platforms);
        
        // Add collision between player and obstacles
        this.physics.add.collider(
            this.player, 
            this.obstacles, 
            (player, obstacle) => this.handleObstacleCollision(
                player as Phaser.Physics.Arcade.Sprite, 
                obstacle as Phaser.Physics.Arcade.Sprite
            ),
            undefined, 
            this
        );
        
        // Add overlap for powerup collection
        this.physics.add.overlap(
            this.player,
            this.powerups,
            (player, powerup) => this.collectPowerup(
                player as Phaser.Physics.Arcade.Sprite,
                powerup as Phaser.Physics.Arcade.Sprite
            ),
            undefined,
            this
        );

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
        this.timerText = this.add.text(this.scale.width / 2, 41, `1:00`, timerStyle) // Moved down by 25px
            .setOrigin(0.5, 0) // Center-top alignment
            .setScrollFactor(0); // Fix to camera
        
        // --- Powerup Indicator ---
        const powerupStyle = { 
            fontSize: '24px', 
            color: '#FFFF00', 
            fontStyle: 'bold', 
            stroke: '#000000', 
            strokeThickness: 3,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, stroke: true, fill: true }
        };
        this.powerupIndicator = this.add.text(this.scale.width / 2, 75, '', powerupStyle)
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setVisible(false);

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
        
        // Make sure we have enough pointers for multi-touch
        this.input.addPointer(3);
        
        this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
            // Check if we have two simultaneous touches
            const activeTouches = this.countActiveTouches();
            
            if (activeTouches >= 2) {
                // Two or more fingers are touching - trigger attack
                console.log("Two or more touches detected - Attack!");
                this.touchAttack = true;
                return;
            }
            
            // Single touch handling for movement/jump - Use pointer 1 (id: 1)
            if (pointer.id === 1) { 
                this.isPointerDown = true;
                this.pointerStartX = pointer.x;
                this.pointerStartY = pointer.y;
                this.pointerMoveX = pointer.x; 
                this.pointerDownTime = this.time.now;
                this.touchMoveDirection = 'none'; 
                this.touchJump = false;
            }
        });
        this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
            // Ensure we are tracking the primary pointer (id: 1)
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
             // Ensure we are tracking the primary pointer (id: 1)
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

        // Define the attack effect animation
        if (!this.anims.exists('attack_crescent')) {
            this.anims.create({
                key: 'attack_crescent',
                frames: this.anims.generateFrameNumbers('attack_effect', { start: 0, end: 5 }), // 6 frames
                frameRate: 20, // Adjust frame rate as needed
                repeat: 0 // Play only once
            });
        }

        // Create the attack effect sprite (initially invisible and scaled)
        this.attackEffectSprite = this.add.sprite(0, 0, 'attack_effect')
            .setOrigin(0.5, 0.5) 
            .setScale(0.8) // Apply 80% scale
            .setVisible(false)
            .setDepth(98); 

        // --- Handle sprite animation completion --- 
        this.attackEffectSprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            if (this.attackEffectSprite) {
                this.attackEffectSprite.setVisible(false);
            }
        });

        // --- Create UI for Jump Indicators ---
        this.jumpIndicators = this.add.group();
        // Initial update in case starting with charges (though we start with 0)
        this.updateJumpIndicators(); 
    }

    // New helper method to count active touches
    countActiveTouches() {
        let count = 0;
        if (this.input.pointer1.isDown) count++;
        if (this.input.pointer2.isDown) count++;
        if (this.input.pointer3.isDown) count++;
        if (this.input.pointer4.isDown) count++;
        return count;
    }

    // Helper function to add a platform
    addPlatform(x: number, y: number, width: number) {
        const platform = this.platforms?.get(x, y, 'platform_rect') as Phaser.Physics.Arcade.Sprite | undefined;
        if (platform) {
            platform.setActive(true);
            platform.setVisible(true);
            platform.setOrigin(0.5, 0.5);
            platform.setDisplaySize(width, this.platformHeight); // Set display size
            if (platform.body) {
                platform.body.enable = true;
                // Important: Refresh body *after* changing display size
                platform.refreshBody(); 
            }
            
            // Randomly spawn an obstacle on this platform (except on the first few platforms)
            if (this.obstacles && x > this.scale.width * 1.5 && Math.random() < this.obstacleSpawnChance) {
                // Spawn obstacle above the platform
                const obstacleY = y - this.platformHeight / 2 - this.obstacleSize / 2;
                
                // Randomize height between on platform and floating above
                const floatingHeight = Math.random() < 0.6 ? 
                    Phaser.Math.Between(20, 100) : 0;
                    
                this.addObstacle(x, obstacleY - floatingHeight);
            }
            
            // Randomly spawn a powerup (with lower chance than obstacles)
            if (!this.isPoweredUp && this.powerups && x > this.scale.width * 2 && Math.random() < this.powerupSpawnChance) {
                // Lower powerup position to be reachable by jumps
                // Position them 40% from the bottom of the screen
                const screenBottom = this.scale.height;
                const powerupYPosition = screenBottom * 0.6; // 40% from bottom
                
                // Add some variance, but keep them jumpable
                const variance = this.playerCharacterHeight; // Use player height for appropriate variance
                const powerupY = powerupYPosition - Phaser.Math.Between(0, variance);
                
                // Ensure powerups are always above platforms by a jumpable amount
                const minJumpableHeight = 50; // Minimum height above platforms
                const platformTopY = y - this.platformHeight/2;
                const finalPowerupY = Math.min(powerupY, platformTopY - minJumpableHeight);
                
                this.addPowerup(x, finalPowerupY);
            }
        }
        return platform;
    }

    // New helper function to add an obstacle
    addObstacle(x: number, y: number) {
        if (!this.obstacles) return;
        
        const obstacle = this.obstacles.get(x, y, 'obstacle') as Phaser.Physics.Arcade.Sprite | undefined;
        if (obstacle) {
            obstacle.setActive(true);
            obstacle.setVisible(true);
            obstacle.setOrigin(0.5, 0.5);
            
            // Scale the goose to appropriate size
            const scale = 0.5; // Adjust this value as needed for appropriate sizing
            obstacle.setScale(scale);
            
            if (obstacle.body) {
                obstacle.body.enable = true;
                // Set collision box to be appropriate for the goose shape
                // Make it slightly smaller than the visual for better gameplay feel
                const collisionWidth = this.obstacleSize * 0.8;
                const collisionHeight = this.obstacleSize * 0.5; // Lower height for goose shape
                obstacle.body.setSize(collisionWidth, collisionHeight);
                // Adjust offset for better collision alignment with the goose visual
                obstacle.body.setOffset((obstacle.width * scale - collisionWidth) / 2, obstacle.height * scale - collisionHeight);
            }
            
            obstacle.refreshBody();
            
            // Add a data property to track if this obstacle has been attacked
            obstacle.setData('attacked', false);
            
            // Add bobbing animation
            this.tweens.add({
                targets: obstacle,
                y: obstacle.y - 15, // Move up 15px
                duration: Phaser.Math.Between(700, 1000), // Random duration for variation
                ease: 'Sine.easeInOut',
                yoyo: true, // Go back and forth
                repeat: -1 // Loop forever
            });
        }
        return obstacle;
    }

    // New method to add a powerup
    addPowerup(x: number, y: number) {
        if (!this.powerups) return;
        
        const powerup = this.powerups.get(x, y, 'powerup') as Phaser.Physics.Arcade.Sprite | undefined;
        if (powerup) {
            powerup.setActive(true);
            powerup.setVisible(true);
            powerup.setOrigin(0.5, 0.5);
            
            // Set scale and enable physics
            powerup.setScale(0.35);
            
            if (powerup.body) {
                powerup.body.enable = true;
            }
            
            // Add floating animation
            this.tweens.add({
                targets: powerup,
                y: y - 20,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                angle: { from: -10, to: 10, duration: 1200, yoyo: true, repeat: -1 }
            });
            
            // Add glow effect
            this.tweens.add({
                targets: powerup,
                alpha: 0.7,
                duration: 800,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }
        return powerup;
    }

    // Method to handle powerup collection
    collectPowerup(player: Phaser.Physics.Arcade.Sprite, powerup: Phaser.Physics.Arcade.Sprite) {
        // Deactivate the powerup sprite
        powerup.setActive(false);
        powerup.setVisible(false);
        
        // Stop any tweens on the powerup
        this.tweens.killTweensOf(powerup);
        
        // Play collection effect
        const particles = this.add.particles(powerup.x, powerup.y, 'powerup', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.5, end: 0 },
            quantity: 15,
            lifespan: 800,
            emitting: false
        });
        particles.explode();
        
        // Clean up particles after explosion
        this.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        // --- Grant Extra Jump via Active Powerup Count --- 
        this.activePowerupCount++;
        console.log(`Powerup collected! Active powerups: ${this.activePowerupCount}`);
        this.updateJumpIndicators(); // Update UI

        // --- Schedule expiration for THIS powerup --- 
        this.time.delayedCall(this.powerupDuration, this.expireSinglePowerup, [], this);
        console.log(`Scheduled powerup expiration in ${this.powerupDuration}ms`);

        // Start visual/audio/speed powerup state (based on last pickup)
        this.activatePowerup();
        
        powerup.destroy();
    }

    // --- New method to handle expiration of one powerup instance ---
    expireSinglePowerup() {
        if (this.activePowerupCount > 0) {
            this.activePowerupCount--;
            console.log(`A powerup expired! Active powerups remaining: ${this.activePowerupCount}`);
            this.updateJumpIndicators();
            // Optional TODO: Refactor deactivatePowerup check based on count == 0
        }
    }

    // Method to activate powerup state
    activatePowerup() {
        console.log("POWERUP ACTIVATED!");
        
        // Switch audio
        if (this.backgroundMusic && this.powerupMusic) {
            this.backgroundMusic.pause();
            this.powerupMusic.play();
        }
        
        // Set powerup state
        this.isPoweredUp = true;
        this.powerupTimer = this.time.now;
        
        // Update visual indicator
        if (this.powerupIndicator) {
            this.powerupIndicator.setText("SUPERSTAR MODE!");
            this.powerupIndicator.setVisible(true);
            
            // Add pulsing effect to the indicator
            this.tweens.add({
                targets: this.powerupIndicator,
                scale: { from: 1, to: 1.2 },
                duration: 500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }
        
        // Boost the player visually
        if (this.player) {
            this.tweens.add({
                targets: this.player,
                alpha: 0.85,
                duration: 200,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }
    }

    // Method to deactivate powerup state
    deactivatePowerup() {
        console.log("POWERUP DEACTIVATED");
        
        // Switch audio back
        if (this.backgroundMusic && this.powerupMusic) {
            this.powerupMusic.stop();
            this.backgroundMusic.resume();
        }
        
        // Reset powerup state
        this.isPoweredUp = false;
        
        // Update visual indicator
        if (this.powerupIndicator) {
            this.powerupIndicator.setVisible(false);
            this.tweens.killTweensOf(this.powerupIndicator);
        }
        
        // Reset player visual effects
        if (this.player) {
            this.tweens.killTweensOf(this.player);
            this.player.setAlpha(1);
        }
    }

    // Collision handler for obstacles
    handleObstacleCollision(player: Phaser.Physics.Arcade.Sprite, obstacle: Phaser.Physics.Arcade.Sprite) {
        // If powered up, immediately destroy obstacles
        if (this.isPoweredUp) {
            // If not already attacked, award points
            if (!obstacle.getData('attacked')) {
                // Mark as attacked
                obstacle.setData('attacked', true);
                
                // Add bonus points (with powerup multiplier)
                const pointsAwarded = this.obstacleKillBonus * this.powerupScoreMultiplier;
                this.score += pointsAwarded;
                
                // Show floating score text with bonus indicator
                this.showFloatingScore(obstacle.x, obstacle.y, `+${pointsAwarded} (${this.powerupScoreMultiplier}x)`);
                
                // Immediately disable collision
                if (obstacle.body) {
                    obstacle.body.enable = false;
                }
                
                // Play defeat animation
                this.defeatObstacle(obstacle);
            }
            return;
        }
        
        // Normal collision handling for non-powerup state
        if (!this.isAttacking && !obstacle.getData('attacked')) {
            // Set flag that player is blocked by obstacle for scoring
            this.isBlockedByObstacle = true;
        } else if (this.isAttacking) {
            // If player is attacking, handle the attack regardless of previous attack state
            
            // If not already attacked, award points
            if (!obstacle.getData('attacked')) {
                // Mark as attacked
                obstacle.setData('attacked', true);
                
                // Add points
                this.score += this.obstacleKillBonus;
                
                // Show floating score text
                this.showFloatingScore(obstacle.x, obstacle.y, `+${this.obstacleKillBonus}`);
            }
            
            // Immediately disable collision on the obstacle
            if (obstacle.body) {
                obstacle.body.enable = false;
            }
            
            // Play defeat animation if not already defeated
            if (obstacle.active && obstacle.visible) {
                this.defeatObstacle(obstacle);
            }
            
            // No longer blocked
            this.isBlockedByObstacle = false;
        }
    }

    // New method to handle obstacle defeat effects
    defeatObstacle(obstacle: Phaser.Physics.Arcade.Sprite) {
        // Stop the bobbing animation by removing all tweens for this obstacle
        this.tweens.killTweensOf(obstacle);
        
        // Play "flop off screen" animation
        this.tweens.add({
            targets: obstacle,
            x: obstacle.x + Phaser.Math.Between(200, 400) * (Math.random() > 0.5 ? 1 : -1),
            y: this.scale.height + 200, // Further off bottom of screen
            angle: Phaser.Math.Between(360, 720) * (Math.random() > 0.5 ? 1 : -1), // Spin 2-4 times
            scale: 0.2, // Shrink as it flies away
            duration: 1500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                obstacle.destroy();
            }
        });
    }

    // New method to display floating score text
    showFloatingScore(x: number, y: number, text: string) {
        const style = { 
            fontSize: '24px',
            color: '#FFFF00', 
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, stroke: true, fill: true }
        };
        
        const scoreText = this.add.text(x, y, text, style)
            .setOrigin(0.5, 0.5);
        
        // Add to array for cleanup
        this.scorePopups.push(scoreText);
        
        // Animate the text floating up and fading out
        this.tweens.add({
            targets: scoreText,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                // Remove from array and destroy
                const index = this.scorePopups.indexOf(scoreText);
                if (index > -1) {
                    this.scorePopups.splice(index, 1);
                }
                scoreText.destroy();
            }
        });
    }

    generatePlatforms() {
        if (!this.player || !this.platforms) return;

        const playerX = this.player.x;
        const cameraScrollX = this.cameras.main.scrollX;
        const generationLimitX = this.targetWorldWidth - this.basePlatformWidth; 
        const groundY = this.scale.height - this.platformHeight / 2;
        
        let yBeforeCurrent = this.lastPlacedPlatformY; 

        // --- Calculate Max Jump Distance (Once) ---
        const gravity = this.physics.world.gravity.y;
        const maxHorizontalSpeed = this.powerupRunSpeed; 
        const jumpVel = Math.abs(this.jumpVelocity);
        const maxAirTime = (2 * jumpVel) / gravity; 
        const maxHorizontalJumpDistance = maxHorizontalSpeed * maxAirTime;

        // --- Define Gap Constraints in Pixels ---
        // Reduce min gap multiplier to ensure it's < safe max
        const minGapPixels = this.playerCollisionWidth * 1.1; 
        const safetyMargin = 0.80; 
        const baseSafeMaxGapPixels = maxHorizontalJumpDistance * safetyMargin; 
        console.log(`Min Gap Pixels: ${minGapPixels.toFixed(2)}, Base Safe Max Gap Pixels: ${baseSafeMaxGapPixels.toFixed(2)}`);

        while (this.furthestPlatformX < playerX + this.platformScrollMargin + this.scale.width && this.furthestPlatformX < generationLimitX) {
            // --- Calculate Platform Width --- 
            const widthVariance = 0.3; // e.g., 70% to 130%
            const currentPlatformWidth = this.basePlatformWidth * Phaser.Math.FloatBetween(1 - widthVariance, 1 + widthVariance);

            // --- Calculate Platform Height --- 
            let platformY = groundY;
            const maxHeightDelta = this.playerCharacterHeight * 0.6; // Max Y diff from last platform
            const randHeight = Math.random();
            
            if (randHeight < 0.6) { // Increased chance (60%) of varied height
                 // Allow slight downward variation too, but ensure jumpable
                 const minYDelta = -this.playerCharacterHeight * 0.2; // Max downward step (e.g., 20% player height)
                 const minAllowedY = Math.max(groundY - 250, yBeforeCurrent - maxHeightDelta);
                 const maxAllowedY = Math.min(groundY, yBeforeCurrent - minYDelta); // Allow lower Y (move down)
                 
                 // Clamp calculated Y between min/max allowed relative to previous
                 platformY = Phaser.Math.Clamp(
                     Phaser.Math.Between(minAllowedY, maxAllowedY), // Target Y
                     minAllowedY, // Absolute min allowed
                     groundY // Absolute max allowed (ground)
                 ); 
            }
            platformY = Math.min(platformY, groundY); // Ensure never below ground
            
            const deltaY = yBeforeCurrent - platformY; 

            // --- Determine the Max Gap for THIS specific iteration --- 
            let currentSafeMaxGapPixels = baseSafeMaxGapPixels; 
            if (yBeforeCurrent === groundY) {
                currentSafeMaxGapPixels *= 0.7; 
            }
            currentSafeMaxGapPixels = Math.max(minGapPixels, currentSafeMaxGapPixels);

            // --- Calculate Adjusted Max Gap Multiplier --- 
            const minGapMultiplier = minGapPixels / this.basePlatformWidth;
            const currentSafeMaxGapMultiplier = currentSafeMaxGapPixels / this.basePlatformWidth;
            let currentMaxGapMultiplierBasedOnDeltaY = this.maxGapMultiplier; 
            if (deltaY > this.playerCharacterHeight * 0.3) { 
                currentMaxGapMultiplierBasedOnDeltaY = Math.max(minGapMultiplier, this.maxGapMultiplier * 0.6); 
            } else if (deltaY > 0) { 
                 currentMaxGapMultiplierBasedOnDeltaY = Math.max(minGapMultiplier, this.maxGapMultiplier * 0.8); 
            }
            const finalMaxMultiplier = Math.min(currentMaxGapMultiplierBasedOnDeltaY, currentSafeMaxGapMultiplier);
            const finalMinMultiplier = minGapMultiplier;
            const clampedFinalMaxMultiplier = Math.max(finalMinMultiplier, finalMaxMultiplier);

            // --- Generate Gap Multiplier with Bias --- 
            let gapMultiplier;
            if (Math.random() < 0.80) { // 80% chance of smaller/medium gap
                gapMultiplier = Phaser.Math.FloatBetween(
                    finalMinMultiplier, 
                    finalMinMultiplier + (clampedFinalMaxMultiplier - finalMinMultiplier) * 0.75
                );
            } else { // 20% chance of larger gap
                 gapMultiplier = Phaser.Math.FloatBetween(
                    finalMinMultiplier + (clampedFinalMaxMultiplier - finalMinMultiplier) * 0.60, 
                    clampedFinalMaxMultiplier 
                );
            }

            // Calculate the initial gap distance based on multiplier
            const initialGapDistance = this.basePlatformWidth * gapMultiplier;

            // --- Final Clamp --- 
            const finalGapDistance = Phaser.Math.Clamp(initialGapDistance, minGapPixels, currentSafeMaxGapPixels);

            // --- Calculate X Position --- 
            const platformX = this.furthestPlatformX + finalGapDistance + (currentPlatformWidth / 2);

            this.addPlatform(platformX, platformY, currentPlatformWidth); 
            
            // --- Updates --- 
            this.furthestPlatformX = platformX + (currentPlatformWidth / 2);
            this.lastPlacedPlatformY = platformY; 
            yBeforeCurrent = platformY; 
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
        this.gameTimeLeft = Math.max(0, this.gameTimeLeft - elapsedTime);
        this.gameStartTime = this.time.now; // Reset start time for next frame
        
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
        
        // --- Update Powerup Status ---
        if (this.isPoweredUp) {
            const powerupElapsed = this.time.now - this.powerupTimer;
            const powerupSecondsLeft = Math.ceil((this.powerupDuration - powerupElapsed) / 1000);
            
            // Update powerup indicator
            if (this.powerupIndicator) {
                this.powerupIndicator.setText(`SUPERSTAR MODE! ${powerupSecondsLeft}s`);
            }
            
            // Check if powerup has expired
            if (powerupElapsed >= this.powerupDuration) {
                this.deactivatePowerup();
            }
        }
        
        // Update max distance reached for scoring
        if (this.player.x > this.maxDistanceReached) {
            this.maxDistanceReached = this.player.x;
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
                // Reset obstacle blocked flag when making progress
                this.isBlockedByObstacle = false;
            } else {
                // Player is not making progress - decrease score after delay
                if (currentTime - this.scoringTimer > this.scoringInterval) {
                    // Calculate penalty - higher if blocked by obstacle
                    const penalty = this.isBlockedByObstacle ? this.obstacleBlockedPenalty : 3;
                    // Decrement score with applicable penalty
                    this.score = Math.max(0, this.score - penalty);
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
        this.isRunning = this.isPoweredUp || this.shiftKey.isDown; 
        
        // Check for jump input (keyboard or touch)
        const isJumpInputDown = keyboardUp || this.touchJump; 
        this.touchJump = false; // Reset touch flag immediately

        // --- Jump Buffering: Record jump input time --- 
        if (isJumpInputDown) {
            this.jumpBufferTimer = this.time.now; // Set/refresh buffer timer
        }

        const doAttack = keyboardAttack || this.touchAttack;
        this.touchAttack = false; // Reset attack touch flag
        
        // Set current speed based on powerup state
        let currentSpeed;
        if (this.isPoweredUp) {
            currentSpeed = this.powerupRunSpeed;
        } else {
            currentSpeed = this.isRunning ? this.normalRunSpeed : this.walkSpeed;
        }
        
        // --- Attack handling --- 
        if (doAttack && !this.isAttacking) {
            console.log("LOG: Attack conditions met. Playing 'attack'...");
            this.isAttacking = true;
            this.player.setVelocityX(0);
            this.player.anims.play('attack', false);
            console.log(`LOG: Called play('attack'). Current anim: ${this.player.anims.currentAnim?.key}`);
            
            // --- Trigger Attack Effect Sprite ---
            if (this.player && this.player.body && this.attackEffectSprite) {
                 const attackOffsetX = 5;    // Original offset from player right edge
                 const attackWidth = 30;     // Hitbox width (visual center calculation)
                 const extraShiftX = 25;   // Additional shift to the right

                 const effectX = this.player.getRightCenter().x + attackOffsetX + (attackWidth / 2) + extraShiftX;
                 const effectY = this.player.y; 
                 
                 this.attackEffectSprite.setPosition(effectX, effectY);
                 this.attackEffectSprite.setVisible(true);
                 this.attackEffectSprite.play('attack_crescent', true); 
            }
            
            // Check for nearby obstacles to destroy
            this.checkAttackNearbyObstacles();
        }
        
        // --- Movement, Animation, Mid-Air Jump Reset --- 
        if (!this.isAttacking) {
            this.player.setVelocityX(currentSpeed);
            this.player.setFlipX(false);
            const animKey = this.isRunning ? 'run' : 'walk';
            
            // Check ground status using blocked.down (from coyote time implementation)
            const isGrounded = this.player.body?.blocked.down ?? false;
            
            if (isGrounded) { 
                // --- Player has landed --- 
                let justLanded = false; // Flag to see if we need to update indicators
                if (this.midAirJumpsUsed > 0) {
                    console.log("Landed, resetting mid-air jump counter.");
                    this.midAirJumpsUsed = 0;
                    justLanded = true;
                }
                this.airborneTimer = 0;
                if (this.player.anims.currentAnim?.key !== animKey) {
                    this.player.anims.play(animKey, true);
                }
                // Update indicators AFTER resetting jumps if needed
                if (justLanded) {
                    this.updateJumpIndicators(); 
                }
            } else {
                // In the air: Handle coyote time for idle animation
                if (this.airborneTimer === 0) { this.airborneTimer = this.time.now; }
                if (this.time.now - this.airborneTimer > this.coyoteTimeThreshold) {
                    if (this.player.anims.currentAnim?.key !== 'idle') {
                         this.player.anims.play('idle', true);
                    }
                }
            }
        } // End if (!this.isAttacking)
        
        // --- Execute Jump (Uses Buffer, Ground Check, OR Active Powerup Count) --- 
        const jumpBufferActive = this.time.now - this.jumpBufferTimer < this.jumpBufferDuration;
        const canJumpFromGround = (this.player.body?.blocked.down ?? false);
        const canMultiJump = this.activePowerupCount > this.midAirJumpsUsed;
        // Add velocity check: only multi-jump if not moving strongly upwards
        const isMovingUp = (this.player.body?.velocity.y ?? 0) < -50; // Small threshold 

        if (jumpBufferActive && !this.isAttacking && (canJumpFromGround || (canMultiJump && !isMovingUp))) {
            // --- DEBUG LOG --- 
            console.log(`>>> Jump Executing: Buffer=${jumpBufferActive}, Grounded=${canJumpFromGround}, Multi=${canMultiJump}, UsedAir=${this.midAirJumpsUsed}, ActiveP=${this.activePowerupCount}`);
            // --- END DEBUG --- 
            
            this.player.setVelocityY(this.jumpVelocity);
            let multiJumpUsed = false; // Flag to see if we need to update indicators
            if (!canJumpFromGround && canMultiJump) {
                this.midAirJumpsUsed++;
                console.log(`    Multi-jump Used! New count: ${this.midAirJumpsUsed}`);
                multiJumpUsed = true; 
            }
            this.jumpBufferTimer = 0; // Consume the buffer
            // Update indicators AFTER using a multi-jump
            if (multiJumpUsed) {
                this.updateJumpIndicators();
            }
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
        
        // Remove obstacles that are far behind
        this.cleanupObstacles();
        
        // Clean up powerups that are far behind
        this.cleanupPowerups();

        // Update parallax background
        if (this.backgroundStars && this.midgroundBuildings && this.foregroundCity && this.player) {
            // Calculate scroll based on player position
            const playerXProgress = this.player.x / this.targetWorldWidth;
            
            // Different scroll speeds for each layer
            this.backgroundStars.tilePositionX = playerXProgress * 200; // Stars move very slowly
            this.midgroundBuildings.tilePositionX = playerXProgress * 500; // Buildings move a bit faster
            this.foregroundCity.tilePositionX = playerXProgress * 800; // Foreground moves fastest
        }
    }

    // --- Method: Lose Life / Game Over Check ---
    loseLife() {
        if (!this.player || !this.livesText) return;
        
        // End powerup state if active (visuals/speed)
        if (this.isPoweredUp) {
            this.deactivatePowerup();
        }
        
        // --- Reset Powerup Jump Count & Mid-Air Jumps on Life Loss --- 
        if (this.activePowerupCount > 0) {
            console.log("Life lost, resetting active powerup count.");
            this.activePowerupCount = 0;
            // UI will update on scene restart via create()
        }
        if (this.midAirJumpsUsed > 0) {
            console.log("Life lost, resetting mid-air jump counter.");
            this.midAirJumpsUsed = 0; 
        }

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
            // --- Store lives, score, time, and distance in data manager before restart ---
            console.log(`LOSE LIFE - Storing lives: ${this.lives}, score: ${this.score}, time: ${this.gameTimeLeft}`);
            this.data.set('currentLives', this.lives);
            this.data.set('currentScore', this.score);
            this.data.set('timeLeft', this.gameTimeLeft);
            this.data.set('maxDistance', this.maxDistanceReached);
            this.scene.restart();
        }
    }

    // --- Method: Handle Game Over Transition ---
    handleGameOver() {
        console.log(`Game Over! Final Score: ${this.score}`);
        
        // Make sure all music is stopped when game over
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
        if (this.powerupMusic) {
            this.powerupMusic.stop();
        }
        
        // Calculate final score components
        const baseScore = this.score;
        const distanceScore = Math.floor(this.maxDistanceReached / 100); // 1 point per 100 units traveled
        const lifeBonus = this.lives * 1000; // 1000 points per remaining life
        const finalScore = baseScore + distanceScore + lifeBonus;
        
        // Check if player "won" by getting to work on time (score >= 5000)
        // Time's up is not necessarily a loss - check if they accumulated enough points
        const gameWon = finalScore >= 5000;
        
        // Pass data to appropriate end scene
        if (gameWon) {
            console.log(`Win condition met with score: ${finalScore}. Starting WinScene...`);
            this.scene.start('WinScene', { 
                finalScore: finalScore,
                baseScore: baseScore,
                distanceScore: distanceScore,
                lifeBonus: lifeBonus
            });
        } else {
            console.log(`Loss condition with score: ${finalScore}. Starting GameOver scene...`);
            this.scene.start('GameOver', { 
                finalScore: finalScore,
                baseScore: baseScore,
                distanceScore: distanceScore,
                lifeBonus: lifeBonus
            });
        }
    }

    // New method to check for and destroy obstacles when attacking
    checkAttackNearbyObstacles() {
        if (!this.player || !this.obstacles || !this.player.body) return; 
        
        // Define the attack area relative to the player's RIGHT edge
        const attackOffsetX = 5;    
        const attackWidth = 30;     
        const attackHeight = this.player.height * 0.8; 
        
        const playerRightEdgeX = this.player.getRightCenter().x;
        const attackX = playerRightEdgeX + attackOffsetX;
        const attackY = this.player.y - attackHeight / 2; 

        const attackRect = new Phaser.Geom.Rectangle(attackX, attackY, attackWidth, attackHeight);

        console.log(`Checking obstacles vs attack rect: [x:${attackX.toFixed(2)}, y:${attackY.toFixed(2)}, w:${attackWidth}, h:${attackHeight.toFixed(2)}]`);
        
        this.obstacles.getChildren().forEach(child => {
            const obstacle = child as Phaser.Physics.Arcade.Sprite;
            
            // Ensure obstacle has a body before checking intersection
            if (obstacle.getData('attacked') || !obstacle.body) return;
            
            // Get the obstacle's physics body bounds
            const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body;
            const obstacleRect = new Phaser.Geom.Rectangle(
                obstacleBody.x,
                obstacleBody.y,
                obstacleBody.width,
                obstacleBody.height
            );

            // Check for intersection between attack rectangle and obstacle body rectangle
            if (Phaser.Geom.Intersects.RectangleToRectangle(attackRect, obstacleRect)) {
                console.log(`Attacked obstacle via intersection at [${obstacle.x.toFixed(2)}, ${obstacle.y.toFixed(2)}]`);
                
                // Mark as attacked
                obstacle.setData('attacked', true);
                
                // Add points
                this.score += this.obstacleKillBonus;
                
                // Show floating score text
                this.showFloatingScore(obstacle.x, obstacle.y, `+${this.obstacleKillBonus}`);
                
                // Immediately disable collision on the obstacle
                obstacleBody.enable = false;
                
                // Play defeat animation
                this.defeatObstacle(obstacle);
            }
        });
    }

    // New method to remove obstacles that are far behind the player
    cleanupObstacles() {
        if (!this.player || !this.obstacles) return;
        
        const cameraScrollX = this.cameras.main.scrollX;
        const obstaclesToRemove: Phaser.GameObjects.GameObject[] = [];
        
        this.obstacles.getChildren().forEach(child => {
            const obstacle = child as Phaser.Physics.Arcade.Sprite;
            if (obstacle.active && obstacle.x < cameraScrollX - this.platformKillOffset) {
                obstaclesToRemove.push(obstacle);
            }
        });
        
        obstaclesToRemove.forEach(obstacle => {
            this.obstacles?.remove(obstacle, true, true);
        });
    }

    // Method to clean up powerups that are far behind the player
    cleanupPowerups() {
        if (!this.player || !this.powerups) return;
        
        const cameraScrollX = this.cameras.main.scrollX;
        const powerupsToRemove: Phaser.GameObjects.GameObject[] = [];
        
        this.powerups.getChildren().forEach(child => {
            const powerup = child as Phaser.Physics.Arcade.Sprite;
            if (powerup.active && powerup.x < cameraScrollX - this.platformKillOffset) {
                powerupsToRemove.push(powerup);
            }
        });
        
        powerupsToRemove.forEach(powerup => {
            this.powerups?.remove(powerup, true, true);
        });
    }

    // Override destroy to clean up resources when scene exits
    shutdown() {
        // Stop all music
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
        if (this.powerupMusic) {
            this.powerupMusic.stop();
        }
        
        // Clean up all score popups
        this.scorePopups.forEach(popup => {
            popup.destroy();
        });
        this.scorePopups = [];
        
        // Stop all tweens
        this.tweens.killAll();
    }

    // --- Update Jump Indicators Method --- 
    updateJumpIndicators() {
        if (!this.jumpIndicators) return;
        this.jumpIndicators.clear(true, true); 
        
        const startX = this.scale.width / 2; 
        const startY = 130;                 
        const iconScale = 0.07;             
        const spacing = 10; 
        const totalWidth = (this.activePowerupCount - 1) * spacing;
        const firstIconX = startX - totalWidth / 2;

        for (let i = 0; i < this.activePowerupCount; i++) {
            const iconX = firstIconX + i * spacing; 
            const icon = this.jumpIndicators.create(iconX, startY, 'powerup') as Phaser.GameObjects.Image;
            icon.setScale(iconScale).setScrollFactor(0); 
            
            // Dim the icon if it represents a used jump for this airtime
            if (i < this.midAirJumpsUsed) {
                icon.setAlpha(0.3); // Set opacity low for used jumps
            } else {
                icon.setAlpha(1.0); // Full opacity for available jumps
            }
        }
    }
} 