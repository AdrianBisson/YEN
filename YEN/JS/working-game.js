// Working Snake Game Module - Extracted from index-working.html
// This module contains the complete working game logic

// ============================================================================
// OPTIMIZATION: Object Pooling for Memory Management
// ============================================================================

class Vector3Pool {
    static pool = [];
    static maxPoolSize = 100;
    
    static get() {
        return this.pool.pop() || new THREE.Vector3();
    }
    
    static release(vector) {
        if (this.pool.length < this.maxPoolSize) {
            vector.set(0, 0, 0);
            this.pool.push(vector);
        }
    }
    
    static getMultiple(count) {
        const vectors = [];
        for (let i = 0; i < count; i++) {
            vectors.push(this.get());
        }
        return vectors;
    }
    
    static releaseMultiple(vectors) {
        vectors.forEach(vector => this.release(vector));
    }
}

class ColorPool {
    static pool = [];
    static maxPoolSize = 50;
    
    static get() {
        return this.pool.pop() || new THREE.Color();
    }
    
    static release(color) {
        if (this.pool.length < this.maxPoolSize) {
            color.setHex(0x000000);
            this.pool.push(color);
        }
    }
}

// ============================================================================
// OPTIMIZATION: Spatial Partitioning for Collision Detection
// ============================================================================

class SpatialGrid {
    constructor(cellSize = 10) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.objectMap = new WeakMap(); // Track which cell each object is in
    }
    
    getGridKey(position) {
        const x = Math.floor(position.x / this.cellSize);
        const y = Math.floor(position.y / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${y},${z}`;
    }
    
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
    
    clear() {
        this.grid.clear();
        this.objectMap = new WeakMap();
    }
}

// ============================================================================
// OPTIMIZATION: Collision Detection System
// ============================================================================

class CollisionSystem {
    constructor(spatialGrid) {
        this.spatialGrid = spatialGrid;
        this.collisionPairs = new Set();
        this.tempVector = Vector3Pool.get();
    }
    
    updateObject(object, position) {
        // Don't add wall faces to the spatial grid
        if (this.isWallObject(object)) return;
        this.spatialGrid.insert(object, position);
    }
    
    removeObject(object) {
        if (this.isWallObject(object)) return;
        this.spatialGrid.remove(object);
    }
    
    // Check if an object is a wall (face mesh or line)
    isWallObject(object) {
        // Check if it's a face mesh or line by looking at the parent scene
        // Wall objects are added directly to the scene, not as part of snakes
        if (!object || !object.parent) return false;
        
        // Wall faces have specific material properties (shader material)
        if (object.material && object.material.type === 'ShaderMaterial') {
            return true;
        }
        
        // Wall lines have LineBasicMaterial
        if (object.material && object.material.type === 'LineBasicMaterial') {
            return true;
        }
        
        // Additional check: if it's one of the known face objects
        if (object === scene) return false; // Skip scene itself
        
        // Check if it's one of the cube faces
        for (const face of faces) {
            if (object === face.mesh || object === face.line) {
                return true;
            }
        }
        
        return false;
    }
    
    checkCollisions(playerSnake, shadowSnakes, nibbles) {
        performanceMonitor.recordCollisionCheck();
        const collisions = [];
        
        if (!playerSnake || !playerSnake.head) return collisions;
        

        
        // Get nearby objects for player snake
        const nearbyObjects = this.spatialGrid.getNearby(playerSnake.head.position, COLLISION_DISTANCE * 2);
        

        
        // Check player snake collisions
        for (const obj of nearbyObjects) {
            if (obj === playerSnake.head) continue;
            
            // Skip wall objects
            if (this.isWallObject(obj)) {
                continue;
            }
            
            // Skip if it's the player snake's own segment
            if (playerSnake.segments.includes(obj)) {
                continue;
            }
            
            // Additional check: make sure it's not the player snake itself
            if (obj === playerSnake) {
                continue;
            }
            
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
            if (!shadow || !shadow.head) continue;
            
            const nearbyShadowObjects = this.spatialGrid.getNearby(shadow.head.position, COLLISION_DISTANCE * 2);
            
            for (const obj of nearbyShadowObjects) {
                if (obj === shadow.head) continue;
                
                // Skip wall objects
                if (this.isWallObject(obj)) continue;
                
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
    
    dispose() {
        Vector3Pool.release(this.tempVector);
    }
}

// ============================================================================
// OPTIMIZATION: Memory-Efficient Math Utilities
// ============================================================================

class VectorMath {
    static temp1 = Vector3Pool.get();
    static temp2 = Vector3Pool.get();
    static temp3 = Vector3Pool.get();
    
    static getDirection(from, to, out) {
        return out.subVectors(to, from).normalize();
    }
    
    static addScaled(vector, direction, scalar, out) {
        // Copy the direction, scale it, then add to the vector
        out.copy(direction).multiplyScalar(scalar).add(vector);
        return out;
    }
    
    static moveForward(position, direction, distance, out) {
        // Move position in direction by distance
        out.copy(position).add(direction.clone().multiplyScalar(distance));
        return out;
    }
    
    static distanceSquared(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return dx * dx + dy * dy + dz * dz;
    }
    
    static isNearWall(position, halfSize, buffer) {
        return Math.abs(position.x) > halfSize - buffer ||
               Math.abs(position.y) > halfSize - buffer ||
               Math.abs(position.z) > halfSize - buffer;
    }
    
    static dispose() {
        Vector3Pool.release(this.temp1);
        Vector3Pool.release(this.temp2);
        Vector3Pool.release(this.temp3);
    }
}

// ============================================================================
// OPTIMIZATION: Performance Monitoring
// ============================================================================

class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.memoryUsage = 0;
        this.collisionChecks = 0;
        this.objectsCreated = 0;
        this.objectsPooled = 0;
    }
    
    update() {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // Log memory usage
            this.memoryUsage = Vector3Pool.pool.length + ColorPool.pool.length;
            
            // Reset counters
            this.collisionChecks = 0;
            this.objectsCreated = 0;
            this.objectsPooled = 0;
        }
    }
    
    recordCollisionCheck() {
        this.collisionChecks++;
    }
    
    recordObjectCreated() {
        this.objectsCreated++;
    }
    
    recordObjectPooled() {
        this.objectsPooled++;
    }
    
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

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Initialize optimization systems
const spatialGrid = new SpatialGrid(10);
const collisionSystem = new CollisionSystem(spatialGrid);

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Black background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50); // Set initial camera position
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';

// Post-processing for bloom effect
const composer = new THREE.EffectComposer(renderer);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

// Add canvas to the game container
const canvasContainer = document.getElementById('game-canvas-container');
if (canvasContainer) {
    canvasContainer.appendChild(renderer.domElement);
} else {
    document.body.appendChild(renderer.domElement);
}

// Constants
const CUBE_SIZE = 100;
const CUBE_HALF_SIZE = CUBE_SIZE / 2;
const SEGMENT_RADIUS = 0.8;
const SEGMENT_SPACING = SEGMENT_RADIUS * 2;
const COLLISION_DISTANCE = 1.8;
const WALL_BUFFER = 5;
const SAFE_WALL_DISTANCE = 2;
const SAFE_OBJECT_DISTANCE = 2;

// Game settings with updated speed
let settings = {
    speed: 0.3, // Base movement speed for the player snake
    colorCycleRate: 0.5, // Controls how fast the snake's rainbow colors change
    trailLength: 50, // Number of trail points to store for smooth movement
    fov: 75, // Field of view for the camera
    shadowSpeed: 0.4, // Movement speed for shadow snakes
    spawnRate: 3, // How frequently new nibbles spawn (higher = more frequent)
    fxVolume: 0.5, // Master volume for all sound effects
    wallOpacity: 1.0, // Transparency of the cube walls
    wireframeEnabled: false, // Toggle between wireframe and shader wall display
    stationaryCamera: false // Toggle between following and stationary camera modes
};

// Custom shader for the cube walls - creates a dynamic, animated pattern
const cubeWallShader = {
    uniforms: {
        iTime: { value: 0 }, // Current time for animation
        iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) }, // Screen resolution
        opacity: { value: settings.wallOpacity } // Wall transparency
    },
    vertexShader: `
        varying vec2 vUv; // UV coordinates passed to fragment shader
        varying vec3 vPosition; // 3D position passed to fragment shader
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float iTime; // Time for animation
        uniform vec3 iResolution; // Screen resolution
        uniform float opacity; // Wall transparency
        varying vec2 vUv; // UV coordinates from vertex shader
        varying vec3 vPosition; // 3D position from vertex shader
        
        // Color palette function for generating rainbow patterns
        vec3 palette(float t) {
            vec3 a = vec3(0.5, 0.2, 0.5);   // Base color (Mauve)
            vec3 b = vec3(1.0, 1.0, 0.0);   // Color variation (Jaune)
            vec3 c = vec3(0.0, 1.0, 0.0);   // Color variation (Vert)
            vec3 d = vec3(0.263, 0.416, 0.557); // Phase offset
        
            return a + b * cos(6.28318 * (c * t + d));
        }
        
        void main() {
            // Normalize UV coordinates to create centered pattern
            vec2 uv = (vUv * 2.0 - 1.0) * 2.0;
            vec2 uv0 = uv;
            vec3 finalColor = vec3(0.0);
            
            // Create layered pattern effect
            for (float i = 0.0; i < 4.0; i++) {
                uv = fract(uv * 1.5) - 0.5;
        
                // Calculate distance-based pattern
                float d = length(uv) * exp(-length(uv0));
        
                // Get color from palette
                vec3 col = palette(length(uv0) + i * 0.4 + iTime * 0.4);
        
                // Create wave pattern
                d = sin(d * 8.0 + iTime) / 8.0;
                d = abs(d);
        
                // Apply pattern intensity
                d = pow(0.01 / d, 1.2);
        
                // Add this layer to final color
                finalColor += col * d;
            }
            
            // Adjust final color brightness
            finalColor = pow(finalColor, vec3(0.8));
            
            // Output final color with transparency
            gl_FragColor = vec4(finalColor, min(0.8, length(finalColor) * 0.5 + 0.3) * opacity);
        }
    `
};

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Add starfield background
function createStarfield() {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    
    // Create stars in a spherical distribution around the playing area
    const radius = 300; // Far enough to be outside the cube but visible
    
    for (let i = 0; i < starCount; i++) {
        // Random spherical coordinates
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius;
        
        // Convert to Cartesian coordinates
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        vertices.push(x, y, z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    // Create different sized stars
    const sizes = [];
    for (let i = 0; i < starCount; i++) {
        sizes.push(Math.random() * 2 + 0.5);
    }
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    // Create star material with custom shader
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    const stars = new THREE.Points(geometry, starMaterial);
    scene.add(stars);
    
    return stars;
}

// Create starfield
const starfield = createStarfield();

// Cube environment setup
const hs = CUBE_HALF_SIZE; // Half-size, 50

// Define cube vertices
const vertices = [
    new THREE.Vector3(-hs, -hs, -hs), // 0
    new THREE.Vector3(hs, -hs, -hs),  // 1
    new THREE.Vector3(hs, hs, -hs),   // 2
    new THREE.Vector3(-hs, hs, -hs),  // 3
    new THREE.Vector3(-hs, -hs, hs),  // 4
    new THREE.Vector3(hs, -hs, hs),   // 5
    new THREE.Vector3(hs, hs, hs),    // 6
    new THREE.Vector3(-hs, hs, hs)    // 7
];

// Function to create face wireframe
function createFaceLines(faceIndices) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    for (const index of faceIndices) {
        positions.push(vertices[index].x, vertices[index].y, vertices[index].z);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
    });
    return new THREE.LineLoop(geometry, material);
}

// Create shader material for cube faces
function createCubeFace(faceIndices, axis, sign) {
    // Create a face geometry
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
    
    // Create shader material for the face
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
        line: createFaceLines(faceIndices), 
        mesh: faceMesh, 
        axis: axis, 
        sign: sign
    };
}

// Define faces with their indices and properties
const faces = [
    createCubeFace([0, 1, 2, 3], 'z', -1), // Back
    createCubeFace([4, 5, 6, 7], 'z', 1),  // Front
    createCubeFace([0, 3, 7, 4], 'x', -1), // Left
    createCubeFace([1, 2, 6, 5], 'x', 1),  // Right
    createCubeFace([0, 1, 5, 4], 'y', -1), // Bottom
    createCubeFace([3, 2, 6, 7], 'y', 1)   // Top
];

// Add faces to scene
faces.forEach(face => {
    scene.add(face.line);
    scene.add(face.mesh);
    face.line.visible = false; // Initially hide wireframe
    face.mesh.visible = true; // Initially show shaded faces
});

// Revised Snake Class with Improvements
class Snake {
    constructor(isPlayer = false) {
        this.isPlayer = isPlayer;
        this.direction = new THREE.Vector3(0, 0, -1); // Initial direction
        this.speed = isPlayer ? settings.speed : settings.shadowSpeed;
        this.segments = [];
        this.trail = []; // For smooth movement
        this.path = new THREE.CatmullRomCurve3(); // For TubeGeometry
        this.bodyMesh = null;
        this.head = new THREE.Group(); // Head group for customization
        this.particleTrail = this.createParticleTrail();
        this.colorOffset = Math.random() * Math.PI * 2;
        this.length = 5; // Initial length
        this.creationTime = 0; // When the snake was created
        this.isInitialReflectionPhase = false; // Whether shadow snake is in initial reflection phase
        this.targetDirection = Vector3Pool.get(); // Target direction for shadow snakes
        this.lastDirectionChange = 0; // Last time direction was changed
        this.directionChangeInterval = 1000; // Time between direction changes (ms)
        this.segmentColorIndex = 0; // For rainbow color cycling
        this.nibblesEaten = 0; // Track number of nibbles consumed
        // trail property is used for smooth movement and TubeGeometry
        this.init();
    }

    init() {
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.2,
            transmission: 0.5, // For subsurface scattering
            thickness: 0.5,
            emissive: 0xffffff,
            emissiveIntensity: 0.2
        });

        // Head customization
        const headGeometry = new THREE.SphereGeometry(SEGMENT_RADIUS * 1.2, 32, 32);
        const headMesh = new THREE.Mesh(headGeometry, material);
        this.head.add(headMesh);

        // Add eyes
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.4, 0.3, -0.8);
        const rightEye = leftEye.clone();
        rightEye.position.x = -0.4;
        this.head.add(leftEye, rightEye);
        
        scene.add(this.head);
        collisionSystem.updateObject(this.head, this.head.position);

        // Initial segments
        for (let i = 0; i < this.length; i++) {
            this.addSegment(true);
        }

        // Initialize trail with initial positions
        for (let i = 0; i < settings.trailLength; i++) {
            // Create a trail that extends behind the head in the initial direction
            const trailPos = this.head.position.clone().add(
                this.direction.clone().multiplyScalar(-i * SEGMENT_SPACING)
            );
            this.trail.push(trailPos);
        }

        // Create body as TubeGeometry
        this.updateBodyMesh(material);
    }

    createParticleTrail() {
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
        scene.add(particles);
        return particles;
    }

    updateBodyMesh(material) {
        if (this.bodyMesh) scene.remove(this.bodyMesh);

        this.path = new THREE.CatmullRomCurve3(this.trail);
        const geometry = new THREE.TubeGeometry(this.path, this.trail.length, SEGMENT_RADIUS, 16, false);
        this.bodyMesh = new THREE.Mesh(geometry, material);
        scene.add(this.bodyMesh);
    }

    addSegment(initial = false) {
        const lastPosition = this.segments.length > 0 ? this.segments[this.segments.length - 1].position : this.head.position;
        const newPosition = lastPosition.clone().sub(this.direction.clone().multiplyScalar(SEGMENT_SPACING));

        // Use temporary material if bodyMesh doesn't exist yet
        const material = this.bodyMesh ? this.bodyMesh.material : new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        const segment = new THREE.Mesh(new THREE.CylinderGeometry(SEGMENT_RADIUS, SEGMENT_RADIUS, SEGMENT_SPACING, 16), material);
        segment.position.copy(newPosition);
        scene.add(segment);
        this.segments.push(segment);
        collisionSystem.updateObject(segment, segment.position);

        if (!initial) this.length++;
        
        // Only update body mesh if it exists
        if (this.bodyMesh) {
            this.updateBodyMesh(this.bodyMesh.material);
        }
    }

    update(delta) {
        // Update direction based on head rotation
        this.head.getWorldDirection(this.direction);

        // Move head
        const moveDistance = this.speed * delta * 60;
        this.head.position.add(this.direction.clone().multiplyScalar(moveDistance));

        // AI behavior for shadow snakes: seek nibbles when in autonomous mode
        if (!this.isPlayer && !this.isInitialReflectionPhase) {
            this.seekNibbles();
        }

        // Slithering animation
        const time = performance.now() * 0.001;
        const wiggle = Math.sin(time * 5 + this.colorOffset) * 0.5;
        this.head.position.y += wiggle * 0.1; // Small vertical wiggle

        // Update trail
        this.trail.unshift(this.head.position.clone());
        if (this.trail.length > settings.trailLength) this.trail.pop();

        // Update body mesh
        if (this.bodyMesh) {
            this.updateBodyMesh(this.bodyMesh.material);
        }

        // Update segments positions along the path
        const segmentDistance = SEGMENT_SPACING * this.segments.length;
        for (let i = 0; i < this.segments.length; i++) {
            const pathLength = this.path.getLength();
            if (pathLength > 0) {
                const t = (i + 1) * SEGMENT_SPACING / pathLength;
                const position = this.path.getPointAt(t);
                this.segments[i].position.copy(position);
            } else {
                // Fallback positioning if path is too short
                const direction = Vector3Pool.get();
                this.head.getWorldDirection(direction);
                const segmentPos = Vector3Pool.get();
                VectorMath.moveForward(this.head.position, direction, -(i + 1) * SEGMENT_SPACING, segmentPos);
                this.segments[i].position.copy(segmentPos);
                Vector3Pool.release(direction);
                Vector3Pool.release(segmentPos);
            }

            // Add slither to segments
            const segWiggle = Math.sin(time * 5 + i * 0.5 + this.colorOffset) * 0.3;
            this.segments[i].position.x += segWiggle * 0.05;

            // Only update collision detection for player snake segments
            if (this.isPlayer) {
                collisionSystem.updateObject(this.segments[i], this.segments[i].position);
            }
        }

        // Update particle trail
        const positions = this.particleTrail.geometry.attributes.position.array;
        const colors = this.particleTrail.geometry.attributes.color.array;
        const sizes = this.particleTrail.geometry.attributes.size.array;

        for (let i = 0; i < this.trail.length; i++) {
            const idx = i * 3;
            positions[idx] = this.trail[i].x;
            positions[idx + 1] = this.trail[i].y;
            positions[idx + 2] = this.trail[i].z;

            const color = new THREE.Color().setHSL((time * settings.colorCycleRate + i * 0.01 + this.colorOffset) % 1, 1, 0.5);
            colors[idx] = color.r;
            colors[idx + 1] = color.g;
            colors[idx + 2] = color.b;

            sizes[i] = (1 - i / this.trail.length) * 0.5; // Fade size
        }

        this.particleTrail.geometry.attributes.position.needsUpdate = true;
        this.particleTrail.geometry.attributes.color.needsUpdate = true;
        this.particleTrail.geometry.attributes.size.needsUpdate = true;

        // Update head color gradient
        const headColor = new THREE.Color().setHSL((time * settings.colorCycleRate + this.colorOffset) % 1, 1, 0.5);
        this.head.children[0].material.color = headColor;
        this.head.children[0].material.emissive = headColor;

        // Update body color with gradient
        if (this.bodyMesh) {
            this.bodyMesh.material.color = headColor; // Base, but for gradient, could use vertex colors or custom shader
        }

        // Only update collision detection for player snake head
        if (this.isPlayer) {
            collisionSystem.updateObject(this.head, this.head.position);
        }
    }

    // AI method for shadow snakes to seek nibbles
    seekNibbles() {
        // Find the closest nibble from the global nibbles array
        let closestNibble = null;
        let closestDistance = Infinity;
        
        // Use the global nibbles array from the game
        if (typeof nibbles !== 'undefined' && nibbles.length > 0) {
            nibbles.forEach(nibble => {
                if (nibble && nibble.position) {
                    const distance = this.head.position.distanceTo(nibble.position);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestNibble = nibble;
                    }
                }
            });
            
            // If we found a nibble, move toward it more aggressively
            if (closestNibble && closestDistance > 2) {
                const directionToNibble = Vector3Pool.get();
                VectorMath.getDirection(this.head.position, closestNibble.position, directionToNibble);
                
                // More aggressive rotation toward the nibble
                const targetRotation = Math.atan2(directionToNibble.x, directionToNibble.z);
                const currentRotation = this.head.rotation.y;
                
                // Faster rotation with less randomness for more focused movement
                const rotationSpeed = 0.08; // Increased from 0.05
                const randomOffset = (Math.random() - 0.5) * 0.05; // Reduced randomness
                this.head.rotation.y += (targetRotation - currentRotation + randomOffset) * rotationSpeed;
                
                // Also adjust Y rotation for vertical movement toward nibbles
                const verticalDirection = Vector3Pool.get();
                VectorMath.getDirection(this.head.position, closestNibble.position, verticalDirection);
                const targetYRotation = Math.atan2(-verticalDirection.y, Math.sqrt(verticalDirection.x * verticalDirection.x + verticalDirection.z * verticalDirection.z));
                const currentYRotation = this.head.rotation.x;
                this.head.rotation.x += (targetYRotation - currentYRotation) * rotationSpeed * 0.5;
                
                Vector3Pool.release(directionToNibble);
                Vector3Pool.release(verticalDirection);
            } else if (closestNibble && closestDistance <= 2) {
                // When very close to a nibble, slow down and prepare to eat
                this.speed = settings.shadowSpeed * 0.5;
            } else {
                // If no nibbles nearby, return to normal speed and do gentle exploration
                this.speed = settings.shadowSpeed;
                
                // Gentle random movement when no nibbles are visible
                const time = performance.now() * 0.001;
                const gentleWander = Math.sin(time * 0.5 + this.colorOffset) * 0.02;
                this.head.rotation.y += gentleWander;
            }
        }
    }

    dispose() {
        scene.remove(this.head);
        scene.remove(this.bodyMesh);
        scene.remove(this.particleTrail);
        this.segments.forEach(segment => {
            scene.remove(segment);
            collisionSystem.removeObject(segment);
        });
        collisionSystem.removeObject(this.head);
        
        // Release pooled vectors
        Vector3Pool.release(this.targetDirection);
        
        // Clear trail and release pooled vectors
        this.trail.forEach(point => Vector3Pool.release(point));
        this.trail = [];
    }

    // Method to sync direction with head rotation and update trail
    syncDirection() {
        // Update direction based on head rotation
        this.head.getWorldDirection(this.direction);
        
        // Update trail to match the new direction
        this.trail = [];
        for (let i = 0; i < settings.trailLength; i++) {
            // Create a trail that extends behind the head in the current direction
            const trailPos = this.head.position.clone().add(
                this.direction.clone().multiplyScalar(-i * SEGMENT_SPACING)
            );
            this.trail.push(trailPos);
        }
        
        // Update body mesh with new trail
        if (this.bodyMesh && this.bodyMesh.material) {
            this.updateBodyMesh(this.bodyMesh.material);
        }
    }
}

// Sound system for managing all game audio
class SoundSystem {
    constructor() {
        // Initialize Web Audio API context
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.context.suspend(); // Start suspended until user interaction
        
        // Create master gain node for overall volume control
        this.fxGain = this.context.createGain();
        this.fxGain.connect(this.context.destination);
        
        // Create oscillators and gain nodes for nibble collection sound (triangle)
        this.nibbleOscillator = this.context.createOscillator();
        this.nibbleGain = this.context.createGain();
        this.nibbleOscillator.connect(this.nibbleGain);
        this.nibbleGain.connect(this.fxGain);
        this.nibbleOscillator.type = 'triangle';
        this.nibbleOscillator.frequency.setValueAtTime(440, this.context.currentTime); // A4 note
        this.nibbleGain.gain.setValueAtTime(0, this.context.currentTime);
        
        // Create collision sound oscillator
        this.collisionOscillator = this.context.createOscillator();
        this.collisionGain = this.context.createGain();
        this.collisionOscillator.connect(this.collisionGain);
        this.collisionGain.connect(this.fxGain);
        this.collisionOscillator.type = 'triangle';
        this.collisionOscillator.frequency.setValueAtTime(220, this.context.currentTime);
        this.collisionGain.gain.setValueAtTime(0, this.context.currentTime);
        
        // Create shadow snake spawn sound oscillators
        this.shadowSpawnBase = this.context.createOscillator();
        this.shadowSpawnBaseGain = this.context.createGain();
        this.shadowSpawnBase.connect(this.shadowSpawnBaseGain);
        this.shadowSpawnBaseGain.connect(this.fxGain);
        this.shadowSpawnBase.type = 'sine';
        this.shadowSpawnBase.frequency.setValueAtTime(120, this.context.currentTime);
        this.shadowSpawnBaseGain.gain.setValueAtTime(0, this.context.currentTime);
        
        // Add harmonics for rich monk voice effect
        this.shadowSpawnHarmonics = this.context.createOscillator();
        this.shadowSpawnHarmonicsGain = this.context.createGain();
        this.shadowSpawnHarmonics.connect(this.shadowSpawnHarmonicsGain);
        this.shadowSpawnHarmonicsGain.connect(this.fxGain);
        this.shadowSpawnHarmonics.type = 'sine';
        this.shadowSpawnHarmonics.frequency.setValueAtTime(240, this.context.currentTime);
        this.shadowSpawnHarmonicsGain.gain.setValueAtTime(0, this.context.currentTime);
        
        // Start all oscillators
        this.nibbleOscillator.start();
        this.collisionOscillator.start();
        this.silentOsc = this.context.createOscillator();
        this.shadowSpawnBase.start();
        this.shadowSpawnHarmonics.start();
    }
    
    // Play sound when collecting nibbles
    playNibbleCollect() {
        const now = this.context.currentTime;
        
        // Set up triangle sound
        this.nibbleOscillator.frequency.setValueAtTime(440, now); // A4
        
        // Create quick attack and decay envelope
        this.nibbleGain.gain.setValueAtTime(0, now);
        this.nibbleGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        this.nibbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        // Ensure the sound completely stops
        this.nibbleGain.gain.setValueAtTime(0, now + 0.11);
    }
    
    // Play sound when snake collides
    playCollision() {
        const now = this.context.currentTime;
        this.collisionGain.gain.setValueAtTime(0.2, now);
        this.collisionGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        // Ensure the sound completely stops
        this.collisionGain.gain.setValueAtTime(0, now + 0.21);
    }
    
    // Play sound when shadow snake spawns
    playShadowSpawn() {
        const now = this.context.currentTime;
        
        // Set up base frequency and harmonics
        this.shadowSpawnBase.frequency.setValueAtTime(120, now);
        this.shadowSpawnHarmonics.frequency.setValueAtTime(240, now);
        
        // Create rich envelope for base frequency
        this.shadowSpawnBaseGain.gain.setValueAtTime(0, now);
        this.shadowSpawnBaseGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
        this.shadowSpawnBaseGain.gain.exponentialRampToValueAtTime(0.3, now + 0.5);
        this.shadowSpawnBaseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        // Ensure the sound completely stops
        this.shadowSpawnBaseGain.gain.setValueAtTime(0, now + 1.51);
        
        // Create envelope for harmonics
        this.shadowSpawnHarmonicsGain.gain.setValueAtTime(0, now);
        this.shadowSpawnHarmonicsGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        this.shadowSpawnHarmonicsGain.gain.exponentialRampToValueAtTime(0.2, now + 0.5);
        this.shadowSpawnHarmonicsGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        // Ensure the sound completely stops
        this.shadowSpawnHarmonicsGain.gain.setValueAtTime(0, now + 1.31);
        
        // Add slight pitch bend for natural sound
        this.shadowSpawnBase.frequency.linearRampToValueAtTime(110, now + 1.5);
        this.shadowSpawnHarmonics.frequency.linearRampToValueAtTime(220, now + 1.5);
    }
    
    // Set master volume for all sound effects
    setFxVolume(volume) {
        this.fxGain.gain.setValueAtTime(volume, this.context.currentTime);
    }

    // Resume audio context after user interaction
    resume() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    // Pause audio context
    pause() {
        if (this.context.state === 'running') {
            this.context.suspend();
        }
    }
}

// Initialize sound system
let soundSystem = new SoundSystem();

// Game state variables
let playerSnake;
let shadowSnakes = [];
let nibbles = [];
let score = 0;
let isGameOver = false;
let gameStarted = false;
let lastSpawnTime = performance.now();
const spawnInterval = 3000; // Base interval between nibble spawns

// Nibble setup with glow effect
const nibbleGeometry = new THREE.SphereGeometry(0.5, 16, 16);

// Create a glowing nibble with core and glow effect
function createGlowingNibble() {
    // Create the core nibble
    const nibble = new THREE.Mesh(
        nibbleGeometry,
        new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        })
    );
    
    // Create glow effect with larger transparent sphere
    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide // Render inside of sphere for glow effect
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    nibble.add(glow); // Add glow as child of nibble
    
    return nibble;
}

// Spawn a new nibble at random position within the cube
function spawnNibble() {
    const nibble = createGlowingNibble();
    
    let position;
    let tries = 0;
    let isSafe = false;
    const maxTries = 100; // Prevent infinite loop
    
    do {
        const x = (Math.random() - 0.5) * CUBE_SIZE;
        const y = (Math.random() - 0.5) * CUBE_SIZE;
        const z = (Math.random() - 0.5) * CUBE_SIZE;
        position = Vector3Pool.get().set(x, y, z);
        
        const isNearWall = Math.abs(x) > CUBE_HALF_SIZE - SAFE_WALL_DISTANCE ||
                           Math.abs(y) > CUBE_HALF_SIZE - SAFE_WALL_DISTANCE ||
                           Math.abs(z) > CUBE_HALF_SIZE - SAFE_WALL_DISTANCE;
        
        if (isNearWall) {
            tries++;
            Vector3Pool.release(position);
            continue;
        }
        
        isSafe = true;
        
        // Use spatial grid to check for nearby objects efficiently
        const nearbyObjects = spatialGrid.getNearby(position, SAFE_OBJECT_DISTANCE * 2);
        
        for (const obj of nearbyObjects) {
            if (VectorMath.distanceSquared(position, obj.position) < SAFE_OBJECT_DISTANCE * SAFE_OBJECT_DISTANCE) {
                isSafe = false;
                break;
            }
        }
        
        tries++;
        if (tries > maxTries) {
            // Fallback to any position if no safe spot found
            break;
        }
        
        if (!isSafe) {
            Vector3Pool.release(position);
        }
    } while (!isSafe);
    
    nibble.position.copy(position);
    
    scene.add(nibble);
    nibbles.push(nibble);
    
    // Add to spatial grid for collision detection
    collisionSystem.updateObject(nibble, nibble.position);
    
    // Release the temporary position vector
    Vector3Pool.release(position);
}

// Shadow snake spawn mechanics
let lastShadowSpawnTime = 0;
const shadowSpawnDelay = 3000; // Minimum time between shadow snake spawns
let isShadowSnakeInvulnerable = false;

// Check if player has crossed cube boundaries and spawn shadow snakes
function checkCubeBoundary(snake) {
    if (!snake || !snake.isPlayer || !snake.head) return; // Skip if snake is invalid
    
    const halfSize = CUBE_HALF_SIZE;
    const pos = snake.head.position;
    
    // Get the previous position from the trail, ensuring it's different from current
    let prevPos = null;
    if (snake.trail.length > 1) {
        // Use the second position in trail (index 1) to ensure it's different from current
        prevPos = snake.trail[1];
    } else if (snake.trail.length > 0) {
        // Fallback to first trail position if only one exists
        prevPos = snake.trail[0];
    } else {
        // If no trail, create a position slightly behind the current position
        prevPos = pos.clone().sub(snake.direction.clone().multiplyScalar(SEGMENT_SPACING));
    }
    
    // Helper function to check if a position is inside the cube
    const isInsideCube = (position) => {
        return Math.abs(position.x) <= halfSize && 
               Math.abs(position.y) <= halfSize && 
               Math.abs(position.z) <= halfSize;
    };
    
    // Only spawn shadow snake if transitioning from inside to outside
    const wasInside = isInsideCube(prevPos);
    const isInside = isInsideCube(pos);
    
    if (!wasInside || isInside) {
        return; // Don't spawn if already outside or still inside
    }
    
    console.log('Wall collision detected! Spawning shadow snake...');
    
    // Find which wall was crossed and calculate intersection point
    let wallHitPoint = null;
    let normal = Vector3Pool.get();
    
    // Check X boundaries
    if (Math.abs(pos.x) > halfSize && Math.abs(prevPos.x) <= halfSize) {
        wallHitPoint = Vector3Pool.get().copy(pos);
        wallHitPoint.x = Math.sign(pos.x) * halfSize;
        normal.set(-Math.sign(pos.x), 0, 0);
    }
    // Check Y boundaries
    else if (Math.abs(pos.y) > halfSize && Math.abs(prevPos.y) <= halfSize) {
        wallHitPoint = Vector3Pool.get().copy(pos);
        wallHitPoint.y = Math.sign(pos.y) * halfSize;
        normal.set(0, -Math.sign(pos.y), 0);
    }
    // Check Z boundaries
    else if (Math.abs(pos.z) > halfSize && Math.abs(prevPos.z) <= halfSize) {
        wallHitPoint = Vector3Pool.get().copy(pos);
        wallHitPoint.z = Math.sign(pos.z) * halfSize;
        normal.set(0, 0, -Math.sign(pos.z));
    }
    
    // If we've hit a wall, spawn a shadow snake
    if (wallHitPoint) {
        console.log('Spawning shadow snake at:', wallHitPoint, 'with normal:', normal);
        spawnShadowSnake(wallHitPoint, normal);
        
        // Clean up pooled vectors
        Vector3Pool.release(wallHitPoint);
        Vector3Pool.release(normal);
        Vector3Pool.release(spawnPosition);
    }
}



// Spawn a shadow snake at wall intersection point
function spawnShadowSnake(wallHitPoint, normal) {
    const currentTime = performance.now();
    if (currentTime - lastShadowSpawnTime < shadowSpawnDelay) {
        console.log('Shadow snake spawn blocked by delay');
        return;
    }
    
    console.log('Creating shadow snake...');
    lastShadowSpawnTime = currentTime;
    isShadowSnakeInvulnerable = true;
    
    // Create shadow snake at wall intersection, but slightly inside the boundary
    const shadowSnake = new Snake(false);
    const spawnPosition = Vector3Pool.get().copy(wallHitPoint);
    
    // Move spawn position slightly inside the boundary to prevent immediate boundary issues
    const insetAmount = 2;
    if (Math.abs(wallHitPoint.x) >= CUBE_HALF_SIZE) {
        spawnPosition.x = Math.sign(wallHitPoint.x) * (CUBE_HALF_SIZE - insetAmount);
    }
    if (Math.abs(wallHitPoint.y) >= CUBE_HALF_SIZE) {
        spawnPosition.y = Math.sign(wallHitPoint.y) * (CUBE_HALF_SIZE - insetAmount);
    }
    if (Math.abs(wallHitPoint.z) >= CUBE_HALF_SIZE) {
        spawnPosition.z = Math.sign(wallHitPoint.z) * (CUBE_HALF_SIZE - insetAmount);
    }
    
    shadowSnake.head.position.copy(spawnPosition);
    
    // Calculate reflected direction from player's movement
    const playerDirection = Vector3Pool.get();
    playerSnake.head.getWorldDirection(playerDirection);
    const reflectedDirection = Vector3Pool.get();
    reflectedDirection.copy(playerDirection).reflect(normal);
    
    console.log('Player direction:', playerDirection, 'Reflected direction:', reflectedDirection);
    
    // Set shadow snake's initial direction
    const lookAtPos = Vector3Pool.get();
    VectorMath.moveForward(shadowSnake.head.position, reflectedDirection, 1, lookAtPos);
    shadowSnake.head.lookAt(lookAtPos);
    
    // Initialize shadow snake properties
    shadowSnake.creationTime = currentTime;
    shadowSnake.isInitialReflectionPhase = true;
    shadowSnake.targetDirection.copy(reflectedDirection);
    shadowSnake.speed = settings.shadowSpeed;
    shadowSnake.nibblesEaten = 0;
    
    console.log('Adding initial segments...');
    
    // Add initial segments without counting them as nibbles eaten
    const baseSegments = 5;
    
    // Temporarily override addSegment to not increment nibblesEaten
    const originalAddSegment = shadowSnake.addSegment;
    shadowSnake.addSegment = function() {
        // Generate color based on time for rainbow effect
        const hue = Math.random() * 360;
        const color = ColorPool.get().setHSL(((hue + 180) % 360) / 360, 1.0, 0.3);
        
        // Create new segment with appropriate size and color
        const segment = new THREE.Mesh(
            new THREE.SphereGeometry(SEGMENT_RADIUS, 32, 32),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            })
        );
        
        // Position segment based on existing segments
        if (this.segments.length > 0) {
            const lastPos = this.segments[this.segments.length - 1].position;
            let direction = Vector3Pool.get();
            
            if (this.segments.length > 1) {
                // Use direction between last two segments
                const prevSegPos = this.segments[this.segments.length - 2].position;
                VectorMath.getDirection(prevSegPos, lastPos, direction);
            } else {
                // Use direction from head to first segment
                this.head.getWorldDirection(direction);
                direction.negate();
            }
            
            // Position segment with proper spacing
            VectorMath.moveForward(lastPos, direction, SEGMENT_SPACING, segment.position);
            Vector3Pool.release(direction);
        } else {
            // Position first segment behind head
            const direction = Vector3Pool.get();
            this.head.getWorldDirection(direction);
            VectorMath.moveForward(this.head.position, direction, -SEGMENT_SPACING, segment.position);
            Vector3Pool.release(direction);
        }
        
        this.segments.push(segment);
        scene.add(segment);
        
        // Add to spatial grid for collision detection
        collisionSystem.updateObject(segment, segment.position);
        
        // Release the color
        ColorPool.release(color);
    };
    
    // Add initial segments
    for (let i = 0; i < baseSegments; i++) {
        shadowSnake.addSegment();
    }
    
    // Restore original addSegment method
    shadowSnake.addSegment = originalAddSegment;
    
    // Add to shadow snakes array
    shadowSnakes.push(shadowSnake);
    
    console.log('Shadow snake created with', shadowSnake.segments.length, 'segments. Total shadow snakes:', shadowSnakes.length);
    
    // Play sound
    soundSystem.playShadowSpawn();
    
    // Remove invulnerability and transition to autonomous mode after delay
    setTimeout(() => {
        isShadowSnakeInvulnerable = false;
        shadowSnake.isInitialReflectionPhase = false;
        console.log('Shadow snake transitioned to autonomous mode');
    }, 3000);
    
    // Clean up pooled vectors
    Vector3Pool.release(playerDirection);
    Vector3Pool.release(reflectedDirection);
    Vector3Pool.release(lookAtPos);
}

// Check for collisions between snakes and with walls
function checkCollisions() {
    // Use the optimized collision system
    const collisions = collisionSystem.checkCollisions(playerSnake, shadowSnakes, nibbles);
    
    // Process collisions
    for (const collision of collisions) {
        if (collision.type === 'player_collision') {
            // Handle player collision
            if (collision.object === playerSnake.head) continue; // Skip self
            
            // Check if it's a shadow snake head
            let shadowSnake = null;
            for (const shadow of shadowSnakes) {
                if (shadow.head === collision.object) {
                    shadowSnake = shadow;
                    break;
                }
            }
            
            if (shadowSnake) {
                // Player hit shadow snake head
                dissolveSnake(playerSnake);
                return;
            }
            
            // Check if it's a shadow snake segment
            for (const shadow of shadowSnakes) {
                if (shadow.segments.includes(collision.object)) {
                    dissolveSnake(playerSnake);
                    return;
                }
            }
            
            // Check if it's player's own segment (self-collision)
            if (playerSnake.segments.includes(collision.object)) {
                const segmentIndex = playerSnake.segments.indexOf(collision.object);
                if (segmentIndex >= 10) { // Skip first 10 segments
                    dissolveSnake(playerSnake);
                    return;
                }
            }
        } else if (collision.type === 'shadow_collision') {
            // Handle shadow snake collision
            const shadow = collision.snake;
            
            if (collision.object === shadow.head) continue; // Skip self
            
            // Check if it's player's segment
            if (playerSnake.segments.includes(collision.object)) {
                console.log('Shadow snake hit player segment, dissolving...');
                dissolveSnake(shadow);
                continue;
            }
            
            // Check if it's another shadow snake's head
            for (const otherShadow of shadowSnakes) {
                if (otherShadow !== shadow && otherShadow.head === collision.object) {
                    console.log('Shadow snake hit another shadow snake head, dissolving...');
                    dissolveSnake(shadow);
                    break;
                }
            }
            
            // Check if it's another shadow snake's segment
            for (const otherShadow of shadowSnakes) {
                if (otherShadow !== shadow && otherShadow.segments.includes(collision.object)) {
                    console.log('Shadow snake hit another shadow snake segment, dissolving...');
                    dissolveSnake(shadow);
                    break;
                }
            }
            
            // Check self-collision for shadow
            if (shadow.segments.includes(collision.object)) {
                const segmentIndex = shadow.segments.indexOf(collision.object);
                if (segmentIndex >= 10) { // Skip first 10 segments
                    console.log('Shadow snake self-collision, dissolving...');
                    dissolveSnake(shadow);
                }
            }
        }
    }
}

// Handle snake dissolution with proper cleanup
function dissolveSnake(snake) {
    console.log('Dissolving snake:', snake.isPlayer ? 'player' : 'shadow', 'segments:', snake.segments.length);
    
    // Remove from spatial grid
    collisionSystem.removeObject(snake.head);
    snake.segments.forEach(segment => {
        collisionSystem.removeObject(segment);
    });
    
    // Remove snake head
    scene.remove(snake.head);
    
    // Create nibbles - for shadow snakes, drop based on total segments; for player, drop based on nibbles eaten
    const nibblesDropped = snake.isPlayer ? 
        Math.min(snake.segments.length, snake.nibblesEaten) : 
        snake.segments.length;
    
    console.log('Creating', nibblesDropped, 'nibbles for', snake.isPlayer ? 'player' : 'shadow', 'snake');
    
    // Remove all segments visually
    snake.segments.forEach(seg => {
        scene.remove(seg);
    });
    
    // Create nibbles at segment positions
    for (let i = 0; i < nibblesDropped; i++) {
        if (i < snake.segments.length) {
            const nibble = createGlowingNibble();
            nibble.position.copy(snake.segments[i].position);
            
            // Add some randomness to nibble positions for better visual effect
            if (!snake.isPlayer) {
                nibble.position.x += (Math.random() - 0.5) * 2;
                nibble.position.y += (Math.random() - 0.5) * 2;
                nibble.position.z += (Math.random() - 0.5) * 2;
            }
            
            scene.add(nibble);
            nibbles.push(nibble);
            
            // Add to spatial grid
            collisionSystem.updateObject(nibble, nibble.position);
            console.log('Created nibble at position:', nibble.position);
        }
    }
    
    // Clear trail points and release pooled vectors
    snake.trail.forEach(point => Vector3Pool.release(point));
    snake.trail = [];
    
    // Handle game over or shadow snake removal
    if (snake.isPlayer) {
        isGameOver = true;
        document.getElementById('final-score').textContent = score;
        document.getElementById('game-over').style.display = 'flex';
    } else {
        shadowSnakes = shadowSnakes.filter(s => s !== snake);
    }
    
    // Proper cleanup
    snake.dispose();
    
    soundSystem.playCollision();
}

// Pause menu functionality
let isPaused = false;
const pauseMenu = document.getElementById('pause-menu');
const resumeButton = document.getElementById('resume');

// Settings controls
const speedControl = document.getElementById('speed');
const colorCycleControl = document.getElementById('color-cycle');
const fovControl = document.getElementById('fov');
const shadowSpeedControl = document.getElementById('shadow-speed');
const spawnRateControl = document.getElementById('spawn-rate');
const fxVolumeSlider = document.getElementById('fx-volume');
const wallOpacityControl = document.getElementById('wall-opacity');
const stationaryCameraControl = document.getElementById('stationary-camera');
const wireframeControl = document.getElementById('wireframe');
const pauseRestartButton = document.getElementById('pause-restart');

// Update settings display
function updateSettingsDisplay() {
    const speedValue = document.getElementById('speed-value');
    const colorCycleValue = document.getElementById('color-cycle-value');
    const fovValue = document.getElementById('fov-value');
    const shadowSpeedValue = document.getElementById('shadow-speed-value');
    const spawnRateValue = document.getElementById('spawn-rate-value');
    const fxVolumeValue = document.getElementById('fx-volume-value');
    const wallOpacityValue = document.getElementById('wall-opacity-value');

    if (speedValue) speedValue.textContent = settings.speed.toFixed(1);
    if (colorCycleValue) colorCycleValue.textContent = settings.colorCycleRate.toFixed(1);
    if (fovValue) fovValue.textContent = settings.fov;
    if (shadowSpeedValue) shadowSpeedValue.textContent = settings.shadowSpeed.toFixed(2);
    if (spawnRateValue) spawnRateValue.textContent = settings.spawnRate.toFixed(1);
    if (fxVolumeValue) fxVolumeValue.textContent = settings.fxVolume.toFixed(1);
    if (wallOpacityValue) wallOpacityValue.textContent = settings.wallOpacity.toFixed(1);
}

// Settings event listeners with null checks
if (speedControl) {
    speedControl.addEventListener('input', (e) => {
        settings.speed = parseFloat(e.target.value);
        updateSettingsDisplay();
        if (playerSnake) playerSnake.speed = settings.speed;
    });
}

if (colorCycleControl) {
    colorCycleControl.addEventListener('input', (e) => {
        settings.colorCycleRate = parseFloat(e.target.value);
        updateSettingsDisplay();
    });
}

if (fovControl) {
    fovControl.addEventListener('input', (e) => {
        settings.fov = parseInt(e.target.value);
        updateSettingsDisplay();
        camera.fov = settings.fov;
        camera.updateProjectionMatrix();
    });
}

if (shadowSpeedControl) {
    shadowSpeedControl.addEventListener('input', (e) => {
        settings.shadowSpeed = parseFloat(e.target.value);
        updateSettingsDisplay();
        shadowSnakes.forEach(snake => {
            snake.speed = settings.shadowSpeed;
        });
    });
}

if (spawnRateControl) {
    spawnRateControl.addEventListener('input', (e) => {
        settings.spawnRate = parseFloat(e.target.value);
        updateSettingsDisplay();
    });
}

if (fxVolumeSlider) {
    fxVolumeSlider.addEventListener('input', (e) => {
        settings.fxVolume = parseFloat(e.target.value);
        updateSettingsDisplay();
        soundSystem.setFxVolume(settings.fxVolume);
    });
}

if (wallOpacityControl) {
    wallOpacityControl.addEventListener('input', (e) => {
        settings.wallOpacity = parseFloat(e.target.value);
        updateSettingsDisplay();
        faces.forEach(face => {
            if (face.mesh && face.mesh.material && face.mesh.material.uniforms) {
                face.mesh.material.uniforms.opacity.value = settings.wallOpacity;
            }
        });
    });
}

if (stationaryCameraControl) {
    stationaryCameraControl.addEventListener('change', (e) => {
        settings.stationaryCamera = e.target.checked;
        if (settings.stationaryCamera) {
            initializeStationaryCamera();
            const cameraInstructions = document.getElementById('camera-instructions');
            if (cameraInstructions && !isPaused) {
                cameraInstructions.style.display = 'block';
            }
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            document.body.style.cursor = 'default';
        } else {
            const cameraInstructions = document.getElementById('camera-instructions');
            if (cameraInstructions) {
                cameraInstructions.style.display = 'none';
            }
            document.body.requestPointerLock();
            document.body.style.cursor = 'none';
        }
    });
}

if (wireframeControl) {
    wireframeControl.addEventListener('change', (e) => {
        settings.wireframeEnabled = e.target.checked;
        updateFacesVisibility();
    });
}

// Reset game with proper cleanup
function resetGame() {
    // Clean up player snake
    if (playerSnake) {
        // Remove and dispose head
        scene.remove(playerSnake.head);
        collisionSystem.removeObject(playerSnake.head);
        
        // Remove and dispose all segments
        playerSnake.segments.forEach(seg => {
            scene.remove(seg);
            collisionSystem.removeObject(seg);
        });
        
        // Proper cleanup
        playerSnake.dispose();
    }
    
    // Clean up shadow snakes
    shadowSnakes.forEach(snake => {
        scene.remove(snake.head);
        collisionSystem.removeObject(snake.head);
        
        snake.segments.forEach(seg => {
            scene.remove(seg);
            collisionSystem.removeObject(seg);
        });
        
        // Proper cleanup
        snake.dispose();
    });
    
    // Clean up nibbles
    nibbles.forEach(nibble => {
        scene.remove(nibble);
        collisionSystem.removeObject(nibble);
    });

    // Clear spatial grid
    spatialGrid.clear();

    // Reset game state
    score = 0;
    document.getElementById('score').textContent = '0';
    isGameOver = false;
    // Don't reset gameStarted here - it should be managed by the calling function
    shadowSnakes = [];
    nibbles = [];
    lastSpawnTime = performance.now();
    lastShadowSpawnTime = performance.now();
    isShadowSnakeInvulnerable = false;

    // Recreate sound system
    soundSystem = new SoundSystem();
    soundSystem.setFxVolume(settings.fxVolume);

    // Create new player snake
    playerSnake = new Snake(true);
    playerSnake.speed = settings.speed;
    playerSnake.head.position.set(0, 0, 0);
    playerSnake.head.rotation.y = -Math.PI / 2;
    
    // Sync the snake's direction and trail with the head rotation
    playerSnake.syncDirection();
    
    // The new Snake class automatically creates initial segments in its init() method
    // Starting segments don't count as nibbles eaten
    playerSnake.nibblesEaten = 0;

    // Spawn initial nibble
    spawnNibble();
    
    // Hide game over screen
    document.getElementById('game-over').style.display = 'none';
    
    // Update face visibility after reset
    updateFacesVisibility();
    
    // Initialize stationary camera if that mode is enabled
    if (settings.stationaryCamera) {
        initializeStationaryCamera();
    }
    
    // Update camera instructions visibility
    document.getElementById('camera-instructions').style.display = 
        settings.stationaryCamera ? 'block' : 'none';
}

// Function to update face visibility based on camera position
function updateFacesVisibility() {
    faces.forEach(face => {
        if (settings.wireframeEnabled) {
            // Wireframe mode - show only wireframe lines when camera is on the correct side
            if (face.sign > 0) {
                face.line.visible = camera.position[face.axis] <= hs;
            } else {
                face.line.visible = camera.position[face.axis] >= -hs;
            }
            face.mesh.visible = false;
        } else {
            // Shader mode - show shaders but hide faces between camera and play area
            if (face.sign > 0) {
                face.mesh.visible = camera.position[face.axis] <= hs;
            } else {
                face.mesh.visible = camera.position[face.axis] >= -hs;
            }
            face.line.visible = false;
        }
    });
}

// Controls for player input and camera movement
const sensitivity = 0.002; // Mouse/touch movement sensitivity
let lastMouseX;
let lastMouseY;
let isPointerLockRequested = false; // Track pointer lock request state

// Handle mouse click to start pointer lock and resume audio
document.addEventListener('click', () => {
    // Only request pointer lock if the game has started
    if (gameStarted && !settings.stationaryCamera && !isPointerLockRequested && !document.pointerLockElement) {
        isPointerLockRequested = true;
        document.body.requestPointerLock().catch(error => {
            console.log('Pointer lock request failed:', error);
            isPointerLockRequested = false;
        });
    }
    soundSystem.resume();
});

// Handle pointer lock state changes
document.addEventListener('pointerlockchange', () => {
    isPointerLockRequested = false;
    if (document.pointerLockElement === document.body) {
        // Pointer lock acquired
        document.body.style.cursor = 'none';
    } else {
        // Pointer lock lost
        document.body.style.cursor = 'default';
    }
});

// Handle pointer lock errors
document.addEventListener('pointerlockerror', (event) => {
    console.log('Pointer lock error:', event);
    isPointerLockRequested = false;
    document.body.style.cursor = 'default';
    
    // Don't try to request pointer lock again immediately after an error
    setTimeout(() => {
        isPointerLockRequested = false;
    }, 1000);
});

// Handle mouse movement for snake control
document.addEventListener('mousemove', (event) => {
    if (!playerSnake) return;

    if (!settings.stationaryCamera && document.pointerLockElement === document.body) {
        // Locked mode: use movementX/Y
        playerSnake.head.rotation.y -= (event.movementX || 0) * sensitivity;
        playerSnake.head.rotation.x -= (event.movementY || 0) * sensitivity;
        playerSnake.head.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, playerSnake.head.rotation.x));
    } else if (settings.stationaryCamera) {
        // Non-locked mode: use clientX/Y delta
        if (lastMouseX !== undefined && lastMouseY !== undefined) {
            const dx = event.clientX - lastMouseX;
            const dy = event.clientY - lastMouseY;
            playerSnake.head.rotation.y -= dx * sensitivity;
            playerSnake.head.rotation.x -= dy * sensitivity;
            playerSnake.head.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, playerSnake.head.rotation.x));
        }
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    } else {
        // Fallback mode: work without pointer lock initially
        if (lastMouseX !== undefined && lastMouseY !== undefined) {
            const dx = event.clientX - lastMouseX;
            const dy = event.clientY - lastMouseY;
            playerSnake.head.rotation.y -= dx * sensitivity;
            playerSnake.head.rotation.x -= dy * sensitivity;
            playerSnake.head.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, playerSnake.head.rotation.x));
        }
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});

// Touch controls for mobile devices
let touchStartX, touchStartY;
let lastTouchTime = 0;
const TOUCH_DELAY = 16; // ~60fps

document.addEventListener('touchstart', (event) => {
    // Only handle touch events if we're on mobile
    if (!isMobile) return;
    
    // Only handle the first touch
    if (event.touches.length > 1) return;
    
    // Prevent default to avoid scrolling
    event.preventDefault();
    
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    lastTouchTime = performance.now();
    soundSystem.resume();
}, { passive: false });

document.addEventListener('touchmove', (event) => {
    // Only handle touch events if we're on mobile
    if (!isMobile) return;
    
    // Only handle the first touch
    if (event.touches.length > 1) return;
    
    // Prevent default to avoid scrolling
    event.preventDefault();
    
    // Throttle touch events to ~60fps
    const currentTime = performance.now();
    if (currentTime - lastTouchTime < TOUCH_DELAY) return;
    
    // Calculate touch movement
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const movementX = touchX - touchStartX;
    const movementY = touchY - touchStartY;
    
    // Apply rotation to snake head with improved sensitivity
    const sensitivity = 0.002;
    playerSnake.head.rotation.y -= movementX * sensitivity;
    playerSnake.head.rotation.x -= movementY * sensitivity * 2; // Increased pitch sensitivity
    playerSnake.head.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, playerSnake.head.rotation.x));
    
    // Update touch start position
    touchStartX = touchX;
    touchStartY = touchY;
    lastTouchTime = currentTime;
}, { passive: false });

// Handle device orientation changes
window.addEventListener('orientationchange', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update shader resolution uniforms
    faces.forEach(face => {
        if (face.mesh.material.uniforms && face.mesh.material.uniforms.iResolution) {
            face.mesh.material.uniforms.iResolution.value.set(
                window.innerWidth, window.innerHeight, 1
            );
        }
    });
});

// Camera state for stationary camera mode
const stationaryCameraState = {
    orbitX: 0,      // Horizontal orbit angle
    orbitY: 0,      // Vertical orbit angle
    distance: 150,  // Distance from center
    center: new THREE.Vector3(0, 0, 0), // Center of the playfield
    keys: {
        w: false,   // Orbit up
        s: false,   // Orbit down
        a: false,   // Orbit left
        d: false,   // Orbit right
        q: false,   // Zoom in
        e: false    // Zoom out
    }
};

// Handle keyboard input for camera control
document.addEventListener('keydown', (e) => {
    
    // Toggle pause menu with Spacebar
    if (e.code === 'Space' && !isGameOver) {
        isPaused = !isPaused;
        if (isPaused) {
            updatePauseState();
            soundSystem.pause();
        } else {
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) {
                pauseMenu.style.display = 'none';
            }
            const cameraInstructions = document.getElementById('camera-instructions');
            if (cameraInstructions) {
                cameraInstructions.style.display = settings.stationaryCamera ? 'block' : 'none';
            }
            soundSystem.resume();
            safeRequestPointerLock();
        }
        return;
    }
    
    // Handle camera controls in stationary mode
    if (settings.stationaryCamera) {
        switch(e.key.toLowerCase()) {
            case 'w': stationaryCameraState.keys.w = true; break;
            case 's': stationaryCameraState.keys.s = true; break;
            case 'a': stationaryCameraState.keys.a = true; break;
            case 'd': stationaryCameraState.keys.d = true; break;
            case 'q': stationaryCameraState.keys.q = true; break;
            case 'e': stationaryCameraState.keys.e = true; break;
        }
    }
});

// Handle key release for camera control
document.addEventListener('keyup', (e) => {
    if (settings.stationaryCamera) {
        switch(e.key.toLowerCase()) {
            case 'w': stationaryCameraState.keys.w = false; break;
            case 's': stationaryCameraState.keys.s = false; break;
            case 'a': stationaryCameraState.keys.a = false; break;
            case 'd': stationaryCameraState.keys.d = false; break;
            case 'q': stationaryCameraState.keys.q = false; break;
            case 'e': stationaryCameraState.keys.e = false; break;
        }
    }
});

// Update camera position and orientation
function updateCamera() {
    if (!playerSnake) return;
    
    if (settings.stationaryCamera) {
        // Process camera movement in stationary mode
        const moveSpeed = 0.02;
        const zoomSpeed = 1.0;
        
        // Update orbit angles based on key presses
        if (stationaryCameraState.keys.a) stationaryCameraState.orbitX -= moveSpeed;
        if (stationaryCameraState.keys.d) stationaryCameraState.orbitX += moveSpeed;
        if (stationaryCameraState.keys.w) stationaryCameraState.orbitY += moveSpeed;
        if (stationaryCameraState.keys.s) stationaryCameraState.orbitY -= moveSpeed;
        if (stationaryCameraState.keys.q) stationaryCameraState.distance -= zoomSpeed;
        if (stationaryCameraState.keys.e) stationaryCameraState.distance += zoomSpeed;
        
        // Limit vertical orbit to prevent camera flipping
        stationaryCameraState.orbitY = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, stationaryCameraState.orbitY));
        
        // Limit zoom distance
        stationaryCameraState.distance = Math.max(50, Math.min(250, stationaryCameraState.distance));
        
        // Calculate camera position using spherical coordinates
        const phi = stationaryCameraState.orbitY;
        const theta = stationaryCameraState.orbitX;
        
        camera.position.x = stationaryCameraState.center.x + stationaryCameraState.distance * Math.sin(theta) * Math.cos(phi);
        camera.position.y = stationaryCameraState.center.y + stationaryCameraState.distance * Math.sin(phi);
        camera.position.z = stationaryCameraState.center.z + stationaryCameraState.distance * Math.cos(theta) * Math.cos(phi);
        
        // Look at center of playfield
        camera.lookAt(stationaryCameraState.center);
    } else {
        // Follow camera mode - camera follows player snake
        const direction = new THREE.Vector3();
        playerSnake.head.getWorldDirection(direction);
        // Calculate camera offset behind and above player
        const cameraOffset = direction.clone().multiplyScalar(-20).add(new THREE.Vector3(0, 10, 0));
        camera.position.copy(playerSnake.head.position).add(cameraOffset);
        camera.lookAt(playerSnake.head.position);
    }
}

// Helper function to safely request pointer lock
function safeRequestPointerLock() {
    // Don't request pointer lock if:
    // 1. Stationary camera mode is enabled
    // 2. A request is already pending
    // 3. Pointer is already locked
    // 4. Game is paused
    // 5. Game hasn't started yet
    if (settings.stationaryCamera || isPointerLockRequested || document.pointerLockElement || isPaused || !gameStarted) {
        return;
    }
    
    // Add a small delay to prevent rapid successive requests
    setTimeout(() => {
        if (!isPointerLockRequested && !document.pointerLockElement && !isPaused && gameStarted) {
            isPointerLockRequested = true;
            document.body.requestPointerLock().catch(error => {
                console.log('Pointer lock request failed:', error);
                isPointerLockRequested = false;
            });
        }
    }, 100);
}

// Update pause menu visibility and pointer lock state
function updatePauseState() {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.style.display = isPaused ? 'flex' : 'none';
    }
    
    const cameraInstructions = document.getElementById('camera-instructions');
    if (cameraInstructions && !isPaused) {
        cameraInstructions.style.display = 'block';
    }
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    document.body.style.cursor = 'default';
}

// Set up initial stationary camera position
function initializeStationaryCamera() {
    // Position the camera on the side of the cube for an overview
    stationaryCameraState.orbitX = -Math.PI / 2; // Start looking at -X side
    stationaryCameraState.orbitY = 0;
    stationaryCameraState.distance = 150;
    stationaryCameraState.center = new THREE.Vector3(0, 0, 0);
    
    updateCamera();
}

// Main game loop
let lastTime = performance.now() * 0.001;
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    const delta = time - lastTime;
    lastTime = time;
    
    // Update performance monitor
    performanceMonitor.update();
    
    // Update shader uniforms for wall effects
    faces.forEach(face => {
        if (face.mesh && face.mesh.material && face.mesh.material.uniforms) {
            face.mesh.material.uniforms.iTime.value = time;
        }
    });
    
    // Rotate starfield for ambient effect
    if (starfield) {
        starfield.rotation.y += 0.0001 * delta * 60;
        starfield.rotation.x += 0.00005 * delta * 60;
    }
    
    // Only update game state if game has started and is not paused or game over
    if (gameStarted && !isGameOver && !isPaused) {

        
        // Only update snakes if they exist
        if (playerSnake) {
            playerSnake.update(delta);
        }
        
        // Update shadow snakes (optimized for performance)
        shadowSnakes.forEach((snake, index) => {
            if (snake) {
                // Update every other frame for better performance
                if (Math.floor(time * 60) % 2 === index % 2) {
                    snake.update(delta);
                }
            }
        });
        
        // Animate nibbles
        nibbles.forEach((nibble, index) => {
            if (!nibble) return;
            
            // Pulse size for visual appeal
            const pulseFactor = 1 + 0.1 * Math.sin(time * 2 + index);
            nibble.scale.set(pulseFactor, pulseFactor, pulseFactor);
            
            // Rotate glow effect
            if (nibble.children && nibble.children.length > 0) {
                nibble.children[0].rotation.y += 0.01 * delta * 60;
                nibble.children[0].rotation.x += 0.01 * delta * 60;
            }
        });
        
        // Check for wall collisions and shadow snake spawning
        if (playerSnake) {
            checkCubeBoundary(playerSnake);
        }
        
        // Shadow snakes don't need boundary checking - they can move freely
        
        // Check for nibble collection
        if (playerSnake) {
            // Always check player snake
            const playerNibbleIndex = nibbles.findIndex(nibble => 
                nibble && VectorMath.distanceSquared(playerSnake.head.position, nibble.position) < 2.25
            );
            if (playerNibbleIndex !== -1) {
                const nibble = nibbles[playerNibbleIndex];
                scene.remove(nibble);
                collisionSystem.removeObject(nibble);
                nibbles.splice(playerNibbleIndex, 1);
                playerSnake.addSegment();
                score++;
                document.getElementById('score').textContent = score;
                soundSystem.playNibbleCollect();
                spawnNibble();
            }
            
            // Check shadow snakes less frequently for performance
            if (Math.floor(time * 60) % 3 === 0) { // Every 3rd frame
                shadowSnakes.forEach(snake => {
                    if (!snake || !snake.head) return;
                    
                    const nibbleIndex = nibbles.findIndex(nibble => 
                        nibble && VectorMath.distanceSquared(snake.head.position, nibble.position) < 2.25
                    );
                    if (nibbleIndex !== -1) {
                        const nibble = nibbles[nibbleIndex];
                        scene.remove(nibble);
                        collisionSystem.removeObject(nibble);
                        nibbles.splice(nibbleIndex, 1);
                        snake.addSegment();
                        soundSystem.playNibbleCollect();
                        spawnNibble();
                    }
                });
            }
        }

        // Spawn new nibbles based on spawn rate
        const currentTime = performance.now();
        if (currentTime - lastSpawnTime > 3000 / settings.spawnRate) {
            spawnNibble();
            lastSpawnTime = currentTime;
        }

        // Check for collisions using optimized system
        if (playerSnake && !isPaused && !isGameOver && !isShadowSnakeInvulnerable) {
            checkCollisions();
        }
    }

    // Update face visibility based on camera position
    updateFacesVisibility();

    // Update camera and render scene
    if (playerSnake && gameStarted) {
        updateCamera();
    }
    composer.render();  // Use composer for bloom effect
}

// Cleanup function for memory management
function cleanupGame() {
    // Clean up all snakes
    if (playerSnake) {
        playerSnake.dispose();
    }
    
    shadowSnakes.forEach(snake => {
        snake.dispose();
    });
    
    // Clean up collision system
    collisionSystem.dispose();
    
    // Clean up vector math utilities
    VectorMath.dispose();
    
    // Clear spatial grid
    spatialGrid.clear();
    
    // Clear object pools
    Vector3Pool.pool.length = 0;
    ColorPool.pool.length = 0;
}

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanupGame);

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);  // Update composer size
    
    // Update shader resolution uniforms
    faces.forEach(face => {
        if (face.mesh.material.uniforms && face.mesh.material.uniforms.iResolution) {
            face.mesh.material.uniforms.iResolution.value.set(
                window.innerWidth, window.innerHeight, 1
            );
        }
    });
});

// Initialize and start game
const splashScreen = document.getElementById('splash-screen');
const startButton = document.getElementById('start-button');
const mobilePause = document.getElementById('mobile-pause');

// Check if running on mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
    mobilePause.style.display = 'block';
    
    // Mobile pause button handler
    mobilePause.addEventListener('click', () => {
        if (!isGameOver) {
            isPaused = !isPaused;
            pauseMenu.style.display = isPaused ? 'block' : 'none';
            document.body.style.cursor = isPaused ? 'default' : (settings.stationaryCamera ? 'default' : 'none');
        }
    });
    
    // Add touchend event for mobile devices
    mobilePause.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent default touch behavior
        if (!isGameOver) {
            isPaused = !isPaused;
            pauseMenu.style.display = isPaused ? 'block' : 'none';
            document.body.style.cursor = isPaused ? 'default' : (settings.stationaryCamera ? 'default' : 'none');
        }
    });
}

// Wait for everything to load before showing start button
const showStartButton = () => {
    if (startButton) {
        startButton.style.display = 'block';
        
        // Make sure button is large enough and easily tappable on mobile
        if (isMobile) {
            startButton.style.padding = '20px 50px';
            startButton.style.fontSize = '28px';
        }
    }
    
    // Ensure splash screen is visible
    if (splashScreen) {
        splashScreen.style.display = 'flex';
    }
};

// Try multiple event listeners to ensure the button shows up
document.addEventListener('DOMContentLoaded', showStartButton);
window.addEventListener('load', showStartButton);

// Also try to show it immediately if DOM is already ready
if (document.readyState === 'loading') {
    // Still loading, wait for events
} else {
    // DOM is already ready
    showStartButton();
}

// Start game function
const startGame = () => {
    if (splashScreen) {
        splashScreen.style.display = 'none';
    }
    gameStarted = true;
    resetGame();
    soundSystem.resume();
};

// Start game when button is clicked
if (startButton) {
    // Use both click and touchend events for mobile compatibility
    startButton.addEventListener('click', startGame);
    startButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent default touch behavior
        startGame();
    });
}

// Add Reincarnate button functionality
const reincarnateButton = document.getElementById('reincarnate-button');
if (reincarnateButton) {
    const restartGame = () => {
        document.getElementById('game-over').style.display = 'none';
        gameStarted = true;
        resetGame();
        soundSystem.resume();
    };
    
    reincarnateButton.addEventListener('click', restartGame);
    reincarnateButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent default touch behavior
        restartGame();
    });
}

// Resume button functionality
if (resumeButton) {
    resumeButton.addEventListener('click', () => {
        isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        const cameraInstructions = document.getElementById('camera-instructions');
        if (cameraInstructions) {
            cameraInstructions.style.display = settings.stationaryCamera ? 'block' : 'none';
        }
        soundSystem.resume(); // Ensure audio context is resumed
        safeRequestPointerLock();
    });
    
    // Add touch event for mobile devices
    resumeButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent default touch behavior
        isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        const cameraInstructions = document.getElementById('camera-instructions');
        if (cameraInstructions) {
            cameraInstructions.style.display = settings.stationaryCamera ? 'block' : 'none';
        }
        soundSystem.resume(); // Ensure audio context is resumed
        safeRequestPointerLock();
    });
}

// Pause restart button functionality
if (pauseRestartButton) {
    pauseRestartButton.addEventListener('click', () => {
        gameStarted = true;
        resetGame();
        isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        soundSystem.resume(); // Ensure audio context is resumed
        safeRequestPointerLock();
    });
    
    // Add touch event for mobile devices
    pauseRestartButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent default touch behavior
        gameStarted = true;
        resetGame();
        isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        soundSystem.resume(); // Ensure audio context is resumed
        safeRequestPointerLock();
    });
}

// Initialize controls with current settings
const controls = {
    speed: document.getElementById('speed'),
    colorCycle: document.getElementById('color-cycle'),
    fov: document.getElementById('fov'),
    shadowSpeed: document.getElementById('shadow-speed'),
    spawnRate: document.getElementById('spawn-rate'),
    fxVolume: document.getElementById('fx-volume'),
    wallOpacity: document.getElementById('wall-opacity'),
    stationaryCamera: document.getElementById('stationary-camera')
};

// Only add event listeners if elements exist
if (controls.speed) controls.speed.value = settings.speed;
if (controls.colorCycle) controls.colorCycle.value = settings.colorCycleRate;
if (controls.fov) controls.fov.value = settings.fov;
if (controls.shadowSpeed) controls.shadowSpeed.value = settings.shadowSpeed;
if (controls.spawnRate) controls.spawnRate.value = settings.spawnRate;
if (controls.fxVolume) controls.fxVolume.value = settings.fxVolume;
if (controls.wallOpacity) controls.wallOpacity.value = settings.wallOpacity;
if (controls.stationaryCamera) controls.stationaryCamera.checked = settings.stationaryCamera;

updateSettingsDisplay();

// Start the game loop
animate();

// ============================================================================
// OPTIMIZATION: Debug Panel for Performance Monitoring
// ============================================================================

function createDebugPanel() {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: #00ff00;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 1000;
        min-width: 200px;
        display: none;
    `;
    
    debugPanel.innerHTML = `
        <div style="margin-bottom: 5px; font-weight: bold;">🚀 Performance Monitor</div>
        <div>FPS: <span id="debug-fps">0</span></div>
        <div>Pooled Vectors: <span id="debug-vectors">0</span></div>
        <div>Pooled Colors: <span id="debug-colors">0</span></div>
        <div>Collision Checks: <span id="debug-collisions">0</span></div>
        <div>Spatial Grid Cells: <span id="debug-grid">0</span></div>
        <div style="margin-top: 10px; font-size: 10px; color: #888;">
            Press F3 to toggle
        </div>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Add keyboard shortcut to toggle debug panel
    document.addEventListener('keydown', (e) => {
        if (e.code === 'F3') {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    return debugPanel;
}

// Update debug panel with performance metrics
function updateDebugPanel() {
    const fpsElement = document.getElementById('debug-fps');
    const vectorsElement = document.getElementById('debug-vectors');
    const colorsElement = document.getElementById('debug-colors');
    const collisionsElement = document.getElementById('debug-collisions');
    const gridElement = document.getElementById('debug-grid');
    
    if (fpsElement) fpsElement.textContent = performanceMonitor.fps;
    if (vectorsElement) vectorsElement.textContent = Vector3Pool.pool.length;
    if (colorsElement) colorsElement.textContent = ColorPool.pool.length;
    if (collisionsElement) collisionsElement.textContent = performanceMonitor.collisionChecks;
    if (gridElement) gridElement.textContent = spatialGrid.grid.size;
}

// Create debug panel
const debugPanel = createDebugPanel();

// Update debug panel every frame
setInterval(updateDebugPanel, 100);
