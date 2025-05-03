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
            console.log(`Body size after scale and reset: ${this.player.body.width}x${this.player.body.height}`);
        } else {
            console.warn("Player body not available immediately after creation!");
        }

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

        // Generate new platforms ahead of the player, up to the limit
        while (this.furthestPlatformX < playerX + this.platformScrollMargin + this.scale.width && this.furthestPlatformX < generationLimitX) {
            const groundY = this.scale.height - this.platformHeight / 2;
            let platformY = groundY;
            
            // Add more variety: occasional higher/lower platforms
            const randHeight = Math.random();
            if (randHeight < 0.15) { // 15% chance of higher platform
                 platformY = groundY - Phaser.Math.Between(100, 250); 
            } else if (randHeight < 0.25) { // 10% chance of lower platform (careful not to make it too low)
                 platformY = groundY + Phaser.Math.Between(50, 100);
            } // Otherwise, keep it near ground level

            this.addPlatform(this.furthestPlatformX + this.platformWidth / 2, platformY);

            // Vary gaps more, limit max gap size
            if (Math.random() < 0.65) { 
                 this.furthestPlatformX += this.platformWidth * Phaser.Math.FloatBetween(1.0, 1.5);
             } else { 
                 this.furthestPlatformX += this.platformWidth * Phaser.Math.FloatBetween(2.0, 3.5); // Reduced max multiplier
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
        if (!this.cursors || !this.player || !this.platforms || !this.spaceBar || !this.shiftKey) {
            return;
        }

        // --- Player Existence Check --- 
        if (!this.player || !this.player.active) { 
            // If player is gone for any reason, restart (or go to game over later)
            console.log("Player inactive or destroyed! Restarting scene.");
            this.scene.restart();
            return; // Stop further processing this frame
        }

        // --- Get Input States --- 
        // const keyboardLeft = this.cursors.left.isDown; // REMOVE Left input check
        // const keyboardRight = this.cursors.right.isDown; // REMOVE Right input check
        const keyboardUp = this.cursors.up.isDown;
        const keyboardAttack = Phaser.Input.Keyboard.JustDown(this.spaceBar);
        this.isRunning = this.shiftKey.isDown; 
        // const moveLeft = keyboardLeft || this.touchMoveDirection === 'left'; // REMOVE Left input processing
        // const moveRight = keyboardRight || this.touchMoveDirection === 'right'; // REMOVE Right input processing
        const doJump = keyboardUp || this.touchJump;
        const doAttack = keyboardAttack || this.touchAttack;
        this.touchJump = false;
        this.touchAttack = false;
        const currentSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;

        // --- Set Player Velocity & Animation --- 

        // Attack (Keep priority)
        if (doAttack && !this.isAttacking && this.player.body?.touching.down) {
            console.log("LOG: Attack conditions met. Playing 'attack'...");
            this.isAttacking = true;
            this.player.setVelocityX(0); // Stop horizontal movement during attack
            this.player.anims.play('attack', false); 
            console.log(`LOG: Called play('attack'). Current anim: ${this.player.anims.currentAnim?.key}`);
        }

        // Auto-Run / Animation (only if not attacking)
        if (!this.isAttacking) {
            // --- Always move right --- 
            this.player.setVelocityX(currentSpeed); 
            this.player.setFlipX(false); // Ensure facing right

            // --- Set animation based on state --- 
            const animKey = this.isRunning ? 'run' : 'walk';
            if (this.player.body?.touching.down) { 
                // Play walk/run animation if on ground
                if (this.player.anims.currentAnim?.key !== animKey) {
                    this.player.anims.play(animKey, true);
                }
            } else {
                // --- In Air Animation (Optional) --- 
                // You might want a specific jump/fall animation here
                // For now, let's just stop walk/run anims if not already stopped
                // Or maybe keep the last frame of walk/run?
                // Let's use the idle frame (frame 0) for jump/fall for now.
                if (this.player.anims.currentAnim?.key !== 'idle') {
                     this.player.anims.play('idle', true); // Use idle anim while in air
                }
            }
        }

        // Jump (Keep jump logic, but ensure it doesn't override auto-run X velocity)
        if (doJump && this.player.body?.touching.down && !this.isAttacking) {
            this.player.setVelocityY(this.jumpVelocity);
            // No longer need to stop X velocity on jump
        }

        // --- Level Gen, Fall Check, Pointer State Update ---
        this.generatePlatforms();

        // --- Fall Check (More Robust) ---
        const worldBottomThreshold = this.physics.world.bounds.height - 10; // A little buffer above absolute bottom
        
        // Check if player object and its body exist before accessing properties
        if (this.player && this.player.body) {
            // Check the player's bottom edge against the world threshold
            if (this.player.body.bottom > worldBottomThreshold) {
                console.log(`Player fell off! Y: ${this.player.y.toFixed(2)}, Bottom: ${this.player.body.bottom.toFixed(2)} > Threshold: ${worldBottomThreshold.toFixed(2)}. Game Over.`);
                this.scene.start('GameOver'); // Go to GameOver scene
                // No return needed here as scene transition stops current execution
            }
        } else if (!this.player) {
            // Handle case where player might be destroyed unexpectedly
            console.warn("Player doesn't exist in update fall check! Restarting.");
            this.scene.restart(); // Fallback restart if player is missing
        }

        // --- Update previous pointer states --- 
        this.pointer2PreviouslyDown = this.input.pointer2?.isDown ?? false;
    }
} 