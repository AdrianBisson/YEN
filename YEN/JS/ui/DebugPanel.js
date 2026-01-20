/**
 * @fileoverview Debug panel for performance monitoring
 * @module ui/DebugPanel
 */

import { performanceMonitor } from '../utils/PerformanceMonitor.js';
import { Vector3Pool, ColorPool } from '../utils/ObjectPools.js';

/**
 * Debug panel for displaying performance metrics
 * @class
 */
export class DebugPanel {
    /**
     * Create a new DebugPanel instance
     * @param {Object} spatialGrid - Reference to spatial grid for stats
     */
    constructor(spatialGrid) {
        /** @type {Object} */
        this.spatialGrid = spatialGrid;

        /** @type {HTMLElement|null} */
        this.panel = null;

        /** @type {HTMLElement|null} */
        this.fpsElement = null;

        /** @type {HTMLElement|null} */
        this.vectorsElement = null;

        /** @type {HTMLElement|null} */
        this.colorsElement = null;

        /** @type {HTMLElement|null} */
        this.collisionsElement = null;

        /** @type {HTMLElement|null} */
        this.gridElement = null;

        /** @type {boolean} */
        this.visible = false;

        this._createPanel();
        this._setupKeyboardToggle();
    }

    /**
     * Create the debug panel DOM element
     * @private
     */
    _createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.style.cssText = `
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

        this.panel.innerHTML = `
            <div style="margin-bottom: 5px; font-weight: bold;">Performance Monitor</div>
            <div>FPS: <span id="debug-fps">0</span></div>
            <div>Pooled Vectors: <span id="debug-vectors">0</span></div>
            <div>Pooled Colors: <span id="debug-colors">0</span></div>
            <div>Collision Checks: <span id="debug-collisions">0</span></div>
            <div>Spatial Grid Cells: <span id="debug-grid">0</span></div>
            <div style="margin-top: 10px; font-size: 10px; color: #888;">
                Press F3 to toggle
            </div>
        `;

        document.body.appendChild(this.panel);

        // Cache element references
        this.fpsElement = document.getElementById('debug-fps');
        this.vectorsElement = document.getElementById('debug-vectors');
        this.colorsElement = document.getElementById('debug-colors');
        this.collisionsElement = document.getElementById('debug-collisions');
        this.gridElement = document.getElementById('debug-grid');
    }

    /**
     * Set up keyboard toggle for debug panel
     * @private
     */
    _setupKeyboardToggle() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'F3') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * Update the debug panel with current metrics
     */
    update() {
        if (!this.visible) return;

        if (this.fpsElement) {
            this.fpsElement.textContent = performanceMonitor.fps.toString();
        }
        if (this.vectorsElement) {
            this.vectorsElement.textContent = Vector3Pool.pool.length.toString();
        }
        if (this.colorsElement) {
            this.colorsElement.textContent = ColorPool.pool.length.toString();
        }
        if (this.collisionsElement) {
            this.collisionsElement.textContent = performanceMonitor.collisionChecks.toString();
        }
        if (this.gridElement && this.spatialGrid) {
            this.gridElement.textContent = this.spatialGrid.grid.size.toString();
        }
    }

    /**
     * Show the debug panel
     */
    show() {
        this.visible = true;
        if (this.panel) {
            this.panel.style.display = 'block';
        }
    }

    /**
     * Hide the debug panel
     */
    hide() {
        this.visible = false;
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    /**
     * Toggle debug panel visibility
     * @returns {boolean} New visibility state
     */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
        return this.visible;
    }

    /**
     * Clean up the debug panel
     */
    dispose() {
        if (this.panel) {
            document.body.removeChild(this.panel);
            this.panel = null;
        }
    }
}

export default DebugPanel;
