/**
 * @fileoverview Cube environment with animated shader walls
 * @module rendering/CubeEnvironment
 */

import { CUBE_SIZE, CUBE_HALF_SIZE } from '../config/constants.js';
import { settings } from '../config/settings.js';

/**
 * Custom shader for animated cube walls
 * @constant {Object}
 */
const cubeWallShader = {
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
        opacity: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float iTime;
        uniform vec3 iResolution;
        uniform float opacity;
        varying vec2 vUv;
        varying vec3 vPosition;

        vec3 palette(float t) {
            vec3 a = vec3(0.5, 0.2, 0.5);
            vec3 b = vec3(1.0, 1.0, 0.0);
            vec3 c = vec3(0.0, 1.0, 0.0);
            vec3 d = vec3(0.263, 0.416, 0.557);
            return a + b * cos(6.28318 * (c * t + d));
        }

        void main() {
            vec2 uv = (vUv * 2.0 - 1.0) * 2.0;
            vec2 uv0 = uv;
            vec3 finalColor = vec3(0.0);

            for (float i = 0.0; i < 4.0; i++) {
                uv = fract(uv * 1.5) - 0.5;
                float d = length(uv) * exp(-length(uv0));
                vec3 col = palette(length(uv0) + i * 0.4 + iTime * 0.4);
                d = sin(d * 8.0 + iTime) / 8.0;
                d = abs(d);
                d = pow(0.01 / d, 1.2);
                finalColor += col * d;
            }

            finalColor = pow(finalColor, vec3(0.8));
            gl_FragColor = vec4(finalColor, min(0.8, length(finalColor) * 0.5 + 0.3) * opacity);
        }
    `
};

/**
 * Manages the cubic play area environment
 * @class
 */
export class CubeEnvironment {
    /**
     * Create a new CubeEnvironment instance
     * @param {THREE.Scene} scene - The scene to add the cube to
     * @param {THREE.Camera} camera - The camera for visibility calculations
     */
    constructor(scene, camera) {
        /** @type {THREE.Scene} */
        this.scene = scene;

        /** @type {THREE.Camera} */
        this.camera = camera;

        /** @type {Array<{mesh: THREE.Mesh, line: THREE.LineLoop, axis: string, sign: number}>} */
        this.faces = [];

        /** @type {THREE.Vector3[]} */
        this.vertices = this._createVertices();

        this._createFaces();
    }

    /**
     * Create cube vertices
     * @private
     * @returns {THREE.Vector3[]}
     */
    _createVertices() {
        const hs = CUBE_HALF_SIZE;
        return [
            new THREE.Vector3(-hs, -hs, -hs), // 0
            new THREE.Vector3(hs, -hs, -hs),  // 1
            new THREE.Vector3(hs, hs, -hs),   // 2
            new THREE.Vector3(-hs, hs, -hs),  // 3
            new THREE.Vector3(-hs, -hs, hs),  // 4
            new THREE.Vector3(hs, -hs, hs),   // 5
            new THREE.Vector3(hs, hs, hs),    // 6
            new THREE.Vector3(-hs, hs, hs)    // 7
        ];
    }

    /**
     * Create wireframe lines for a face
     * @private
     * @param {number[]} faceIndices - Indices of vertices for the face
     * @returns {THREE.LineLoop}
     */
    _createFaceLines(faceIndices) {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        for (const index of faceIndices) {
            positions.push(
                this.vertices[index].x,
                this.vertices[index].y,
                this.vertices[index].z
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        return new THREE.LineLoop(geometry, material);
    }

    /**
     * Create a single cube face with shader material
     * @private
     * @param {number[]} faceIndices - Indices of vertices for the face
     * @param {string} axis - Axis the face is on ('x', 'y', or 'z')
     * @param {number} sign - Direction on the axis (1 or -1)
     * @returns {{mesh: THREE.Mesh, line: THREE.LineLoop, axis: string, sign: number}}
     */
    _createCubeFace(faceIndices, axis, sign) {
        const hs = CUBE_HALF_SIZE;
        const faceGeometry = new THREE.PlaneGeometry(CUBE_SIZE, CUBE_SIZE);

        // Position and rotate the face appropriately
        if (axis === 'x') {
            faceGeometry.rotateY(Math.PI * 0.5);
            faceGeometry.translate(sign * hs, 0, 0);
        } else if (axis === 'y') {
            faceGeometry.rotateX(Math.PI * 0.5);
            faceGeometry.translate(0, sign * hs, 0);
        } else {
            faceGeometry.translate(0, 0, sign * hs);
        }

        // Create shader material
        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                opacity: { value: settings.wallOpacity }
            },
            vertexShader: cubeWallShader.vertexShader,
            fragmentShader: cubeWallShader.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        const faceMesh = new THREE.Mesh(faceGeometry, shaderMaterial);

        return {
            line: this._createFaceLines(faceIndices),
            mesh: faceMesh,
            axis: axis,
            sign: sign
        };
    }

    /**
     * Create all cube faces
     * @private
     */
    _createFaces() {
        // Define faces with their vertex indices and properties
        const faceDefinitions = [
            { indices: [0, 1, 2, 3], axis: 'z', sign: -1 }, // Back
            { indices: [4, 5, 6, 7], axis: 'z', sign: 1 },  // Front
            { indices: [0, 3, 7, 4], axis: 'x', sign: -1 }, // Left
            { indices: [1, 2, 6, 5], axis: 'x', sign: 1 },  // Right
            { indices: [0, 1, 5, 4], axis: 'y', sign: -1 }, // Bottom
            { indices: [3, 2, 6, 7], axis: 'y', sign: 1 }   // Top
        ];

        for (const def of faceDefinitions) {
            const face = this._createCubeFace(def.indices, def.axis, def.sign);
            this.faces.push(face);
            this.scene.add(face.line);
            this.scene.add(face.mesh);
            face.line.visible = false; // Initially hide wireframe
            face.mesh.visible = true;  // Initially show shaded faces
        }
    }

    /**
     * Update shader time uniform for animation
     * @param {number} time - Current time in seconds
     */
    updateShaderTime(time) {
        for (const face of this.faces) {
            if (face.mesh?.material?.uniforms) {
                face.mesh.material.uniforms.iTime.value = time;
            }
        }
    }

    /**
     * Update wall opacity
     * @param {number} opacity - Opacity value (0-1)
     */
    setWallOpacity(opacity) {
        for (const face of this.faces) {
            if (face.mesh?.material?.uniforms) {
                face.mesh.material.uniforms.opacity.value = opacity;
            }
        }
    }

    /**
     * Toggle wireframe mode
     * @param {boolean} enabled - Whether wireframe mode is enabled
     */
    setWireframe(enabled) {
        const hs = CUBE_HALF_SIZE;

        for (const face of this.faces) {
            if (enabled) {
                // Wireframe mode - show only wireframe lines when camera is on correct side
                if (face.sign > 0) {
                    face.line.visible = this.camera.position[face.axis] <= hs;
                } else {
                    face.line.visible = this.camera.position[face.axis] >= -hs;
                }
                face.mesh.visible = false;
            } else {
                // Shader mode - show shaders but hide faces between camera and play area
                if (face.sign > 0) {
                    face.mesh.visible = this.camera.position[face.axis] <= hs;
                } else {
                    face.mesh.visible = this.camera.position[face.axis] >= -hs;
                }
                face.line.visible = false;
            }
        }
    }

    /**
     * Update face visibility based on camera position
     */
    updateVisibility() {
        this.setWireframe(settings.wireframeEnabled);
    }

    /**
     * Update shader resolution on window resize
     */
    updateResolution() {
        for (const face of this.faces) {
            if (face.mesh?.material?.uniforms?.iResolution) {
                face.mesh.material.uniforms.iResolution.value.set(
                    window.innerWidth,
                    window.innerHeight,
                    1
                );
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        for (const face of this.faces) {
            this.scene.remove(face.line);
            this.scene.remove(face.mesh);
            face.line.geometry.dispose();
            face.line.material.dispose();
            face.mesh.geometry.dispose();
            face.mesh.material.dispose();
        }
        this.faces = [];
    }
}

export default CubeEnvironment;
