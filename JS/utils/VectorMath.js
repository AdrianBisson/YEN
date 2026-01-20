/**
 * @fileoverview Memory-efficient math utilities for vector operations
 * @module utils/VectorMath
 */

import { Vector3Pool } from './ObjectPools.js';

/**
 * Static utility class for vector math operations
 * Uses pooled vectors to minimize garbage collection
 * @class
 */
export class VectorMath {
    /** @type {THREE.Vector3} */
    static temp1 = Vector3Pool.get();

    /** @type {THREE.Vector3} */
    static temp2 = Vector3Pool.get();

    /** @type {THREE.Vector3} */
    static temp3 = Vector3Pool.get();

    /**
     * Calculate direction vector from one point to another
     * @param {THREE.Vector3} from - Starting point
     * @param {THREE.Vector3} to - End point
     * @param {THREE.Vector3} out - Output vector to store result
     * @returns {THREE.Vector3} Normalized direction vector
     */
    static getDirection(from, to, out) {
        return out.subVectors(to, from).normalize();
    }

    /**
     * Add a scaled direction to a vector
     * @param {THREE.Vector3} vector - Base vector
     * @param {THREE.Vector3} direction - Direction to add
     * @param {number} scalar - Scale factor
     * @param {THREE.Vector3} out - Output vector to store result
     * @returns {THREE.Vector3} Result vector
     */
    static addScaled(vector, direction, scalar, out) {
        out.copy(direction).multiplyScalar(scalar).add(vector);
        return out;
    }

    /**
     * Move a position forward in a direction by a distance
     * @param {THREE.Vector3} position - Starting position
     * @param {THREE.Vector3} direction - Direction to move
     * @param {number} distance - Distance to move
     * @param {THREE.Vector3} out - Output vector to store result
     * @returns {THREE.Vector3} New position
     */
    static moveForward(position, direction, distance, out) {
        out.copy(position).add(direction.clone().multiplyScalar(distance));
        return out;
    }

    /**
     * Calculate squared distance between two positions (faster than regular distance)
     * @param {THREE.Vector3} pos1 - First position
     * @param {THREE.Vector3} pos2 - Second position
     * @returns {number} Squared distance
     */
    static distanceSquared(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Check if a position is near any wall of the cube
     * @param {THREE.Vector3} position - Position to check
     * @param {number} halfSize - Half size of the cube
     * @param {number} buffer - Buffer distance from wall
     * @returns {boolean} True if near a wall
     */
    static isNearWall(position, halfSize, buffer) {
        return Math.abs(position.x) > halfSize - buffer ||
               Math.abs(position.y) > halfSize - buffer ||
               Math.abs(position.z) > halfSize - buffer;
    }

    /**
     * Dispose of pooled temporary vectors
     */
    static dispose() {
        Vector3Pool.release(this.temp1);
        Vector3Pool.release(this.temp2);
        Vector3Pool.release(this.temp3);
    }
}

export default VectorMath;
