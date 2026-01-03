import * as THREE from 'three';
import { screenToNDC } from '../utils/MathUtils.js';
import { INTERACTION } from '../config/constants.js';

/**
 * Handles touch input and raycasting for plate selection
 */
export class TouchHandler {
  constructor(sceneManager, camera, plateSpawner, session) {
    this.sceneManager = sceneManager;
    this.camera = camera;
    this.plateSpawner = plateSpawner;
    this.session = session;

    this.raycaster = new THREE.Raycaster();
    this.selectedPlate = null;
    this.touchStartPos = null;
    this.touchHistory = [];
    this.canvas = sceneManager.canvas;
    this.isSelecting = false;

    // For XR input tracking
    this.inputSource = null;

    this._setupEventListeners();
  }

  _setupEventListeners() {
    // Use XR session input events instead of canvas touch events
    this.session.addEventListener('selectstart', this._onSelectStart.bind(this));
    this.session.addEventListener('selectend', this._onSelectEnd.bind(this));

    console.log('XR input event listeners attached');
  }

  _onSelectStart(event) {
    console.log('XR selectstart event fired!', event);
    this.isSelecting = true;
    this.inputSource = event.inputSource;
    this.touchStartPos = { time: Date.now() };
    this.touchHistory = [this.touchStartPos];

    // Note: We can't raycast here directly because we don't have access to the XRFrame
    // The raycasting will happen in the update() method
    // For now, just mark that selection has started
  }

  /**
   * Internal method called from update() to perform initial plate selection
   */
  _performInitialSelection(frame, referenceSpace) {
    if (!this.inputSource) return;

    // Get input source pose
    const inputPose = frame.getPose(this.inputSource.targetRaySpace, referenceSpace);
    if (!inputPose) return;

    // Setup raycaster from input pose
    const matrix = new THREE.Matrix4();
    matrix.fromArray(inputPose.transform.matrix);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);

    // Set ray origin and direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(quaternion);

    this.raycaster.set(position, direction);

    // Perform raycasting with XR input source
    const intersectedPlate = this._raycastPlatesXR();

    if (intersectedPlate && !this.selectedPlate) {
      console.log('Plate selected via XR input!');
      this.selectedPlate = intersectedPlate;
      this.onPlateSelected?.(intersectedPlate);
    }
  }

  _onSelectEnd(event) {
    console.log('XR selectend event fired!');
    this.isSelecting = false;

    if (!this.selectedPlate) return;

    // For now, just release the plate
    // TODO: Implement velocity calculation for throw
    this.onPlateReleased?.(this.selectedPlate, 'tap');

    // Reset state
    this.selectedPlate = null;
    this.inputSource = null;
    this.touchStartPos = null;
    this.touchHistory = [];
  }

  /**
   * Update method to be called each frame for dragging
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   */
  update(frame, referenceSpace) {
    if (!this.isSelecting || !this.inputSource) return;

    // If we just started selecting but haven't selected a plate yet, try to select one
    if (!this.selectedPlate) {
      this._performInitialSelection(frame, referenceSpace);
      return;
    }

    // Get input source pose for dragging
    const inputPose = frame.getPose(this.inputSource.targetRaySpace, referenceSpace);
    if (!inputPose) return;

    // Use the input ray direction for raycasting
    const matrix = new THREE.Matrix4();
    matrix.fromArray(inputPose.transform.matrix);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);

    // Set ray origin and direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(quaternion);

    this.raycaster.set(position, direction);

    // Notify drag controller with raycast hit position
    // The drag controller will handle the actual position update
    this.onPlateDraggingXR?.(this.selectedPlate, this.raycaster);
  }

  _raycastPlatesXR() {
    // Raycaster should already be set up with XR input source ray
    // Get all plate meshes
    const plateMeshes = this.plateSpawner.getPlates().map(plate => plate.getMesh());

    console.log('XR raycasting - Plate count:', plateMeshes.length);

    // Perform raycasting
    const intersects = this.raycaster.intersectObjects(plateMeshes, false);

    console.log('XR intersects found:', intersects.length);
    if (intersects.length > 0) {
      console.log('First intersect distance:', intersects[0].distance);
    }

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const plate = this.plateSpawner.findPlateByMesh(mesh);
      console.log('Plate found via XR:', plate);
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
    if (this.session) {
      this.session.removeEventListener('selectstart', this._onSelectStart);
      this.session.removeEventListener('selectend', this._onSelectEnd);
    }
  }
}
