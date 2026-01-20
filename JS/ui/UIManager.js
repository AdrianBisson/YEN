/**
 * @fileoverview UI element management
 * @module ui/UIManager
 */

/**
 * Manages DOM UI elements and display
 * @class
 */
export class UIManager {
    /**
     * Create a new UIManager instance
     */
    constructor() {
        // Cache DOM elements
        /** @type {HTMLElement|null} */
        this.splashScreen = document.getElementById('splash-screen');

        /** @type {HTMLElement|null} */
        this.startButton = document.getElementById('start-button');

        /** @type {HTMLElement|null} */
        this.scoreDisplay = document.getElementById('score');

        /** @type {HTMLElement|null} */
        this.gameOverScreen = document.getElementById('game-over');

        /** @type {HTMLElement|null} */
        this.finalScoreDisplay = document.getElementById('final-score');

        /** @type {HTMLElement|null} */
        this.reincarnateButton = document.getElementById('reincarnate-button');

        /** @type {HTMLElement|null} */
        this.mobilePauseButton = document.getElementById('mobile-pause');

        /** @type {HTMLElement|null} */
        this.cameraInstructions = document.getElementById('camera-instructions');

        /** @type {boolean} */
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }

    /**
     * Show the splash/start screen
     */
    showSplashScreen() {
        if (this.splashScreen) {
            this.splashScreen.style.display = 'flex';
        }
    }

    /**
     * Hide the splash/start screen
     */
    hideSplashScreen() {
        if (this.splashScreen) {
            this.splashScreen.style.display = 'none';
        }
    }

    /**
     * Show the start button (make it visible and styled)
     */
    showStartButton() {
        if (this.startButton) {
            this.startButton.style.display = 'block';

            if (this.isMobile) {
                this.startButton.style.padding = '20px 50px';
                this.startButton.style.fontSize = '28px';
            }
        }
    }

    /**
     * Update the score display
     * @param {number} score - Current score
     */
    updateScore(score) {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = score.toString();
        }
    }

    /**
     * Show the game over screen
     * @param {number} finalScore - Final score to display
     */
    showGameOver(finalScore) {
        if (this.finalScoreDisplay) {
            this.finalScoreDisplay.textContent = finalScore.toString();
        }
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'flex';
        }
    }

    /**
     * Hide the game over screen
     */
    hideGameOver() {
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'none';
        }
    }

    /**
     * Show camera instructions
     */
    showCameraInstructions() {
        if (this.cameraInstructions) {
            this.cameraInstructions.style.display = 'block';
        }
    }

    /**
     * Hide camera instructions
     */
    hideCameraInstructions() {
        if (this.cameraInstructions) {
            this.cameraInstructions.style.display = 'none';
        }
    }

    /**
     * Set camera instructions visibility
     * @param {boolean} visible - Whether to show instructions
     */
    setCameraInstructionsVisible(visible) {
        if (visible) {
            this.showCameraInstructions();
        } else {
            this.hideCameraInstructions();
        }
    }

    /**
     * Show mobile pause button
     */
    showMobilePause() {
        if (this.mobilePauseButton && this.isMobile) {
            this.mobilePauseButton.style.display = 'block';
        }
    }

    /**
     * Set up start button click handler
     * @param {Function} callback - Callback for start button click
     */
    onStartClick(callback) {
        if (this.startButton) {
            this.startButton.addEventListener('click', callback);
            this.startButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                callback();
            });
        }
    }

    /**
     * Set up reincarnate button click handler
     * @param {Function} callback - Callback for reincarnate button click
     */
    onReincarnateClick(callback) {
        if (this.reincarnateButton) {
            this.reincarnateButton.addEventListener('click', callback);
            this.reincarnateButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                callback();
            });
        }
    }

    /**
     * Set up mobile pause button click handler
     * @param {Function} callback - Callback for pause button click
     */
    onMobilePauseClick(callback) {
        if (this.mobilePauseButton) {
            this.mobilePauseButton.addEventListener('click', callback);
            this.mobilePauseButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                callback();
            });
        }
    }

    /**
     * Check if running on mobile
     * @returns {boolean}
     */
    isMobileDevice() {
        return this.isMobile;
    }
}

export default UIManager;
