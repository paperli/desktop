import * as THREE from 'three';
import { screenToNDC, lerp } from '../utils/MathUtils.js';
import { INTERACTION } from '../config/constants.js';

/**
 * Handles drag interaction for plates
 */
export class DragController {
  constructor(sceneManager, camera, desktopBounds) {
    this.sceneManager = sceneManager;
    this.camera = camera;
    this.desktopBounds = desktopBounds;
    this.canvas = sceneManager.canvas;

    this.raycaster = new THREE.Raycaster();
    this.dragPlane = null;

    this._createDragPlane();
  }

  _createDragPlane() {
    // Create an invisible plane at desktop height for dragging
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    planeGeometry.rotateX(-Math.PI / 2); // Make it horizontal

    // Create material for the plane (invisible but raycast-able)
    const planeMaterial = new THREE.MeshBasicMaterial({
      visible: false, // Don't render it
      side: THREE.DoubleSide
    });

    this.dragPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.dragPlane.visible = true; // Must be visible for raycasting (but material is invisible)
    this.dragPlane.position.y = this.desktopBounds.centerY;

    // Add to scene so raycasting can work
    this.sceneManager.add(this.dragPlane);
    console.log('Drag plane created at height:', this.desktopBounds.centerY);
  }

  /**
   * Start dragging a plate
   * @param {Plate} plate
   */
  startDrag(plate) {
    console.log('Starting drag on plate');
    plate.setKinematic(true);
  }

  /**
   * Update plate position during drag
   * @param {Plate} plate
   * @param {number} screenX
   * @param {number} screenY
   */
  updateDrag(plate, screenX, screenY) {
    // Convert screen coordinates to NDC
    const ndc = screenToNDC(screenX, screenY, this.canvas);

    // Cast ray from camera through touch point
    this.raycaster.setFromCamera(ndc, this.camera);

    // Intersect with drag plane
    const intersects = this.raycaster.intersectObject(this.dragPlane);

    console.log('Drag update - intersects:', intersects.length);

    if (intersects.length > 0) {
      const intersectPoint = intersects[0].point;

      // Clamp to desktop bounds (in local desktop space)
      const localX = intersectPoint.x - this.desktopBounds.position.x;
      const localZ = intersectPoint.z - this.desktopBounds.position.z;

      // Apply bounds with padding
      const padding = 0.05;
      const clampedX = Math.max(
        this.desktopBounds.minX + padding,
        Math.min(this.desktopBounds.maxX - padding, localX)
      );
      const clampedZ = Math.max(
        this.desktopBounds.minZ + padding,
        Math.min(this.desktopBounds.maxZ - padding, localZ)
      );

      // Convert back to world space
      const targetPosition = new THREE.Vector3(
        this.desktopBounds.position.x + clampedX,
        this.desktopBounds.centerY + 0.02, // Slightly above surface
        this.desktopBounds.position.z + clampedZ
      );

      // Smooth interpolation for natural feel
      const currentPos = plate.getMesh().position;
      const smoothedPos = new THREE.Vector3(
        lerp(currentPos.x, targetPosition.x, INTERACTION.DRAG_SMOOTH_FACTOR),
        targetPosition.y,
        lerp(currentPos.z, targetPosition.z, INTERACTION.DRAG_SMOOTH_FACTOR)
      );

      plate.setPosition(smoothedPos);
      console.log('Plate position updated to:', smoothedPos);
    } else {
      console.warn('No intersection with drag plane');
    }
  }

  /**
   * Update plate position during drag using XR raycaster
   * @param {Plate} plate
   * @param {THREE.Raycaster} raycaster
   */
  updateDragXR(plate, raycaster) {
    // Intersect with drag plane
    const intersects = raycaster.intersectObject(this.dragPlane);

    if (intersects.length > 0) {
      const intersectPoint = intersects[0].point;

      // Clamp to desktop bounds (in local desktop space)
      const localX = intersectPoint.x - this.desktopBounds.position.x;
      const localZ = intersectPoint.z - this.desktopBounds.position.z;

      // Apply bounds with padding
      const padding = 0.05;
      const clampedX = Math.max(
        this.desktopBounds.minX + padding,
        Math.min(this.desktopBounds.maxX - padding, localX)
      );
      const clampedZ = Math.max(
        this.desktopBounds.minZ + padding,
        Math.min(this.desktopBounds.maxZ - padding, localZ)
      );

      // Convert back to world space
      const targetPosition = new THREE.Vector3(
        this.desktopBounds.position.x + clampedX,
        this.desktopBounds.centerY + 0.03, // Slightly above surface
        this.desktopBounds.position.z + clampedZ
      );

      // Smooth interpolation for natural feel
      const currentPos = plate.getMesh().position;
      const smoothedPos = new THREE.Vector3(
        lerp(currentPos.x, targetPosition.x, INTERACTION.DRAG_SMOOTH_FACTOR),
        targetPosition.y,
        lerp(currentPos.z, targetPosition.z, INTERACTION.DRAG_SMOOTH_FACTOR)
      );

      plate.setPosition(smoothedPos);
    }
  }

  /**
   * End dragging a plate
   * @param {Plate} plate
   */
  endDrag(plate) {
    console.log('Ending drag on plate');
    plate.setKinematic(false);
  }

  /**
   * Update desktop bounds (if desktop is moved/changed)
   * @param {Object} bounds
   */
  updateDesktopBounds(bounds) {
    this.desktopBounds = bounds;
    if (this.dragPlane) {
      this.dragPlane.position.y = bounds.centerY;
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.dragPlane) {
      this.sceneManager.remove(this.dragPlane);
      this.dragPlane.geometry.dispose();
      if (this.dragPlane.material) {
        this.dragPlane.material.dispose();
      }
      this.dragPlane = null;
    }
  }
}
