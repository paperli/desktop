/**
 * WebXR utility functions
 */

/**
 * Check if WebXR is supported
 * @returns {boolean}
 */
export function isWebXRSupported() {
  return 'xr' in navigator;
}

/**
 * Check if AR mode is supported
 * @returns {Promise<boolean>}
 */
export async function isARSupported() {
  if (!isWebXRSupported()) {
    return false;
  }

  try {
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch (error) {
    console.error('Error checking AR support:', error);
    return false;
  }
}

/**
 * Request XR session with configuration
 * @param {string} mode - Session mode ('immersive-ar')
 * @param {Object} config - Session configuration
 * @returns {Promise<XRSession>}
 */
export async function requestXRSession(mode, config) {
  if (!isWebXRSupported()) {
    throw new Error('WebXR not supported');
  }

  try {
    return await navigator.xr.requestSession(mode, config);
  } catch (error) {
    console.error('Error requesting XR session:', error);
    throw error;
  }
}

/**
 * Get reference space from session
 * @param {XRSession} session
 * @param {string} type - Reference space type ('local', 'local-floor', 'viewer', etc.)
 * @returns {Promise<XRReferenceSpace>}
 */
export async function getXRReferenceSpace(session, type = 'local') {
  try {
    return await session.requestReferenceSpace(type);
  } catch (error) {
    console.error(`Error getting ${type} reference space:`, error);
    // Fallback to 'viewer' if requested space is not available
    if (type !== 'viewer') {
      console.warn(`Falling back to 'viewer' reference space`);
      return await session.requestReferenceSpace('viewer');
    }
    throw error;
  }
}

/**
 * Request hit test source for AR surface detection
 * @param {XRSession} session
 * @param {XRReferenceSpace} referenceSpace
 * @returns {Promise<XRHitTestSource>}
 */
export async function requestHitTestSource(session, referenceSpace) {
  try {
    return await session.requestHitTestSource({ space: referenceSpace });
  } catch (error) {
    console.error('Error requesting hit test source:', error);
    throw error;
  }
}

/**
 * Create anchor at hit test result
 * @param {XRSession} session
 * @param {XRHitTestResult} hitTestResult
 * @param {XRFrame} frame
 * @returns {Promise<XRAnchor>}
 */
export async function createAnchor(session, hitTestResult, frame) {
  try {
    const pose = hitTestResult.getPose(frame.session.referenceSpace);
    if (!pose) {
      throw new Error('Failed to get pose from hit test result');
    }

    // Create anchor at the hit test pose
    return await hitTestResult.createAnchor(pose.transform);
  } catch (error) {
    console.error('Error creating anchor:', error);
    throw error;
  }
}

/**
 * Convert XRRigidTransform to Three.js Matrix4
 * @param {XRRigidTransform} transform
 * @returns {THREE.Matrix4}
 */
export function xrTransformToMatrix4(transform) {
  const matrix = new THREE.Matrix4();
  matrix.fromArray(transform.matrix);
  return matrix;
}

/**
 * Get position and rotation from XRPose
 * @param {XRPose} pose
 * @returns {Object} {position: THREE.Vector3, quaternion: THREE.Quaternion}
 */
export function getPoseTransform(pose) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const matrix = xrTransformToMatrix4(pose.transform);

  matrix.decompose(position, quaternion, new THREE.Vector3());

  return { position, quaternion };
}

/**
 * Detect primary input source type from XR session
 * @param {XRSession} session
 * @returns {string} - 'touch', 'controller', 'hand', or 'gaze'
 */
export function detectInputType(session) {
  if (!session || !session.inputSources || session.inputSources.length === 0) {
    return 'unknown';
  }

  // Check all input sources and return the most capable one
  // Priority: controller > hand > touch > gaze
  for (const source of session.inputSources) {
    if (source.targetRayMode === 'tracked-pointer') {
      return 'controller';
    }
  }

  for (const source of session.inputSources) {
    if (source.targetRayMode === 'hand') {
      return 'hand';
    }
  }

  for (const source of session.inputSources) {
    if (source.targetRayMode === 'screen') {
      return 'touch';
    }
  }

  for (const source of session.inputSources) {
    if (source.targetRayMode === 'gaze') {
      return 'gaze';
    }
  }

  return 'unknown';
}

/**
 * Get appropriate hint text based on input type
 * @param {string} inputType - Result from detectInputType()
 * @param {string} action - 'place' or 'interact'
 * @returns {string} - Hint text
 */
export function getHintText(inputType, action = 'place') {
  const hints = {
    place: {
      touch: 'Tap a surface to place virtual desktop',
      controller: 'Point and pull trigger to place virtual desktop',
      hand: 'Point and pinch to place virtual desktop',
      gaze: 'Look at a surface and select to place virtual desktop',
      unknown: 'Select a surface to place virtual desktop',
    },
    interact: {
      touch: 'Tap, drag or throw plates to interact',
      controller: 'Point and pull trigger to grab and throw plates',
      hand: 'Pinch to grab and throw plates',
      gaze: 'Look and select to interact with plates',
      unknown: 'Select plates to interact',
    },
  };

  return hints[action]?.[inputType] || hints[action].unknown;
}

import * as THREE from 'three';
