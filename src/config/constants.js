// Application Configuration Constants

// Plate Physics & Dimensions
export const PLATE = {
  MAX_WIDTH: 0.08,  // 8cm width (reduced from 15cm)
  MAX_DEPTH: 0.08,  // 8cm depth (reduced from 15cm)
  HEIGHT: 0.025,    // 2.5cm height (keep thickness)
  SHAPE: 'box',     // 'cylinder' for circular plates, 'box' for square plates
  MASS: 0.3,        // kg (reduced mass for smaller size)
  FRICTION: 0.25,   // Reduced for better sliding (balanced between control and momentum)
  RESTITUTION: 0.3, // Bounciness (0 = no bounce, 1 = perfect bounce)
};

// Plate Spawning
export const SPAWN = {
  MIN_PLATES: 5,
  MAX_PLATES: 8,
  INITIAL_HEIGHT: 0.15, // Height above desktop to spawn (reduced for faster settle)
  MIN_SPACING: 0.10,    // Minimum distance between plates (increased for boxes)
};

// Desktop Properties
export const DESKTOP = {
  MIN_SIZE: 0.4,    // Minimum desktop size (0.4m x 0.4m)
  MAX_SIZE: 2.0,    // Maximum desktop size (2m x 2m)
  THICKNESS: 0.02,  // Desktop thickness
  WALL_HEIGHT: 0.15, // Invisible boundary wall height (increased)
};

// Physics World
export const PHYSICS = {
  GRAVITY: -9.82, // m/s² (Earth gravity)
  TIME_STEP: 1 / 60, // Fixed time step for physics simulation
  MAX_SUB_STEPS: 3,
  SOLVER_ITERATIONS: 10,
  DAMPING: 0.01, // Linear damping (0-1)
  ANGULAR_DAMPING: 0.05, // Angular damping (0-1)
};

// Interaction
export const INTERACTION = {
  DRAG_SMOOTH_FACTOR: 0.3, // Lower = smoother but more lag
  THROW_VELOCITY_SCALE: 2.0, // Multiplier for throw velocity (legacy 2D touch)
  MAX_THROW_VELOCITY: 8.0, // m/s maximum throw speed (increased for more satisfying throws)
  TOUCH_SAMPLES: 3, // Number of touch positions to track for velocity calculation
  TAP_THRESHOLD: 10, // pixels - movement less than this is considered a tap
  SWIPE_THRESHOLD: 50, // pixels - movement more than this is a swipe
};

// Materials & Colors
export const MATERIALS = {
  DESKTOP: {
    color: 0xe0e0e0,
    metalness: 0.1,
    roughness: 0.8,
    opacity: 0.95,
    transparent: true,
  },
  SURFACE_OVERLAY: {
    color: 0x00bcd4,
    opacity: 0.4,
    transparent: true,
    wireframe: false,
  },
  PLATE_COLORS: [
    0xff5252, // Red
    0x2196f3, // Blue
    0x4caf50, // Green
    0xffc107, // Amber
    0x9c27b0, // Purple
    0xff6f00, // Orange
    0x00bcd4, // Cyan
    0xe91e63, // Pink
  ],
  PLATE_PBR: {
    metalness: 0.2,
    roughness: 0.6,
  },
};

// UI
export const UI = {
  HINT_FADE_DURATION: 2000, // ms for fade in/out animation
  HINT_PLACEMENT: 'Tap a table to place virtual desktop',
  HINT_INTERACTION: 'Drag or throw plates to interact',
  LOADING_TEXT: 'Initializing AR...',
  ERROR_NO_WEBXR: 'WebXR is not supported on this device. Please use Chrome on Android with ARCore support.',
  ERROR_NO_AR: 'AR mode is not available. Please ensure you have ARCore installed.',
  ERROR_SESSION_FAILED: 'Failed to start AR session. Please try again.',
};

// Performance
export const PERFORMANCE = {
  TARGET_FPS: 60,
  MAX_DRAW_CALLS: 100,
  TEXTURE_MAX_SIZE: 512,
};

// WebXR Session Configuration
export const XR_CONFIG = {
  sessionMode: 'immersive-ar',
  requiredFeatures: ['hit-test'],
  optionalFeatures: ['anchors'],
};
