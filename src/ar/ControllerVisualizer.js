import * as THREE from 'three';

/**
 * Visualizes XR controllers with rays for better user feedback
 */
export class ControllerVisualizer {
  constructor(session, sceneManager, surfaceDetector = null) {
    this.session = session;
    this.sceneManager = sceneManager;
    this.surfaceDetector = surfaceDetector; // For checking plane intersections

    // Track controller visualizations
    this.controllers = new Map(); // inputSource.id -> {ray, pointer, disc}

    this.maxRayLength = 5.0; // 5 meters (maximum)
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

    // Create ray line (will be updated dynamically based on intersections)
    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -this.maxRayLength)
    ]);
    const rayMaterial = new THREE.LineBasicMaterial({
      color: rayMode === 'hand' ? 0xff6b6b : 0x00bcd4,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });
    const ray = new THREE.Line(rayGeometry, rayMaterial);
    this.sceneManager.add(ray);

    // Create intersection disc (shown when ray hits a plane)
    const discGeometry = new THREE.CircleGeometry(0.01, 32); // 1cm disc
    const discMaterial = new THREE.MeshBasicMaterial({
      color: rayMode === 'hand' ? 0xff6b6b : 0x00bcd4,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false, // Prevent z-fighting
    });
    const disc = new THREE.Mesh(discGeometry, discMaterial);
    disc.renderOrder = 999; // Render on top to avoid z-fighting
    disc.visible = false; // Hidden by default
    this.sceneManager.add(disc);

    // Store references
    this.controllers.set(id, { pointer, ray, disc });

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

    const { pointer, ray, disc } = viz;

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

    // Get ray direction in world space
    const rayDirection = new THREE.Vector3(0, 0, -1);
    rayDirection.applyQuaternion(quaternion).normalize();

    // Check for plane intersections
    let rayLength = this.maxRayLength;
    let hitPoint = null;
    let hitNormal = null;
    let hitMesh = null;

    if (this.surfaceDetector && this.surfaceDetector.planeMeshes) {
      const raycaster = new THREE.Raycaster(position, rayDirection);
      let closestDistance = Infinity;

      this.surfaceDetector.planeMeshes.forEach((mesh) => {
        const intersects = raycaster.intersectObject(mesh, false);
        if (intersects.length > 0) {
          const distance = intersects[0].distance;
          if (distance < closestDistance) {
            closestDistance = distance;
            hitPoint = intersects[0].point;
            hitNormal = intersects[0].face ? intersects[0].face.normal.clone() : null;
            hitMesh = mesh;
            rayLength = distance;
          }
        }
      });
    }

    // Update ray geometry with new length (in LOCAL space of the ray object)
    // The ray naturally points along -Z in its local space, so we just set the length
    const rayEndLocal = new THREE.Vector3(0, 0, -rayLength);
    ray.geometry.setFromPoints([
      new THREE.Vector3(0, 0, 0),
      rayEndLocal
    ]);
    ray.position.copy(position);
    ray.quaternion.copy(quaternion);

    // Update disc visibility and position
    if (hitPoint && hitNormal && hitMesh) {
      disc.visible = true;

      // Transform normal from mesh local space to world space
      const worldNormal = hitNormal.clone()
        .transformDirection(hitMesh.matrixWorld)
        .normalize();

      // Offset the disc slightly above the surface to prevent z-fighting
      const offsetDistance = 0.002; // 2mm offset
      disc.position.copy(hitPoint).add(worldNormal.clone().multiplyScalar(offsetDistance));

      // Orient disc perpendicular to the hit surface
      disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), worldNormal);
    } else {
      disc.visible = false;
    }
  }

  /**
   * Remove controller visualization
   * @param {string} id
   */
  _removeControllerVisualization(id) {
    const viz = this.controllers.get(id);
    if (!viz) return;

    const { pointer, ray, disc } = viz;

    // Remove from scene
    this.sceneManager.remove(pointer);
    this.sceneManager.remove(ray);
    this.sceneManager.remove(disc);

    // Dispose geometries and materials
    pointer.geometry.dispose();
    pointer.material.dispose();
    ray.geometry.dispose();
    ray.material.dispose();
    disc.geometry.dispose();
    disc.material.dispose();

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
      // disc visibility is controlled by intersection detection
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
      viz.disc.visible = false;
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
