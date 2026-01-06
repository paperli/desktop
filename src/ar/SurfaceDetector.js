import * as THREE from 'three';

/**
 * Handles WebXR plane detection for surface detection
 * Uses native plane detection API (frame.detectedPlanes) instead of hit testing
 */
export class SurfaceDetector {
  constructor(session, sceneManager, materialLibrary) {
    this.session = session;
    this.sceneManager = sceneManager;
    this.materialLibrary = materialLibrary;

    this.planeMeshes = new Map(); // Store meshes for each detected plane
    this.isReady = false;
    this.selectedPlane = null; // Currently selected plane for desktop placement
    this.planeDetectionSupported = false;
    this.currentPointedPlane = null; // Track which plane is being pointed at

    this._initialize();
  }

  async _initialize() {
    try {
      // Check if plane detection is enabled
      this.planeDetectionSupported = this.session.enabledFeatures &&
                                     this.session.enabledFeatures.includes('plane-detection');

      if (this.planeDetectionSupported) {
        console.log('✅ Plane detection enabled');
      } else {
        console.warn('⚠️ Plane detection not supported - will not show detected surfaces');
      }

      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize surface detector:', error);
    }
  }

  /**
   * Create a mesh for a detected plane
   * @returns {THREE.Mesh} Plane visualization mesh
   */
  _createPlaneMesh() {
    // Create a mesh with semi-transparent material and random color
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(Math.random(), Math.random(), Math.random()),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      wireframe: false
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Add wireframe outline for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    mesh.add(line);

    return mesh;
  }

  /**
   * Create geometry from plane polygon points
   * @param {Array} polygon - Array of DOMPointReadOnly vertices
   * @returns {THREE.BufferGeometry} Triangulated plane geometry
   */
  _createPlaneGeometryFromPolygon(polygon) {
    const vertices = [];
    const indices = [];

    // Add vertices
    for (let i = 0; i < polygon.length; i++) {
      vertices.push(polygon[i].x, polygon[i].y, polygon[i].z);
    }

    // Triangulate polygon (simple fan triangulation from first vertex)
    for (let i = 1; i < polygon.length - 1; i++) {
      indices.push(0, i, i + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Update plane detection and visualize detected planes
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   */
  update(frame, referenceSpace) {
    if (!this.isReady || !this.planeDetectionSupported) {
      return;
    }

    // Get detected planes from the frame
    const detectedPlanes = frame.detectedPlanes;

    if (!detectedPlanes) {
      return;
    }

    // Track which planes are still active
    const activePlanes = new Set();

    // Update or create meshes for detected planes
    detectedPlanes.forEach((plane) => {
      // Only process horizontal planes
      if (plane.orientation !== 'horizontal') {
        return;
      }

      // Get plane pose to check height
      const pose = frame.getPose(plane.planeSpace, referenceSpace);
      if (!pose) {
        return;
      }

      const planeHeight = pose.transform.position.y;

      // FILTER OUT CEILING: Reject planes above 2.0m (typical ceiling height)
      if (planeHeight > 2.0) {
        console.log(`Ceiling rejected - too high (${planeHeight.toFixed(2)}m)`);
        return;
      }

      // FILTER OUT LARGE FLOOR: Reject very large planes below 0.5m (likely floor)
      if (planeHeight < 0.5 && plane.polygon) {
        const area = this._calculatePolygonArea(plane.polygon);
        if (area > 3.0) { // Floor is usually > 3 square meters
          console.log(`Floor rejected - too low and large (${planeHeight.toFixed(2)}m, ${area.toFixed(2)}m²)`);
          return;
        }
      }

      activePlanes.add(plane);

      let mesh = this.planeMeshes.get(plane);

      if (!mesh) {
        // Create new mesh for this plane
        mesh = this._createPlaneMesh();
        this.planeMeshes.set(plane, mesh);
        this.sceneManager.add(mesh);
        console.log(`Table surface detected at height ${planeHeight.toFixed(2)}m`);
      }

      // Update mesh geometry and position
      this._updatePlaneMesh(mesh, plane, frame, referenceSpace);
    });

    // Remove meshes for planes that are no longer detected
    this.planeMeshes.forEach((mesh, plane) => {
      if (!activePlanes.has(plane)) {
        this.sceneManager.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        // Dispose wireframe child
        if (mesh.children[0]) {
          mesh.children[0].geometry.dispose();
          mesh.children[0].material.dispose();
        }
        this.planeMeshes.delete(plane);
        console.log('Plane removed (no longer detected)');
      }
    });

    // Update highlighting for plane being pointed at
    this._updatePointedPlaneHighlight(frame, referenceSpace);
  }

  /**
   * Update visual highlight for the plane being pointed at
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   */
  _updatePointedPlaneHighlight(frame, referenceSpace) {
    const pointedPlane = this._getPointedPlaneInternal(frame, referenceSpace);

    // Reset previous highlighted plane
    if (this.currentPointedPlane && this.currentPointedPlane !== pointedPlane) {
      const prevMesh = this.planeMeshes.get(this.currentPointedPlane);
      if (prevMesh && prevMesh.material) {
        // Reset to normal opacity
        prevMesh.material.opacity = 0.5;
      }
    }

    // Highlight new pointed plane
    if (pointedPlane) {
      const mesh = this.planeMeshes.get(pointedPlane);
      if (mesh && mesh.material) {
        // Increase opacity to highlight
        mesh.material.opacity = 0.8;
      }
    }

    this.currentPointedPlane = pointedPlane;
  }

  /**
   * Get the plane that the user is pointing at with their controller/hand (internal helper)
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   * @returns {XRPlane|null} The plane being pointed at, or null
   */
  _getPointedPlaneInternal(frame, referenceSpace) {
    if (!this.planeDetectionSupported || this.planeMeshes.size === 0) {
      return null;
    }

    // Get input sources (controllers, hands, gaze)
    const session = frame.session;
    const inputSources = session.inputSources;

    if (!inputSources || inputSources.length === 0) {
      return null;
    }

    // Check ALL input sources (both left and right hands/controllers)
    let closestPlane = null;
    let closestDistance = Infinity;
    let foundFromHand = null;

    for (const inputSource of inputSources) {
      const targetRayPose = frame.getPose(inputSource.targetRaySpace, referenceSpace);

      if (!targetRayPose) {
        continue; // Skip this input source if no pose
      }

      // Create ray from input source
      const rayOrigin = new THREE.Vector3(
        targetRayPose.transform.position.x,
        targetRayPose.transform.position.y,
        targetRayPose.transform.position.z
      );

      // Get ray direction from the transform matrix
      const matrix = new THREE.Matrix4().fromArray(targetRayPose.transform.matrix);
      const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(matrix).normalize();

      // Create raycaster
      const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);

      // Find closest plane intersection from this input source
      this.planeMeshes.forEach((mesh, plane) => {
        const intersects = raycaster.intersectObject(mesh, false);
        if (intersects.length > 0) {
          const distance = intersects[0].distance;
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPlane = plane;
            foundFromHand = inputSource.handedness;
          }
        }
      });
    }

    // Log when plane is found (for debugging)
    if (closestPlane && foundFromHand) {
      // Only log occasionally to avoid spam (every 60 frames = ~1 second)
      if (!this._lastLogFrame || (frame.session.frameIndex - this._lastLogFrame) > 60) {
        console.log(`Plane detected by ${foundFromHand} hand at ${closestDistance.toFixed(2)}m`);
        this._lastLogFrame = frame.session.frameIndex || 0;
      }
    }

    return closestPlane;
  }

  /**
   * Get the plane that the user is pointing at with their controller/hand (public API)
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   * @returns {XRPlane|null} The plane being pointed at, or null
   */
  getPointedPlane(frame, referenceSpace) {
    return this._getPointedPlaneInternal(frame, referenceSpace);
  }

  /**
   * Update a plane mesh to match the detected plane
   * @param {THREE.Mesh} mesh
   * @param {XRPlane} plane
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   */
  _updatePlaneMesh(mesh, plane, frame, referenceSpace) {
    const pose = frame.getPose(plane.planeSpace, referenceSpace);

    if (pose) {
      // Update position
      mesh.position.setFromMatrixPosition(
        new THREE.Matrix4().fromArray(pose.transform.matrix)
      );

      // Update rotation
      mesh.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().fromArray(pose.transform.matrix)
      );

      // Update geometry based on plane polygon
      if (plane.polygon && plane.polygon.length > 0) {
        const geometry = this._createPlaneGeometryFromPolygon(plane.polygon);

        // Dispose old geometry
        mesh.geometry.dispose();
        mesh.geometry = geometry;

        // Update wireframe child
        if (mesh.children[0]) {
          const oldEdges = mesh.children[0].geometry;
          mesh.children[0].geometry = new THREE.EdgesGeometry(geometry);
          oldEdges.dispose();
        }
      }
    }
  }

  /**
   * Calculate approximate area of a polygon
   * @param {Array} polygon - Array of DOMPointReadOnly vertices
   * @returns {number} Approximate area in square meters
   */
  _calculatePolygonArea(polygon) {
    if (polygon.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].x * polygon[j].z;
      area -= polygon[j].x * polygon[i].z;
    }
    return Math.abs(area / 2);
  }

  /**
   * Get the currently selected plane for desktop placement
   * @returns {XRPlane|null}
   */
  getSelectedPlane() {
    return this.selectedPlane;
  }

  /**
   * Set the selected plane (when user taps to place)
   * @param {XRPlane} plane
   */
  setSelectedPlane(plane) {
    this.selectedPlane = plane;
  }

  /**
   * Get detected surface size from a specific plane
   * @param {XRPlane} plane
   * @returns {Object} {width, depth} Approximate size of the plane
   */
  getPlaneSize(plane) {
    if (!plane || !plane.polygon || plane.polygon.length === 0) {
      // Fallback to default size
      return { width: 0.8, depth: 0.6 };
    }

    // Calculate bounding box of polygon
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    plane.polygon.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    });

    return {
      width: maxX - minX,
      depth: maxZ - minZ
    };
  }

  /**
   * Hide all plane overlays (e.g., after desktop is placed)
   */
  hideOverlays() {
    this.planeMeshes.forEach((mesh) => {
      mesh.visible = false;
    });
  }

  /**
   * Show all plane overlays
   */
  showOverlays() {
    this.planeMeshes.forEach((mesh) => {
      mesh.visible = true;
    });
  }

  /**
   * Cleanup resources
   */
  dispose() {
    // Remove all plane meshes
    this.planeMeshes.forEach((mesh) => {
      this.sceneManager.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      // Dispose wireframe child
      if (mesh.children[0]) {
        mesh.children[0].geometry.dispose();
        mesh.children[0].material.dispose();
      }
    });
    this.planeMeshes.clear();
  }
}
