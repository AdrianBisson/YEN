/**
 * @fileoverview Main entry point for YEN: The Eternal Longing
 * @module main
 */

import { Game } from './core/Game.js';

/**
 * Main application entry point
 * Waits for THREE.js to be loaded, then initializes the game
 */
async function main() {
    // Wait for THREE to be available on window
    if (!window.THREE) {
        console.error('THREE.js not loaded');
        return;
    }

    try {
        // Create and initialize game
        const game = new Game();
        game.init();

        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            game.dispose();
        });

        // Make game accessible for debugging
        window.game = game;
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showLoadError(error);
    }
}

/**
 * Display error message to user
 * @param {Error} error - The error that occurred
 */
function showLoadError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 10000;
        max-width: 500px;
    `;

    errorDiv.innerHTML = `
        <h2>Game Loading Error</h2>
        <p>Failed to initialize the game.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please check the browser console for more details.</p>
        <button onclick="location.reload()" style="
            background: #444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 15px;
        ">Retry</button>
    `;

    document.body.appendChild(errorDiv);
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
