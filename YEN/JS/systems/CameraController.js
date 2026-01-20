/**
 * @fileoverview Camera control system with follow and stationary modes
 * @module systems/CameraController
 */

import { settings } from '../config/settings.js';

/**
 * Controls camera position and orientation
 * @class
 */
export class CameraController {
    /**
     * Create a new CameraController
     * @param {THREE.Camera} camera - The camera to control
     */
    constructor(camera) {
        /** @type {THREE.Camera} */
        this.camera = camera;

        /**
         * Stationary camera state
         * @type {{orbitX: number, orbitY: number, distance: number, center: THREE.Vector3, keys: Object}}
         */
        this.stationaryState = {
            orbitX: 0,
            orbitY: 0,
            distance: 150,
            center: new THREE.Vector3(0, 0, 0),
            keys: {
                w: false,
                s: false,
                a: false,
                d: false,
                q: false,
                e: false
            }
        };

        /** @type {number} */
        this.moveSpeed = 0.02;

        /** @type {number} */
        this.zoomSpeed = 1.0;

        /** @type {number} */
        this.minDistance = 50;

        /** @type {number} */
        this.maxDistance = 250;
    }

    /**
     * Handle camera control key press
     * @param {string} key - Key that was pressed (lowercase)
     */
    onKeyDown(key) {
        if (key in this.stationaryState.keys) {
            this.stationaryState.keys[key] = true;
        }
    }

    /**
     * Handle camera control key release
     * @param {string} key - Key that was released (lowercase)
     */
    onKeyUp(key) {
        if (key in this.stationaryState.keys) {
            this.stationaryState.keys[key] = false;
        }
    }

    /**
     * Initialize stationary camera position
     */
    initializeStationaryCamera() {
        this.stationaryState.orbitX = -Math.PI / 2;
        this.stationaryState.orbitY = 0;
        this.stationaryState.distance = 150;
        this.stationaryState.center.set(0, 0, 0);
        this._updateStationaryCamera();
    }

    /**
     * Update camera position based on current mode
     * @param {THREE.Object3D} [target] - Target to follow (player snake head)
     */
    update(target) {
        if (settings.stationaryCamera) {
            this._processStationaryInput();
            this._updateStationaryCamera();
        } else if (target) {
            this._updateFollowCamera(target);
        }
    }

    /**
     * Process stationary camera input
     * @private
     */
    _processStationaryInput() {
        const keys = this.stationaryState.keys;

        // Update orbit angles based on key presses
        if (keys.a) this.stationaryState.orbitX -= this.moveSpeed;
        if (keys.d) this.stationaryState.orbitX += this.moveSpeed;
        if (keys.w) this.stationaryState.orbitY += this.moveSpeed;
        if (keys.s) this.stationaryState.orbitY -= this.moveSpeed;
        if (keys.q) this.stationaryState.distance -= this.zoomSpeed;
        if (keys.e) this.stationaryState.distance += this.zoomSpeed;

        // Limit vertical orbit to prevent camera flipping
        this.stationaryState.orbitY = Math.max(
            -Math.PI / 2 + 0.1,
            Math.min(Math.PI / 2 - 0.1, this.stationaryState.orbitY)
        );

        // Limit zoom distance
        this.stationaryState.distance = Math.max(
            this.minDistance,
            Math.min(this.maxDistance, this.stationaryState.distance)
        );
    }

    /**
     * Update stationary camera position using spherical coordinates
     * @private
     */
    _updateStationaryCamera() {
        const { orbitX, orbitY, distance, center } = this.stationaryState;

        const phi = orbitY;
        const theta = orbitX;

        this.camera.position.x = center.x + distance * Math.sin(theta) * Math.cos(phi);
        this.camera.position.y = center.y + distance * Math.sin(phi);
        this.camera.position.z = center.z + distance * Math.cos(theta) * Math.cos(phi);

        this.camera.lookAt(center);
    }

    /**
     * Update follow camera to track target
     * @private
     * @param {THREE.Object3D} target - Target to follow
     */
    _updateFollowCamera(target) {
        const direction = new THREE.Vector3();
        target.getWorldDirection(direction);

        // Calculate camera offset behind and above player
        const cameraOffset = direction.clone()
            .multiplyScalar(-20)
            .add(new THREE.Vector3(0, 10, 0));

        this.camera.position.copy(target.position).add(cameraOffset);
        this.camera.lookAt(target.position);
    }

    /**
     * Reset camera to default position
     */
    reset() {
        if (settings.stationaryCamera) {
            this.initializeStationaryCamera();
        } else {
            this.camera.position.set(0, 0, 50);
        }
    }
}

export default CameraController;
