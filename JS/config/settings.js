/**
 * @fileoverview Reactive game settings manager for YEN: The Eternal Longing
 * @module config/settings
 */

/**
 * @typedef {Object} SettingsValues
 * @property {number} speed - Base movement speed for the player snake
 * @property {number} colorCycleRate - How fast the snake's rainbow colors change
 * @property {number} trailLength - Number of trail points for smooth movement
 * @property {number} fov - Field of view for the camera
 * @property {number} shadowSpeed - Movement speed for shadow snakes
 * @property {number} spawnRate - How frequently new nibbles spawn
 * @property {number} fxVolume - Master volume for all sound effects
 * @property {number} wallOpacity - Transparency of the cube walls
 * @property {number} trailOpacity - Transparency of the particle trail
 * @property {boolean} wireframeEnabled - Toggle wireframe wall display
 * @property {boolean} stationaryCamera - Toggle stationary camera mode
 */

/**
 * Reactive settings manager with change callbacks
 * @class
 */
class Settings {
    /**
     * Create a new Settings instance with default values
     */
    constructor() {
        /** @private */
        this._values = {
            speed: 0.3,
            colorCycleRate: 0.5,
            trailLength: 50,
            fov: 75,
            shadowSpeed: 0.4,
            spawnRate: 3,
            fxVolume: 0.5,
            wallOpacity: 1.0,
            trailOpacity: 0.45,
            wireframeEnabled: false,
            stationaryCamera: false
        };

        /**
         * Listeners for settings changes
         * @type {Map<string, Function[]>}
         * @private
         */
        this._listeners = new Map();
    }

    /**
     * Get a setting value
     * @param {string} key - The setting key
     * @returns {*} The setting value
     */
    get(key) {
        return this._values[key];
    }

    /**
     * Set a setting value and notify listeners
     * @param {string} key - The setting key
     * @param {*} value - The new value
     */
    set(key, value) {
        const oldValue = this._values[key];
        if (oldValue !== value) {
            this._values[key] = value;
            this._notify(key, value, oldValue);
        }
    }

    /**
     * Subscribe to changes on a specific setting
     * @param {string} key - The setting key to watch
     * @param {Function} callback - Callback function (newValue, oldValue) => void
     * @returns {Function} Unsubscribe function
     */
    onChange(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, []);
        }
        this._listeners.get(key).push(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this._listeners.get(key);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify listeners of a setting change
     * @private
     * @param {string} key - The setting key that changed
     * @param {*} newValue - The new value
     * @param {*} oldValue - The previous value
     */
    _notify(key, newValue, oldValue) {
        const listeners = this._listeners.get(key) || [];
        listeners.forEach(callback => callback(newValue, oldValue));
    }

    // Getter/setter shortcuts for common settings

    /** @type {number} */
    get speed() { return this._values.speed; }
    set speed(value) { this.set('speed', value); }

    /** @type {number} */
    get colorCycleRate() { return this._values.colorCycleRate; }
    set colorCycleRate(value) { this.set('colorCycleRate', value); }

    /** @type {number} */
    get trailLength() { return this._values.trailLength; }
    set trailLength(value) { this.set('trailLength', value); }

    /** @type {number} */
    get fov() { return this._values.fov; }
    set fov(value) { this.set('fov', value); }

    /** @type {number} */
    get shadowSpeed() { return this._values.shadowSpeed; }
    set shadowSpeed(value) { this.set('shadowSpeed', value); }

    /** @type {number} */
    get spawnRate() { return this._values.spawnRate; }
    set spawnRate(value) { this.set('spawnRate', value); }

    /** @type {number} */
    get fxVolume() { return this._values.fxVolume; }
    set fxVolume(value) { this.set('fxVolume', value); }

    /** @type {number} */
    get wallOpacity() { return this._values.wallOpacity; }
    set wallOpacity(value) { this.set('wallOpacity', value); }

    /** @type {number} */
    get trailOpacity() { return this._values.trailOpacity; }
    set trailOpacity(value) { this.set('trailOpacity', value); }

    /** @type {boolean} */
    get wireframeEnabled() { return this._values.wireframeEnabled; }
    set wireframeEnabled(value) { this.set('wireframeEnabled', value); }

    /** @type {boolean} */
    get stationaryCamera() { return this._values.stationaryCamera; }
    set stationaryCamera(value) { this.set('stationaryCamera', value); }
}

/**
 * Singleton settings instance
 * @type {Settings}
 */
export const settings = new Settings();

export default settings;
