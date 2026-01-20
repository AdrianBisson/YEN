/**
 * @fileoverview Main game controller
 * @module core/Game
 */

import { CUBE_HALF_SIZE, SEGMENT_SPACING, SPAWN_INTERVAL, SHADOW_SPAWN_DELAY } from '../config/constants.js';
import { settings } from '../config/settings.js';
import { Vector3Pool, ColorPool } from '../utils/ObjectPools.js';
import { VectorMath } from '../utils/VectorMath.js';
import { performanceMonitor } from '../utils/PerformanceMonitor.js';
import { SceneManager } from '../rendering/SceneManager.js';
import { CubeEnvironment } from '../rendering/CubeEnvironment.js';
import { Effects } from '../rendering/Effects.js';
import { SpatialGrid, CollisionSystem } from '../systems/CollisionSystem.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { InputHandler } from '../systems/InputHandler.js';
import { CameraController } from '../systems/CameraController.js';
import { Snake } from './Snake.js';
import { NibbleManager } from './Nibble.js';
import { UIManager } from '../ui/UIManager.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { DebugPanel } from '../ui/DebugPanel.js';

/**
 * Main game controller that orchestrates all systems
 * @class
 */
export class Game {
    /**
     * Create a new Game instance
     */
    constructor() {
        // Game state
        /** @type {boolean} */
        this.isGameOver = false;

        /** @type {boolean} */
        this.gameStarted = false;

        /** @type {boolean} */
        this.isPaused = false;

        /** @type {number} */
        this.score = 0;

        /** @type {number} */
        this.lastSpawnTime = 0;

        /** @type {number} */
        this.lastShadowSpawnTime = 0;

        /** @type {boolean} */
        this.isShadowSnakeInvulnerable = false;

        /** @type {number} */
        this.lastTime = 0;

        // Systems (initialized in init())
        /** @type {SceneManager|null} */
        this.sceneManager = null;

        /** @type {CubeEnvironment|null} */
        this.cubeEnvironment = null;

        /** @type {Effects|null} */
        this.effects = null;

        /** @type {SpatialGrid|null} */
        this.spatialGrid = null;

        /** @type {CollisionSystem|null} */
        this.collisionSystem = null;

        /** @type {SoundSystem|null} */
        this.soundSystem = null;

        /** @type {InputHandler|null} */
        this.inputHandler = null;

        /** @type {CameraController|null} */
        this.cameraController = null;

        /** @type {NibbleManager|null} */
        this.nibbleManager = null;

        /** @type {UIManager|null} */
        this.uiManager = null;

        /** @type {PauseMenu|null} */
        this.pauseMenu = null;

        /** @type {DebugPanel|null} */
        this.debugPanel = null;

        // Game entities
        /** @type {Snake|null} */
        this.playerSnake = null;

        /** @type {Snake[]} */
        this.shadowSnakes = [];

        // Animation frame ID
        /** @type {number|null} */
        this.animationFrameId = null;

        // Bind methods
        this._animate = this._animate.bind(this);
        this._onWindowResize = this._onWindowResize.bind(this);
    }

    /**
     * Initialize all game systems
     */
    init() {
        // Scene manager
        this.sceneManager = new SceneManager();
        this.sceneManager.attachToDOM();

        // Spatial grid and collision system
        this.spatialGrid = new SpatialGrid(10);
        this.collisionSystem = new CollisionSystem(this.spatialGrid, []);

        // Cube environment
        this.cubeEnvironment = new CubeEnvironment(
            this.sceneManager.scene,
            this.sceneManager.camera
        );
        this.collisionSystem.setFaces(this.cubeEnvironment.faces);

        // Effects
        this.effects = new Effects(this.sceneManager.scene);
        this.effects.createStarfield();

        // Sound system
        this.soundSystem = new SoundSystem();
        this.soundSystem.setFxVolume(settings.fxVolume);

        // Nibble manager
        this.nibbleManager = new NibbleManager(
            this.sceneManager.scene,
            this.collisionSystem,
            this.spatialGrid
        );

        // Camera controller
        this.cameraController = new CameraController(this.sceneManager.camera);

        // Input handler
        this.inputHandler = new InputHandler({
            onSnakeRotate: (rotY, rotX) => {
                if (this.playerSnake && !this.isPaused && !this.isGameOver) {
                    this.playerSnake.rotate(rotY, rotX);
                }
            },
            onPauseToggle: () => this._togglePause(),
            onAudioResume: () => this.soundSystem?.resume(),
            onCameraKeyDown: (key) => this.cameraController?.onKeyDown(key),
            onCameraKeyUp: (key) => this.cameraController?.onKeyUp(key)
        });

        // UI Manager
        this.uiManager = new UIManager();
        this.uiManager.showSplashScreen();
        this.uiManager.showStartButton();

        if (this.uiManager.isMobileDevice()) {
            this.uiManager.showMobilePause();
            this.uiManager.onMobilePauseClick(() => this._togglePause());
        }

        this.uiManager.onStartClick(() => this.start());
        this.uiManager.onReincarnateClick(() => this._restart());

        // Pause menu
        this.pauseMenu = new PauseMenu({
            onResume: () => this._resume(),
            onRestart: () => this._restart(),
            onSettingChange: (key, value) => this._handleSettingChange(key, value)
        });

        // Debug panel
        this.debugPanel = new DebugPanel(this.spatialGrid);

        // Window resize handler
        window.addEventListener('resize', this._onWindowResize);

        // Start animation loop
        this.lastTime = performance.now() * 0.001;
        this._animate();
    }

    /**
     * Start the game
     */
    start() {
        this.uiManager.hideSplashScreen();
        this.gameStarted = true;
        this.inputHandler.setGameStarted(true);
        this._reset();
        this.soundSystem.resume();
    }

    /**
     * Reset game state
     * @private
     */
    _reset() {
        // Clean up existing snakes
        if (this.playerSnake) {
            this.playerSnake.dispose();
        }
        this.shadowSnakes.forEach(snake => snake.dispose());
        this.shadowSnakes = [];

        // Clear nibbles
        this.nibbleManager.clear();

        // Clear spatial grid
        this.spatialGrid.clear();

        // Reset state
        this.score = 0;
        this.uiManager.updateScore(0);
        this.isGameOver = false;
        this.inputHandler.setGameOver(false);
        this.lastSpawnTime = performance.now();
        this.lastShadowSpawnTime = performance.now();
        this.isShadowSnakeInvulnerable = false;

        // Recreate sound system
        this.soundSystem = new SoundSystem();
        this.soundSystem.setFxVolume(settings.fxVolume);

        // Create player snake
        this.playerSnake = new Snake(
            this.sceneManager.scene,
            this.collisionSystem,
            true
        );
        this.playerSnake.speed = settings.speed;
        this.playerSnake.head.position.set(0, 0, 0);
        this.playerSnake.head.rotation.y = -Math.PI / 2;
        this.playerSnake.syncDirection();
        this.playerSnake.nibblesEaten = 0;

        // Spawn initial nibble
        this.nibbleManager.spawn();

        // Hide game over screen
        this.uiManager.hideGameOver();

        // Update visibility
        this.cubeEnvironment.updateVisibility();

        // Initialize camera
        if (settings.stationaryCamera) {
            this.cameraController.initializeStationaryCamera();
        }

        this.uiManager.setCameraInstructionsVisible(settings.stationaryCamera);
    }

    /**
     * Restart the game
     * @private
     */
    _restart() {
        this.gameStarted = true;
        this._reset();
        this.soundSystem.resume();
        this.inputHandler.requestPointerLock();
    }

    /**
     * Toggle pause state
     * @private
     */
    _togglePause() {
        if (this.isGameOver) return;

        this.isPaused = !this.isPaused;
        this.inputHandler.setPaused(this.isPaused);

        if (this.isPaused) {
            this.pauseMenu.show();
            this.soundSystem.pause();
            this.inputHandler.exitPointerLock();
        } else {
            this.pauseMenu.hide();
            this.uiManager.setCameraInstructionsVisible(settings.stationaryCamera);
            this.soundSystem.resume();
            this.inputHandler.requestPointerLock();
        }
    }

    /**
     * Resume game
     * @private
     */
    _resume() {
        this.isPaused = false;
        this.inputHandler.setPaused(false);
        this.uiManager.setCameraInstructionsVisible(settings.stationaryCamera);
        this.soundSystem.resume();
        this.inputHandler.requestPointerLock();
    }

    /**
     * Handle setting changes
     * @private
     * @param {string} key - Setting key
     * @param {*} value - New value
     */
    _handleSettingChange(key, value) {
        switch (key) {
            case 'speed':
                if (this.playerSnake) {
                    this.playerSnake.speed = value;
                }
                break;
            case 'fov':
                this.sceneManager.setFOV(value);
                break;
            case 'shadowSpeed':
                this.shadowSnakes.forEach(snake => {
                    snake.speed = value;
                });
                break;
            case 'fxVolume':
                this.soundSystem.setFxVolume(value);
                break;
            case 'wallOpacity':
                this.cubeEnvironment.setWallOpacity(value);
                break;
            case 'stationaryCamera':
                if (value) {
                    this.cameraController.initializeStationaryCamera();
                    this.uiManager.showCameraInstructions();
                    this.inputHandler.exitPointerLock();
                } else {
                    this.uiManager.hideCameraInstructions();
                    this.inputHandler.requestPointerLock();
                }
                break;
            case 'wireframeEnabled':
                this.cubeEnvironment.setWireframe(value);
                break;
        }
    }

    /**
     * Main animation loop
     * @private
     */
    _animate() {
        this.animationFrameId = requestAnimationFrame(this._animate);

        const time = performance.now() * 0.001;
        const delta = time - this.lastTime;
        this.lastTime = time;

        // Update performance monitor
        performanceMonitor.update();

        // Update shader time
        this.cubeEnvironment.updateShaderTime(time);

        // Update starfield
        this.effects.updateStarfield(delta);

        // Update game logic if playing
        if (this.gameStarted && !this.isGameOver && !this.isPaused) {
            this._updateGameLogic(time, delta);
        }

        // Update face visibility
        this.cubeEnvironment.updateVisibility();

        // Update camera
        if (this.playerSnake && this.gameStarted) {
            this.cameraController.update(this.playerSnake.head);
        }

        // Update debug panel
        this.debugPanel.update();

        // Render
        this.sceneManager.render();
    }

    /**
     * Update game logic
     * @private
     * @param {number} time - Current time
     * @param {number} delta - Time delta
     */
    _updateGameLogic(time, delta) {
        // Update player snake
        if (this.playerSnake) {
            this.playerSnake.update(delta);
        }

        // Update shadow snakes (optimized)
        this.shadowSnakes.forEach((snake, index) => {
            if (snake && Math.floor(time * 60) % 2 === index % 2) {
                snake.update(delta);
            }
        });

        // Animate nibbles
        this.nibbleManager.animate(time, delta);

        // Check boundary crossings
        if (this.playerSnake) {
            this._checkCubeBoundary();
        }

        // Check nibble collection
        this._checkNibbleCollection(time);

        // Spawn nibbles
        const currentTime = performance.now();
        if (currentTime - this.lastSpawnTime > SPAWN_INTERVAL / settings.spawnRate) {
            this.nibbleManager.spawn();
            this.lastSpawnTime = currentTime;
        }

        // Check collisions
        if (this.playerSnake && !this.isShadowSnakeInvulnerable) {
            this._checkCollisions();
        }
    }

    /**
     * Check if player crossed cube boundary
     * @private
     */
    _checkCubeBoundary() {
        if (!this.playerSnake?.isPlayer) return;

        const halfSize = CUBE_HALF_SIZE;
        const pos = this.playerSnake.head.position;

        // Get previous position from trail
        let prevPos = null;
        if (this.playerSnake.trail.length > 1) {
            prevPos = this.playerSnake.trail[1];
        } else if (this.playerSnake.trail.length > 0) {
            prevPos = this.playerSnake.trail[0];
        } else {
            prevPos = pos.clone().sub(
                this.playerSnake.direction.clone().multiplyScalar(SEGMENT_SPACING)
            );
        }

        const isInsideCube = (position) => {
            return Math.abs(position.x) <= halfSize &&
                   Math.abs(position.y) <= halfSize &&
                   Math.abs(position.z) <= halfSize;
        };

        const wasInside = isInsideCube(prevPos);
        const isInside = isInsideCube(pos);

        if (!wasInside || isInside) return;

        // Find which wall was crossed
        let wallHitPoint = null;
        let normal = Vector3Pool.get();

        if (Math.abs(pos.x) > halfSize && Math.abs(prevPos.x) <= halfSize) {
            wallHitPoint = Vector3Pool.get().copy(pos);
            wallHitPoint.x = Math.sign(pos.x) * halfSize;
            normal.set(-Math.sign(pos.x), 0, 0);
        } else if (Math.abs(pos.y) > halfSize && Math.abs(prevPos.y) <= halfSize) {
            wallHitPoint = Vector3Pool.get().copy(pos);
            wallHitPoint.y = Math.sign(pos.y) * halfSize;
            normal.set(0, -Math.sign(pos.y), 0);
        } else if (Math.abs(pos.z) > halfSize && Math.abs(prevPos.z) <= halfSize) {
            wallHitPoint = Vector3Pool.get().copy(pos);
            wallHitPoint.z = Math.sign(pos.z) * halfSize;
            normal.set(0, 0, -Math.sign(pos.z));
        }

        if (wallHitPoint) {
            this._spawnShadowSnake(wallHitPoint, normal);
            Vector3Pool.release(wallHitPoint);
        }
        Vector3Pool.release(normal);
    }

    /**
     * Spawn a shadow snake at wall intersection
     * @private
     * @param {THREE.Vector3} wallHitPoint - Point where wall was crossed
     * @param {THREE.Vector3} normal - Wall normal
     */
    _spawnShadowSnake(wallHitPoint, normal) {
        const currentTime = performance.now();
        if (currentTime - this.lastShadowSpawnTime < SHADOW_SPAWN_DELAY) return;

        this.lastShadowSpawnTime = currentTime;
        this.isShadowSnakeInvulnerable = true;

        // Create shadow snake
        const shadowSnake = new Snake(
            this.sceneManager.scene,
            this.collisionSystem,
            false
        );

        // Position slightly inside boundary
        const spawnPosition = Vector3Pool.get().copy(wallHitPoint);
        const insetAmount = 2;

        if (Math.abs(wallHitPoint.x) >= CUBE_HALF_SIZE) {
            spawnPosition.x = Math.sign(wallHitPoint.x) * (CUBE_HALF_SIZE - insetAmount);
        }
        if (Math.abs(wallHitPoint.y) >= CUBE_HALF_SIZE) {
            spawnPosition.y = Math.sign(wallHitPoint.y) * (CUBE_HALF_SIZE - insetAmount);
        }
        if (Math.abs(wallHitPoint.z) >= CUBE_HALF_SIZE) {
            spawnPosition.z = Math.sign(wallHitPoint.z) * (CUBE_HALF_SIZE - insetAmount);
        }

        shadowSnake.head.position.copy(spawnPosition);

        // Calculate reflected direction
        const playerDirection = Vector3Pool.get();
        this.playerSnake.head.getWorldDirection(playerDirection);
        const reflectedDirection = Vector3Pool.get();
        reflectedDirection.copy(playerDirection).reflect(normal);

        // Set direction
        const lookAtPos = Vector3Pool.get();
        VectorMath.moveForward(shadowSnake.head.position, reflectedDirection, 1, lookAtPos);
        shadowSnake.head.lookAt(lookAtPos);

        // Initialize properties
        shadowSnake.creationTime = currentTime;
        shadowSnake.isInitialReflectionPhase = true;
        shadowSnake.targetDirection.copy(reflectedDirection);
        shadowSnake.speed = settings.shadowSpeed;
        shadowSnake.nibblesEaten = 0;
        shadowSnake.setNibblesRef(this.nibbleManager.getAll());

        this.shadowSnakes.push(shadowSnake);
        this.soundSystem.playShadowSpawn();

        // Transition to autonomous mode after delay
        setTimeout(() => {
            this.isShadowSnakeInvulnerable = false;
            shadowSnake.isInitialReflectionPhase = false;
        }, 3000);

        // Cleanup
        Vector3Pool.release(spawnPosition);
        Vector3Pool.release(playerDirection);
        Vector3Pool.release(reflectedDirection);
        Vector3Pool.release(lookAtPos);
    }

    /**
     * Check nibble collection
     * @private
     * @param {number} time - Current time
     */
    _checkNibbleCollection(time) {
        if (!this.playerSnake) return;

        // Player nibble collection
        const playerNibbleIndex = this.nibbleManager.findNearby(
            this.playerSnake.head.position
        );

        if (playerNibbleIndex !== -1) {
            this.nibbleManager.removeByIndex(playerNibbleIndex);
            this.playerSnake.addSegment();
            this.playerSnake.nibblesEaten++;
            this.score++;
            this.uiManager.updateScore(this.score);
            this.soundSystem.playNibbleCollect();
            this.nibbleManager.spawn();
        }

        // Shadow snake nibble collection (throttled)
        if (Math.floor(time * 60) % 3 === 0) {
            for (const snake of this.shadowSnakes) {
                if (!snake?.head) continue;

                const nibbleIndex = this.nibbleManager.findNearby(snake.head.position);
                if (nibbleIndex !== -1) {
                    this.nibbleManager.removeByIndex(nibbleIndex);
                    snake.addSegment();
                    snake.nibblesEaten++;
                    this.soundSystem.playNibbleCollect();
                    this.nibbleManager.spawn();
                }
            }
        }
    }

    /**
     * Check and handle collisions
     * @private
     */
    _checkCollisions() {
        const collisions = this.collisionSystem.checkCollisions(
            this.playerSnake,
            this.shadowSnakes,
            this.nibbleManager.getAll()
        );

        for (const collision of collisions) {
            if (collision.type === 'player_collision') {
                if (collision.object === this.playerSnake.head) continue;

                // Check shadow snake segment
                for (const shadow of this.shadowSnakes) {
                    if (shadow.segments.includes(collision.object)) {
                        this._dissolveSnake(this.playerSnake);
                        return;
                    }
                }

                // Check self-collision
                if (this.playerSnake.segments.includes(collision.object)) {
                    const segmentIndex = this.playerSnake.segments.indexOf(collision.object);
                    if (segmentIndex >= 10) {
                        this._dissolveSnake(this.playerSnake);
                        return;
                    }
                }
            } else if (collision.type === 'shadow_collision') {
                const shadow = collision.snake;
                if (collision.object === shadow.head) continue;

                // Check player segment
                if (this.playerSnake.segments.includes(collision.object)) {
                    this._dissolveSnake(shadow);
                    continue;
                }

                // Check other shadow snakes
                for (const otherShadow of this.shadowSnakes) {
                    if (otherShadow !== shadow) {
                        if (otherShadow.segments.includes(collision.object)) {
                            this._dissolveSnake(shadow);
                            break;
                        }
                    }
                }

                // Self-collision
                if (shadow.segments.includes(collision.object)) {
                    const segmentIndex = shadow.segments.indexOf(collision.object);
                    if (segmentIndex >= 10) {
                        this._dissolveSnake(shadow);
                    }
                }
            }
        }
    }

    /**
     * Dissolve a snake and create nibbles
     * @private
     * @param {Snake} snake - Snake to dissolve
     */
    _dissolveSnake(snake) {
        // Remove from collision system
        this.collisionSystem.removeObject(snake.head);
        snake.segments.forEach(segment => {
            this.collisionSystem.removeObject(segment);
        });

        // Create nibbles from segments
        const nibblesDropped = snake.isPlayer ?
            Math.min(snake.segments.length, snake.nibblesEaten) :
            snake.segments.length;

        for (let i = 0; i < nibblesDropped && i < snake.segments.length; i++) {
            this.nibbleManager.createAt(
                snake.segments[i].position,
                !snake.isPlayer
            );
        }

        // Handle game over or remove shadow
        if (snake.isPlayer) {
            this.isGameOver = true;
            this.inputHandler.setGameOver(true);
            this.uiManager.showGameOver(this.score);
        } else {
            this.shadowSnakes = this.shadowSnakes.filter(s => s !== snake);
        }

        snake.dispose();
        this.soundSystem.playCollision();
    }

    /**
     * Handle window resize
     * @private
     */
    _onWindowResize() {
        this.cubeEnvironment.updateResolution();
    }

    /**
     * Clean up all resources
     */
    dispose() {
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Remove event listeners
        window.removeEventListener('resize', this._onWindowResize);

        // Dispose systems
        this.playerSnake?.dispose();
        this.shadowSnakes.forEach(snake => snake.dispose());
        this.nibbleManager?.dispose();
        this.cubeEnvironment?.dispose();
        this.effects?.dispose();
        this.sceneManager?.dispose();
        this.inputHandler?.dispose();
        this.debugPanel?.dispose();
        this.collisionSystem?.dispose();
        VectorMath.dispose();
        Vector3Pool.clear();
        ColorPool.clear();
    }
}

export default Game;
