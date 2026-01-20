/**
 * @fileoverview Nibble (collectible) management
 * @module core/Nibble
 */

import { CUBE_SIZE, CUBE_HALF_SIZE, SAFE_WALL_DISTANCE, SAFE_OBJECT_DISTANCE } from '../config/constants.js';
import { Vector3Pool } from '../utils/ObjectPools.js';
import { VectorMath } from '../utils/VectorMath.js';

/**
 * Manages nibble (collectible) creation and spawning
 * @class
 */
export class NibbleManager {
    /**
     * Create a new NibbleManager
     * @param {THREE.Scene} scene - The scene to add nibbles to
     * @param {Object} collisionSystem - The collision system
     * @param {Object} spatialGrid - The spatial grid for nearby object queries
     */
    constructor(scene, collisionSystem, spatialGrid) {
        /** @type {THREE.Scene} */
        this.scene = scene;

        /** @type {Object} */
        this.collisionSystem = collisionSystem;

        /** @type {Object} */
        this.spatialGrid = spatialGrid;

        /** @type {THREE.Mesh[]} */
        this.nibbles = [];

        /** @type {THREE.SphereGeometry} */
        this.nibbleGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    }

    /**
     * Create a glowing nibble mesh
     * @returns {THREE.Mesh} The nibble mesh with glow effect
     */
    create() {
        // Core nibble
        const nibble = new THREE.Mesh(
            this.nibbleGeometry,
            new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.9
            })
        );

        // Glow effect
        const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        nibble.add(glow);

        return nibble;
    }

    /**
     * Spawn a new nibble at a safe random position
     * @returns {THREE.Mesh|null} The spawned nibble or null if spawn failed
     */
    spawn() {
        const nibble = this.create();
        let position;
        let tries = 0;
        let isSafe = false;
        const maxTries = 100;

        do {
            const x = (Math.random() - 0.5) * CUBE_SIZE;
            const y = (Math.random() - 0.5) * CUBE_SIZE;
            const z = (Math.random() - 0.5) * CUBE_SIZE;
            position = Vector3Pool.get().set(x, y, z);

            // Check wall distance
            const isNearWall = Math.abs(x) > CUBE_HALF_SIZE - SAFE_WALL_DISTANCE ||
                               Math.abs(y) > CUBE_HALF_SIZE - SAFE_WALL_DISTANCE ||
                               Math.abs(z) > CUBE_HALF_SIZE - SAFE_WALL_DISTANCE;

            if (isNearWall) {
                tries++;
                Vector3Pool.release(position);
                continue;
            }

            isSafe = true;

            // Check nearby objects
            const nearbyObjects = this.spatialGrid.getNearby(position, SAFE_OBJECT_DISTANCE * 2);

            for (const obj of nearbyObjects) {
                if (VectorMath.distanceSquared(position, obj.position) < SAFE_OBJECT_DISTANCE * SAFE_OBJECT_DISTANCE) {
                    isSafe = false;
                    break;
                }
            }

            tries++;
            if (tries > maxTries) break;

            if (!isSafe) {
                Vector3Pool.release(position);
            }
        } while (!isSafe);

        nibble.position.copy(position);
        this.scene.add(nibble);
        this.nibbles.push(nibble);
        this.collisionSystem.updateObject(nibble, nibble.position);

        Vector3Pool.release(position);

        return nibble;
    }

    /**
     * Remove a nibble from the game
     * @param {THREE.Mesh} nibble - The nibble to remove
     */
    remove(nibble) {
        const index = this.nibbles.indexOf(nibble);
        if (index !== -1) {
            this.scene.remove(nibble);
            this.collisionSystem.removeObject(nibble);
            this.nibbles.splice(index, 1);
        }
    }

    /**
     * Remove a nibble by index
     * @param {number} index - The index of the nibble to remove
     * @returns {THREE.Mesh|null} The removed nibble or null
     */
    removeByIndex(index) {
        if (index >= 0 && index < this.nibbles.length) {
            const nibble = this.nibbles[index];
            this.scene.remove(nibble);
            this.collisionSystem.removeObject(nibble);
            this.nibbles.splice(index, 1);
            return nibble;
        }
        return null;
    }

    /**
     * Animate all nibbles
     * @param {number} time - Current time in seconds
     * @param {number} delta - Time delta
     */
    animate(time, delta) {
        this.nibbles.forEach((nibble, index) => {
            if (!nibble) return;

            // Pulse size
            const pulseFactor = 1 + 0.1 * Math.sin(time * 2 + index);
            nibble.scale.set(pulseFactor, pulseFactor, pulseFactor);

            // Rotate glow
            if (nibble.children?.length > 0) {
                nibble.children[0].rotation.y += 0.01 * delta * 60;
                nibble.children[0].rotation.x += 0.01 * delta * 60;
            }
        });
    }

    /**
     * Find index of nibble near a position
     * @param {THREE.Vector3} position - Position to check
     * @param {number} [threshold=2.25] - Distance threshold squared
     * @returns {number} Index of nearby nibble or -1
     */
    findNearby(position, threshold = 2.25) {
        return this.nibbles.findIndex(nibble =>
            nibble && VectorMath.distanceSquared(position, nibble.position) < threshold
        );
    }

    /**
     * Get all nibbles
     * @returns {THREE.Mesh[]}
     */
    getAll() {
        return this.nibbles;
    }

    /**
     * Get nibble count
     * @returns {number}
     */
    get count() {
        return this.nibbles.length;
    }

    /**
     * Clear all nibbles
     */
    clear() {
        this.nibbles.forEach(nibble => {
            this.scene.remove(nibble);
            this.collisionSystem.removeObject(nibble);
        });
        this.nibbles = [];
    }

    /**
     * Create a nibble at a specific position (for dropping from snakes)
     * @param {THREE.Vector3} position - Position to create nibble at
     * @param {boolean} [randomize=false] - Whether to add random offset
     * @returns {THREE.Mesh} The created nibble
     */
    createAt(position, randomize = false) {
        const nibble = this.create();
        nibble.position.copy(position);

        if (randomize) {
            nibble.position.x += (Math.random() - 0.5) * 2;
            nibble.position.y += (Math.random() - 0.5) * 2;
            nibble.position.z += (Math.random() - 0.5) * 2;
        }

        this.scene.add(nibble);
        this.nibbles.push(nibble);
        this.collisionSystem.updateObject(nibble, nibble.position);

        return nibble;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.clear();
        this.nibbleGeometry.dispose();
    }
}

export default NibbleManager;
