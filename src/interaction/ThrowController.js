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
   * @param {Array|Object} touchHistoryOrVelocity - Array of {x, y, time} touch positions OR {x, y, z, speed} 3D velocity
   */
  throwPlate(plate, touchHistoryOrVelocity) {
    let velocity3D;

    // Check if we received a pre-calculated 3D velocity (from XR) or touch history (from 2D)
    if (touchHistoryOrVelocity.speed !== undefined) {
      // This is a 3D velocity object from XR
      velocity3D = new THREE.Vector3(
        touchHistoryOrVelocity.x,
        touchHistoryOrVelocity.y,
        touchHistoryOrVelocity.z
      );

      // Amplify velocity for more satisfying throws (XR hand tracking is slower than swipes)
      // Multiplier of 2.5x makes throws feel more impactful
      velocity3D.multiplyScalar(2.5);

      // Dampen Y component (vertical) to keep throws mostly horizontal on desktop
      velocity3D.y *= 0.2;

    } else {
      // This is touch history from 2D screen input
      const velocity2D = calculateVelocity(touchHistoryOrVelocity);

      // Convert screen velocity to world velocity
      const velocityScale = INTERACTION.THROW_VELOCITY_SCALE * 0.001;

      // Create 3D velocity vector
      velocity3D = new THREE.Vector3(
        velocity2D.x * velocityScale,
        0, // No upward velocity (constrained to desktop)
        -velocity2D.y * velocityScale // Negative because screen Y is inverted
      );
    }

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

    console.log('Plate thrown with velocity:', velocity3D, 'Speed:', speed.toFixed(2), 'm/s');
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
