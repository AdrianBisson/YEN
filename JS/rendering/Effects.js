/**
 * @fileoverview Visual effects including starfield
 * @module rendering/Effects
 */

/**
 * Creates and manages visual effects for the game
 * @class
 */
export class Effects {
    /**
     * Create a new Effects instance
     * @param {THREE.Scene} scene - The scene to add effects to
     */
    constructor(scene) {
        /** @type {THREE.Scene} */
        this.scene = scene;

        /** @type {THREE.Points|null} */
        this.starfield = null;
    }

    /**
     * Create a starfield background
     * @param {number} [starCount=2000] - Number of stars to create
     * @param {number} [radius=300] - Radius of the starfield sphere
     * @returns {THREE.Points} The starfield points object
     */
    createStarfield(starCount = 2000, radius = 300) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        // Create stars in a spherical distribution
        for (let i = 0; i < starCount; i++) {
            // Random spherical coordinates
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            // Convert to Cartesian coordinates
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            vertices.push(x, y, z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Create different sized stars
        const sizes = [];
        for (let i = 0; i < starCount; i++) {
            sizes.push(Math.random() * 2 + 0.5);
        }
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        // Create star material
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);

        return this.starfield;
    }

    /**
     * Update starfield animation
     * @param {number} delta - Time delta in seconds
     */
    updateStarfield(delta) {
        if (this.starfield) {
            this.starfield.rotation.y += 0.0001 * delta * 60;
            this.starfield.rotation.x += 0.00005 * delta * 60;
        }
    }

    /**
     * Clean up effects
     */
    dispose() {
        if (this.starfield) {
            this.scene.remove(this.starfield);
            this.starfield.geometry.dispose();
            this.starfield.material.dispose();
            this.starfield = null;
        }
    }
}

export default Effects;
