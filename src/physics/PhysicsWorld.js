import * as CANNON from 'cannon-es';
import { PHYSICS, DESKTOP, PLATE } from '../config/constants.js';

/**
 * Manages Cannon.js physics world and simulation
 */
export class PhysicsWorld {
  constructor() {
    this.world = null;
    this.desktopBodies = [];
    this.plateBodies = [];
    this.desktopBounds = null;

    this._initialize();
  }

  _initialize() {
    // Create physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, PHYSICS.GRAVITY, 0),
    });

    // Configure solver for better collision detection
    this.world.solver.iterations = 20; // Increased from 10 to prevent penetration
    this.world.solver.tolerance = 0.001;
    this.world.allowSleep = false; // Disable sleep for now to ensure collisions work

    // Configure broadphase for better collision detection
    this.world.broadphase = new CANNON.SAPBroadphase(this.world); // More efficient than NaiveBroadphase

    // Enable collision detection debugging
    let collisionCount = 0;
    this.world.addEventListener('beginContact', (event) => {
      collisionCount++;
      console.log(`Collision #${collisionCount}: Body A mass=${event.bodyA.mass}, Body B mass=${event.bodyB.mass}`);
    });

    // Create shared materials for consistent collision behavior
    this.plateMaterial = new CANNON.Material('plate');
    this.desktopMaterial = new CANNON.Material('desktop');

    // Define contact material between plates (for plate-to-plate collision)
    const platePlateContact = new CANNON.ContactMaterial(
      this.plateMaterial,
      this.plateMaterial,
      {
        friction: PLATE.FRICTION, // Use plate friction constant (0.25)
        restitution: 0.3, // Slight bounce when plates hit each other
        contactEquationStiffness: 1e9, // Increased stiffness to prevent penetration
        contactEquationRelaxation: 3,
        frictionEquationStiffness: 1e9,
        frictionEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(platePlateContact);

    // Define contact material between plates and desktop
    const plateDesktopContact = new CANNON.ContactMaterial(
      this.plateMaterial,
      this.desktopMaterial,
      {
        friction: PLATE.FRICTION, // Use plate friction constant (0.25) for better sliding
        restitution: 0.1, // Less bounce on desktop surface
        contactEquationStiffness: 1e9, // Very stiff to prevent penetration
        contactEquationRelaxation: 3,
        frictionEquationStiffness: 1e9,
        frictionEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(plateDesktopContact);

    console.log('Physics materials and contact materials initialized');
  }

  /**
   * Setup desktop boundaries (invisible walls)
   * @param {Object} bounds - Desktop bounds from DesktopPlacer
   */
  setupDesktopBoundaries(bounds) {
    this.desktopBounds = bounds; // Store for plate constraint checking

    // Clear existing desktop bodies
    this.desktopBodies.forEach(body => this.world.removeBody(body));
    this.desktopBodies = [];

    // Create floor (desktop surface) with desktop material
    // Make it thicker to prevent penetration
    const floorThickness = DESKTOP.THICKNESS * 2; // Double thickness for better collision
    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(
        new CANNON.Vec3(bounds.width / 2, floorThickness / 2, bounds.depth / 2)
      ),
      material: this.desktopMaterial,
      collisionResponse: true,
    });

    // Position the floor slightly lower to account for thickness
    floorBody.position.set(
      bounds.position.x,
      bounds.position.y - DESKTOP.THICKNESS / 2,
      bounds.position.z
    );

    floorBody.quaternion.set(
      bounds.quaternion.x,
      bounds.quaternion.y,
      bounds.quaternion.z,
      bounds.quaternion.w
    );

    this.world.addBody(floorBody);
    this.desktopBodies.push(floorBody);

    console.log('Desktop floor created at y:', floorBody.position.y, 'with thickness:', floorThickness);

    // Create invisible boundary walls
    const wallHeight = DESKTOP.WALL_HEIGHT;
    const wallThickness = 0.05;

    // Wall positions relative to desktop
    const walls = [
      // Left wall
      {
        width: wallThickness,
        height: wallHeight,
        depth: bounds.depth,
        x: -bounds.width / 2,
        z: 0,
      },
      // Right wall
      {
        width: wallThickness,
        height: wallHeight,
        depth: bounds.depth,
        x: bounds.width / 2,
        z: 0,
      },
      // Front wall
      {
        width: bounds.width,
        height: wallHeight,
        depth: wallThickness,
        x: 0,
        z: -bounds.depth / 2,
      },
      // Back wall
      {
        width: bounds.width,
        height: wallHeight,
        depth: wallThickness,
        x: 0,
        z: bounds.depth / 2,
      },
    ];

    walls.forEach((wall) => {
      const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(
          new CANNON.Vec3(wall.width / 2, wall.height / 2, wall.depth / 2)
        ),
        material: this.desktopMaterial, // Use desktop material for walls too
      });

      // Position walls on the desktop surface, at the edges
      // Wall position in local space
      const localPos = new CANNON.Vec3(wall.x, wallHeight / 2, wall.z);

      // Apply desktop rotation to the local position
      const rotatedPos = new CANNON.Vec3();
      floorBody.quaternion.vmult(localPos, rotatedPos);

      // Set wall position: desktop position + rotated local position + height offset
      // Position walls at the floor level
      wallBody.position.set(
        bounds.position.x + rotatedPos.x,
        bounds.position.y + wallHeight / 2 - DESKTOP.THICKNESS,
        bounds.position.z + rotatedPos.z
      );

      // Apply same rotation as desktop
      wallBody.quaternion.copy(floorBody.quaternion);

      this.world.addBody(wallBody);
      this.desktopBodies.push(wallBody);
    });

    console.log('Desktop boundaries created with wall height:', wallHeight);
  }

  /**
   * Add plate physics body to world
   * @param {CANNON.Body} body
   */
  addPlateBody(body) {
    this.world.addBody(body);
    this.plateBodies.push(body);
  }

  /**
   * Remove plate physics body from world
   * @param {CANNON.Body} body
   */
  removePlateBody(body) {
    this.world.removeBody(body);
    const index = this.plateBodies.indexOf(body);
    if (index > -1) {
      this.plateBodies.splice(index, 1);
    }
  }

  /**
   * Update physics simulation
   * @param {number} deltaTime - Time since last update in seconds
   */
  step(deltaTime) {
    // Use fixed time step for stable physics
    this.world.step(PHYSICS.TIME_STEP, deltaTime, PHYSICS.MAX_SUB_STEPS);
  }

  /**
   * Get physics world
   * @returns {CANNON.World}
   */
  getWorld() {
    return this.world;
  }

  /**
   * Get shared plate material for consistent collisions
   * @returns {CANNON.Material}
   */
  getPlateMaterial() {
    return this.plateMaterial;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    // Remove all bodies
    [...this.desktopBodies, ...this.plateBodies].forEach(body => {
      this.world.removeBody(body);
    });

    this.desktopBodies = [];
    this.plateBodies = [];
    this.world = null;
  }
}
