/**
 * @fileoverview Game constants for YEN: The Eternal Longing
 * @module config/constants
 */

/**
 * Size of the cubic play area
 * @constant {number}
 */
export const CUBE_SIZE = 100;

/**
 * Half size of the cube (used for boundary calculations)
 * @constant {number}
 */
export const CUBE_HALF_SIZE = CUBE_SIZE / 2;

/**
 * Radius of each snake segment
 * @constant {number}
 */
export const SEGMENT_RADIUS = 0.8;

/**
 * Spacing between snake segments
 * @constant {number}
 */
export const SEGMENT_SPACING = SEGMENT_RADIUS * 2;

/**
 * Distance threshold for collision detection
 * @constant {number}
 */
export const COLLISION_DISTANCE = 1.8;

/**
 * Buffer distance from walls for various calculations
 * @constant {number}
 */
export const WALL_BUFFER = 5;

/**
 * Minimum safe distance from walls for spawning
 * @constant {number}
 */
export const SAFE_WALL_DISTANCE = 2;

/**
 * Minimum safe distance from other objects for spawning
 * @constant {number}
 */
export const SAFE_OBJECT_DISTANCE = 2;

/**
 * Base interval between nibble spawns (milliseconds)
 * @constant {number}
 */
export const SPAWN_INTERVAL = 3000;

/**
 * Minimum delay between shadow snake spawns (milliseconds)
 * @constant {number}
 */
export const SHADOW_SPAWN_DELAY = 3000;

/**
 * Mouse/touch movement sensitivity
 * @constant {number}
 */
export const SENSITIVITY = 0.002;

/**
 * Touch event throttle delay (milliseconds)
 * @constant {number}
 */
export const TOUCH_DELAY = 16;
