import * as THREE from 'three';
import { DESKTOP } from '../config/constants.js';
import { clamp } from '../utils/MathUtils.js';

/**
 * Handles desktop placement on detected surfaces
 */
export class DesktopPlacer {
  constructor(sceneManager, materialLibrary) {
    this.sceneManager = sceneManager;
    this.materialLibrary = materialLibrary;

    this.desktop = null;
    this.desktopBounds = null;
    this.isPlaced = false;
  }

  /**
   * Place desktop at hit test result location (legacy method - kept for compatibility)
   * @param {XRHitTestResult} hitTestResult
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   * @param {Object} detectedSize - Optional detected plane size {width, depth}
   * @returns {Object} Desktop bounds for physics
   */
  async placeDesktop(hitTestResult, frame, referenceSpace, detectedSize = null) {
    if (this.isPlaced) {
      console.warn('Desktop already placed');
      return this.desktopBounds;
    }

    try {
      const pose = hitTestResult.getPose(referenceSpace);
      if (!pose) {
        throw new Error('Failed to get pose from hit test result');
      }

      // Extract position and orientation
      const position = new THREE.Vector3(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );

      const orientation = new THREE.Quaternion(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );

      // Create desktop with detected size or reasonable default
      this._createDesktop(position, orientation, detectedSize);

      // Try to create anchor for persistent placement
      try {
        const anchor = await hitTestResult.createAnchor(pose.transform);
        console.log('Anchor created successfully');
        // Store anchor reference if needed
        this.anchor = anchor;
      } catch (error) {
        console.warn('Anchors not supported, desktop will not persist', error);
      }

      this.isPlaced = true;
      return this.desktopBounds;
    } catch (error) {
      console.error('Failed to place desktop:', error);
      throw error;
    }
  }

  /**
   * Place desktop on a detected XRPlane
   * @param {XRPlane} plane - Detected plane from frame.detectedPlanes
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} referenceSpace
   * @param {Object} detectedSize - Detected plane size {width, depth}
   * @returns {Object} Desktop bounds for physics
   */
  async placeDesktopOnPlane(plane, frame, referenceSpace, detectedSize = null) {
    if (this.isPlaced) {
      console.warn('Desktop already placed');
      return this.desktopBounds;
    }

    try {
      // Get pose from plane's space
      const pose = frame.getPose(plane.planeSpace, referenceSpace);
      if (!pose) {
        throw new Error('Failed to get pose from plane');
      }

      // Extract position and orientation
      const position = new THREE.Vector3(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );

      const orientation = new THREE.Quaternion(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );

      console.log('Placing desktop at plane position:', position);
      console.log('Plane orientation:', plane.orientation);

      // Create desktop with detected size
      this._createDesktop(position, orientation, detectedSize);

      // Try to create anchor for persistent placement
      try {
        const anchor = await frame.createAnchor(pose.transform, plane.planeSpace);
        console.log('Anchor created successfully on plane');
        this.anchor = anchor;
      } catch (error) {
        console.warn('Failed to create anchor on plane, desktop may not persist', error);
      }

      this.isPlaced = true;
      return this.desktopBounds;
    } catch (error) {
      console.error('Failed to place desktop on plane:', error);
      throw error;
    }
  }

  _createDesktop(position, orientation, detectedSize = null) {
    // Use detected size if available, otherwise use reasonable defaults
    let width, depth;

    if (detectedSize && detectedSize.width > 0 && detectedSize.depth > 0) {
      // Use detected plane size, clamped to reasonable limits
      width = clamp(detectedSize.width * 0.9, DESKTOP.MIN_SIZE, DESKTOP.MAX_SIZE);
      depth = clamp(detectedSize.depth * 0.9, DESKTOP.MIN_SIZE, DESKTOP.MAX_SIZE);
      console.log('Using detected surface size:', detectedSize, '-> Desktop size:', { width, depth });
    } else {
      // Fallback to default size
      width = clamp(0.8, DESKTOP.MIN_SIZE, DESKTOP.MAX_SIZE);
      depth = clamp(0.6, DESKTOP.MIN_SIZE, DESKTOP.MAX_SIZE);
      console.log('Using default desktop size:', { width, depth });
    }

    const thickness = DESKTOP.THICKNESS;

    // Create desktop geometry
    const geometry = new THREE.BoxGeometry(width, thickness, depth);
    const material = this.materialLibrary.getDesktopMaterial();

    this.desktop = new THREE.Mesh(geometry, material);
    this.desktop.castShadow = true;
    this.desktop.receiveShadow = true;

    // Set position - use detected position
    this.desktop.position.copy(position);
    this.desktop.position.y += thickness / 2; // Adjust so top is at detected surface

    // FORCE HORIZONTAL ORIENTATION - ignore detected surface tilt
    // Extract only the Y-axis rotation (yaw) from detected orientation
    // This keeps the desktop aligned with the surface direction but perfectly level
    const euler = new THREE.Euler().setFromQuaternion(orientation, 'YXZ');
    const yRotationOnly = new THREE.Euler(0, euler.y, 0, 'YXZ'); // Keep only yaw, zero out pitch/roll
    this.desktop.quaternion.setFromEuler(yRotationOnly);

    console.log('Desktop forced to horizontal orientation (yaw only):', (euler.y * 180 / Math.PI).toFixed(1), 'degrees');

    this.sceneManager.add(this.desktop);

    // Calculate bounds for physics constraints
    // Use the forced horizontal quaternion, not the detected tilted one
    this.desktopBounds = {
      width: width,
      depth: depth,
      height: thickness,
      minX: -width / 2,
      maxX: width / 2,
      minZ: -depth / 2,
      maxZ: depth / 2,
      centerY: position.y + thickness,
      position: position.clone(),
      quaternion: this.desktop.quaternion.clone(), // Use forced horizontal orientation
    };

    console.log('Desktop placed with bounds:', this.desktopBounds);
  }

  /**
   * Get desktop mesh
   * @returns {THREE.Mesh|null}
   */
  getDesktop() {
    return this.desktop;
  }

  /**
   * Get desktop bounds for physics
   * @returns {Object|null}
   */
  getBounds() {
    return this.desktopBounds;
  }

  /**
   * Check if desktop is placed
   * @returns {boolean}
   */
  isDesktopPlaced() {
    return this.isPlaced;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.desktop) {
      this.sceneManager.remove(this.desktop);
      this.desktop.geometry.dispose();
      this.desktop = null;
    }

    if (this.anchor) {
      this.anchor.delete();
      this.anchor = null;
    }

    this.isPlaced = false;
    this.desktopBounds = null;
  }
}
