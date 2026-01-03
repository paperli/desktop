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

    this.dragPlane = new THREE.Mesh(planeGeometry);
    this.dragPlane.visible = false;
    this.dragPlane.position.y = this.desktopBounds.centerY;
  }

  /**
   * Start dragging a plate
   * @param {Plate} plate
   */
  startDrag(plate) {
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
    }
  }

  /**
   * End dragging a plate
   * @param {Plate} plate
   */
  endDrag(plate) {
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
      this.dragPlane.geometry.dispose();
      this.dragPlane = null;
    }
  }
}
