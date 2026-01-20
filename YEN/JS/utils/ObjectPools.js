/**
 * @fileoverview Object pooling utilities for memory management
 * @module utils/ObjectPools
 */

/**
 * Object pool for THREE.Vector3 instances to reduce garbage collection
 * @class
 */
export class Vector3Pool {
    /** @type {THREE.Vector3[]} */
    static pool = [];

    /** @type {number} */
    static maxPoolSize = 100;

    /**
     * Get a Vector3 from the pool or create a new one
     * @returns {THREE.Vector3}
     */
    static get() {
        return this.pool.pop() || new THREE.Vector3();
    }

    /**
     * Release a Vector3 back to the pool
     * @param {THREE.Vector3} vector - The vector to release
     */
    static release(vector) {
        if (this.pool.length < this.maxPoolSize) {
            vector.set(0, 0, 0);
            this.pool.push(vector);
        }
    }

    /**
     * Get multiple Vector3 instances from the pool
     * @param {number} count - Number of vectors to get
     * @returns {THREE.Vector3[]}
     */
    static getMultiple(count) {
        const vectors = [];
        for (let i = 0; i < count; i++) {
            vectors.push(this.get());
        }
        return vectors;
    }

    /**
     * Release multiple Vector3 instances back to the pool
     * @param {THREE.Vector3[]} vectors - Array of vectors to release
     */
    static releaseMultiple(vectors) {
        vectors.forEach(vector => this.release(vector));
    }

    /**
     * Clear the pool (for cleanup)
     */
    static clear() {
        this.pool.length = 0;
    }
}

/**
 * Object pool for THREE.Color instances to reduce garbage collection
 * @class
 */
export class ColorPool {
    /** @type {THREE.Color[]} */
    static pool = [];

    /** @type {number} */
    static maxPoolSize = 50;

    /**
     * Get a Color from the pool or create a new one
     * @returns {THREE.Color}
     */
    static get() {
        return this.pool.pop() || new THREE.Color();
    }

    /**
     * Release a Color back to the pool
     * @param {THREE.Color} color - The color to release
     */
    static release(color) {
        if (this.pool.length < this.maxPoolSize) {
            color.setHex(0x000000);
            this.pool.push(color);
        }
    }

    /**
     * Clear the pool (for cleanup)
     */
    static clear() {
        this.pool.length = 0;
    }
}
