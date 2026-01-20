/**
 * @fileoverview Snake entity class for player and AI snakes
 * @module core/Snake
 */

import { CUBE_HALF_SIZE, SEGMENT_RADIUS, SEGMENT_SPACING, WALL_BUFFER } from '../config/constants.js';
import { settings } from '../config/settings.js';
import { Vector3Pool, ColorPool } from '../utils/ObjectPools.js';
import { VectorMath } from '../utils/VectorMath.js';

/**
 * Snake entity that can be controlled by player or AI
 * @class
 */
export class Snake {
    /**
     * Create a new Snake instance
     * @param {THREE.Scene} scene - The scene to add the snake to
     * @param {Object} collisionSystem - The collision system for updating positions
     * @param {boolean} [isPlayer=false] - Whether this is the player snake
     */
    constructor(scene, collisionSystem, isPlayer = false) {
        /** @type {THREE.Scene} */
        this.scene = scene;

        /** @type {Object} */
        this.collisionSystem = collisionSystem;

        /** @type {boolean} */
        this.isPlayer = isPlayer;

        /** @type {THREE.Vector3} */
        this.direction = new THREE.Vector3(0, 0, -1);

        /** @type {number} */
        this.speed = isPlayer ? settings.speed : settings.shadowSpeed;

        /** @type {THREE.Mesh[]} */
        this.segments = [];

        /** @type {THREE.Vector3[]} */
        this.trail = [];

        /** @type {THREE.CatmullRomCurve3} */
        this.path = new THREE.CatmullRomCurve3();

        /** @type {THREE.Group} */
        this.head = new THREE.Group();

        /** @type {THREE.Mesh|null} */
        this.headMesh = null;

        /** @type {THREE.Mesh[]} */
        this.visualSegments = [];

        /** @type {THREE.Material|null} */
        this.headMaterial = null;

        /** @type {THREE.Material|null} */
        this.bodyMaterial = null;

        /** @type {THREE.Material|null} */
        this.collisionMaterial = null;

        /** @type {THREE.SphereGeometry|null} */
        this.visualSegmentGeometry = null;

        /** @type {THREE.Points} */
        this.particleTrail = null;

        /** @type {number} */
        this.colorOffset = Math.random() * Math.PI * 2;

        /** @type {number} */
        this.length = 5;

        /** @type {number} */
        this.creationTime = 0;

        /** @type {boolean} */
        this.isInitialReflectionPhase = false;

        /** @type {THREE.Vector3} */
        this.targetDirection = Vector3Pool.get();

        /** @type {number} */
        this.lastDirectionChange = 0;

        /** @type {number} */
        this.directionChangeInterval = 1000;

        /** @type {number} */
        this.segmentColorIndex = 0;

        /** @type {number} */
        this.nibblesEaten = 0;

        /** @type {Array|null} Reference to global nibbles array for AI */
        this._nibblesRef = null;

        this._init();
    }

    /**
     * Set reference to nibbles array for AI behavior
     * @param {Array} nibbles - Array of nibble objects
     */
    setNibblesRef(nibbles) {
        this._nibblesRef = nibbles;
    }

    /**
     * Initialize the snake
     * @private
     */
    _init() {
        this.headMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.4,
            transmission: 0.6,
            thickness: 0.6,
            emissive: 0xffffff,
            emissiveIntensity: 0.35
        });
        this.bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.2,
            transmission: 0.4,
            thickness: 0.4,
            emissive: 0xffffff,
            emissiveIntensity: 0.2
        });
        this.collisionMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0
        });
        this.visualSegmentGeometry = new THREE.SphereGeometry(SEGMENT_RADIUS, 16, 16);

        // Create head
        const headGeometry = new THREE.SphereGeometry(SEGMENT_RADIUS * 1.1, 32, 32);
        this.headMesh = new THREE.Mesh(headGeometry, this.headMaterial);
        this.headMesh.scale.set(1, 1, 1.5);
        this.head.add(this.headMesh);

        // Add eyes
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.4, 0.3, -0.8);
        const rightEye = leftEye.clone();
        rightEye.position.x = -0.4;
        this.head.add(leftEye, rightEye);

        this.scene.add(this.head);
        this.collisionSystem.updateObject(this.head, this.head.position);

        // Create particle trail
        this.particleTrail = this._createParticleTrail();

        // Initial segments
        for (let i = 0; i < this.length; i++) {
            this.addSegment(true);
        }

        // Initialize trail
        for (let i = 0; i < settings.trailLength; i++) {
            const trailPos = this.head.position.clone().add(
                this.direction.clone().multiplyScalar(-i * SEGMENT_SPACING)
            );
            this.trail.push(trailPos);
        }

        // Position initial visual body segments
        this.path = new THREE.CatmullRomCurve3(this.trail);
        this._updateVisualSegments();
    }

    /**
     * Create particle trail effect
     * @private
     * @returns {THREE.Points}
     */
    _createParticleTrail() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(settings.trailLength * 3);
        const colors = new Float32Array(settings.trailLength * 3);
        const sizes = new Float32Array(settings.trailLength);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        return particles;
    }

    /**
     * Update visual segment positions and tail taper based on the trail.
     * @private
     */
    _updateVisualSegments() {
        if (this.visualSegments.length === 0 || this.trail.length === 0) {
            return;
        }

        const pathLength = this.path.getLength();
        const direction = Vector3Pool.get();
        this.head.getWorldDirection(direction);
        const tailSegments = Math.min(6, this.visualSegments.length);
        const tailStartIndex = Math.max(0, this.visualSegments.length - tailSegments);

        for (let i = 0; i < this.visualSegments.length; i++) {
            const mesh = this.visualSegments[i];
            if (pathLength > 0) {
                const t = (i + 1) * SEGMENT_SPACING / pathLength;
                const position = this.path.getPointAt(Math.min(t, 1));
                mesh.position.copy(position);
            } else {
                const segmentPos = Vector3Pool.get();
                VectorMath.moveForward(this.head.position, direction, -(i + 1) * SEGMENT_SPACING, segmentPos);
                mesh.position.copy(segmentPos);
                Vector3Pool.release(segmentPos);
            }

            const tailT = i >= tailStartIndex ?
                (i - tailStartIndex) / Math.max(1, this.visualSegments.length - tailStartIndex - 1) :
                0;
            const radiusScale = i >= tailStartIndex ? THREE.MathUtils.lerp(1, 0.1, tailT) : 1;
            mesh.scale.set(radiusScale, radiusScale, radiusScale);
        }

        Vector3Pool.release(direction);
    }

    /**
     * Add a segment to the snake
     * @param {boolean} [initial=false] - Whether this is an initial segment
     */
    addSegment(initial = false) {
        const lastPosition = this.segments.length > 0 ?
            this.segments[this.segments.length - 1].position :
            this.head.position;
        const newPosition = lastPosition.clone().sub(
            this.direction.clone().multiplyScalar(SEGMENT_SPACING)
        );

        const segment = new THREE.Mesh(
            new THREE.CylinderGeometry(SEGMENT_RADIUS, SEGMENT_RADIUS, SEGMENT_SPACING, 16),
            this.collisionMaterial
        );
        segment.visible = false;
        segment.position.copy(newPosition);
        this.scene.add(segment);
        this.segments.push(segment);
        this.collisionSystem.updateObject(segment, segment.position);

        if (!initial) this.length++;

        const visualSegment = new THREE.Mesh(this.visualSegmentGeometry, this.bodyMaterial);
        this.scene.add(visualSegment);
        this.visualSegments.push(visualSegment);
    }

    /**
     * Update snake position and animation
     * @param {number} delta - Time delta in seconds
     */
    update(delta) {
        // Update direction from head rotation
        this.head.getWorldDirection(this.direction);

        // Move head
        const moveDistance = this.speed * delta * 60;
        this.head.position.add(this.direction.clone().multiplyScalar(moveDistance));

        // AI behavior for shadow snakes
        if (!this.isPlayer) {
            if (!this.isInitialReflectionPhase) {
                this._seekNibbles();
            }
            this._avoidWalls();
        }

        // Slithering animation
        const time = performance.now() * 0.001;
        const wiggle = Math.sin(time * 5 + this.colorOffset) * 0.5;
        this.head.position.y += wiggle * 0.1;

        // Update trail
        this.trail.unshift(this.head.position.clone());
        if (this.trail.length > settings.trailLength) this.trail.pop();

        // Update path for body visuals/collision
        this.path = new THREE.CatmullRomCurve3(this.trail);

        this._updateVisualSegments();

        // Update segment positions
        for (let i = 0; i < this.segments.length; i++) {
            const pathLength = this.path.getLength();
            if (pathLength > 0) {
                const t = (i + 1) * SEGMENT_SPACING / pathLength;
                const position = this.path.getPointAt(Math.min(t, 1));
                this.segments[i].position.copy(position);
            } else {
                const direction = Vector3Pool.get();
                this.head.getWorldDirection(direction);
                const segmentPos = Vector3Pool.get();
                VectorMath.moveForward(this.head.position, direction, -(i + 1) * SEGMENT_SPACING, segmentPos);
                this.segments[i].position.copy(segmentPos);
                Vector3Pool.release(direction);
                Vector3Pool.release(segmentPos);
            }

            // Segment slither
            const segWiggle = Math.sin(time * 5 + i * 0.5 + this.colorOffset) * 0.3;
            this.segments[i].position.x += segWiggle * 0.05;

            // Update collision for player segments only
            if (this.isPlayer) {
                this.collisionSystem.updateObject(this.segments[i], this.segments[i].position);
            }
        }

        // Update particle trail
        this._updateParticleTrail(time);

        // Update head color
        const headColor = new THREE.Color().setHSL(
            (time * settings.colorCycleRate + this.colorOffset) % 1, 1, 0.5
        );
        if (this.headMesh) {
            this.headMesh.material.color = headColor;
            this.headMesh.material.emissive = headColor;
        }

        if (this.bodyMaterial) {
            this.bodyMaterial.color = headColor;
            this.bodyMaterial.emissive = headColor;
        }

        // Update collision for player head
        if (this.isPlayer) {
            this.collisionSystem.updateObject(this.head, this.head.position);
        }
    }

    /**
     * Update particle trail visuals
     * @private
     * @param {number} time - Current time in seconds
     */
    _updateParticleTrail(time) {
        const positions = this.particleTrail.geometry.attributes.position.array;
        const colors = this.particleTrail.geometry.attributes.color.array;
        const sizes = this.particleTrail.geometry.attributes.size.array;

        for (let i = 0; i < this.trail.length; i++) {
            const idx = i * 3;
            positions[idx] = this.trail[i].x;
            positions[idx + 1] = this.trail[i].y;
            positions[idx + 2] = this.trail[i].z;

            const color = new THREE.Color().setHSL(
                (time * settings.colorCycleRate + i * 0.01 + this.colorOffset) % 1, 1, 0.5
            );
            colors[idx] = color.r;
            colors[idx + 1] = color.g;
            colors[idx + 2] = color.b;

            sizes[i] = (1 - i / this.trail.length) * 0.5;
        }

        this.particleTrail.geometry.attributes.position.needsUpdate = true;
        this.particleTrail.geometry.attributes.color.needsUpdate = true;
        this.particleTrail.geometry.attributes.size.needsUpdate = true;
    }

    /**
     * AI behavior to seek nearest nibble
     * @private
     */
    _seekNibbles() {
        if (!this._nibblesRef || this._nibblesRef.length === 0) return;

        let closestNibble = null;
        let closestDistance = Infinity;

        for (const nibble of this._nibblesRef) {
            if (nibble?.position) {
                const distance = this.head.position.distanceTo(nibble.position);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestNibble = nibble;
                }
            }
        }

        if (closestNibble && closestDistance > 2) {
            const directionToNibble = Vector3Pool.get();
            VectorMath.getDirection(this.head.position, closestNibble.position, directionToNibble);

            const targetRotation = Math.atan2(directionToNibble.x, directionToNibble.z);
            const currentRotation = this.head.rotation.y;
            const rotationSpeed = 0.08;
            const randomOffset = (Math.random() - 0.5) * 0.05;
            this.head.rotation.y += (targetRotation - currentRotation + randomOffset) * rotationSpeed;

            // Vertical adjustment
            const verticalDirection = Vector3Pool.get();
            VectorMath.getDirection(this.head.position, closestNibble.position, verticalDirection);
            const targetYRotation = Math.atan2(
                -verticalDirection.y,
                Math.sqrt(verticalDirection.x ** 2 + verticalDirection.z ** 2)
            );
            this.head.rotation.x += (targetYRotation - this.head.rotation.x) * rotationSpeed * 0.5;

            Vector3Pool.release(directionToNibble);
            Vector3Pool.release(verticalDirection);
        } else if (closestNibble && closestDistance <= 2) {
            this.speed = settings.shadowSpeed * 0.5;
        } else {
            this.speed = settings.shadowSpeed;
            const time = performance.now() * 0.001;
            const gentleWander = Math.sin(time * 0.5 + this.colorOffset) * 0.02;
            this.head.rotation.y += gentleWander;
        }
    }

    /**
     * Keep shadow snakes within the cube by steering away from walls.
     * @private
     */
    _avoidWalls() {
        const safeBoundary = CUBE_HALF_SIZE - WALL_BUFFER;
        const pos = this.head.position;
        const steer = Vector3Pool.get().set(0, 0, 0);
        let needsTurn = false;

        if (pos.x > safeBoundary) {
            steer.x -= 1;
            needsTurn = true;
        } else if (pos.x < -safeBoundary) {
            steer.x += 1;
            needsTurn = true;
        }

        if (pos.y > safeBoundary) {
            steer.y -= 1;
            needsTurn = true;
        } else if (pos.y < -safeBoundary) {
            steer.y += 1;
            needsTurn = true;
        }

        if (pos.z > safeBoundary) {
            steer.z -= 1;
            needsTurn = true;
        } else if (pos.z < -safeBoundary) {
            steer.z += 1;
            needsTurn = true;
        }

        if (!needsTurn) {
            Vector3Pool.release(steer);
            return;
        }

        pos.x = Math.min(Math.max(pos.x, -CUBE_HALF_SIZE + SEGMENT_RADIUS), CUBE_HALF_SIZE - SEGMENT_RADIUS);
        pos.y = Math.min(Math.max(pos.y, -CUBE_HALF_SIZE + SEGMENT_RADIUS), CUBE_HALF_SIZE - SEGMENT_RADIUS);
        pos.z = Math.min(Math.max(pos.z, -CUBE_HALF_SIZE + SEGMENT_RADIUS), CUBE_HALF_SIZE - SEGMENT_RADIUS);

        steer.normalize();

        const targetRotation = Math.atan2(steer.x, steer.z);
        const rotationSpeed = 0.12;
        this.head.rotation.y += (targetRotation - this.head.rotation.y) * rotationSpeed;

        const targetYRotation = Math.atan2(
            -steer.y,
            Math.sqrt(steer.x ** 2 + steer.z ** 2)
        );
        this.head.rotation.x += (targetYRotation - this.head.rotation.x) * rotationSpeed * 0.5;

        Vector3Pool.release(steer);
    }

    /**
     * Rotate snake head
     * @param {number} rotationY - Y-axis rotation delta
     * @param {number} rotationX - X-axis rotation delta
     */
    rotate(rotationY, rotationX) {
        this.head.rotation.y += rotationY;
        this.head.rotation.x += rotationX;
        this.head.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.head.rotation.x));
    }

    /**
     * Sync direction with head rotation and update trail
     */
    syncDirection() {
        this.head.getWorldDirection(this.direction);

        this.trail = [];
        for (let i = 0; i < settings.trailLength; i++) {
            const trailPos = this.head.position.clone().add(
                this.direction.clone().multiplyScalar(-i * SEGMENT_SPACING)
            );
            this.trail.push(trailPos);
        }

        this.path = new THREE.CatmullRomCurve3(this.trail);
        this._updateVisualSegments();
    }

    /**
     * Clean up snake resources
     */
    dispose() {
        this.scene.remove(this.head);
        this.scene.remove(this.particleTrail);
        this.visualSegments.forEach(segment => {
            this.scene.remove(segment);
        });
        this.visualSegments = [];

        this.segments.forEach(segment => {
            this.scene.remove(segment);
            this.collisionSystem.removeObject(segment);
        });

        this.collisionSystem.removeObject(this.head);
        Vector3Pool.release(this.targetDirection);

        this.trail.forEach(point => {
            if (point instanceof THREE.Vector3) {
                Vector3Pool.release(point);
            }
        });
        this.trail = [];
    }
}

export default Snake;
