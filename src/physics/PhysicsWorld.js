import * as CANNON from 'cannon-es';
import { PHYSICS, DESKTOP } from '../config/constants.js';

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

    // Configure solver for better performance
    this.world.solver.iterations = PHYSICS.SOLVER_ITERATIONS;
    this.world.allowSleep = true;

    // Configure broadphase for better collision detection
    this.world.broadphase = new CANNON.NaiveBroadphase();

    // Set default contact material
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.4,
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;
  }

  /**
   * Setup desktop boundaries (invisible walls)
   * @param {Object} bounds - Desktop bounds from DesktopPlacer
   */
  setupDesktopBoundaries(bounds) {
    this.desktopBounds = bounds;

    // Clear existing desktop bodies
    this.desktopBodies.forEach(body => this.world.removeBody(body));
    this.desktopBodies = [];

    // Create floor (desktop surface)
    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(
        new CANNON.Vec3(bounds.width / 2, DESKTOP.THICKNESS / 2, bounds.depth / 2)
      ),
    });

    floorBody.position.set(
      bounds.position.x,
      bounds.position.y,
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
      });

      // Position relative to desktop
      wallBody.position.set(
        bounds.position.x + wall.x,
        bounds.position.y + wallHeight / 2 + DESKTOP.THICKNESS,
        bounds.position.z + wall.z
      );

      wallBody.quaternion.copy(floorBody.quaternion);

      this.world.addBody(wallBody);
      this.desktopBodies.push(wallBody);
    });

    console.log('Desktop boundaries created');
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
