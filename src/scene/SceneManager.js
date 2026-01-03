import * as THREE from 'three';

/**
 * Manages Three.js scene, renderer, camera, and lighting for WebXR AR
 */
export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.lights = {};

    this._initialize();
  }

  _initialize() {
    // Create scene
    this.scene = new THREE.Scene();

    // Create camera with appropriate settings for AR
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01, // Near plane - close to camera for AR
      20    // Far plane
    );

    // Create WebXR-compatible renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true, // Transparent background for AR
      antialias: true,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true; // Enable WebXR

    // Set default reference space type for AR
    // 'local' is the standard for AR tracking on mobile
    this.renderer.xr.setReferenceSpaceType('local');

    // Enable shadows for depth perception
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Setup lighting
    this._setupLighting();

    // Handle window resize
    window.addEventListener('resize', this._onWindowResize.bind(this));
  }

  _setupLighting() {
    // Ambient light for overall scene illumination
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.lights.ambient);

    // Directional light for shadows and definition
    this.lights.directional = new THREE.DirectionalLight(0xffffff, 0.8);
    this.lights.directional.position.set(1, 2, 1);
    this.lights.directional.castShadow = true;

    // Configure shadow properties
    this.lights.directional.shadow.mapSize.width = 1024;
    this.lights.directional.shadow.mapSize.height = 1024;
    this.lights.directional.shadow.camera.near = 0.1;
    this.lights.directional.shadow.camera.far = 10;
    this.lights.directional.shadow.camera.left = -2;
    this.lights.directional.shadow.camera.right = 2;
    this.lights.directional.shadow.camera.top = 2;
    this.lights.directional.shadow.camera.bottom = -2;

    this.scene.add(this.lights.directional);

    // Hemisphere light for natural outdoor lighting
    this.lights.hemisphere = new THREE.HemisphereLight(
      0xffffff, // Sky color
      0x444444, // Ground color
      0.4
    );
    this.scene.add(this.lights.hemisphere);
  }

  _onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Start XR session with the renderer
   * @param {XRSession} session
   */
  async startXRSession(session) {
    // Try setting session with 'local' reference space (already set as default)
    try {
      console.log('Attempting to set XR session with reference space: local');
      await this.renderer.xr.setSession(session);
      console.log('XR session set successfully');
    } catch (error) {
      console.warn('Failed with local reference space, trying viewer:', error);
      // Fallback to 'viewer' if 'local' is not supported
      this.renderer.xr.setReferenceSpaceType('viewer');
      await this.renderer.xr.setSession(session);
      console.log('XR session set successfully with viewer reference space');
    }
  }

  /**
   * Set animation loop
   * @param {Function} callback - Animation loop callback
   */
  setAnimationLoop(callback) {
    this.renderer.setAnimationLoop(callback);
  }

  /**
   * Add object to scene
   * @param {THREE.Object3D} object
   */
  add(object) {
    this.scene.add(object);
  }

  /**
   * Remove object from scene
   * @param {THREE.Object3D} object
   */
  remove(object) {
    this.scene.remove(object);
  }

  /**
   * Render the scene
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Get raycaster for touch interaction
   * @returns {THREE.Raycaster}
   */
  createRaycaster() {
    return new THREE.Raycaster();
  }

  /**
   * Cleanup resources
   */
  dispose() {
    window.removeEventListener('resize', this._onWindowResize);
    this.renderer.dispose();

    // Dispose lights
    Object.values(this.lights).forEach(light => {
      if (light.dispose) light.dispose();
    });
  }
}
