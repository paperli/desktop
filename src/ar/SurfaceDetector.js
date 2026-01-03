import * as THREE from 'three';
import { getXRReferenceSpace, requestHitTestSource } from '../utils/XRUtils.js';

/**
 * Handles WebXR hit testing for surface detection
 */
export class SurfaceDetector {
  constructor(session, sceneManager, materialLibrary) {
    this.session = session;
    this.sceneManager = sceneManager;
    this.materialLibrary = materialLibrary;

    this.hitTestSource = null;
    this.referenceSpace = null;
    this.surfaceOverlay = null;
    this.isReady = false;

    this._initialize();
  }

  async _initialize() {
    try {
      // Get reference space
      this.referenceSpace = await getXRReferenceSpace(this.session, 'viewer');

      // Request hit test source for horizontal planes
      this.hitTestSource = await requestHitTestSource(
        this.session,
        this.referenceSpace
      );

      // Create visual overlay for detected surfaces
      this._createSurfaceOverlay();

      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize surface detector:', error);
    }
  }

  _createSurfaceOverlay() {
    // Create a plane overlay mesh to show detected surfaces
    // Start with a default size, will be updated when we detect the actual plane
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = this.materialLibrary.getSurfaceOverlayMaterial();

    this.surfaceOverlay = new THREE.Mesh(geometry, material);
    this.surfaceOverlay.rotation.x = -Math.PI / 2; // Lay flat
    this.surfaceOverlay.visible = false;

    this.sceneManager.add(this.surfaceOverlay);

    // Create a wireframe border to show the exact edges
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x00bcd4, linewidth: 2 });
    this.surfaceEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.surfaceEdges.rotation.x = -Math.PI / 2;
    this.surfaceEdges.visible = false;
    this.sceneManager.add(this.surfaceEdges);

    this.lastHitResult = null;
  }

  /**
   * Update hit test and surface overlay visualization
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} localReferenceSpace
   * @returns {XRHitTestResult|null} Most recent hit test result
   */
  update(frame, localReferenceSpace) {
    if (!this.isReady || !this.hitTestSource) {
      return null;
    }

    // Get hit test results
    const hitTestResults = frame.getHitTestResults(this.hitTestSource);

    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(localReferenceSpace);

      if (pose) {
        // Store the hit result for getting plane info
        this.lastHitResult = hit;

        // Update overlay position and orientation
        this.surfaceOverlay.visible = true;
        this.surfaceOverlay.position.set(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );

        // Update rotation to match detected plane orientation
        this.surfaceOverlay.quaternion.set(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );

        // Rotate to lay flat (plane is vertical by default)
        this.surfaceOverlay.rotateX(-Math.PI / 2);

        // Update edges to match
        if (this.surfaceEdges) {
          this.surfaceEdges.visible = true;
          this.surfaceEdges.position.copy(this.surfaceOverlay.position);
          this.surfaceEdges.quaternion.copy(this.surfaceOverlay.quaternion);
        }

        // Try to get the actual plane size if available
        if (hit.results && hit.results[0] && hit.results[0].plane) {
          const plane = hit.results[0].plane;
          if (plane.polygon) {
            this._updateOverlaySizeFromPlane(plane);
          }
        }

        return hit;
      }
    }

    // No surface detected
    this.surfaceOverlay.visible = false;
    if (this.surfaceEdges) {
      this.surfaceEdges.visible = false;
    }
    return null;
  }

  /**
   * Update overlay size based on detected plane
   * @param {XRPlane} plane
   */
  _updateOverlaySizeFromPlane(plane) {
    try {
      // Calculate bounding box of the plane polygon
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const point of plane.polygon) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minZ = Math.min(minZ, point.z);
        maxZ = Math.max(maxZ, point.z);
      }

      const width = maxX - minX;
      const depth = maxZ - minZ;

      // Update overlay geometry to match detected plane size
      if (width > 0 && depth > 0) {
        this.surfaceOverlay.geometry.dispose();
        this.surfaceOverlay.geometry = new THREE.PlaneGeometry(width, depth);

        // Update edges geometry to match
        if (this.surfaceEdges) {
          this.surfaceEdges.geometry.dispose();
          const edgesGeometry = new THREE.EdgesGeometry(this.surfaceOverlay.geometry);
          this.surfaceEdges.geometry = edgesGeometry;
        }
      }
    } catch (error) {
      // Plane info might not be available, use default size
      console.log('Could not get plane size, using default');
    }
  }

  /**
   * Get the last detected hit result with plane info
   * @returns {XRHitTestResult|null}
   */
  getLastHitResult() {
    return this.lastHitResult;
  }

  /**
   * Hide surface overlay (e.g., after desktop is placed)
   */
  hideOverlay() {
    if (this.surfaceOverlay) {
      this.surfaceOverlay.visible = false;
    }
    if (this.surfaceEdges) {
      this.surfaceEdges.visible = false;
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }

    if (this.surfaceOverlay) {
      this.sceneManager.remove(this.surfaceOverlay);
      this.surfaceOverlay.geometry.dispose();
      this.surfaceOverlay = null;
    }

    if (this.surfaceEdges) {
      this.sceneManager.remove(this.surfaceEdges);
      this.surfaceEdges.geometry.dispose();
      this.surfaceEdges.material.dispose();
      this.surfaceEdges = null;
    }
  }
}
