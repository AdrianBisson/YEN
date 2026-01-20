# YEN: the Eternal Longing

A 3D Snake game built with Three.js featuring beautiful shader effects, dynamic lighting, and smooth gameplay.

## Features

- **3D Snake Gameplay**: Navigate through a beautiful cube environment
- **Dynamic Shader Walls**: Animated rainbow patterns on the cube walls
- **Shadow Snakes**: AI-controlled snakes that spawn when you cross boundaries
- **Sound System**: Immersive audio with Web Audio API
- **Mobile Support**: Touch controls for mobile devices
- **Camera Modes**: Follow camera or stationary orbit camera
- **Customizable Settings**: Adjust speed, colors, spawn rates, and more
- **Beautiful Visuals**: Starfield background and smooth animations

## How to Play

1. **Start the Game**: Click "Start Game" on the splash screen
2. **Control the Snake**: Use mouse movement to control the snake's direction
3. **Collect Nibbles**: Eat the glowing yellow orbs to grow your snake
4. **Avoid Collisions**: Don't hit your own body or shadow snakes
5. **Cross Boundaries**: When you cross cube walls, shadow snakes will spawn
6. **Pause**: Press SPACE to pause and access settings

## Controls

- **Mouse/Touch**: Control snake direction
- **SPACE**: Pause/Resume game
- **W/S**: Orbit camera up/down (stationary mode)
- **A/D**: Orbit camera left/right (stationary mode)
- **Q/E**: Zoom camera in/out (stationary mode)

## Settings

- **Player Speed**: Control how fast your snake moves
- **Color Cycle Rate**: Adjust rainbow color animation speed
- **Field of View**: Change camera perspective
- **Shadow Snake Speed**: Control AI snake movement speed
- **Nibble Spawn Rate**: Adjust how often food appears
- **Sound Effects Volume**: Master volume control
- **Wall Pattern Opacity**: Transparency of cube walls
- **Stationary Camera Mode**: Toggle between follow and orbit camera
- **Wireframe Mode**: Switch between shader and wireframe walls

## Technical Details

- **Engine**: Three.js for 3D graphics
- **Audio**: Web Audio API for sound effects
- **Shaders**: Custom GLSL shaders for wall effects
- **Physics**: Collision detection and boundary checking
- **Mobile**: Responsive design with touch controls

## File Structure

```
SNAKE/
├── index.html          # Main HTML file
├── js/
│   └── working-game.js # Complete game implementation
└── README.md           # This file
```

## Running the Game

1. **Local Server**: Run a local HTTP server (required for ES6 modules)
   ```bash
   python3 -m http.server 8000
   ```
2. **Open Browser**: Navigate to `http://localhost:8000`
3. **Enjoy**: The game will load automatically

## Browser Requirements

- Modern browser with WebGL support
- ES6 module support
- Web Audio API support

## Development

The game is built as a single, self-contained module that includes:
- Complete game logic
- 3D scene management
- Input handling
- Audio system
- UI management

All functionality is contained in `js/working-game.js` for easy maintenance and modification.
