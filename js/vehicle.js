// ==========================================
// GTA 5 - PEGASSI ZENTORNO SUPERCAR PHYSICS
// ==========================================
class Vehicle {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.type = options.type || 'sports';
    this.color = options.color || 0xef4444; // Zentorno Crimson Red

    this.position = new THREE.Vector3();
    if (options.position) this.position.copy(options.position);
    this.rotation = options.rotation || 0;

    // Dynamics
    this.speed = 0;
    this.steerAngle = 0;
    this.maxSteerAngle = 0.58;
    this.acceleration = options.acceleration || 36;
    this.maxSpeed = options.maxSpeed || 50;
    this.reverseMaxSpeed = 18;
    this.brakeForce = 55;
    this.friction = 0.99;
    this.turnSpeed = 2.2;

    // Drifting & physics state
    this.isHandbraking = false;
    this.driftFactor = 0;
    this.chassisRoll = 0;
    this.chassisPitch = 0;

    // Nitro Boost System (GTA 5)
    this.nitro = 100;
    this.maxNitro = 100;
    this.isNitroActive = false;
    this.isBurnout = false;

    // Exhaust Flames
    this.flameTimer = 0;
    this.wasAccelerating = false;

    // Damage & health
    this.health = 100;
    this.maxHealth = 100;
    this.isDestroyed = false;
    this.smokeParticles = [];
    this.skidMarks = [];

    // Police
    this.isPolice = (this.type === 'police');
    this.sirenActive = false;
    this.sirenTimer = 0;

    // Driver
    this.driver = null;

    this.createModel();
    this.createPromptBadge();
  }

  createModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    this.chassisGroup = new THREE.Group();
    this.mesh.add(this.chassisGroup);

    let l = 4.6, w = 2.1, h = 0.98;
    if (this.type === 'truck') { l = 5.4; w = 2.3; h = 1.55; }
    else if (this.type === 'police') { l = 4.5; w = 2.05; h = 1.15; }

    this.dimensions = { l, w, h };

    // Metallic Zentorno Lacquer
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.isPolice ? 0x111827 : this.color,
      metalness: 0.9,
      roughness: 0.16
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.8,
      roughness: 0.4
    });

    // Lower Wedge Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.46, l), bodyMat);
    lowerBody.position.y = h * 0.42;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // Front Carbon Splitter
    const fSplitter = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.08, 0.6), carbonMat);
    fSplitter.position.set(0, h * 0.15, -l * 0.52);
    this.chassisGroup.add(fSplitter);

    // Front Air Intakes
    const fDam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, h * 0.25, 0.2), carbonMat);
    fDam.position.set(0, h * 0.32, -l * 0.51);
    this.chassisGroup.add(fDam);

    // Aerodynamic Side Intake Pods (Zentorno style)
    [-w * 0.52, w * 0.52].forEach(sx => {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.18, h * 0.4, l * 0.35), carbonMat);
      pod.position.set(sx, h * 0.45, l * 0.05);
      this.chassisGroup.add(pod);
    });

    // Cockpit & Seats
    const intMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    this.driverSeat = new THREE.Group();
    this.driverSeat.position.set(-w * 0.23, h * 0.52, -l * 0.02);

    const seatMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const dSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.5), seatMat);
    this.driverSeat.add(dSeat);
    this.chassisGroup.add(this.driverSeat);

    const pSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.5), seatMat);
    pSeat.position.set(w * 0.23, h * 0.52, -l * 0.02);
    this.chassisGroup.add(pSeat);

    // Dashboard & Steering Wheel
    const dash = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.3, 0.4), intMat);
    dash.position.set(0, h * 0.7, -l * 0.22);
    this.chassisGroup.add(dash);

    this.steeringWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.03, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.6 })
    );
    this.steeringWheel.position.set(-w * 0.23, h * 0.74, -l * 0.16);
    this.steeringWheel.rotation.x = -Math.PI / 4;
    this.chassisGroup.add(this.steeringWheel);

    // Canopy Roof & Privacy Tinted Glass
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.8, 0.08, l * 0.36),
      this.isPolice ? new THREE.MeshStandardMaterial({ color: 0xffffff }) : bodyMat
    );
    roof.position.set(0, h * 1.04, 0);
    this.chassisGroup.add(roof);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.42
    });

    // Angled Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.58), glassMat);
    windshield.position.set(0, h * 0.84, -l * 0.22);
    windshield.rotation.x = -Math.PI / 3.6;
    this.chassisGroup.add(windshield);

    // Rear Engine Louvers (Zentorno Hexagonal Louvers)
    const rearLouvers = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.12, l * 0.38), carbonMat);
    rearLouvers.position.set(0, h * 0.82, l * 0.25);
    this.chassisGroup.add(rearLouvers);

    // GT Race Wing
    if (this.type === 'sports') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.08, 0.4), carbonMat);
      wing.position.set(0, h * 1.08, l * 0.46);
      this.chassisGroup.add(wing);

      [-w * 0.35, w * 0.35].forEach(spX => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 6), carbonMat);
        strut.position.set(spX, h * 0.9, l * 0.46);
        this.chassisGroup.add(strut);
      });
    }

    // Rear Carbon Diffuser
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.22, 0.45), carbonMat);
    diffuser.position.set(0, h * 0.2, l * 0.52);
    this.chassisGroup.add(diffuser);

    // Dual Center Exhaust Pipes
    this.exhaustPipes = [];
    [-0.18, 0.18].forEach(exX => {
      const ex = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.25, 10),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 })
      );
      ex.rotation.x = Math.PI / 2;
      ex.position.set(exX, h * 0.24, l * 0.52);
      this.chassisGroup.add(ex);
      this.exhaustPipes.push(ex);
    });

    // 3D Exhaust Flame Cones (Blue Nitro / Orange Backfire)
    this.flameMeshes = [];
    [-0.18, 0.18].forEach(fx => {
      const fGeo = new THREE.ConeGeometry(0.18, 0.8, 8);
      const fMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8, // Cyan Blue Nitro Flame
        transparent: true,
        opacity: 0.9
      });
      const flame = new THREE.Mesh(fGeo, fMat);
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(fx, h * 0.24, l * 0.52 + 0.45);
      flame.visible = false;
      this.chassisGroup.add(flame);
      this.flameMeshes.push(flame);
    });

    // Projector Headlights
    this.headlights = [];
    [-w * 0.36, w * 0.36].forEach(x => {
      const spot = new THREE.SpotLight(0xfffaed, 2.8, 50, Math.PI / 5, 0.4);
      spot.position.set(x, h * 0.46, -l * 0.5);
      spot.target.position.set(x, 0, -l * 0.5 - 25);
      this.chassisGroup.add(spot);
      this.chassisGroup.add(spot.target);
      this.headlights.push(spot);
    });

    // LED Taillights
    this.taillightMeshes = [];
    [-w * 0.36, w * 0.36].forEach(x => {
      const tLamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.14, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x990000 })
      );
      tLamp.position.set(x, h * 0.48, l * 0.51);
      this.chassisGroup.add(tLamp);
      this.taillightMeshes.push(tLamp);
    });

    // Police Lightbar
    if (this.isPolice) {
      this.redFlasher = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.28, 0.18, 0.32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      this.redFlasher.position.set(-w * 0.2, h * 1.22, 0);
      this.chassisGroup.add(this.redFlasher);

      this.blueFlasher = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.28, 0.18, 0.32),
        new THREE.MeshBasicMaterial({ color: 0x0066ff })
      );
      this.blueFlasher.position.set(w * 0.2, h * 1.22, 0);
      this.chassisGroup.add(this.blueFlasher);

      this.sirenRedLight = new THREE.PointLight(0xff0000, 0, 16);
      this.sirenRedLight.position.copy(this.redFlasher.position);
      this.chassisGroup.add(this.sirenRedLight);

      this.sirenBlueLight = new THREE.PointLight(0x0066ff, 0, 16);
      this.sirenBlueLight.position.copy(this.blueFlasher.position);
      this.chassisGroup.add(this.sirenBlueLight);
    }

    // Wheels with Red Calipers
    this.wheels = [];
    const wheelRadius = 0.40;
    const wheelWidth = 0.30;
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.95, roughness: 0.2 });

    const wheelOffsets = [
      { x: -w * 0.48, z: -l * 0.33, isFront: true },
      { x:  w * 0.48, z: -l * 0.33, isFront: true },
      { x: -w * 0.48, z:  l * 0.33, isFront: false },
      { x:  w * 0.48, z:  l * 0.33, isFront: false }
    ];

    wheelOffsets.forEach(cfg => {
      const wheelHolder = new THREE.Group();
      wheelHolder.position.set(cfg.x, wheelRadius, cfg.z);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18), tireMat);
      tire.rotateZ(Math.PI / 2);
      tire.castShadow = true;
      wheelHolder.add(tire);

      // Alloy Rim
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelWidth * 1.02, 10), rimMat);
      rim.rotateZ(Math.PI / 2);
      wheelHolder.add(rim);

      // Red Brake Caliper
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.16), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      cal.position.set(0, wheelRadius * 0.4, 0);
      wheelHolder.add(cal);

      this.mesh.add(wheelHolder);
      this.wheels.push({ group: wheelHolder, tire: tire, isFront: cfg.isFront, rotationX: 0 });
    });

    this.mesh.userData = { entity: this };
    this.chassisGroup.userData = { entity: this };
    this.scene.add(this.mesh);
  }

  createPromptBadge() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[ENTER / F] DRIVE', 128, 38);

    const tex = new THREE.CanvasTexture(canvas);
    this.promptSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    this.promptSprite.scale.set(3.2, 0.8, 1);
    this.promptSprite.position.set(0, 2.5, 0);
    this.promptSprite.visible = false;
    this.mesh.add(this.promptSprite);
  }

  setPromptVisible(visible) {
    if (this.promptSprite) {
      this.promptSprite.visible = visible && !this.driver;
    }
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
    const nitroPressed = input.nitro || false;
    this.isHandbraking = handbrake;

    // --- BURNOUT MECHANIC (HOLD GAS + BRAKE AT STANDSTILL) ---
    this.isBurnout = (forward && backward && Math.abs(this.speed) < 3);
    if (this.isBurnout) {
      this.spawnTireSmoke(delta, 1.2);
      window.soundEngine?.setTireScreech(true);
      this.speed = 0;
    }

    // --- NITRO BOOST SYSTEM ---
    if (nitroPressed && this.nitro > 0 && Math.abs(this.speed) > 2) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - delta * 30);
      this.speed = Math.min(68, this.speed + this.acceleration * 1.8 * delta); // 80+ MPH
      this.triggerFlames(true, 0x38bdf8); // Cyan Nitro Flames
      window.soundEngine?.playNitro();
    } else {
      this.isNitroActive = false;
      this.nitro = Math.min(this.maxNitro, this.nitro + delta * 12); // Recharge nitro
    }

    // --- ACCELERATION & BRAKING ---
    if (!this.isBurnout) {
      if (forward) {
        if (this.speed < 0) {
          this.speed += this.brakeForce * delta;
        } else {
          this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * delta);
        }
        this.wasAccelerating = true;
      } else if (backward) {
        if (this.speed > 0) {
          this.speed -= this.brakeForce * delta;
        } else {
          this.speed = Math.max(-this.reverseMaxSpeed, this.speed - this.acceleration * 0.7 * delta);
        }
      } else {
        // Letting off throttle -> Trigger exhaust pop & flame
        if (this.wasAccelerating && Math.abs(this.speed) > 15) {
          this.wasAccelerating = false;
          this.triggerFlames(false, 0xf97316); // Orange backfire flame
          window.soundEngine?.playExhaustPop();
        }
        this.speed *= this.friction;
        if (Math.abs(this.speed) < 0.1) this.speed = 0;
      }
    }

    // Drifting
    if (handbrake) {
      this.speed *= 0.97;
      this.driftFactor = Math.min(1.0, this.driftFactor + delta * 4.0);
      if (Math.abs(this.speed) > 6) {
        window.soundEngine?.setTireScreech(true);
        this.spawnDriftSmokeAndSkid(delta);
      }
    } else if (!this.isBurnout) {
      this.driftFactor = Math.max(0, this.driftFactor - delta * 2.5);
      window.soundEngine?.setTireScreech(false);
    }

    // Taillights
    const isBraking = (forward && this.speed < 0) || (backward && this.speed > 0) || handbrake;
    this.taillightMeshes.forEach(mesh => {
      mesh.material.color.setHex(isBraking ? 0xff1111 : 0x880000);
    });

    // Steering
    let targetSteer = 0;
    if (left) targetSteer = this.maxSteerAngle;
    if (right) targetSteer = -this.maxSteerAngle;

    const speedRatio = Math.min(1.0, Math.abs(this.speed) / this.maxSpeed);
    const steerSensitivity = 1.0 - speedRatio * 0.42;
    this.steerAngle += (targetSteer * steerSensitivity - this.steerAngle) * delta * 9.5;

    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = -this.steerAngle * 2.2;
    }

    if (Math.abs(this.speed) > 0.1) {
      const dir = this.speed >= 0 ? 1 : -1;
      const turnMultiplier = 1.0 + (this.driftFactor * 0.85);
      this.rotation += this.steerAngle * dir * this.turnSpeed * turnMultiplier * delta;
    }

    // Pitch & Roll
    const targetRoll = -this.steerAngle * (this.speed / this.maxSpeed) * 0.18;
    let targetPitch = 0;
    if (forward) targetPitch = 0.05;
    if (isBraking) targetPitch = -0.07;

    this.chassisRoll += (targetRoll - this.chassisRoll) * delta * 7;
    this.chassisPitch += (targetPitch - this.chassisPitch) * delta * 7;

    this.chassisGroup.rotation.z = this.chassisRoll;
    this.chassisGroup.rotation.x = this.chassisPitch;

    // Movement
    const moveDist = this.speed * delta;
    const moveVector = new THREE.Vector3(
      -Math.sin(this.rotation) * moveDist,
      0,
      -Math.cos(this.rotation) * moveDist
    );

    const nextPos = this.position.clone().add(moveVector);

    if (!this.checkCollisions(nextPos, obstacles)) {
      this.position.copy(nextPos);
    } else {
      this.speed = -this.speed * 0.35;
      window.soundEngine?.playCrash();
      this.onHit(Math.min(30, Math.abs(this.speed) * 1.5));
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // Wheels
    const wheelRotDelta = (this.speed / 0.40) * delta;
    this.wheels.forEach(w => {
      w.rotationX -= wheelRotDelta;
      w.tire.rotation.x = w.rotationX;
      if (w.isFront) {
        w.group.rotation.y = this.steerAngle;
      }
    });

    // Update Flames
    if (this.flameTimer > 0) {
      this.flameTimer -= delta;
      if (this.flameTimer <= 0) {
        this.flameMeshes.forEach(f => f.visible = false);
      }
    }

    // Police flashers
    if (this.isPolice && this.sirenActive) {
      this.sirenTimer += delta * 8;
      const flash = Math.sin(this.sirenTimer) > 0;
      this.redFlasher.material.color.setHex(flash ? 0xff0000 : 0x330000);
      this.blueFlasher.material.color.setHex(!flash ? 0x0088ff : 0x001133);
      this.sirenRedLight.intensity = flash ? 9 : 0;
      this.sirenBlueLight.intensity = !flash ? 9 : 0;
    }

    if (this.health < 40) {
      this.spawnDamageSmoke(delta);
    }
  }

  triggerFlames(isNitro, colorHex) {
    this.flameTimer = isNitro ? 0.2 : 0.12;
    this.flameMeshes.forEach(f => {
      f.visible = true;
      f.material.color.setHex(colorHex);
      f.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.6, 1);
    });
  }

  spawnDriftSmokeAndSkid(delta) {
    this.spawnTireSmoke(delta, 1.0);

    if (Math.random() > 0.4) {
      [-this.dimensions.w * 0.44, this.dimensions.w * 0.44].forEach(xOff => {
        const markPos = new THREE.Vector3(xOff, 0.05, this.dimensions.l * 0.33);
        markPos.applyEuler(new THREE.Euler(0, this.rotation, 0));
        markPos.add(this.position);

        const skid = new THREE.Mesh(
          new THREE.PlaneGeometry(0.32, 1.2),
          new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.65, depthWrite: false })
        );
        skid.rotation.x = -Math.PI / 2;
        skid.rotation.z = this.rotation;
        skid.position.copy(markPos);
        this.scene.add(skid);

        this.skidMarks.push({ mesh: skid, life: 10.0 });
      });
    }
  }

  spawnTireSmoke(delta, density = 1.0) {
    if (Math.random() > 0.4 * density) return;
    [-this.dimensions.w * 0.42, this.dimensions.w * 0.42].forEach(xOff => {
      const sMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35 * density, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.65 })
      );
      const sPos = new THREE.Vector3(xOff, 0.3, this.dimensions.l * 0.35);
      sPos.applyEuler(new THREE.Euler(0, this.rotation, 0));
      sMesh.position.copy(this.position).add(sPos);
      this.scene.add(sMesh);

      this.smokeParticles.push({
        mesh: sMesh,
        vel: new THREE.Vector3((Math.random()-0.5)*2.5, Math.random()*2 + 1.2, (Math.random()-0.5)*2.5),
        life: 0.7
      });
    });
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
    const sm = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 4, 4),
      new THREE.MeshBasicMaterial({ color: this.health < 20 ? 0x111111 : 0x555555, transparent: true, opacity: 0.65 })
    );
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

    this.chassisGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 });
      }
    });

    if (this.driver && this.driver.onCarExplode) {
      this.driver.onCarExplode();
    }
    this.position.y += 0.5;
  }

  getDriverDoorPosition() {
    const doorOffset = new THREE.Vector3(-this.dimensions.w * 0.78, 0, -this.dimensions.l * 0.05);
    doorOffset.applyEuler(new THREE.Euler(0, this.rotation, 0));
    return this.position.clone().add(doorOffset);
  }
}
