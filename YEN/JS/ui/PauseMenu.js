/**
 * @fileoverview Pause menu and settings controls
 * @module ui/PauseMenu
 */

import { settings } from '../config/settings.js';

/**
 * Manages the pause menu and game settings UI
 * @class
 */
export class PauseMenu {
    /**
     * Create a new PauseMenu instance
     * @param {Object} callbacks - Callback functions
     * @param {Function} [callbacks.onResume] - Called when resuming game
     * @param {Function} [callbacks.onRestart] - Called when restarting game
     * @param {Function} [callbacks.onSettingChange] - Called when a setting changes
     */
    constructor(callbacks = {}) {
        /** @type {Object} */
        this.callbacks = callbacks;

        /** @type {boolean} */
        this.isPaused = false;

        // Cache DOM elements
        /** @type {HTMLElement|null} */
        this.pauseMenu = document.getElementById('pause-menu');

        /** @type {HTMLElement|null} */
        this.resumeButton = document.getElementById('resume');

        /** @type {HTMLElement|null} */
        this.restartButton = document.getElementById('pause-restart');

        // Settings controls
        /** @type {HTMLInputElement|null} */
        this.speedControl = document.getElementById('speed');

        /** @type {HTMLInputElement|null} */
        this.colorCycleControl = document.getElementById('color-cycle');

        /** @type {HTMLInputElement|null} */
        this.fovControl = document.getElementById('fov');

        /** @type {HTMLInputElement|null} */
        this.shadowSpeedControl = document.getElementById('shadow-speed');

        /** @type {HTMLInputElement|null} */
        this.spawnRateControl = document.getElementById('spawn-rate');

        /** @type {HTMLInputElement|null} */
        this.fxVolumeControl = document.getElementById('fx-volume');

        /** @type {HTMLInputElement|null} */
        this.wallOpacityControl = document.getElementById('wall-opacity');

        /** @type {HTMLInputElement|null} */
        this.stationaryCameraControl = document.getElementById('stationary-camera');

        /** @type {HTMLInputElement|null} */
        this.wireframeControl = document.getElementById('wireframe');

        // Display elements
        /** @type {HTMLElement|null} */
        this.speedValue = document.getElementById('speed-value');

        /** @type {HTMLElement|null} */
        this.colorCycleValue = document.getElementById('color-cycle-value');

        /** @type {HTMLElement|null} */
        this.fovValue = document.getElementById('fov-value');

        /** @type {HTMLElement|null} */
        this.shadowSpeedValue = document.getElementById('shadow-speed-value');

        /** @type {HTMLElement|null} */
        this.spawnRateValue = document.getElementById('spawn-rate-value');

        /** @type {HTMLElement|null} */
        this.fxVolumeValue = document.getElementById('fx-volume-value');

        /** @type {HTMLElement|null} */
        this.wallOpacityValue = document.getElementById('wall-opacity-value');

        this._setupEventListeners();
        this._initializeControls();
        this._updateDisplay();
    }

    /**
     * Set up event listeners for controls
     * @private
     */
    _setupEventListeners() {
        // Resume button
        if (this.resumeButton) {
            this.resumeButton.addEventListener('click', () => this._onResume());
            this.resumeButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._onResume();
            });
        }

        // Restart button
        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => this._onRestart());
            this.restartButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._onRestart();
            });
        }

        // Speed control
        if (this.speedControl) {
            this.speedControl.addEventListener('input', (e) => {
                settings.speed = parseFloat(e.target.value);
                this._updateDisplay();
                this.callbacks.onSettingChange?.('speed', settings.speed);
            });
        }

        // Color cycle control
        if (this.colorCycleControl) {
            this.colorCycleControl.addEventListener('input', (e) => {
                settings.colorCycleRate = parseFloat(e.target.value);
                this._updateDisplay();
                this.callbacks.onSettingChange?.('colorCycleRate', settings.colorCycleRate);
            });
        }

        // FOV control
        if (this.fovControl) {
            this.fovControl.addEventListener('input', (e) => {
                settings.fov = parseInt(e.target.value);
                this._updateDisplay();
                this.callbacks.onSettingChange?.('fov', settings.fov);
            });
        }

        // Shadow speed control
        if (this.shadowSpeedControl) {
            this.shadowSpeedControl.addEventListener('input', (e) => {
                settings.shadowSpeed = parseFloat(e.target.value);
                this._updateDisplay();
                this.callbacks.onSettingChange?.('shadowSpeed', settings.shadowSpeed);
            });
        }

        // Spawn rate control
        if (this.spawnRateControl) {
            this.spawnRateControl.addEventListener('input', (e) => {
                settings.spawnRate = parseFloat(e.target.value);
                this._updateDisplay();
                this.callbacks.onSettingChange?.('spawnRate', settings.spawnRate);
            });
        }

        // FX Volume control
        if (this.fxVolumeControl) {
            this.fxVolumeControl.addEventListener('input', (e) => {
                settings.fxVolume = parseFloat(e.target.value);
                this._updateDisplay();
                this.callbacks.onSettingChange?.('fxVolume', settings.fxVolume);
            });
        }

        // Wall opacity control
        if (this.wallOpacityControl) {
            this.wallOpacityControl.addEventListener('input', (e) => {
                settings.wallOpacity = parseFloat(e.target.value);
                this._updateDisplay();
                this.callbacks.onSettingChange?.('wallOpacity', settings.wallOpacity);
            });
        }

        // Stationary camera toggle
        if (this.stationaryCameraControl) {
            this.stationaryCameraControl.addEventListener('change', (e) => {
                settings.stationaryCamera = e.target.checked;
                this.callbacks.onSettingChange?.('stationaryCamera', settings.stationaryCamera);
            });
        }

        // Wireframe toggle
        if (this.wireframeControl) {
            this.wireframeControl.addEventListener('change', (e) => {
                settings.wireframeEnabled = e.target.checked;
                this.callbacks.onSettingChange?.('wireframeEnabled', settings.wireframeEnabled);
            });
        }
    }

    /**
     * Initialize controls with current settings values
     * @private
     */
    _initializeControls() {
        if (this.speedControl) this.speedControl.value = settings.speed;
        if (this.colorCycleControl) this.colorCycleControl.value = settings.colorCycleRate;
        if (this.fovControl) this.fovControl.value = settings.fov;
        if (this.shadowSpeedControl) this.shadowSpeedControl.value = settings.shadowSpeed;
        if (this.spawnRateControl) this.spawnRateControl.value = settings.spawnRate;
        if (this.fxVolumeControl) this.fxVolumeControl.value = settings.fxVolume;
        if (this.wallOpacityControl) this.wallOpacityControl.value = settings.wallOpacity;
        if (this.stationaryCameraControl) this.stationaryCameraControl.checked = settings.stationaryCamera;
        if (this.wireframeControl) this.wireframeControl.checked = settings.wireframeEnabled;
    }

    /**
     * Update value displays
     * @private
     */
    _updateDisplay() {
        if (this.speedValue) this.speedValue.textContent = settings.speed.toFixed(1);
        if (this.colorCycleValue) this.colorCycleValue.textContent = settings.colorCycleRate.toFixed(1);
        if (this.fovValue) this.fovValue.textContent = settings.fov.toString();
        if (this.shadowSpeedValue) this.shadowSpeedValue.textContent = settings.shadowSpeed.toFixed(2);
        if (this.spawnRateValue) this.spawnRateValue.textContent = settings.spawnRate.toFixed(1);
        if (this.fxVolumeValue) this.fxVolumeValue.textContent = settings.fxVolume.toFixed(1);
        if (this.wallOpacityValue) this.wallOpacityValue.textContent = settings.wallOpacity.toFixed(1);
    }

    /**
     * Handle resume button click
     * @private
     */
    _onResume() {
        this.hide();
        this.callbacks.onResume?.();
    }

    /**
     * Handle restart button click
     * @private
     */
    _onRestart() {
        this.hide();
        this.callbacks.onRestart?.();
    }

    /**
     * Show the pause menu
     */
    show() {
        this.isPaused = true;
        if (this.pauseMenu) {
            this.pauseMenu.style.display = 'flex';
        }
    }

    /**
     * Hide the pause menu
     */
    hide() {
        this.isPaused = false;
        if (this.pauseMenu) {
            this.pauseMenu.style.display = 'none';
        }
    }

    /**
     * Toggle pause menu visibility
     * @returns {boolean} New paused state
     */
    toggle() {
        if (this.isPaused) {
            this.hide();
        } else {
            this.show();
        }
        return this.isPaused;
    }

    /**
     * Get current paused state
     * @returns {boolean}
     */
    getPaused() {
        return this.isPaused;
    }
}

export default PauseMenu;
