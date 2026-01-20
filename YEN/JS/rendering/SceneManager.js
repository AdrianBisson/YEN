/**
 * @fileoverview Three.js scene, camera, and renderer management
 * @module rendering/SceneManager
 */

/**
 * Manages the Three.js scene, camera, renderer, and post-processing
 * @class
 */
export class SceneManager {
    /**
     * Create a new SceneManager instance
     */
    constructor() {
        /** @type {THREE.Scene} */
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        /** @type {THREE.PerspectiveCamera} */
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 50);

        /** @type {THREE.WebGLRenderer} */
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1';

        /** @type {THREE.EffectComposer} */
        this.composer = new THREE.EffectComposer(this.renderer);

        /** @type {THREE.RenderPass} */
        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        /** @type {THREE.UnrealBloomPass} */
        this.bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        this.composer.addPass(this.bloomPass);

        // Add lighting
        this._setupLighting();

        // Bind resize handler
        this._handleResize = this._handleResize.bind(this);
        window.addEventListener('resize', this._handleResize);
    }

    /**
     * Set up scene lighting
     * @private
     */
    _setupLighting() {
        /** @type {THREE.AmbientLight} */
        this.ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(this.ambientLight);

        /** @type {THREE.DirectionalLight} */
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(1, 1, 1);
        this.scene.add(this.directionalLight);
    }

    /**
     * Attach renderer to DOM
     * @param {string} containerId - ID of the container element (optional)
     */
    attachToDOM(containerId = 'game-canvas-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.appendChild(this.renderer.domElement);
        } else {
            document.body.appendChild(this.renderer.domElement);
        }
    }

    /**
     * Handle window resize
     * @private
     */
    _handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Update camera field of view
     * @param {number} fov - New field of view value
     */
    setFOV(fov) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Render the scene using post-processing
     */
    render() {
        this.composer.render();
    }

    /**
     * Render without post-processing
     */
    renderBasic() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Add an object to the scene
     * @param {THREE.Object3D} object - Object to add
     */
    add(object) {
        this.scene.add(object);
    }

    /**
     * Remove an object from the scene
     * @param {THREE.Object3D} object - Object to remove
     */
    remove(object) {
        this.scene.remove(object);
    }

    /**
     * Clean up resources
     */
    dispose() {
        window.removeEventListener('resize', this._handleResize);
        this.renderer.dispose();
    }
}

export default SceneManager;
