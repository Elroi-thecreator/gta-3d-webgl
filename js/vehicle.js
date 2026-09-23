// ==========================================
// GTA 3D - VEHICLE PHYSICS & DYNAMICS
// ==========================================
class Vehicle {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.type = options.type || 'sports'; // 'sports', 'sedan', 'police', 'muscle', 'truck'
    this.color = options.color || 0xdd2222;

    this.position = new THREE.Vector3();
    if (options.position) this.position.copy(options.position);
    this.rotation = options.rotation || 0;

    // Dynamics state
    this.speed = 0;
    this.steerAngle = 0;
    this.maxSteerAngle = 0.55;
    this.acceleration = options.acceleration || 28;
    this.maxSpeed = options.maxSpeed || 42;
    this.reverseMaxSpeed = 15;
    this.brakeForce = 45;
    this.friction = 0.985;
    this.turnSpeed = 1.9;

    // Drifting & physics state
    this.isHandbraking = false;
    this.driftFactor = 0;
    this.chassisRoll = 0;
    this.chassisPitch = 0;

    // Damage & health
    this.health = 100;
    this.maxHealth = 100;
    this.isDestroyed = false;
    this.smokeParticles = [];

    // Police specific
    this.isPolice = (this.type === 'police');
    this.sirenActive = false;
    this.sirenTimer = 0;

    // Occupant
    this.driver = null;

    // Build 3D vehicle
    this.createModel();
  }

  createModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // Chassis group (tilts with pitch & roll)
    this.chassisGroup = new THREE.Group();
    this.mesh.add(this.chassisGroup);

    // Car dimensions by type
    let l = 4.2, w = 1.9, h = 1.1;
    if (this.type === 'sports') { l = 4.4; w = 2.0; h = 0.95; }
    else if (this.type === 'truck') { l = 5.2; w = 2.2; h = 1.5; }
    else if (this.type === 'police') { l = 4.3; w = 1.9; h = 1.15; }

    this.dimensions = { l, w, h };

    // --- CAR BODY ---
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.isPolice ? 0x111111 : this.color,
      roughness: 0.2,
      metalness: 0.6
    });

    // Lower body
    const lowerGeo = new THREE.BoxGeometry(w, h * 0.55, l);
    const lowerBody = new THREE.Mesh(lowerGeo, bodyMat);
    lowerBody.position.y = h * 0.45;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // Cabin / Roof
    const roofMat = this.isPolice 
      ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }) 
      : bodyMat;
    const cabinGeo = new THREE.BoxGeometry(w * 0.88, h * 0.55, l * 0.55);
    const cabin = new THREE.Mesh(cabinGeo, roofMat);
    cabin.position.set(0, h * 0.9, -l * 0.05);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // Windshield & Windows
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.75
    });
    const windGeo = new THREE.BoxGeometry(w * 0.89, h * 0.52, l * 0.56);
    const windshield = new THREE.Mesh(windGeo, glassMat);
    windshield.position.copy(cabin.position);
    this.chassisGroup.add(windshield);

    // Police Lightbar & Liveries
    if (this.isPolice) {
      // Lightbar base
      const barGeo = new THREE.BoxGeometry(w * 0.65, 0.12, 0.35);
      const barMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(0, h * 1.22, -l * 0.05);
      this.chassisGroup.add(bar);

      // Red & Blue flashers
      this.redFlasher = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.25, 0.15, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      this.redFlasher.position.set(-w * 0.18, h * 1.22, -l * 0.05);
      this.chassisGroup.add(this.redFlasher);

      this.blueFlasher = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.25, 0.15, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x0066ff })
      );
      this.blueFlasher.position.set(w * 0.18, h * 1.22, -l * 0.05);
      this.chassisGroup.add(this.blueFlasher);

      // Flashing point lights
      this.sirenRedLight = new THREE.PointLight(0xff0000, 0, 14);
      this.sirenRedLight.position.copy(this.redFlasher.position);
      this.chassisGroup.add(this.sirenRedLight);

      this.sirenBlueLight = new THREE.PointLight(0x0066ff, 0, 14);
      this.sirenBlueLight.position.copy(this.blueFlasher.position);
      this.chassisGroup.add(this.sirenBlueLight);
    }

    // Spoiler for sports car
    if (this.type === 'sports') {
      const spGeo = new THREE.BoxGeometry(w * 0.85, 0.08, 0.35);
      const spMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
      const spoiler = new THREE.Mesh(spGeo, spMat);
      spoiler.position.set(0, h * 0.9, l * 0.44);
      this.chassisGroup.add(spoiler);
    }

    // Headlights
    this.headlights = [];
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff5ea });
    [-w * 0.36, w * 0.36].forEach(x => {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), lightMat);
      lamp.position.set(x, h * 0.45, -l * 0.5);
      this.chassisGroup.add(lamp);

      const spot = new THREE.SpotLight(0xfffaed, 2.5, 40, Math.PI / 6, 0.4);
      spot.position.set(x, h * 0.45, -l * 0.5);
      spot.target.position.set(x, 0, -l * 0.5 - 20);
      this.chassisGroup.add(spot);
      this.chassisGroup.add(spot.target);
      this.headlights.push(spot);
    });

    // Taillights
    this.taillightMeshes = [];
    [-w * 0.36, w * 0.36].forEach(x => {
      const tMat = new THREE.MeshBasicMaterial({ color: 0xaa1111 });
      const tLamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), tMat);
      tLamp.position.set(x, h * 0.45, l * 0.5);
      this.chassisGroup.add(tLamp);
      this.taillightMeshes.push(tLamp);
    });

    // --- 4 WHEELS ---
    this.wheels = [];
    const wheelRadius = 0.38;
    const wheelWidth = 0.28;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 });

    const wheelOffsets = [
      { x: -w * 0.46, z: -l * 0.32, isFront: true },  // Front Left
      { x:  w * 0.46, z: -l * 0.32, isFront: true },  // Front Right
      { x: -w * 0.46, z:  l * 0.32, isFront: false }, // Rear Left
      { x:  w * 0.46, z:  l * 0.32, isFront: false }  // Rear Right
    ];

    wheelOffsets.forEach(cfg => {
      const wheelHolder = new THREE.Group();
      wheelHolder.position.set(cfg.x, wheelRadius, cfg.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.castShadow = true;
      wheelHolder.add(tire);

      // Rim center
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth * 1.05, 8), rimMat);
      rim.rotateZ(Math.PI / 2);
      wheelHolder.add(rim);

      this.mesh.add(wheelHolder);
      this.wheels.push({
        group: wheelHolder,
        tire: tire,
        isFront: cfg.isFront,
        rotationX: 0
      });
    });

    // Tag for hit detection
    this.mesh.userData = { entity: this };
    this.chassisGroup.userData = { entity: this };

    this.scene.add(this.mesh);
  }

  update(delta, input = {}, obstacles = []) {
    if (this.isDestroyed) {
      this.updateDestroyedSmoke(delta);
      return;
    }

    const forward = input.forward || false;
    const backward = input.backward || false;
    const left = input.left || false;
    const right = input.right || false;
    const handbrake = input.handbrake || false;
    this.isHandbraking = handbrake;

    // --- ACCELERATION & BRAKING ---
    if (forward) {
      if (this.speed < 0) {
        this.speed += this.brakeForce * delta;
      } else {
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * delta);
      }
    } else if (backward) {
      if (this.speed > 0) {
        this.speed -= this.brakeForce * delta;
      } else {
        this.speed = Math.max(-this.reverseMaxSpeed, this.speed - this.acceleration * 0.7 * delta);
      }
    } else {
      this.speed *= this.friction;
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    // Handbrake physics (cuts speed, induces rear drift slip)
    if (handbrake) {
      this.speed *= 0.965;
      this.driftFactor = Math.min(1.0, this.driftFactor + delta * 3.5);
      if (Math.abs(this.speed) > 10) {
        window.soundEngine?.setTireScreech(true);
      }
    } else {
      this.driftFactor = Math.max(0, this.driftFactor - delta * 2.5);
      window.soundEngine?.setTireScreech(false);
    }

    // Taillights flare on brake/reverse
    const isBraking = (forward && this.speed < 0) || (backward && this.speed > 0) || handbrake;
    this.taillightMeshes.forEach(mesh => {
      mesh.material.color.setHex(isBraking ? 0xff2222 : 0xaa1111);
    });

    // --- STEERING ---
    let targetSteer = 0;
    if (left) targetSteer = this.maxSteerAngle;
    if (right) targetSteer = -this.maxSteerAngle;

    // Smooth steer interpolation with speed sensitivity
    const speedRatio = Math.min(1.0, Math.abs(this.speed) / this.maxSpeed);
    const steerSensitivity = 1.0 - speedRatio * 0.45;
    this.steerAngle += (targetSteer * steerSensitivity - this.steerAngle) * delta * 8.0;

    // Yaw rotation based on speed and steering
    if (Math.abs(this.speed) > 0.1) {
      const dir = this.speed >= 0 ? 1 : -1;
      const turnMultiplier = 1.0 + (this.driftFactor * 0.8);
      this.rotation += this.steerAngle * dir * this.turnSpeed * turnMultiplier * delta;
    }

    // --- CHASSIS PITCH & ROLL DYNAMICS ---
    const targetRoll = -this.steerAngle * (this.speed / this.maxSpeed) * 0.15;
    let targetPitch = 0;
    if (forward) targetPitch = 0.04;
    if (isBraking) targetPitch = -0.06;

    this.chassisRoll += (targetRoll - this.chassisRoll) * delta * 6;
    this.chassisPitch += (targetPitch - this.chassisPitch) * delta * 6;

    this.chassisGroup.rotation.z = this.chassisRoll;
    this.chassisGroup.rotation.x = this.chassisPitch;

    // --- MOVEMENT & VELOCITY ---
    const moveDist = this.speed * delta;
    const moveVector = new THREE.Vector3(
      -Math.sin(this.rotation) * moveDist,
      0,
      -Math.cos(this.rotation) * moveDist
    );

    // Tentative next position
    const nextPos = this.position.clone().add(moveVector);

    // Collision detection with world boundaries and obstacles
    if (!this.checkCollisions(nextPos, obstacles)) {
      this.position.copy(nextPos);
    } else {
      // Rebound bounce
      this.speed = -this.speed * 0.35;
      window.soundEngine?.playCrash();
      this.onHit(Math.min(30, Math.abs(this.speed) * 1.5));
    }

    // Update 3D mesh transforms
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // --- WHEEL ROTATION & STEERING VISUALS ---
    const wheelRotDelta = (this.speed / 0.38) * delta;
    this.wheels.forEach(w => {
      w.rotationX -= wheelRotDelta;
      w.tire.rotation.x = w.rotationX;
      if (w.isFront) {
        w.group.rotation.y = this.steerAngle;
      }
    });

    // --- POLICE SIRENS & LIGHTS ---
    if (this.isPolice && this.sirenActive) {
      this.sirenTimer += delta * 8;
      const flash = Math.sin(this.sirenTimer) > 0;
      this.redFlasher.material.color.setHex(flash ? 0xff0000 : 0x330000);
      this.blueFlasher.material.color.setHex(!flash ? 0x0088ff : 0x001133);
      this.sirenRedLight.intensity = flash ? 8 : 0;
      this.sirenBlueLight.intensity = !flash ? 8 : 0;
    }

    // --- CRITICAL DAMAGE SMOKE ---
    if (this.health < 40) {
      this.spawnDamageSmoke(delta);
    }
  }

  checkCollisions(nextPos, obstacles) {
    const halfL = this.dimensions.l * 0.48;
    const halfW = this.dimensions.w * 0.48;

    for (const obs of obstacles) {
      if (!obs || obs === this) continue;
      const oPos = obs.position;
      const oSize = obs.collisionSize || { x: 2, z: 2 };

      if (
        Math.abs(nextPos.x - oPos.x) < halfW + oSize.x * 0.5 &&
        Math.abs(nextPos.z - oPos.z) < halfL + oSize.z * 0.5
      ) {
        return true;
      }
    }
    return false;
  }

  spawnDamageSmoke(delta) {
    if (Math.random() > 0.3) return;
    const smokeGeo = new THREE.SphereGeometry(0.3, 4, 4);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: this.health < 20 ? 0x111111 : 0x555555,
      transparent: true,
      opacity: 0.6
    });
    const sm = new THREE.Mesh(smokeGeo, smokeMat);
    const hoodOffset = new THREE.Vector3(0, 0.8, -this.dimensions.l * 0.35)
      .applyEuler(new THREE.Euler(0, this.rotation, 0));
    sm.position.copy(this.position).add(hoodOffset);
    this.scene.add(sm);

    this.smokeParticles.push({
      mesh: sm,
      vel: new THREE.Vector3((Math.random()-0.5)*1.5, Math.random()*2+1, (Math.random()-0.5)*1.5),
      life: 0.8
    });
  }

  updateDestroyedSmoke(delta) {
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const s = this.smokeParticles[i];
      s.life -= delta;
      s.mesh.position.addScaledVector(s.vel, delta);
      s.mesh.scale.multiplyScalar(1.02);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  onHit(damage, knockback = null) {
    if (this.isDestroyed) return;
    this.health = Math.max(0, this.health - damage);

    if (this.health <= 0) {
      this.explode();
    }
  }

  explode() {
    this.isDestroyed = true;
    this.speed = 0;
    window.soundEngine?.playExplosion();

    // Blackened burnt chassis
    this.chassisGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
      }
    });

    // Knock occupants out or waste player
    if (this.driver && this.driver.onCarExplode) {
      this.driver.onCarExplode();
    }

    // Launch slightly into air
    this.position.y += 0.5;
  }

  getDriverDoorPosition() {
    const doorOffset = new THREE.Vector3(-this.dimensions.w * 0.75, 0, -this.dimensions.l * 0.05);
    doorOffset.applyEuler(new THREE.Euler(0, this.rotation, 0));
    return this.position.clone().add(doorOffset);
  }
}
