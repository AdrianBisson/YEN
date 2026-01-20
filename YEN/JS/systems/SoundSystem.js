/**
 * @fileoverview Web Audio API sound system for game audio
 * @module systems/SoundSystem
 */

/**
 * Manages all game audio using Web Audio API synthesis
 * @class
 */
export class SoundSystem {
    /**
     * Create a new SoundSystem instance
     */
    constructor() {
        /** @type {AudioContext} */
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.context.suspend(); // Start suspended until user interaction

        /** @type {GainNode} */
        this.fxGain = this.context.createGain();
        this.fxGain.connect(this.context.destination);

        // Nibble collection sound (triangle wave)
        /** @type {OscillatorNode} */
        this.nibbleOscillator = this.context.createOscillator();
        /** @type {GainNode} */
        this.nibbleGain = this.context.createGain();
        this.nibbleOscillator.connect(this.nibbleGain);
        this.nibbleGain.connect(this.fxGain);
        this.nibbleOscillator.type = 'triangle';
        this.nibbleOscillator.frequency.setValueAtTime(440, this.context.currentTime);
        this.nibbleGain.gain.setValueAtTime(0, this.context.currentTime);

        // Collision sound (triangle wave)
        /** @type {OscillatorNode} */
        this.collisionOscillator = this.context.createOscillator();
        /** @type {GainNode} */
        this.collisionGain = this.context.createGain();
        this.collisionOscillator.connect(this.collisionGain);
        this.collisionGain.connect(this.fxGain);
        this.collisionOscillator.type = 'triangle';
        this.collisionOscillator.frequency.setValueAtTime(220, this.context.currentTime);
        this.collisionGain.gain.setValueAtTime(0, this.context.currentTime);

        // Shadow snake spawn sound (rich monk voice effect)
        /** @type {OscillatorNode} */
        this.shadowSpawnBase = this.context.createOscillator();
        /** @type {GainNode} */
        this.shadowSpawnBaseGain = this.context.createGain();
        this.shadowSpawnBase.connect(this.shadowSpawnBaseGain);
        this.shadowSpawnBaseGain.connect(this.fxGain);
        this.shadowSpawnBase.type = 'sine';
        this.shadowSpawnBase.frequency.setValueAtTime(120, this.context.currentTime);
        this.shadowSpawnBaseGain.gain.setValueAtTime(0, this.context.currentTime);

        // Harmonics for shadow spawn
        /** @type {OscillatorNode} */
        this.shadowSpawnHarmonics = this.context.createOscillator();
        /** @type {GainNode} */
        this.shadowSpawnHarmonicsGain = this.context.createGain();
        this.shadowSpawnHarmonics.connect(this.shadowSpawnHarmonicsGain);
        this.shadowSpawnHarmonicsGain.connect(this.fxGain);
        this.shadowSpawnHarmonics.type = 'sine';
        this.shadowSpawnHarmonics.frequency.setValueAtTime(240, this.context.currentTime);
        this.shadowSpawnHarmonicsGain.gain.setValueAtTime(0, this.context.currentTime);

        // Start all oscillators
        this.nibbleOscillator.start();
        this.collisionOscillator.start();
        this.shadowSpawnBase.start();
        this.shadowSpawnHarmonics.start();
    }

    /**
     * Play sound when collecting nibbles
     */
    playNibbleCollect() {
        const now = this.context.currentTime;

        this.nibbleOscillator.frequency.setValueAtTime(440, now); // A4

        // Quick attack and decay envelope
        this.nibbleGain.gain.setValueAtTime(0, now);
        this.nibbleGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        this.nibbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        this.nibbleGain.gain.setValueAtTime(0, now + 0.11);
    }

    /**
     * Play sound when snake collides
     */
    playCollision() {
        const now = this.context.currentTime;

        this.collisionGain.gain.setValueAtTime(0.2, now);
        this.collisionGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        this.collisionGain.gain.setValueAtTime(0, now + 0.21);
    }

    /**
     * Play sound when shadow snake spawns
     */
    playShadowSpawn() {
        const now = this.context.currentTime;

        // Base frequency and harmonics
        this.shadowSpawnBase.frequency.setValueAtTime(120, now);
        this.shadowSpawnHarmonics.frequency.setValueAtTime(240, now);

        // Rich envelope for base frequency
        this.shadowSpawnBaseGain.gain.setValueAtTime(0, now);
        this.shadowSpawnBaseGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
        this.shadowSpawnBaseGain.gain.exponentialRampToValueAtTime(0.3, now + 0.5);
        this.shadowSpawnBaseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        this.shadowSpawnBaseGain.gain.setValueAtTime(0, now + 1.51);

        // Envelope for harmonics
        this.shadowSpawnHarmonicsGain.gain.setValueAtTime(0, now);
        this.shadowSpawnHarmonicsGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        this.shadowSpawnHarmonicsGain.gain.exponentialRampToValueAtTime(0.2, now + 0.5);
        this.shadowSpawnHarmonicsGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        this.shadowSpawnHarmonicsGain.gain.setValueAtTime(0, now + 1.31);

        // Slight pitch bend for natural sound
        this.shadowSpawnBase.frequency.linearRampToValueAtTime(110, now + 1.5);
        this.shadowSpawnHarmonics.frequency.linearRampToValueAtTime(220, now + 1.5);
    }

    /**
     * Set master volume for all sound effects
     * @param {number} volume - Volume level (0-1)
     */
    setFxVolume(volume) {
        this.fxGain.gain.setValueAtTime(volume, this.context.currentTime);
    }

    /**
     * Resume audio context after user interaction
     */
    resume() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    /**
     * Pause audio context
     */
    pause() {
        if (this.context.state === 'running') {
            this.context.suspend();
        }
    }

    /**
     * Check if audio context is running
     * @returns {boolean}
     */
    isRunning() {
        return this.context.state === 'running';
    }
}

export default SoundSystem;
