/**
 * @fileoverview Spatial partitioning and collision detection system
 * @module systems/CollisionSystem
 */

import { Vector3Pool } from '../utils/ObjectPools.js';
import { performanceMonitor } from '../utils/PerformanceMonitor.js';
import { COLLISION_DISTANCE } from '../config/constants.js';

/**
 * Spatial grid for efficient collision detection
 * @class
 */
export class SpatialGrid {
    /**
     * Create a new SpatialGrid
     * @param {number} [cellSize=10] - Size of each grid cell
     */
    constructor(cellSize = 10) {
        /** @type {number} */
        this.cellSize = cellSize;

        /** @type {Map<string, Set<THREE.Object3D>>} */
        this.grid = new Map();

        /** @type {WeakMap<THREE.Object3D, string>} */
        this.objectMap = new WeakMap();
    }

    /**
     * Get grid cell key for a position
     * @param {THREE.Vector3} position - Position to get key for
     * @returns {string} Grid cell key
     */
    getGridKey(position) {
        const x = Math.floor(position.x / this.cellSize);
        const y = Math.floor(position.y / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${y},${z}`;
    }

    /**
     * Insert an object into the grid
     * @param {THREE.Object3D} object - Object to insert
     * @param {THREE.Vector3} position - Position of the object
     */
    insert(object, position) {
        const key = this.getGridKey(position);

        // Remove from previous cell if exists
        this.remove(object);

        // Add to new cell
        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }
        this.grid.get(key).add(object);
        this.objectMap.set(object, key);
    }

    /**
     * Remove an object from the grid
     * @param {THREE.Object3D} object - Object to remove
     */
    remove(object) {
        const key = this.objectMap.get(object);
        if (key && this.grid.has(key)) {
            this.grid.get(key).delete(object);
            if (this.grid.get(key).size === 0) {
                this.grid.delete(key);
            }
        }
        this.objectMap.delete(object);
    }

    /**
     * Get all objects near a position
     * @param {THREE.Vector3} position - Center position
     * @param {number} radius - Search radius
     * @returns {THREE.Object3D[]} Array of nearby objects
     */
    getNearby(position, radius) {
        const nearbyObjects = new Set();
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerKey = this.getGridKey(position);
        const [centerX, centerY, centerZ] = centerKey.split(',').map(Number);

        // Check cells within radius
        for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
            for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
                for (let z = centerZ - cellRadius; z <= centerZ + cellRadius; z++) {
                    const key = `${x},${y},${z}`;
                    if (this.grid.has(key)) {
                        this.grid.get(key).forEach(obj => nearbyObjects.add(obj));
                    }
                }
            }
        }

        return Array.from(nearbyObjects);
    }

    /**
     * Clear all objects from the grid
     */
    clear() {
        this.grid.clear();
        this.objectMap = new WeakMap();
    }
}

/**
 * Collision detection system using spatial partitioning
 * @class
 */
export class CollisionSystem {
    /**
     * Create a new CollisionSystem
     * @param {SpatialGrid} spatialGrid - Spatial grid to use
     * @param {Array<{mesh: THREE.Mesh, line: THREE.LineLoop}>} faces - Cube faces to exclude from collisions
     */
    constructor(spatialGrid, faces = []) {
        /** @type {SpatialGrid} */
        this.spatialGrid = spatialGrid;

        /** @type {Array} */
        this.faces = faces;

        /** @type {Set<string>} */
        this.collisionPairs = new Set();

        /** @type {THREE.Vector3} */
        this.tempVector = Vector3Pool.get();
    }

    /**
     * Set the cube faces for wall detection
     * @param {Array} faces - Array of face objects
     */
    setFaces(faces) {
        this.faces = faces;
    }

    /**
     * Update an object's position in the spatial grid
     * @param {THREE.Object3D} object - Object to update
     * @param {THREE.Vector3} position - New position
     */
    updateObject(object, position) {
        if (this._isWallObject(object)) return;
        this.spatialGrid.insert(object, position);
    }

    /**
     * Remove an object from the spatial grid
     * @param {THREE.Object3D} object - Object to remove
     */
    removeObject(object) {
        if (this._isWallObject(object)) return;
        this.spatialGrid.remove(object);
    }

    /**
     * Check if an object is a wall (face mesh or line)
     * @private
     * @param {THREE.Object3D} object - Object to check
     * @returns {boolean} True if wall object
     */
    _isWallObject(object) {
        if (!object || !object.parent) return false;

        // Wall faces have ShaderMaterial
        if (object.material?.type === 'ShaderMaterial') {
            return true;
        }

        // Wall lines have LineBasicMaterial
        if (object.material?.type === 'LineBasicMaterial') {
            return true;
        }

        // Check if it's one of the cube faces
        for (const face of this.faces) {
            if (object === face.mesh || object === face.line) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check for collisions between game objects
     * @param {Object} playerSnake - Player snake object
     * @param {Object[]} shadowSnakes - Array of shadow snakes
     * @param {THREE.Object3D[]} nibbles - Array of nibble objects
     * @returns {Array<{type: string, object?: THREE.Object3D, snake?: Object, distance: number}>}
     */
    checkCollisions(playerSnake, shadowSnakes, nibbles) {
        performanceMonitor.recordCollisionCheck();
        const collisions = [];

        if (!playerSnake?.head) return collisions;

        // Get nearby objects for player snake
        const nearbyObjects = this.spatialGrid.getNearby(
            playerSnake.head.position,
            COLLISION_DISTANCE * 2
        );

        // Check player snake collisions
        for (const obj of nearbyObjects) {
            if (obj === playerSnake.head) continue;
            if (this._isWallObject(obj)) continue;
            if (playerSnake.segments.includes(obj)) continue;
            if (obj === playerSnake) continue;

            const distance = playerSnake.head.position.distanceTo(obj.position);
            if (distance < COLLISION_DISTANCE) {
                collisions.push({
                    type: 'player_collision',
                    object: obj,
                    distance: distance
                });
            }
        }

        // Check shadow snake collisions
        for (const shadow of shadowSnakes) {
            if (!shadow?.head) continue;

            const nearbyShadowObjects = this.spatialGrid.getNearby(
                shadow.head.position,
                COLLISION_DISTANCE * 2
            );

            for (const obj of nearbyShadowObjects) {
                if (obj === shadow.head) continue;
                if (this._isWallObject(obj)) continue;

                const distance = shadow.head.position.distanceTo(obj.position);
                if (distance < COLLISION_DISTANCE) {
                    collisions.push({
                        type: 'shadow_collision',
                        snake: shadow,
                        object: obj,
                        distance: distance
                    });
                }
            }
        }

        return collisions;
    }

    /**
     * Clean up resources
     */
    dispose() {
        Vector3Pool.release(this.tempVector);
    }
}

export default CollisionSystem;
