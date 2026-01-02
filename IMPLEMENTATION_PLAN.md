# Implementation Plan: AR Virtual Desktop Experience

## Goal

Develop a WebXR-based AR application that enables users to place virtual desktops on real-world tables and interact with physics-enabled plates through touch gestures on Android devices.

## User Review Required

> [!IMPORTANT]
> **Technology Stack Confirmation**
> - **3D Library**: Three.js (recommended for WebXR compatibility and extensive documentation)
> - **Physics Engine**: Cannon.js (lightweight, well-suited for mobile)
> - **Build Tool**: Vite (fast development, optimized bundling)
> 
> Please confirm if these choices align with your preferences or if you have alternative libraries in mind.

> [!WARNING]
> **WebXR Limitations**
> - WebXR Hit Test API requires HTTPS in production
> - Not all Android devices support ARCore - we'll need to implement feature detection
> - Physics simulation may need optimization based on device performance

> [!IMPORTANT]
> **Meta Quest Fast-Follow**
> - Meta Quest support will be implemented immediately after Android testing is complete
> - Will require controller input mapping and potential hand tracking integration
> - Architecture designed to support multiple input modalities

## Proposed Changes

### Entry Page & Core Structure

#### [NEW] [index.html](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/index.html)

Single-page HTML structure with:
- Entry page with "Enter AR" button
- Optional simulated desktop preview container (non-AR Three.js scene)
- AR canvas overlay (hidden until AR session starts)
- Animated hint text container with fade in/out CSS animations
- Viewport meta tags for mobile optimization
- Script imports for Three.js, Cannon.js, and application code

---

#### [NEW] [style.css](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/style.css)

Styling for:
- Entry page layout with centered "Enter AR" button
- Simulated desktop preview container
- Full-screen AR canvas (hidden on entry page)
- Bottom-positioned hint text with semi-transparent background
- CSS keyframe animation for hint text fade in/out (continuous loop)
- Button styling with modern, premium aesthetics
- Loading states and error messages
- Mobile-optimized touch targets
- Smooth transitions between entry and AR modes

---

### JavaScript Application Modules

#### [NEW] [src/main.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/main.js)

Application entry point:
- Entry page initialization with simulated desktop preview
- "Enter AR" button event handling
- WebXR feature detection and compatibility checks
- AR session initialization and configuration
- Module orchestration (scene, physics, interaction managers)
- Error handling and user feedback
- Session lifecycle management
- Transition logic from entry page to AR mode

---

#### [NEW] [src/scene/SceneManager.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/scene/SceneManager.js)

Three.js scene setup and management:
- WebXR-compatible renderer configuration
- AR camera setup with appropriate near/far planes
- Ambient and directional lighting for PBR materials
- Animation loop with XR frame updates
- Scene graph management

---

#### [NEW] [src/scene/MaterialLibrary.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/scene/MaterialLibrary.js)

PBR material definitions:
- Desktop surface material (neutral, slightly transparent)
- Plate materials (vibrant solid colors with PBR properties)
- Surface detection overlay material (semi-transparent cyan)
- Shared material properties (metalness, roughness, normal maps)

---

### Surface Detection & Placement

#### [NEW] [src/ar/SurfaceDetector.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/ar/SurfaceDetector.js)

WebXR Hit Test implementation:
- Request hit test source for horizontal planes
- Continuous surface scanning during AR session
- Hit test result processing and filtering
- Surface mesh generation for visual feedback
- Coordinate transformation from hit test to world space

---

#### [NEW] [src/ar/DesktopPlacer.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/ar/DesktopPlacer.js)

Desktop placement logic:
- Touch event handling for surface tap detection
- Desktop geometry creation matching detected surface dimensions
- Anchor creation for persistent world-locked positioning
- Desktop bounds calculation for physics constraints
- Single desktop instance management

---

### Physics System

#### [NEW] [src/physics/PhysicsWorld.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/physics/PhysicsWorld.js)

Cannon.js physics world setup:
- Physics world initialization with appropriate gravity
- Time step management synchronized with render loop
- Collision detection configuration
- Performance optimization (broadphase, solver iterations)
- Debug visualization (optional, for development)

---

#### [NEW] [src/physics/PlatePhysics.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/physics/PlatePhysics.js)

Plate physics bodies and constraints:
- Rigid body creation for each plate
- Material properties (friction, restitution)
- Desktop boundary constraints (invisible walls)
- Collision groups and masks
- Velocity damping for realistic behavior

---

### Interactive Objects

#### [NEW] [src/objects/Plate.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/objects/Plate.js)

Plate object class:
- Three.js mesh creation (geometry + PBR material)
- Cannon.js physics body linkage
- Transform synchronization (physics → visual)
- Plate dimensions (15cm max width/depth, 2-3cm height)
- Color assignment from material library

---

#### [NEW] [src/objects/PlateSpawner.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/objects/PlateSpawner.js)

Plate spawning system:
- Spawn 5-8 plates when desktop is placed
- Random non-overlapping position generation
- Initial height offset for drop animation
- Plate instance management
- Cleanup on session end

---

### Interaction System

#### [NEW] [src/interaction/TouchHandler.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/interaction/TouchHandler.js)

Touch input processing:
- Touch start/move/end event listeners
- Raycasting from touch point to 3D scene
- Plate selection and deselection
- Gesture recognition (tap vs drag vs swipe)
- Multi-touch prevention for MVP

---

#### [NEW] [src/interaction/DragController.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/interaction/DragController.js)

Drag interaction implementation:
- Selected plate position updates following touch
- Constraint to desktop plane (Y-axis locking)
- Smooth interpolation for natural feel
- Physics body kinematic mode during drag
- Release handling with velocity calculation

---

#### [NEW] [src/interaction/ThrowController.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/interaction/ThrowController.js)

Throw gesture implementation:
- Touch velocity calculation from movement history
- Velocity vector application to physics body
- Throw force scaling for appropriate feel
- Maximum velocity capping
- Angular velocity for realistic tumbling

---

### UI Components

#### [NEW] [src/ui/EntryPage.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/ui/EntryPage.js)

Entry page management:
- "Enter AR" button initialization and styling
- Optional simulated desktop preview (Three.js scene without XR)
- Button click handler to transition to AR mode
- Entry page hide/show logic
- Simulated desktop animation (rotating plates, etc.)

---

#### [NEW] [src/ui/HintDisplay.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/ui/HintDisplay.js)

UI hint text management:
- Display "Tap a table to place virtual desktop" before placement
- Continuous fade in/out animation to encourage interaction
- Hide hint after desktop placement
- Show additional hints for interaction (optional)
- CSS animation control and synchronization
- Responsive positioning at bottom of screen

---

#### [NEW] [src/ui/ErrorHandler.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/ui/ErrorHandler.js)

Error messaging and fallbacks:
- WebXR not supported message
- ARCore not available message
- Session initialization failures
- User-friendly error descriptions
- Retry mechanisms

---

### Utilities

#### [NEW] [src/utils/XRUtils.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/utils/XRUtils.js)

WebXR helper functions:
- Feature detection utilities
- Reference space management
- Hit test source creation helpers
- Anchor management utilities
- Coordinate system conversions

---

#### [NEW] [src/utils/MathUtils.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/utils/MathUtils.js)

Mathematical utilities:
- Vector operations
- Boundary checking
- Random position generation within bounds
- Overlap detection for spawning
- Velocity calculations

---

### Configuration

#### [NEW] [src/config/constants.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/src/config/constants.js)

Application constants:
- Plate dimensions (max 0.15m / 15cm width/depth)
- Physics parameters (gravity, friction, restitution)
- Spawn count (5-8 plates)
- Material properties
- Performance settings (max FPS, physics steps)
- Animation timings (hint fade duration, etc.)
- UI configuration (button text, hint messages)

---

### Build Configuration

#### [NEW] [package.json](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/package.json)

Project dependencies and scripts:
- Three.js (latest stable)
- Cannon-es (ES6 version of Cannon.js)
- Vite for development and building
- Development server with HTTPS support
- Build scripts for production

---

#### [NEW] [vite.config.js](file:///Users/ken-junglee/Documents/lab/ar_lab/desktop/vite.config.js)

Vite configuration:
- HTTPS development server (required for WebXR)
- Build optimization settings
- Asset handling
- Source maps for debugging

---

## Verification Plan

### Automated Tests

```bash
# Install dependencies
npm install

# Start development server with HTTPS
npm run dev
```

**Browser Testing**
- Use browser_subagent to verify UI rendering
- Check hint text visibility and positioning
- Validate button states and interactions

### Manual Verification

**Phase 1: Entry Page**
1. Deploy to HTTPS server or use local HTTPS dev server
2. Access from Android device with Chrome
3. Verify entry page loads with "Enter AR" button
4. Check optional simulated desktop preview renders (if implemented)
5. Confirm button is clearly visible and tappable

**Phase 2: AR Session Initialization**
1. Tap "Enter AR" button
2. Verify smooth transition to AR mode
3. Confirm AR session starts without errors
4. Check camera feed displays correctly
5. Verify entry page elements are hidden

**Phase 3: Surface Detection**
1. Point device at horizontal surfaces (tables, desks)
2. Verify semi-transparent overlay appears on detected surfaces
3. Confirm hint text "Tap a table to place virtual desktop" displays
4. Verify hint text continuously fades in/out to encourage interaction
5. Test detection on multiple surface types

**Phase 4: Desktop Placement**
1. Tap detected surface
2. Verify desktop appears at tap location
3. Confirm desktop size matches detected surface
4. Check desktop remains anchored when moving device
5. Verify hint text disappears after placement

**Phase 5: Plate Spawning**
1. Observe 5-8 plates spawn on desktop
2. Verify plates don't overlap initially
3. Confirm plates settle onto desktop surface
4. Check plate sizes appear reasonable in AR (≤15cm)

**Phase 6: Drag Interaction**
1. Touch and hold a plate
2. Move finger across screen
3. Verify plate follows touch position
4. Confirm plate stays on desktop plane
5. Release and verify plate stops smoothly

**Phase 7: Throw Interaction**
1. Touch plate and perform quick swipe gesture
2. Verify plate moves with velocity in swipe direction
3. Confirm plate bounces off desktop boundaries
4. Check plate doesn't fall off edges

**Phase 8: Collision Physics**
1. Throw one plate at another
2. Verify plates collide and bounce realistically
3. Test multiple simultaneous collisions
4. Confirm physics simulation remains stable

**Phase 9: Performance**
1. Monitor frame rate during interaction (target 60 FPS)
2. Test with maximum plate count
3. Verify touch response feels immediate (<100ms)
4. Check for any jitter or stuttering

**Phase 10: Visual Quality**
1. Verify PBR materials render correctly
2. Check edges are clearly visible
3. Confirm lighting responds to environment
4. Validate color palette is vibrant and distinct

### Success Criteria

- ✅ Entry page loads within 1 second
- ✅ "Enter AR" button is clearly visible and functional
- ✅ Hint text animation is smooth and continuous
- ✅ AR session initializes within 3 seconds
- ✅ Surface detection works on 90%+ of horizontal surfaces
- ✅ Desktop placement accuracy within 5cm
- ✅ Consistent 60 FPS during normal interaction
- ✅ Touch response latency under 100ms
- ✅ Plates never escape desktop boundaries
- ✅ Collisions appear natural and physically accurate
- ✅ All interactions work smoothly on target Android device

### Meta Quest Fast-Follow Criteria

- ✅ Controller input works for selection and throwing
- ✅ Hand tracking functional (if API available)
- ✅ Performance maintained on Quest hardware
- ✅ UI adapted for headset viewing distance

### Known Limitations to Document

- Single desktop instance only (MVP constraint)
- Touch-only interaction (no controller/hand tracking yet)
- No session persistence across app restarts
- Limited to ARCore-compatible Android devices
- Requires HTTPS for WebXR API access
