import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PLATE, PHYSICS } from '../config/constants.js';

/**
 * Represents a single interactive plate with physics and visual mesh
 */
export class Plate {
  constructor(position, materialLibrary, physicsWorld) {
    this.materialLibrary = materialLibrary;
    this.physicsWorld = physicsWorld;

    this.mesh = null;
    this.body = null;
    this.isDragging = false;

    this._createMesh();
    this._createPhysicsBody(position);
  }

  _createMesh() {
    // Create geometry based on plate shape
    let geometry;
    if (PLATE.SHAPE === 'cylinder') {
      geometry = new THREE.CylinderGeometry(
        PLATE.MAX_WIDTH / 2,
        PLATE.MAX_WIDTH / 2,
        PLATE.HEIGHT,
        32
      );
    } else {
      // Box shape
      geometry = new THREE.BoxGeometry(
        PLATE.MAX_WIDTH,
        PLATE.HEIGHT,
        PLATE.MAX_DEPTH
      );
    }

    // Get random material
    const material = this.materialLibrary.getRandomPlateMaterial();

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Store reference to this Plate instance
    this.mesh.userData.plate = this;
  }

  _createPhysicsBody(position) {
    // Create physics shape
    let shape;
    if (PLATE.SHAPE === 'cylinder') {
      shape = new CANNON.Cylinder(
        PLATE.MAX_WIDTH / 2,
        PLATE.MAX_WIDTH / 2,
        PLATE.HEIGHT,
        16
      );
    } else {
      shape = new CANNON.Box(
        new CANNON.Vec3(PLATE.MAX_WIDTH / 2, PLATE.HEIGHT / 2, PLATE.MAX_DEPTH / 2)
      );
    }

    // Create rigid body using shared plate material for proper collision
    this.body = new CANNON.Body({
      mass: PLATE.MASS,
      shape: shape,
      material: this.physicsWorld.getPlateMaterial(), // Use shared material
      linearDamping: PHYSICS.DAMPING,
      angularDamping: PHYSICS.ANGULAR_DAMPING,
      collisionResponse: true, // Ensure collision response is enabled
    });

    // Set initial position
    this.body.position.set(position.x, position.y, position.z);

    // Ensure body never sleeps (for debugging)
    this.body.allowSleep = false;

    // Add to physics world
    this.physicsWorld.addPlateBody(this.body);

    console.log('Plate physics body created with mass:', PLATE.MASS);
  }

  /**
   * Synchronize mesh transform with physics body
   */
  update() {
    if (!this.isDragging) {
      // Copy position and rotation from physics body to mesh
      this.mesh.position.copy(this.body.position);
      this.mesh.quaternion.copy(this.body.quaternion);

      // Clamp velocity to prevent extreme speeds
      const maxVelocity = 5.0; // m/s
      const speed = this.body.velocity.length();
      if (speed > maxVelocity) {
        this.body.velocity.scale(maxVelocity / speed, this.body.velocity);
      }

      // Prevent falling below desktop (safety constraint)
      const minY = this.physicsWorld.desktopBounds?.position?.y;
      if (minY !== undefined && this.body.position.y < minY - 0.1) {
        console.warn('Plate fell below desktop! Resetting position.');
        this.body.position.y = minY + 0.1;
        this.body.velocity.y = Math.max(0, this.body.velocity.y); // Remove downward velocity
      }
    }
  }

  /**
   * Set kinematic mode for dragging
   * @param {boolean} kinematic
   */
  setKinematic(kinematic) {
    this.isDragging = kinematic;
    if (kinematic) {
      // Make it truly kinematic - no physics simulation while dragging
      this.body.type = CANNON.Body.KINEMATIC;
      this.body.velocity.setZero();
      this.body.angularVelocity.setZero();
      this.body.collisionResponse = false; // Don't push other objects
      console.log('Plate set to kinematic mode for dragging');
    } else {
      // Restore to dynamic
      this.body.type = CANNON.Body.DYNAMIC;
      this.body.collisionResponse = true; // Re-enable collision response
      console.log('Plate restored to dynamic mode');
    }
  }

  /**
   * Set plate position (for dragging)
   * @param {THREE.Vector3} position
   */
  setPosition(position) {
    this.body.position.copy(position);
    this.mesh.position.copy(position);
  }

  /**
   * Apply velocity (for throwing)
   * @param {THREE.Vector3} velocity
   */
  applyVelocity(velocity) {
    this.body.velocity.set(velocity.x, velocity.y, velocity.z);
  }

  /**
   * Get mesh for raycasting
   * @returns {THREE.Mesh}
   */
  getMesh() {
    return this.mesh;
  }

  /**
   * Get physics body
   * @returns {CANNON.Body}
   */
  getBody() {
    return this.body;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.body) {
      this.physicsWorld.removePlateBody(this.body);
      this.body = null;
    }

    if (this.mesh) {
      this.mesh.geometry.dispose();
      // Material is shared, don't dispose here
      this.mesh = null;
    }
  }
}
