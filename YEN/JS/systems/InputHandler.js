/**
 * @fileoverview Input handling for mouse, touch, and keyboard controls
 * @module systems/InputHandler
 */

import { settings } from '../config/settings.js';
import { SENSITIVITY, TOUCH_DELAY } from '../config/constants.js';

/**
 * Handles all player input for snake control
 * @class
 */
export class InputHandler {
    /**
     * Create a new InputHandler instance
     * @param {Object} callbacks - Callback functions for input events
     * @param {Function} [callbacks.onSnakeRotate] - Called when snake should rotate (rotationY, rotationX)
     * @param {Function} [callbacks.onPauseToggle] - Called when pause is toggled
     * @param {Function} [callbacks.onAudioResume] - Called when audio should resume
     */
    constructor(callbacks = {}) {
        /** @type {Object} */
        this.callbacks = callbacks;

        /** @type {number|undefined} */
        this.lastMouseX = undefined;

        /** @type {number|undefined} */
        this.lastMouseY = undefined;

        /** @type {number|undefined} */
        this.touchStartX = undefined;

        /** @type {number|undefined} */
        this.touchStartY = undefined;

        /** @type {number} */
        this.lastTouchTime = 0;

        /** @type {boolean} */
        this.isPointerLockRequested = false;

        /** @type {boolean} */
        this.gameStarted = false;

        /** @type {boolean} */
        this.isPaused = false;

        /** @type {boolean} */
        this.isGameOver = false;

        /** @type {boolean} */
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        // Bind event handlers
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);
        this._onPointerLockError = this._onPointerLockError.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        this._setupEventListeners();
    }

    /**
     * Set up all event listeners
     * @private
     */
    _setupEventListeners() {
        document.addEventListener('click', this._onClick);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        document.addEventListener('pointerlockerror', this._onPointerLockError);
        document.addEventListener('touchstart', this._onTouchStart, { passive: false });
        document.addEventListener('touchmove', this._onTouchMove, { passive: false });
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    /**
     * Handle click events
     * @private
     */
    _onClick() {
        if (this.gameStarted && !settings.stationaryCamera &&
            !this.isPointerLockRequested && !document.pointerLockElement) {
            this.isPointerLockRequested = true;
            document.body.requestPointerLock().catch(error => {
                console.log('Pointer lock request failed:', error);
                this.isPointerLockRequested = false;
            });
        }
        this.callbacks.onAudioResume?.();
    }

    /**
     * Handle mouse movement
     * @private
     * @param {MouseEvent} event
     */
    _onMouseMove(event) {
        if (!this.gameStarted) return;

        let rotationY = 0;
        let rotationX = 0;

        if (!settings.stationaryCamera && document.pointerLockElement === document.body) {
            // Locked mode: use movementX/Y
            rotationY = -(event.movementX || 0) * SENSITIVITY;
            rotationX = -(event.movementY || 0) * SENSITIVITY;
        } else {
            // Non-locked mode: use clientX/Y delta
            if (this.lastMouseX !== undefined && this.lastMouseY !== undefined) {
                const dx = event.clientX - this.lastMouseX;
                const dy = event.clientY - this.lastMouseY;
                rotationY = -dx * SENSITIVITY;
                rotationX = -dy * SENSITIVITY;
            }
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }

        if (rotationY !== 0 || rotationX !== 0) {
            this.callbacks.onSnakeRotate?.(rotationY, rotationX);
        }
    }

    /**
     * Handle pointer lock change
     * @private
     */
    _onPointerLockChange() {
        this.isPointerLockRequested = false;
        if (document.pointerLockElement === document.body) {
            document.body.style.cursor = 'none';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    /**
     * Handle pointer lock error
     * @private
     * @param {Event} event
     */
    _onPointerLockError(event) {
        console.log('Pointer lock error:', event);
        this.isPointerLockRequested = false;
        document.body.style.cursor = 'default';

        setTimeout(() => {
            this.isPointerLockRequested = false;
        }, 1000);
    }

    /**
     * Handle touch start
     * @private
     * @param {TouchEvent} event
     */
    _onTouchStart(event) {
        if (!this.isMobile) return;
        if (event.touches.length > 1) return;

        event.preventDefault();
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
        this.lastTouchTime = performance.now();
        this.callbacks.onAudioResume?.();
    }

    /**
     * Handle touch move
     * @private
     * @param {TouchEvent} event
     */
    _onTouchMove(event) {
        if (!this.isMobile) return;
        if (event.touches.length > 1) return;
        if (!this.gameStarted) return;

        event.preventDefault();

        // Throttle touch events
        const currentTime = performance.now();
        if (currentTime - this.lastTouchTime < TOUCH_DELAY) return;

        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;
        const movementX = touchX - this.touchStartX;
        const movementY = touchY - this.touchStartY;

        const rotationY = -movementX * SENSITIVITY;
        const rotationX = -movementY * SENSITIVITY * 2; // Increased pitch sensitivity

        this.callbacks.onSnakeRotate?.(rotationY, rotationX);

        this.touchStartX = touchX;
        this.touchStartY = touchY;
        this.lastTouchTime = currentTime;
    }

    /**
     * Handle key down
     * @private
     * @param {KeyboardEvent} event
     */
    _onKeyDown(event) {
        if (event.code === 'Space' && !this.isGameOver) {
            this.callbacks.onPauseToggle?.();
            return;
        }

        // Emit camera control keys for stationary mode
        if (settings.stationaryCamera) {
            this.callbacks.onCameraKeyDown?.(event.key.toLowerCase());
        }
    }

    /**
     * Handle key up
     * @private
     * @param {KeyboardEvent} event
     */
    _onKeyUp(event) {
        if (settings.stationaryCamera) {
            this.callbacks.onCameraKeyUp?.(event.key.toLowerCase());
        }
    }

    /**
     * Set game started state
     * @param {boolean} started - Whether game has started
     */
    setGameStarted(started) {
        this.gameStarted = started;
    }

    /**
     * Set paused state
     * @param {boolean} paused - Whether game is paused
     */
    setPaused(paused) {
        this.isPaused = paused;
    }

    /**
     * Set game over state
     * @param {boolean} gameOver - Whether game is over
     */
    setGameOver(gameOver) {
        this.isGameOver = gameOver;
    }

    /**
     * Safely request pointer lock
     */
    requestPointerLock() {
        if (settings.stationaryCamera || this.isPointerLockRequested ||
            document.pointerLockElement || this.isPaused || !this.gameStarted) {
            return;
        }

        setTimeout(() => {
            if (!this.isPointerLockRequested && !document.pointerLockElement &&
                !this.isPaused && this.gameStarted) {
                this.isPointerLockRequested = true;
                document.body.requestPointerLock().catch(error => {
                    console.log('Pointer lock request failed:', error);
                    this.isPointerLockRequested = false;
                });
            }
        }, 100);
    }

    /**
     * Exit pointer lock
     */
    exitPointerLock() {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        document.body.style.cursor = 'default';
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        document.removeEventListener('click', this._onClick);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        document.removeEventListener('pointerlockerror', this._onPointerLockError);
        document.removeEventListener('touchstart', this._onTouchStart);
        document.removeEventListener('touchmove', this._onTouchMove);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }
}

export default InputHandler;
