// ==========================================
// GTA 3D - REALISTIC VEHICLE PHYSICS & DYNAMICS
// ==========================================
class Vehicle {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.type = options.type || 'sports';
    this.color = options.color || 0xef4444; // Vibrant crimson red

    this.position = new THREE.Vector3();
    if (options.position) this.position.copy(options.position);
    this.rotation = options.rotation || 0;

    // Dynamics state
    this.speed = 0;
    this.steerAngle = 0;
    this.maxSteerAngle = 0.58;
    this.acceleration = options.acceleration || 32;
    this.maxSpeed = options.maxSpeed || 46;
    this.reverseMaxSpeed = 16;
    this.brakeForce = 52;
    this.friction = 0.988;
    this.turnSpeed = 2.1;

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
    this.skidMarks = [];

    // Police specific
    this.isPolice = (this.type === 'police');
    this.sirenActive = false;
    this.sirenTimer = 0;

    // Occupant
    this.driver = null;

    // Build 3D vehicle
    this.createModel();
    this.createPromptBadge();
  }

  createModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    this.chassisGroup = new THREE.Group();
    this.mesh.add(this.chassisGroup);

    let l = 4.4, w = 2.0, h = 1.05;
    if (this.type === 'sports') { l = 4.6; w = 2.1; h = 0.98; }
    else if (this.type === 'truck') { l = 5.4; w = 2.3; h = 1.55; }
    else if (this.type === 'police') { l = 4.5; w = 2.05; h = 1.15; }

    this.dimensions = { l, w, h };

    // Metallic Car Paint Shader
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.isPolice ? 0x111827 : this.color,
      metalness: 0.88,
      roughness: 0.18
    });

    // Lower Chassis
    const lowerGeo = new THREE.BoxGeometry(w, h * 0.48, l);
    const lowerBody = new THREE.Mesh(lowerGeo, bodyMat);
    lowerBody.position.y = h * 0.42;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // Front Bumper & Air Dam
    const bumperGeo = new THREE.BoxGeometry(w * 0.98, h * 0.32, 0.45);
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const fDam = new THREE.Mesh(bumperGeo, bumperMat);
    fDam.position.set(0, h * 0.25, -l * 0.51);
    this.chassisGroup.add(fDam);

    // Grille with chrome edge
    const grillGeo = new THREE.BoxGeometry(w * 0.55, h * 0.22, 0.1);
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.9 });
    const grill = new THREE.Mesh(grillGeo, grillMat);
    grill.position.set(0, h * 0.38, -l * 0.52);
    this.chassisGroup.add(grill);

    // Hood scoop / vents for sports car
    if (this.type === 'sports') {
      const ventGeo = new THREE.BoxGeometry(w * 0.35, 0.08, l * 0.25);
      const ventMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(0, h * 0.68, -l * 0.22);
      this.chassisGroup.add(vent);
    }

    // --- COCKPIT INTERIOR ---
    const intMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const floorGeo = new THREE.BoxGeometry(w * 0.86, 0.15, l * 0.45);
    const floor = new THREE.Mesh(floorGeo, intMat);
    floor.position.set(0, h * 0.4, -l * 0.02);
    this.chassisGroup.add(floor);

    // Bucket Seats (Driver & Passenger)
    const seatGeo = new THREE.BoxGeometry(0.55, 0.6, 0.5);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    
    // Driver Seat (Left)
    this.driverSeat = new THREE.Group();
    this.driverSeat.position.set(-w * 0.23, h * 0.55, -l * 0.02);
    const dSeat = new THREE.Mesh(seatGeo, seatMat);
    this.driverSeat.add(dSeat);
    this.chassisGroup.add(this.driverSeat);

    // Passenger Seat (Right)
    const pSeat = new THREE.Mesh(seatGeo, seatMat);
    pSeat.position.set(w * 0.23, h * 0.55, -l * 0.02);
    this.chassisGroup.add(pSeat);

    // Dashboard
    const dashGeo = new THREE.BoxGeometry(w * 0.86, 0.32, 0.4);
    const dash = new THREE.Mesh(dashGeo, intMat);
    dash.position.set(0, h * 0.72, -l * 0.22);
    this.chassisGroup.add(dash);

    // 3D Steering Wheel
    const wheelTorus = new THREE.TorusGeometry(0.18, 0.03, 8, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.5 });
    this.steeringWheel = new THREE.Mesh(wheelTorus, wheelMat);
    this.steeringWheel.position.set(-w * 0.23, h * 0.76, -l * 0.16);
    this.steeringWheel.rotation.x = -Math.PI / 4;
    this.chassisGroup.add(this.steeringWheel);

    // --- CABIN ROOF & TRANSPARENT TINTED GLASS ---
    const roofMat = this.isPolice 
      ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }) 
      : bodyMat;
    const roofGeo = new THREE.BoxGeometry(w * 0.82, 0.08, l * 0.38);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, h * 1.05, 0);
    roof.castShadow = true;
    this.chassisGroup.add(roof);

    // Glass Windows (Transparent tinted for full driver visibility)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.35 // Visible interior
    });

    // Angled Windshield
    const windGeo = new THREE.PlaneGeometry(w * 0.82, h * 0.55);
    const windshield = new THREE.Mesh(windGeo, glassMat);
    windshield.position.set(0, h * 0.85, -l * 0.22);
    windshield.rotation.x = -Math.PI / 3.8;
    this.chassisGroup.add(windshield);

    // Rear Windshield
    const rearWind = new THREE.Mesh(windGeo, glassMat);
    rearWind.position.set(0, h * 0.85, l * 0.22);
    rearWind.rotation.x = Math.PI / 3.8;
    rearWind.rotation.y = Math.PI;
    this.chassisGroup.add(rearWind);

    // Side Windows
    [-w * 0.415, w * 0.415].forEach(sx => {
      const sWinGeo = new THREE.PlaneGeometry(l * 0.38, h * 0.38);
      const sWin = new THREE.Mesh(sWinGeo, glassMat);
      sWin.position.set(sx, h * 0.85, 0);
      sWin.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.chassisGroup.add(sWin);

      // Side mirrors
      const mirGeo = new THREE.BoxGeometry(0.18, 0.12, 0.24);
      const mir = new THREE.Mesh(mirGeo, bodyMat);
      mir.position.set(sx * 1.06, h * 0.72, -l * 0.2);
      this.chassisGroup.add(mir);
    });

    // Rear Spoiler
    if (this.type === 'sports') {
      const spGeo = new THREE.BoxGeometry(w * 0.92, 0.08, 0.38);
      const spMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3 });
      const spoiler = new THREE.Mesh(spGeo, spMat);
      spoiler.position.set(0, h * 1.02, l * 0.46);
      this.chassisGroup.add(spoiler);

      // Struts
      [-w * 0.35, w * 0.35].forEach(spX => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), spMat);
        strut.position.set(spX, h * 0.85, l * 0.46);
        this.chassisGroup.add(strut);
      });
    }

    // Chrome Headlights with Projector Lenses
    this.headlights = [];
    [-w * 0.36, w * 0.36].forEach(x => {
      const hBucket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95 })
      );
      hBucket.rotation.x = Math.PI / 2;
      hBucket.position.set(x, h * 0.46, -l * 0.51);
      this.chassisGroup.add(hBucket);

      const spot = new THREE.SpotLight(0xfffaed, 2.8, 48, Math.PI / 5, 0.4);
      spot.position.set(x, h * 0.46, -l * 0.5);
      spot.target.position.set(x, 0, -l * 0.5 - 25);
      this.chassisGroup.add(spot);
      this.chassisGroup.add(spot.target);
      this.headlights.push(spot);
    });

    // LED Taillight Bar
    this.taillightMeshes = [];
    [-w * 0.36, w * 0.36].forEach(x => {
      const tMat = new THREE.MeshBasicMaterial({ color: 0x990000 });
      const tLamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.1), tMat);
      tLamp.position.set(x, h * 0.48, l * 0.51);
      this.chassisGroup.add(tLamp);
      this.taillightMeshes.push(tLamp);
    });

    // Dual Chrome Exhaust Pipes
    [-0.32, 0.32].forEach(exX => {
      const exGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10);
      const exMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
      const exhaust = new THREE.Mesh(exGeo, exMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(exX, h * 0.22, l * 0.52);
      this.chassisGroup.add(exhaust);
    });

    // Police Flasher Bar
    if (this.isPolice) {
      const barGeo = new THREE.BoxGeometry(w * 0.72, 0.15, 0.35);
      const bar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x111827 }));
      bar.position.set(0, h * 1.25, 0);
      this.chassisGroup.add(bar);

      this.redFlasher = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.28, 0.18, 0.32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      this.redFlasher.position.set(-w * 0.2, h * 1.25, 0);
      this.chassisGroup.add(this.redFlasher);

      this.blueFlasher = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.28, 0.18, 0.32),
        new THREE.MeshBasicMaterial({ color: 0x0066ff })
      );
      this.blueFlasher.position.set(w * 0.2, h * 1.25, 0);
      this.chassisGroup.add(this.blueFlasher);

      this.sirenRedLight = new THREE.PointLight(0xff0000, 0, 16);
      this.sirenRedLight.position.copy(this.redFlasher.position);
      this.chassisGroup.add(this.sirenRedLight);

      this.sirenBlueLight = new THREE.PointLight(0x0066ff, 0, 16);
      this.sirenBlueLight.position.copy(this.blueFlasher.position);
      this.chassisGroup.add(this.sirenBlueLight);
    }

    // --- 4 ALLOY WHEELS ---
    this.wheels = [];
    const wheelRadius = 0.40;
    const wheelWidth = 0.30;
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.2 });

    const wheelOffsets = [
      { x: -w * 0.47, z: -l * 0.33, isFront: true },
      { x:  w * 0.47, z: -l * 0.33, isFront: true },
      { x: -w * 0.47, z:  l * 0.33, isFront: false },
      { x:  w * 0.47, z:  l * 0.33, isFront: false }
    ];

    wheelOffsets.forEach(cfg => {
      const wheelHolder = new THREE.Group();
      wheelHolder.position.set(cfg.x, wheelRadius, cfg.z);

      // Rubber Tire
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelHolder.add(tire);

      // Alloy Rim (5-spoke star)
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelWidth * 1.02, 10);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelHolder.add(rim);

      // Brake Caliper (Red)
      const calGeo = new THREE.BoxGeometry(0.12, 0.18, 0.16);
      const cal = new THREE.Mesh(calGeo, new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      cal.position.set(0, wheelRadius * 0.4, 0);
      wheelHolder.add(cal);

      this.mesh.add(wheelHolder);
      this.wheels.push({
        group: wheelHolder,
        tire: tire,
        isFront: cfg.isFront,
        rotationX: 0,
        origOffset: cfg
      });
    });

    this.mesh.userData = { entity: this };
    this.chassisGroup.userData = { entity: this };
    this.scene.add(this.mesh);
  }

  createPromptBadge() {
    // 3D In-World Floating Billboard over car
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
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.promptSprite = new THREE.Sprite(mat);
    this.promptSprite.scale.set(3.2, 0.8, 1);
    this.promptSprite.position.set(0, 2.6, 0);
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

    // Drifting & burnout
    if (handbrake) {
      this.speed *= 0.97;
      this.driftFactor = Math.min(1.0, this.driftFactor + delta * 3.5);
      if (Math.abs(this.speed) > 7) {
        window.soundEngine?.setTireScreech(true);
        this.spawnDriftSmokeAndSkid(delta);
      }
    } else {
      this.driftFactor = Math.max(0, this.driftFactor - delta * 2.5);
      window.soundEngine?.setTireScreech(false);
    }

    // Burnout smoke from standstill
    if (forward && Math.abs(this.speed) < 8 && Math.abs(this.speed) > 0.5) {
      this.spawnTireSmoke(delta);
    }

    // Taillights
    const isBraking = (forward && this.speed < 0) || (backward && this.speed > 0) || handbrake;
    this.taillightMeshes.forEach(mesh => {
      mesh.material.color.setHex(isBraking ? 0xff1111 : 0x880000);
    });

    // --- STEERING ---
    let targetSteer = 0;
    if (left) targetSteer = this.maxSteerAngle;
    if (right) targetSteer = -this.maxSteerAngle;

    const speedRatio = Math.min(1.0, Math.abs(this.speed) / this.maxSpeed);
    const steerSensitivity = 1.0 - speedRatio * 0.42;
    this.steerAngle += (targetSteer * steerSensitivity - this.steerAngle) * delta * 9.0;

    // Rotate steering wheel inside cockpit
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = -this.steerAngle * 2.2;
    }

    // Yaw rotation
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

    // Police flashers
    if (this.isPolice && this.sirenActive) {
      this.sirenTimer += delta * 8;
      const flash = Math.sin(this.sirenTimer) > 0;
      this.redFlasher.material.color.setHex(flash ? 0xff0000 : 0x330000);
      this.blueFlasher.material.color.setHex(!flash ? 0x0088ff : 0x001133);
      this.sirenRedLight.intensity = flash ? 9 : 0;
      this.sirenBlueLight.intensity = !flash ? 9 : 0;
    }

    // Damage smoke
    if (this.health < 40) {
      this.spawnDamageSmoke(delta);
    }
  }

  spawnDriftSmokeAndSkid(delta) {
    this.spawnTireSmoke(delta);

    // Spawn skid marks on road surface
    if (Math.random() > 0.4) {
      [-this.dimensions.w * 0.44, this.dimensions.w * 0.44].forEach(xOff => {
        const markPos = new THREE.Vector3(xOff, 0.05, this.dimensions.l * 0.33);
        markPos.applyEuler(new THREE.Euler(0, this.rotation, 0));
        markPos.add(this.position);

        const skidGeo = new THREE.PlaneGeometry(0.32, 1.2);
        const skidMat = new THREE.MeshBasicMaterial({
          color: 0x050505,
          transparent: true,
          opacity: 0.65,
          depthWrite: false
        });
        const skid = new THREE.Mesh(skidGeo, skidMat);
        skid.rotation.x = -Math.PI / 2;
        skid.rotation.z = this.rotation;
        skid.position.copy(markPos);
        this.scene.add(skid);

        this.skidMarks.push({ mesh: skid, life: 10.0 });
      });
    }
  }

  spawnTireSmoke(delta) {
    if (Math.random() > 0.45) return;
    [-this.dimensions.w * 0.42, this.dimensions.w * 0.42].forEach(xOff => {
      const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.6
      });
      const sMesh = new THREE.Mesh(smokeGeo, smokeMat);
      const sPos = new THREE.Vector3(xOff, 0.3, this.dimensions.l * 0.35);
      sPos.applyEuler(new THREE.Euler(0, this.rotation, 0));
      sMesh.position.copy(this.position).add(sPos);
      this.scene.add(sMesh);

      this.smokeParticles.push({
        mesh: sMesh,
        vel: new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2 + 1, (Math.random()-0.5)*2),
        life: 0.65
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
    const smokeGeo = new THREE.SphereGeometry(0.35, 4, 4);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: this.health < 20 ? 0x111111 : 0x555555,
      transparent: true,
      opacity: 0.65
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
