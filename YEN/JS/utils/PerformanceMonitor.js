/**
 * @fileoverview Performance monitoring utilities
 * @module utils/PerformanceMonitor
 */

import { Vector3Pool, ColorPool } from './ObjectPools.js';

/**
 * Monitors game performance metrics including FPS, memory usage, and collision checks
 * @class
 */
export class PerformanceMonitor {
    /**
     * Create a new PerformanceMonitor instance
     */
    constructor() {
        /** @type {number} */
        this.frameCount = 0;

        /** @type {number} */
        this.lastTime = performance.now();

        /** @type {number} */
        this.fps = 0;

        /** @type {number} */
        this.memoryUsage = 0;

        /** @type {number} */
        this.collisionChecks = 0;

        /** @type {number} */
        this.objectsCreated = 0;

        /** @type {number} */
        this.objectsPooled = 0;
    }

    /**
     * Update performance metrics (call once per frame)
     */
    update() {
        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;

            // Log memory usage from object pools
            this.memoryUsage = Vector3Pool.pool.length + ColorPool.pool.length;

            // Reset counters
            this.collisionChecks = 0;
            this.objectsCreated = 0;
            this.objectsPooled = 0;
        }
    }

    /**
     * Record a collision check operation
     */
    recordCollisionCheck() {
        this.collisionChecks++;
    }

    /**
     * Record an object creation
     */
    recordObjectCreated() {
        this.objectsCreated++;
    }

    /**
     * Record an object being returned to pool
     */
    recordObjectPooled() {
        this.objectsPooled++;
    }

    /**
     * Get current performance statistics
     * @returns {{fps: number, memoryUsage: number, collisionChecks: number, objectsCreated: number, objectsPooled: number}}
     */
    getStats() {
        return {
            fps: this.fps,
            memoryUsage: this.memoryUsage,
            collisionChecks: this.collisionChecks,
            objectsCreated: this.objectsCreated,
            objectsPooled: this.objectsPooled
        };
    }
}

/**
 * Singleton performance monitor instance
 * @type {PerformanceMonitor}
 */
export const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
