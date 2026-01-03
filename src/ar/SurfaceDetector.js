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
    this.lastValidHitTime = 0; // Track when we last had a valid hit (for stability)
    this.stableHitCount = 0; // Count consecutive valid hits before showing overlay
    this.lastHitPose = null; // Store last valid pose for stability
    this.lastLoggedState = null; // Track last logged state to reduce console spam
    this.lockedSurfaceHeight = null; // Lock onto specific surface height
    this.overlaySize = { width: 0.8, depth: 0.6 }; // Fixed size, no dynamic resizing

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
    // Fixed size for stability - we don't resize dynamically
    // 0.8m x 0.6m is a typical table/surface size
    const geometry = new THREE.PlaneGeometry(this.overlaySize.width, this.overlaySize.depth);
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
        const hitHeight = pose.transform.position.y;
        const hitDistance = Math.sqrt(
          pose.transform.position.x ** 2 +
          pose.transform.position.z ** 2
        );

        // Filter out non-horizontal planes (walls, tilted surfaces)
        if (!this._isHorizontalPlane(pose)) {
          this.stableHitCount = 0;
          const timeSinceLastHit = Date.now() - this.lastValidHitTime;
          if (timeSinceLastHit > 500) {
            this.surfaceOverlay.visible = false;
            if (this.surfaceEdges) this.surfaceEdges.visible = false;
            this.lockedSurfaceHeight = null; // Unlock
          }
          return null;
        }

        // HEIGHT FILTERING: Prefer surfaces that are elevated (tables, not floor)
        // Floor is typically at Y=0 or very low
        // Tables are typically 0.4m - 1.2m high
        // If we haven't locked onto a surface yet, prefer elevated surfaces
        if (!this.lockedSurfaceHeight) {
          // Reject floor (surfaces below 0.3m unless very close)
          if (hitHeight < 0.3 && hitDistance > 1.0) {
            console.log(`Surface rejected - too low (${hitHeight.toFixed(2)}m), likely floor`);
            return null;
          }
          // Prefer elevated surfaces
          if (hitHeight > 0.35 && hitHeight < 1.5) {
            console.log(`Surface accepted - good table height (${hitHeight.toFixed(2)}m)`);
          }
        } else {
          // Once locked, only accept surfaces at similar height (±15cm)
          const heightDiff = Math.abs(hitHeight - this.lockedSurfaceHeight);
          if (heightDiff > 0.15) {
            console.log(`Surface rejected - height mismatch (${hitHeight.toFixed(2)}m vs locked ${this.lockedSurfaceHeight.toFixed(2)}m)`);
            return null;
          }
        }

        // DISTANCE FILTERING: Prefer closer surfaces (within reasonable range)
        if (hitDistance > 3.0) {
          console.log(`Surface rejected - too far (${hitDistance.toFixed(2)}m)`);
          return null;
        }

        // Valid horizontal surface detected at appropriate height/distance
        this.lastValidHitTime = Date.now();
        this.lastHitPose = pose;
        this.stableHitCount++;

        // Require at least 5 consecutive hits before showing overlay (strong stability)
        if (this.stableHitCount < 5) {
          return null;
        }

        // Lock onto this surface height on first display
        if (this.stableHitCount === 5) {
          this.lockedSurfaceHeight = hitHeight;
          console.log(`🔒 LOCKED onto surface at height ${hitHeight.toFixed(2)}m, distance ${hitDistance.toFixed(2)}m`);
        }

        // Store the hit result
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

        // Rotate to lay flat
        this.surfaceOverlay.rotateX(-Math.PI / 2);

        // Update edges to match
        if (this.surfaceEdges) {
          this.surfaceEdges.visible = true;
          this.surfaceEdges.position.copy(this.surfaceOverlay.position);
          this.surfaceEdges.quaternion.copy(this.surfaceOverlay.quaternion);
        }

        return hit;
      }
    }

    // No hit test results - keep overlay visible briefly
    const timeSinceLastHit = Date.now() - this.lastValidHitTime;
    if (timeSinceLastHit > 500) {
      this.surfaceOverlay.visible = false;
      if (this.surfaceEdges) this.surfaceEdges.visible = false;
      this.stableHitCount = 0;
      this.lockedSurfaceHeight = null; // Unlock after timeout
    }

    return null;
  }

  /**
   * Check if a detected surface is horizontal (not vertical or tilted)
   * @param {XRPose} pose - The pose from the hit test result
   * @returns {boolean} True if the surface is horizontal
   */
  _isHorizontalPlane(pose) {
    // Extract the surface normal from the pose's orientation quaternion
    // For a horizontal plane, the normal should point upward (Y-axis)

    // Get the quaternion from the pose
    const quat = new THREE.Quaternion(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    );

    // The surface normal is the Y-axis of the local coordinate system
    // For WebXR hit test results, Y points away from the surface (the normal)
    const normal = new THREE.Vector3(0, 1, 0);
    normal.applyQuaternion(quat);

    // Check if the normal is mostly pointing up or down (vertical normal = horizontal plane)
    // For horizontal surfaces, the normal should align with world Y-axis
    const worldUp = new THREE.Vector3(0, 1, 0);
    const dotProduct = Math.abs(normal.dot(worldUp));

    // Threshold: 0.92 means ~23 degrees max tilt (cos(23°) ≈ 0.92)
    // Stricter threshold for better horizontal detection
    // For horizontal table: dot ≈ 1.0 (normal points straight up)
    // For vertical wall: dot ≈ 0.0 (normal points horizontally)
    const isHorizontal = dotProduct > 0.92;

    // Log only when state changes to reduce console spam
    const currentState = `${isHorizontal ? 'H' : 'V'}-${dotProduct.toFixed(2)}`;
    if (this.lastLoggedState !== currentState) {
      console.log(`Surface ${isHorizontal ? 'ACCEPTED ✓' : 'REJECTED ✗'} - ` +
                  `Normal: (${normal.x.toFixed(2)}, ${normal.y.toFixed(2)}, ${normal.z.toFixed(2)}), ` +
                  `Dot: ${dotProduct.toFixed(2)} ${isHorizontal ? '(horizontal)' : '(vertical/tilted)'}`);
      this.lastLoggedState = currentState;
    }

    return isHorizontal;
  }

  /**
   * Get detected surface size for desktop placement
   * Returns fixed size - no dynamic resizing for stability
   * @returns {Object} {width, depth}
   */
  getDetectedSize() {
    return {
      width: this.overlaySize.width,
      depth: this.overlaySize.depth
    };
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
