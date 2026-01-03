import * as THREE from 'three';

/**
 * Visualizes XR controllers with rays for better user feedback
 */
export class ControllerVisualizer {
  constructor(session, sceneManager) {
    this.session = session;
    this.sceneManager = sceneManager;

    // Track controller visualizations
    this.controllers = new Map(); // inputSource.id -> {ray, pointer}

    this.rayLength = 5.0; // 5 meters
    this.isActive = true;
  }

  /**
   * Update controller visualizations each frame
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   */
  update(frame, referenceSpace) {
    if (!this.isActive) return;

    const inputSources = this.session.inputSources;
    const activeControllerIds = new Set();

    // Update or create visualizations for active input sources
    for (const inputSource of inputSources) {
      // Only visualize tracked-pointer (controllers) and hand tracking
      if (inputSource.targetRayMode === 'tracked-pointer' || inputSource.targetRayMode === 'hand') {
        const id = this._getInputSourceId(inputSource);
        activeControllerIds.add(id);

        // Get controller pose
        const pose = frame.getPose(inputSource.targetRaySpace, referenceSpace);
        if (pose) {
          // Create visualization if it doesn't exist
          if (!this.controllers.has(id)) {
            this._createControllerVisualization(id, inputSource.targetRayMode);
          }

          // Update visualization
          this._updateControllerVisualization(id, pose);
        }
      }
    }

    // Remove visualizations for inactive controllers
    for (const [id, viz] of this.controllers.entries()) {
      if (!activeControllerIds.has(id)) {
        this._removeControllerVisualization(id);
      }
    }
  }

  /**
   * Create visual representation of controller
   * @param {string} id
   * @param {string} rayMode
   */
  _createControllerVisualization(id, rayMode) {
    // Create controller pointer (small sphere at controller position)
    const pointerGeometry = new THREE.SphereGeometry(0.01, 8, 8); // 1cm sphere
    const pointerMaterial = new THREE.MeshBasicMaterial({
      color: rayMode === 'hand' ? 0xff6b6b : 0x00bcd4, // Red for hands, cyan for controllers
      transparent: true,
      opacity: 0.8,
    });
    const pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
    this.sceneManager.add(pointer);

    // Create ray line
    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -this.rayLength)
    ]);
    const rayMaterial = new THREE.LineBasicMaterial({
      color: rayMode === 'hand' ? 0xff6b6b : 0x00bcd4,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });
    const ray = new THREE.Line(rayGeometry, rayMaterial);
    this.sceneManager.add(ray);

    // Create ray end indicator (small ring)
    const ringGeometry = new THREE.RingGeometry(0.02, 0.03, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: rayMode === 'hand' ? 0xff6b6b : 0x00bcd4,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // Face upward
    this.sceneManager.add(ring);

    // Store references
    this.controllers.set(id, { pointer, ray, ring });

    console.log(`Controller visualization created for ${rayMode} input`);
  }

  /**
   * Update controller visualization position and orientation
   * @param {string} id
   * @param {XRPose} pose
   */
  _updateControllerVisualization(id, pose) {
    const viz = this.controllers.get(id);
    if (!viz) return;

    const { pointer, ray, ring } = viz;

    // Extract position and orientation from pose
    const position = new THREE.Vector3(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z
    );

    const quaternion = new THREE.Quaternion(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    );

    // Update pointer position
    pointer.position.copy(position);

    // Update ray position and orientation
    ray.position.copy(position);
    ray.quaternion.copy(quaternion);

    // Calculate ray end position for ring
    const rayDirection = new THREE.Vector3(0, 0, -1);
    rayDirection.applyQuaternion(quaternion);
    const rayEnd = position.clone().add(rayDirection.multiplyScalar(this.rayLength));

    ring.position.copy(rayEnd);
    // Orient ring perpendicular to ray
    const ringRotation = new THREE.Euler().setFromQuaternion(quaternion);
    ring.rotation.x = ringRotation.x - Math.PI / 2;
    ring.rotation.y = ringRotation.y;
    ring.rotation.z = ringRotation.z;
  }

  /**
   * Remove controller visualization
   * @param {string} id
   */
  _removeControllerVisualization(id) {
    const viz = this.controllers.get(id);
    if (!viz) return;

    const { pointer, ray, ring } = viz;

    // Remove from scene
    this.sceneManager.remove(pointer);
    this.sceneManager.remove(ray);
    this.sceneManager.remove(ring);

    // Dispose geometries and materials
    pointer.geometry.dispose();
    pointer.material.dispose();
    ray.geometry.dispose();
    ray.material.dispose();
    ring.geometry.dispose();
    ring.material.dispose();

    this.controllers.delete(id);
  }

  /**
   * Get unique ID for input source
   * @param {XRInputSource} inputSource
   * @returns {string}
   */
  _getInputSourceId(inputSource) {
    // Use handedness + targetRayMode as unique identifier
    return `${inputSource.handedness}-${inputSource.targetRayMode}`;
  }

  /**
   * Show controller visualizations
   */
  show() {
    this.isActive = true;
    for (const [id, viz] of this.controllers.entries()) {
      viz.pointer.visible = true;
      viz.ray.visible = true;
      viz.ring.visible = true;
    }
  }

  /**
   * Hide controller visualizations
   */
  hide() {
    this.isActive = false;
    for (const [id, viz] of this.controllers.entries()) {
      viz.pointer.visible = false;
      viz.ray.visible = false;
      viz.ring.visible = false;
    }
  }

  /**
   * Cleanup all controller visualizations
   */
  dispose() {
    for (const [id, viz] of this.controllers.entries()) {
      this._removeControllerVisualization(id);
    }
    this.controllers.clear();
    this.isActive = false;
  }
}
