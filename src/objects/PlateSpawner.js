import * as THREE from 'three';
import { Plate } from './Plate.js';
import { SPAWN } from '../config/constants.js';
import { generateNonOverlappingPosition } from '../utils/MathUtils.js';

/**
 * Manages spawning of plates on the desktop
 */
export class PlateSpawner {
  constructor(sceneManager, materialLibrary, physicsWorld) {
    this.sceneManager = sceneManager;
    this.materialLibrary = materialLibrary;
    this.physicsWorld = physicsWorld;

    this.plates = [];
  }

  /**
   * Spawn plates on the desktop
   * @param {Object} desktopBounds - Bounds from DesktopPlacer
   */
  spawnPlates(desktopBounds) {
    // Random number of plates between min and max
    const plateCount = Math.floor(
      Math.random() * (SPAWN.MAX_PLATES - SPAWN.MIN_PLATES + 1) + SPAWN.MIN_PLATES
    );

    console.log(`Spawning ${plateCount} plates`);

    // Generate non-overlapping positions
    const positions = [];
    const bounds = {
      minX: desktopBounds.minX + 0.1, // Add padding from edges
      maxX: desktopBounds.maxX - 0.1,
      minZ: desktopBounds.minZ + 0.1,
      maxZ: desktopBounds.maxZ - 0.1,
    };

    for (let i = 0; i < plateCount; i++) {
      const position2D = generateNonOverlappingPosition(
        positions,
        bounds,
        SPAWN.MIN_SPACING
      );

      if (position2D) {
        // Convert to 3D position with initial height offset
        const position = new THREE.Vector3(
          desktopBounds.position.x + position2D.x,
          desktopBounds.centerY + SPAWN.INITIAL_HEIGHT,
          desktopBounds.position.z + position2D.z
        );

        // Create plate
        const plate = new Plate(position, this.materialLibrary, this.physicsWorld);

        // Add mesh to scene
        this.sceneManager.add(plate.getMesh());

        // Store plate reference
        this.plates.push(plate);
        positions.push(position2D);
      } else {
        console.warn(`Failed to find position for plate ${i + 1}`);
      }
    }

    console.log(`Successfully spawned ${this.plates.length} plates`);
  }

  /**
   * Update all plates (sync physics with visuals)
   */
  update() {
    this.plates.forEach(plate => plate.update());
  }

  /**
   * Get all plates
   * @returns {Array<Plate>}
   */
  getPlates() {
    return this.plates;
  }

  /**
   * Find plate by mesh (for raycasting)
   * @param {THREE.Mesh} mesh
   * @returns {Plate|null}
   */
  findPlateByMesh(mesh) {
    return mesh.userData.plate || null;
  }

  /**
   * Cleanup all plates
   */
  dispose() {
    this.plates.forEach(plate => {
      this.sceneManager.remove(plate.getMesh());
      plate.dispose();
    });
    this.plates = [];
  }
}
