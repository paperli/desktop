import * as THREE from 'three';
import { MATERIALS } from '../config/constants.js';

/**
 * Material library for the AR application
 * Manages PBR materials for all objects
 */
export class MaterialLibrary {
  constructor() {
    this.materials = {};
    this._initializeMaterials();
  }

  _initializeMaterials() {
    // Desktop material - neutral, slightly transparent
    this.materials.desktop = new THREE.MeshStandardMaterial({
      color: MATERIALS.DESKTOP.color,
      metalness: MATERIALS.DESKTOP.metalness,
      roughness: MATERIALS.DESKTOP.roughness,
      opacity: MATERIALS.DESKTOP.opacity,
      transparent: MATERIALS.DESKTOP.transparent,
      side: THREE.DoubleSide,
    });

    // Surface overlay material for detected planes
    this.materials.surfaceOverlay = new THREE.MeshBasicMaterial({
      color: MATERIALS.SURFACE_OVERLAY.color,
      opacity: MATERIALS.SURFACE_OVERLAY.opacity,
      transparent: MATERIALS.SURFACE_OVERLAY.transparent,
      side: THREE.DoubleSide,
    });

    // Create plate materials for each color
    this.materials.plates = MATERIALS.PLATE_COLORS.map((color) =>
      new THREE.MeshStandardMaterial({
        color: color,
        metalness: MATERIALS.PLATE_PBR.metalness,
        roughness: MATERIALS.PLATE_PBR.roughness,
      })
    );
  }

  /**
   * Get desktop material
   * @returns {THREE.Material}
   */
  getDesktopMaterial() {
    return this.materials.desktop;
  }

  /**
   * Get surface overlay material
   * @returns {THREE.Material}
   */
  getSurfaceOverlayMaterial() {
    return this.materials.surfaceOverlay;
  }

  /**
   * Get random plate material
   * @returns {THREE.Material}
   */
  getRandomPlateMaterial() {
    const index = Math.floor(Math.random() * this.materials.plates.length);
    return this.materials.plates[index];
  }

  /**
   * Get plate material by index
   * @param {number} index
   * @returns {THREE.Material}
   */
  getPlateMaterial(index) {
    return this.materials.plates[index % this.materials.plates.length];
  }

  /**
   * Dispose all materials
   */
  dispose() {
    Object.values(this.materials).forEach((material) => {
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    });
  }
}
