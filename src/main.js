import { SceneManager } from './scene/SceneManager.js';
import { MaterialLibrary } from './scene/MaterialLibrary.js';
import { SurfaceDetector } from './ar/SurfaceDetector.js';
import { DesktopPlacer } from './ar/DesktopPlacer.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { PlateSpawner } from './objects/PlateSpawner.js';
import { TouchHandler } from './interaction/TouchHandler.js';
import { DragController } from './interaction/DragController.js';
import { ThrowController } from './interaction/ThrowController.js';
import { EntryPage } from './ui/EntryPage.js';
import { HintDisplay } from './ui/HintDisplay.js';
import { ErrorHandler } from './ui/ErrorHandler.js';
import { isARSupported, requestXRSession, getXRReferenceSpace, detectInputType, getHintText } from './utils/XRUtils.js';
import { XR_CONFIG } from './config/constants.js';

/**
 * Main application class
 */
class ARVirtualDesktop {
  constructor() {
    // UI Components
    this.entryPage = new EntryPage();
    this.hintDisplay = new HintDisplay();
    this.errorHandler = new ErrorHandler();

    // Core managers
    this.sceneManager = null;
    this.materialLibrary = null;
    this.physicsWorld = null;

    // AR components
    this.session = null;
    this.referenceSpace = null;
    this.surfaceDetector = null;
    this.desktopPlacer = null;

    // Objects and interaction
    this.plateSpawner = null;
    this.touchHandler = null;
    this.dragController = null;
    this.throwController = null;

    // State
    this.isDesktopPlaced = false;
    this.lastFrameTime = 0;

    this._initialize();
  }

  async _initialize() {
    // Check WebXR support
    const supported = await isARSupported();

    if (!supported) {
      this.errorHandler.showWebXRNotSupported();
      this.entryPage.disableButton();
      return;
    }

    // Setup entry page button
    this.entryPage.onEnterAR(this._onEnterAR.bind(this));

    console.log('AR Virtual Desktop initialized');
  }

  async _onEnterAR() {
    try {
      this.entryPage.disableButton();
      this.entryPage.showLoading();

      console.log('Requesting AR session with config:', XR_CONFIG);

      // Request AR session
      this.session = await requestXRSession('immersive-ar', {
        requiredFeatures: XR_CONFIG.requiredFeatures,
        optionalFeatures: XR_CONFIG.optionalFeatures,
      });

      console.log('AR session started successfully');

      // Check supported reference spaces for debugging
      const referenceSpaces = ['viewer', 'local', 'local-floor', 'bounded-floor', 'unbounded'];
      console.log('Checking supported reference spaces:');
      for (const space of referenceSpaces) {
        try {
          await this.session.requestReferenceSpace(space);
          console.log(`  ✓ ${space} - supported`);
        } catch (e) {
          console.log(`  ✗ ${space} - not supported`);
        }
      }

      // Setup session end handler
      this.session.addEventListener('end', this._onSessionEnd.bind(this));

      // Initialize AR components
      await this._setupAR();

      // Transition to AR mode
      this.entryPage.transitionToAR();

      // Detect input type and show appropriate hint
      const inputType = detectInputType(this.session);
      const placementHint = getHintText(inputType, 'place');
      console.log('Input type detected:', inputType);
      this.hintDisplay.showPlacementHint(placementHint);

    } catch (error) {
      console.error('Failed to start AR session:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      // Show more specific error message
      let errorMsg = 'Failed to start AR session. ';
      if (error.name === 'NotSupportedError') {
        errorMsg += 'WebXR AR is not supported on this device.';
      } else if (error.name === 'NotAllowedError') {
        errorMsg += 'Camera permission was denied. Please allow camera access.';
      } else if (error.name === 'SecurityError') {
        errorMsg += 'Security error. Make sure you are using HTTPS.';
      } else {
        errorMsg += error.message || 'Please try again.';
      }

      this.errorHandler.showCustomError(errorMsg);
      this.entryPage.hideLoading();
      this.entryPage.enableButton();
    }
  }

  async _setupAR() {
    const canvas = document.getElementById('ar-canvas');

    // Initialize scene manager
    this.sceneManager = new SceneManager(canvas);
    await this.sceneManager.startXRSession(this.session);

    // Initialize material library
    this.materialLibrary = new MaterialLibrary();

    // Get reference space
    this.referenceSpace = await getXRReferenceSpace(this.session, 'local');

    // Initialize surface detector
    this.surfaceDetector = new SurfaceDetector(
      this.session,
      this.sceneManager,
      this.materialLibrary
    );

    // Initialize desktop placer
    this.desktopPlacer = new DesktopPlacer(
      this.sceneManager,
      this.materialLibrary
    );

    // Initialize physics world
    this.physicsWorld = new PhysicsWorld();

    // Initialize plate spawner
    this.plateSpawner = new PlateSpawner(
      this.sceneManager,
      this.materialLibrary,
      this.physicsWorld
    );

    // Setup touch input for surface tap
    canvas.addEventListener('touchstart', this._onSurfaceTap.bind(this), { once: false });

    // Start render loop
    this.sceneManager.setAnimationLoop(this._onXRFrame.bind(this));

    console.log('AR components initialized');
  }

  _onSurfaceTap(event) {
    // Only handle taps before desktop is placed
    if (this.isDesktopPlaced) return;

    event.preventDefault();
  }

  _onXRFrame(time, frame) {
    if (!frame) return;

    // Calculate delta time
    const deltaTime = this.lastFrameTime ? (time - this.lastFrameTime) / 1000 : 0;
    this.lastFrameTime = time;

    // Update surface detection (before desktop placement)
    if (!this.isDesktopPlaced) {
      const hitTestResult = this.surfaceDetector.update(frame, this.referenceSpace);

      // Check for tap to place desktop
      if (hitTestResult && this._checkForTap(frame)) {
        this._placeDesktop(hitTestResult, frame);
      }
    }

    // Update physics
    if (this.isDesktopPlaced && this.physicsWorld) {
      this.physicsWorld.step(deltaTime);

      // Sync plate visuals with physics
      if (this.plateSpawner) {
        this.plateSpawner.update();
      }

      // Update touch handler for XR input (dragging)
      if (this.touchHandler) {
        this.touchHandler.update(frame, this.referenceSpace);
      }
    }

    // Render scene
    this.sceneManager.render();
  }

  _checkForTap(frame) {
    // Detect input from any XR input source (screen tap, controller, hand tracking)
    const inputSources = this.session.inputSources;

    for (const source of inputSources) {
      // Support multiple input modes:
      // - 'screen' for Android touch
      // - 'tracked-pointer' for Quest controllers
      // - 'gaze' for gaze-based input
      // - 'hand' for hand tracking (if available)
      const supportedModes = ['screen', 'tracked-pointer', 'gaze', 'hand'];

      if (supportedModes.includes(source.targetRayMode)) {
        const pose = frame.getPose(source.targetRaySpace, this.referenceSpace);
        if (pose) {
          console.log('Input detected from:', source.targetRayMode);
          return true;
        }
      }
    }

    return false;
  }

  async _placeDesktop(hitTestResult, frame) {
    try {
      console.log('Placing desktop...');

      // Try to get detected surface size from the overlay
      let detectedSize = null;
      if (this.surfaceDetector.surfaceOverlay && this.surfaceDetector.surfaceOverlay.geometry) {
        const geometry = this.surfaceDetector.surfaceOverlay.geometry;
        if (geometry.parameters) {
          detectedSize = {
            width: geometry.parameters.width,
            depth: geometry.parameters.height // PlaneGeometry uses height for depth
          };
          console.log('Detected surface dimensions:', detectedSize);
        }
      }

      // Place desktop with detected size
      const bounds = await this.desktopPlacer.placeDesktop(
        hitTestResult,
        frame,
        this.referenceSpace,
        detectedSize
      );

      // Setup physics boundaries
      this.physicsWorld.setupDesktopBoundaries(bounds);

      // Spawn plates
      this.plateSpawner.spawnPlates(bounds);

      // Setup interaction controllers
      this.dragController = new DragController(
        this.sceneManager,
        this.sceneManager.camera,
        bounds
      );

      this.throwController = new ThrowController(this.sceneManager.camera);

      // Setup touch handler with XR session
      this.touchHandler = new TouchHandler(
        this.sceneManager,
        this.sceneManager.camera,
        this.plateSpawner,
        this.session
      );

      // Connect touch handler callbacks
      this.touchHandler.onPlateSelected = (plate) => {
        console.log('Plate selected callback triggered');
        this.dragController.startDrag(plate);
      };

      this.touchHandler.onPlateDraggingXR = (plate, raycaster) => {
        // Update drag using XR raycaster
        this.dragController.updateDragXR(plate, raycaster);
      };

      this.touchHandler.onPlateReleased = (plate, gestureType) => {
        console.log('Plate released callback triggered');
        this.dragController.endDrag(plate);
      };

      this.touchHandler.onPlateThrown = (plate, velocity) => {
        console.log('Plate thrown callback triggered with velocity:', velocity);
        this.dragController.endDrag(plate);
        this.throwController.throwPlate(plate, velocity);
      };

      // Hide surface overlay and placement hint
      this.surfaceDetector.hideOverlay();
      this.hintDisplay.hide();

      // Update state
      this.isDesktopPlaced = true;

      console.log('Desktop placed successfully');

    } catch (error) {
      console.error('Failed to place desktop:', error);
    }
  }

  _onSessionEnd() {
    console.log('AR session ended');

    // Cleanup components
    if (this.touchHandler) {
      this.touchHandler.dispose();
      this.touchHandler = null;
    }

    if (this.dragController) {
      this.dragController.dispose();
      this.dragController = null;
    }

    if (this.plateSpawner) {
      this.plateSpawner.dispose();
      this.plateSpawner = null;
    }

    if (this.surfaceDetector) {
      this.surfaceDetector.dispose();
      this.surfaceDetector = null;
    }

    if (this.desktopPlacer) {
      this.desktopPlacer.dispose();
      this.desktopPlacer = null;
    }

    if (this.physicsWorld) {
      this.physicsWorld.dispose();
      this.physicsWorld = null;
    }

    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }

    if (this.materialLibrary) {
      this.materialLibrary.dispose();
      this.materialLibrary = null;
    }

    // Reset state
    this.isDesktopPlaced = false;
    this.session = null;
    this.referenceSpace = null;

    // Return to entry page
    this.hintDisplay.hide();
    this.entryPage.returnToEntry();
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ARVirtualDesktop();
});
