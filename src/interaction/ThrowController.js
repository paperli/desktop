import * as THREE from 'three';
import { calculateVelocity } from '../utils/MathUtils.js';
import { INTERACTION } from '../config/constants.js';

/**
 * Handles throw gesture for plates
 */
export class ThrowController {
  constructor(camera) {
    this.camera = camera;
  }

  /**
   * Calculate and apply throw velocity to plate
   * @param {Plate} plate
   * @param {Array} touchHistory - Array of {x, y, time} touch positions
   */
  throwPlate(plate, touchHistory) {
    // Calculate velocity from touch history
    const velocity2D = calculateVelocity(touchHistory);

    // Convert screen velocity to world velocity
    // This is a simplified conversion - adjust scale as needed
    const velocityScale = INTERACTION.THROW_VELOCITY_SCALE * 0.001;

    // Get camera direction for forward component
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Create 3D velocity vector
    // X component from horizontal swipe
    // Z component from vertical swipe and camera direction
    const velocity3D = new THREE.Vector3(
      velocity2D.x * velocityScale,
      0, // No upward velocity (constrained to desktop)
      -velocity2D.y * velocityScale // Negative because screen Y is inverted
    );

    // Apply maximum velocity cap
    const speed = velocity3D.length();
    if (speed > INTERACTION.MAX_THROW_VELOCITY) {
      velocity3D.normalize().multiplyScalar(INTERACTION.MAX_THROW_VELOCITY);
    }

    // Apply velocity to plate
    plate.applyVelocity(velocity3D);

    // Add small angular velocity for realistic tumbling
    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );

    const body = plate.getBody();
    body.angularVelocity.set(
      angularVelocity.x,
      angularVelocity.y,
      angularVelocity.z
    );

    console.log('Plate thrown with velocity:', velocity3D, 'Speed:', speed);
  }

  /**
   * Check if touch movement qualifies as throw gesture
   * @param {Array} touchHistory
   * @returns {boolean}
   */
  isThrowGesture(touchHistory) {
    if (touchHistory.length < 2) return false;

    const velocity = calculateVelocity(touchHistory);
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

    // Threshold for minimum throw speed (pixels per second)
    const throwSpeedThreshold = 500;

    return speed > throwSpeedThreshold;
  }
}
