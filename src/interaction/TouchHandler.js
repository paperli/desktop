import * as THREE from 'three';
import { screenToNDC } from '../utils/MathUtils.js';
import { INTERACTION } from '../config/constants.js';

/**
 * Handles touch input and raycasting for plate selection
 */
export class TouchHandler {
  constructor(sceneManager, camera, plateSpawner) {
    this.sceneManager = sceneManager;
    this.camera = camera;
    this.plateSpawner = plateSpawner;

    this.raycaster = new THREE.Raycaster();
    this.selectedPlate = null;
    this.touchStartPos = null;
    this.touchHistory = [];
    this.canvas = sceneManager.canvas;

    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
  }

  _onTouchStart(event) {
    event.preventDefault();

    if (event.touches.length !== 1) return; // Only handle single touch

    const touch = event.touches[0];
    this.touchStartPos = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Initialize touch history
    this.touchHistory = [this.touchStartPos];

    // Perform raycasting to detect plate
    const intersectedPlate = this._raycastPlates(touch.clientX, touch.clientY);

    if (intersectedPlate) {
      console.log('Plate selected!');
      this.selectedPlate = intersectedPlate;
      this.onPlateSelected?.(intersectedPlate);
    } else {
      console.log('No plate detected at touch position');
    }
  }

  _onTouchMove(event) {
    event.preventDefault();

    if (event.touches.length !== 1 || !this.selectedPlate) return;

    const touch = event.touches[0];
    const touchPos = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Update touch history (keep only recent samples)
    this.touchHistory.push(touchPos);
    if (this.touchHistory.length > INTERACTION.TOUCH_SAMPLES) {
      this.touchHistory.shift();
    }

    this.onPlateDragged?.(this.selectedPlate, touch.clientX, touch.clientY);
  }

  _onTouchEnd(event) {
    event.preventDefault();

    if (!this.selectedPlate || !this.touchStartPos) return;

    const lastTouch = this.touchHistory[this.touchHistory.length - 1];

    // Calculate movement distance
    const dx = lastTouch.x - this.touchStartPos.x;
    const dy = lastTouch.y - this.touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine gesture type
    if (distance < INTERACTION.TAP_THRESHOLD) {
      // Tap - just release
      this.onPlateReleased?.(this.selectedPlate, 'tap');
    } else if (distance > INTERACTION.SWIPE_THRESHOLD) {
      // Swipe/throw
      this.onPlateThrown?.(this.selectedPlate, this.touchHistory);
    } else {
      // Regular drag release
      this.onPlateReleased?.(this.selectedPlate, 'drag');
    }

    // Reset state
    this.selectedPlate = null;
    this.touchStartPos = null;
    this.touchHistory = [];
  }

  _raycastPlates(screenX, screenY) {
    // Convert screen coordinates to NDC
    const ndc = screenToNDC(screenX, screenY, this.canvas);

    // Setup raycaster
    this.raycaster.setFromCamera(ndc, this.camera);

    // Get all plate meshes
    const plateMeshes = this.plateSpawner.getPlates().map(plate => plate.getMesh());

    console.log('Raycasting with NDC:', ndc, 'Plate count:', plateMeshes.length);

    // Perform raycasting
    const intersects = this.raycaster.intersectObjects(plateMeshes, false);

    console.log('Intersects found:', intersects.length);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const plate = this.plateSpawner.findPlateByMesh(mesh);
      console.log('Plate found:', plate);
      return plate;
    }

    return null;
  }

  /**
   * Get selected plate
   * @returns {Plate|null}
   */
  getSelectedPlate() {
    return this.selectedPlate;
  }

  /**
   * Cleanup event listeners
   */
  dispose() {
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
  }
}
