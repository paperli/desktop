import * as THREE from 'three';

/**
 * Mathematical utility functions for AR application
 */

/**
 * Generate random position within bounds, avoiding overlaps
 * @param {Array} existingPositions - Array of {x, z} positions
 * @param {Object} bounds - {minX, maxX, minZ, maxZ}
 * @param {number} minSpacing - Minimum distance between positions
 * @param {number} maxAttempts - Maximum number of random attempts
 * @returns {Object|null} {x, z} position or null if no valid position found
 */
export function generateNonOverlappingPosition(
  existingPositions,
  bounds,
  minSpacing,
  maxAttempts = 50
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = THREE.MathUtils.randFloat(bounds.minX, bounds.maxX);
    const z = THREE.MathUtils.randFloat(bounds.minZ, bounds.maxZ);

    // Check if position is valid (no overlaps)
    let isValid = true;
    for (const pos of existingPositions) {
      const distance = Math.sqrt((x - pos.x) ** 2 + (z - pos.z) ** 2);
      if (distance < minSpacing) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      return { x, z };
    }
  }

  return null; // Failed to find valid position
}

/**
 * Calculate velocity from touch movement history
 * @param {Array} touchHistory - Array of {x, y, time} touch points
 * @returns {Object} {x, y} velocity in pixels per second
 */
export function calculateVelocity(touchHistory) {
  if (touchHistory.length < 2) {
    return { x: 0, y: 0 };
  }

  const last = touchHistory[touchHistory.length - 1];
  const first = touchHistory[0];
  const timeDelta = (last.time - first.time) / 1000; // Convert to seconds

  if (timeDelta === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (last.x - first.x) / timeDelta,
    y: (last.y - first.y) / timeDelta,
  };
}

/**
 * Calculate 3D velocity from XR position history
 * @param {Array} positionHistory - Array of {x, y, z, time} position points
 * @returns {Object} {x, y, z, speed} velocity in meters per second
 */
export function calculateVelocity3D(positionHistory) {
  if (positionHistory.length < 2) {
    return { x: 0, y: 0, z: 0, speed: 0 };
  }

  // Use last few samples for more accurate velocity (weighted towards recent motion)
  const sampleCount = Math.min(5, positionHistory.length);
  const recentHistory = positionHistory.slice(-sampleCount);

  const last = recentHistory[recentHistory.length - 1];
  const first = recentHistory[0];
  const timeDelta = (last.time - first.time) / 1000; // Convert to seconds

  if (timeDelta === 0) {
    return { x: 0, y: 0, z: 0, speed: 0 };
  }

  const vx = (last.x - first.x) / timeDelta;
  const vy = (last.y - first.y) / timeDelta;
  const vz = (last.z - first.z) / timeDelta;
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  return { x: vx, y: vy, z: vz, speed };
}

/**
 * Check if a point is within bounds
 * @param {Object} point - {x, z} position
 * @param {Object} bounds - {minX, maxX, minZ, maxZ}
 * @returns {boolean}
 */
export function isWithinBounds(point, bounds) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.z >= bounds.minZ &&
    point.z <= bounds.maxZ
  );
}

/**
 * Clamp value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} start
 * @param {number} end
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Calculate distance between two points
 * @param {Object} p1 - {x, y, z} or {x, z}
 * @param {Object} p2 - {x, y, z} or {x, z}
 * @returns {number}
 */
export function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = (p1.y || 0) - (p2.y || 0);
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Convert screen coordinates to normalized device coordinates
 * @param {number} x - Screen x coordinate
 * @param {number} y - Screen y coordinate
 * @param {HTMLElement} canvas - Canvas element
 * @returns {Object} {x, y} in NDC (-1 to 1)
 */
export function screenToNDC(x, y, canvas) {
  return {
    x: (x / canvas.clientWidth) * 2 - 1,
    y: -(y / canvas.clientHeight) * 2 + 1,
  };
}

/**
 * Get random element from array
 * @param {Array} array
 * @returns {*}
 */
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}
