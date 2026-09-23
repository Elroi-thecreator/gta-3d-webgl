// ==========================================
// GTA 3D - AMBIENT TRAFFIC DRIVING AI
// ==========================================
class TrafficManager {
  constructor(scene, cityBuilder) {
    this.scene = scene;
    this.city = cityBuilder;
    this.trafficCars = [];
    this.maxCars = 10;
    this.spawnTimer = 0;

    this.carTypes = ['sports', 'sedan', 'muscle', 'truck'];
    this.carColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x64748b];

    this.initInitialTraffic();
  }

  initInitialTraffic() {
    for (let i = 0; i < this.maxCars; i++) {
      this.spawnCar();
    }
  }

  spawnCar(nearPos = null) {
    const halfX = (this.city.gridWidth * this.city.blockSize) / 2;
    const halfZ = (this.city.gridHeight * this.city.blockSize) / 2;

    // Pick a road coordinate
    const isNS = Math.random() > 0.5;
    let x, z, rot;

    if (isNS) {
      const col = Math.floor(Math.random() * (this.city.gridWidth + 1));
      x = col * this.city.blockSize - halfX + (Math.random() > 0.5 ? 4.5 : -4.5);
      z = (Math.random() - 0.5) * (halfZ * 1.8);
      rot = x > col * this.city.blockSize - halfX ? 0 : Math.PI;
    } else {
      const row = Math.floor(Math.random() * (this.city.gridHeight + 1));
      z = row * this.city.blockSize - halfZ + (Math.random() > 0.5 ? 4.5 : -4.5);
      x = (Math.random() - 0.5) * (halfX * 1.8);
      rot = z > row * this.city.blockSize - halfZ ? Math.PI / 2 : -Math.PI / 2;
    }

    const type = this.carTypes[Math.floor(Math.random() * this.carTypes.length)];
    const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];

    const vehicle = new Vehicle(this.scene, {
      type: type,
      color: color,
      position: new THREE.Vector3(x, 0, z),
      rotation: rot,
      maxSpeed: 20 + Math.random() * 8,
      acceleration: 18
    });

    // Create civilian driver
    const driver = {
      isCivilian: true,
      vehicle: vehicle,
      onCarjacked: () => {
        // Driver gets pulled out onto road
        window.soundEngine?.playPedestrianScream();
        this.removeCar(vehicle);
      }
    };
    vehicle.driver = driver;

    this.trafficCars.push(vehicle);
    if (window.game) window.game.vehicles.push(vehicle);
  }

  update(delta, playerPos) {
    this.spawnTimer += delta;
    if (this.spawnTimer > 3.0 && this.trafficCars.length < this.maxCars) {
      this.spawnTimer = 0;
      this.spawnCar(playerPos);
    }

    for (let i = this.trafficCars.length - 1; i >= 0; i--) {
      const car = this.trafficCars[i];

      // If driven by player or destroyed, detach from autonomous traffic AI
      if (!car.driver?.isCivilian || car.isDestroyed) {
        this.trafficCars.splice(i, 1);
        continue;
      }

      // Despawn if too far from player
      if (playerPos && car.position.distanceTo(playerPos) > 280) {
        this.removeCar(car);
        this.trafficCars.splice(i, 1);
        continue;
      }

      this.updateCarAI(car, delta);
    }
  }

  updateCarAI(car, delta) {
    // Check if obstacle or car ahead
    let shouldBrake = false;
    const forward = new THREE.Vector3(
      -Math.sin(car.rotation),
      0,
      -Math.cos(car.rotation)
    );

    const allVehicles = window.game?.vehicles || [];
    for (const other of allVehicles) {
      if (other === car) continue;
      const toOther = other.position.clone().sub(car.position);
      const dist = toOther.length();
      if (dist < 14 && forward.dot(toOther.normalize()) > 0.8) {
        shouldBrake = true;
        break;
      }
    }

    // AI inputs
    const input = {
      forward: !shouldBrake,
      backward: false,
      left: false,
      right: false,
      handbrake: shouldBrake
    };

    car.update(delta, input, this.city.obstacles);
  }

  removeCar(vehicle) {
    if (vehicle.mesh) {
      this.scene.remove(vehicle.mesh);
    }
    if (window.game) {
      const idx = window.game.vehicles.indexOf(vehicle);
      if (idx !== -1) window.game.vehicles.splice(idx, 1);
    }
  }
}
