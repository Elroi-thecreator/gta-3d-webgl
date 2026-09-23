// ==========================================
// GTA 3D - REALISTIC CHARACTER CONTROLLER
// ==========================================
class PlayerCharacter {
  constructor(scene, cameraController, weaponManager) {
    this.scene = scene;
    this.cameraCtrl = cameraController;
    this.weaponMgr = weaponManager;

    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = 0;
    this.velocity = new THREE.Vector3();

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 100;
    this.maxArmor = 100;
    this.cash = 350;
    this.isDead = false;

    // Movement attributes
    this.walkSpeed = 5.5;
    this.sprintSpeed = 11.2;
    this.jumpForce = 8.8;
    this.gravity = 24.0;
    this.isGrounded = true;
    this.verticalVelocity = 0;

    // Animation state
    this.animTime = 0;
    this.isMoving = false;
    this.isSprinting = false;
    this.isAiming = false;
    this.isPunching = false;
    this.punchTimer = 0;

    // Ragdoll / Knockback
    this.isRagdoll = false;
    this.ragdollTime = 0;
    this.ragdollVelocity = new THREE.Vector3();

    // Vehicle state
    this.inVehicle = false;
    this.currentVehicle = null;

    // Inputs
    this.keys = {};
    this.mouseButtons = {};

    this.createCharacterMesh();
    this.setupEventListeners();
  }

  createCharacterMesh() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // --- REALISTIC MATERIALS ---
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.65 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.1 }); // Rich Blue Vice Jacket
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 }); // White undershirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }); // Dark indigo denim
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }); // White trainers
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.7 });
    const shadesMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.95, roughness: 0.1 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 });

    // Hips / Pelvis Root
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.95;
    this.mesh.add(this.pelvis);

    // Torso Base (Jacket + Shirt)
    const torsoGeo = new THREE.BoxGeometry(0.56, 0.68, 0.34);
    this.torso = new THREE.Mesh(torsoGeo, jacketMat);
    this.torso.position.y = 0.36;
    this.torso.castShadow = true;
    this.pelvis.add(this.torso);

    // Inner White Shirt V-Neck
    const vGeo = new THREE.BoxGeometry(0.24, 0.42, 0.05);
    const vShirt = new THREE.Mesh(vGeo, shirtMat);
    vShirt.position.set(0, 0.12, -0.16);
    this.torso.add(vShirt);

    // Jacket Collar
    const colGeo = new THREE.BoxGeometry(0.48, 0.12, 0.36);
    const collar = new THREE.Mesh(colGeo, jacketMat);
    collar.position.y = 0.36;
    this.torso.add(collar);

    // Belt & Buckle
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.08, 0.35), beltMat);
    belt.position.y = -0.32;
    this.torso.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.04), buckleMat);
    buckle.position.set(0, -0.32, -0.17);
    this.torso.add(buckle);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 8), skinMat);
    neck.position.y = 0.42;
    this.torso.add(neck);

    const headGeo = new THREE.BoxGeometry(0.32, 0.36, 0.32);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 0.60;
    this.head.castShadow = true;
    this.torso.add(this.head);

    // Styled Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.36), hairMat);
    hair.position.set(0, 0.16, -0.02);
    this.head.add(hair);

    // Aviator Sunglasses
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.12), shadesMat);
    shades.position.set(0, 0.05, -0.16);
    this.head.add(shades);

    // --- SHOULDERS & ARMS ---
    const armGeo = new THREE.BoxGeometry(0.18, 0.68, 0.18);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 0.28, 0);
    const lArmMesh = new THREE.Mesh(armGeo, jacketMat);
    lArmMesh.position.y = -0.30;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);

    // Left Hand
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.14), skinMat);
    lHand.position.y = -0.66;
    this.leftArm.add(lHand);
    this.torso.add(this.leftArm);

    // Right Arm (Weapon & Steering Hand)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 0.28, 0);
    const rArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rArmMesh.position.y = -0.30;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);

    // Right Hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.14), skinMat);
    rHand.position.y = -0.66;
    this.rightArm.add(rHand);

    // Handheld Weapon Prop
    this.weaponProp = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.18, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85 })
    );
    this.weaponProp.position.set(0, -0.62, -0.16);
    this.rightArm.add(this.weaponProp);
    this.torso.add(this.rightArm);

    // --- LEGS ---
    const legGeo = new THREE.BoxGeometry(0.24, 0.74, 0.24);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0, 0);
    const lLegMesh = new THREE.Mesh(legGeo, pantsMat);
    lLegMesh.position.y = -0.37;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);

    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.34), shoeMat);
    lShoe.position.set(0, -0.74, -0.05);
    lShoe.castShadow = true;
    this.leftLeg.add(lShoe);
    this.pelvis.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0, 0);
    const rLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rLegMesh.position.y = -0.37;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);

    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.34), shoeMat);
    rShoe.position.set(0, -0.74, -0.05);
    rShoe.castShadow = true;
    this.rightLeg.add(rShoe);
    this.pelvis.add(this.rightLeg);

    this.mesh.userData = { entity: this };
    this.scene.add(this.mesh);
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Board / Exit Vehicle with Enter, NumpadEnter, F, or E!
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyF' || e.code === 'KeyE') {
        if (!this.inVehicle) {
          this.tryEnterNearestVehicle();
        } else {
          this.exitVehicle();
        }
      }

      if (e.code === 'KeyH' && this.inVehicle) {
        window.soundEngine?.playCarHorn();
      }

      if (e.code === 'KeyE' && this.inVehicle && this.currentVehicle?.isPolice) {
        this.currentVehicle.sirenActive = !this.currentVehicle.sirenActive;
        window.soundEngine?.setPoliceSiren(this.currentVehicle.sirenActive);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Click on car to enter
    window.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;

      if (e.button === 0 && !this.inVehicle) {
        // Raycast click for car entry
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.cameraCtrl.camera);
        const vehicles = window.game?.vehicles || [];
        const hits = raycaster.intersectObjects(vehicles.map(v => v.mesh), true);
        if (hits.length > 0 && hits[0].distance < 6.5) {
          let root = hits[0].object;
          while (root && !root.userData?.entity) root = root.parent;
          if (root && root.userData?.entity instanceof Vehicle) {
            this.enterVehicle(root.userData.entity);
            return;
          }
        }
      }

      if (e.button === 2) {
        this.isAiming = true;
        this.cameraCtrl.setAiming(true);
        if (window.ui) window.ui.setAiming(true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
      if (e.button === 2) {
        this.isAiming = false;
        this.cameraCtrl.setAiming(false);
        if (window.ui) window.ui.setAiming(false);
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(delta, cityObstacles = [], vehicles = [], targetEntities = []) {
    if (this.isDead) return;

    // --- RAGDOLL KNOCKBACK ---
    if (this.isRagdoll) {
      this.ragdollTime -= delta;
      this.position.addScaledVector(this.ragdollVelocity, delta);
      this.ragdollVelocity.x *= 0.94;
      this.ragdollVelocity.z *= 0.94;
      this.ragdollVelocity.y -= this.gravity * delta;

      if (this.position.y <= 0) {
        this.position.y = 0;
        this.ragdollVelocity.y = 0;
      }
      this.mesh.position.copy(this.position);
      this.pelvis.rotation.z = Math.PI / 2;

      if (this.ragdollTime <= 0) {
        this.isRagdoll = false;
        this.pelvis.rotation.z = 0;
      }
      return;
    }

    // --- DRIVING VEHICLE MODE (VISIBLE SITTING POSE) ---
    if (this.inVehicle && this.currentVehicle) {
      const v = this.currentVehicle;

      // Full Arrow Key & WASD support for steering and throttle
      const vInput = {
        forward: this.keys['KeyW'] || this.keys['ArrowUp'] || false,
        backward: this.keys['KeyS'] || this.keys['ArrowDown'] || false,
        left: this.keys['KeyA'] || this.keys['ArrowLeft'] || false,
        right: this.keys['KeyD'] || this.keys['ArrowRight'] || false,
        handbrake: this.keys['Space'] || false
      };

      v.update(delta, vInput, [...cityObstacles, ...vehicles]);
      this.position.copy(v.position);

      // Character Visibly Sits in Driver Seat
      this.mesh.visible = true;
      const seatOffset = new THREE.Vector3(-v.dimensions.w * 0.23, v.dimensions.h * 0.38, -v.dimensions.l * 0.05);
      seatOffset.applyEuler(new THREE.Euler(0, v.rotation, 0));
      this.mesh.position.copy(v.position).add(seatOffset);
      this.mesh.rotation.y = v.rotation;

      // Animate Driving Sitting Pose
      this.pelvis.position.y = 0.55;
      this.leftLeg.rotation.x = -Math.PI / 2.2;
      this.rightLeg.rotation.x = -Math.PI / 2.2;
      this.leftArm.rotation.x = -Math.PI / 3.0;
      this.leftArm.rotation.y = 0.35;
      this.rightArm.rotation.x = -Math.PI / 3.0;
      this.rightArm.rotation.y = -0.35;
      this.weaponProp.visible = false;

      window.soundEngine?.updateEngine(v.speed, vInput.forward || vInput.backward);
      if (window.ui) window.ui.updateVehicleHUD(v);
      return;
    }

    // Restore weapon visibility on-foot
    this.weaponProp.visible = (this.weaponMgr.current.id !== 'fists');

    // --- ON-FOOT MOVEMENT (WASD & ARROW KEYS SUPPORT) ---
    const up = this.keys['KeyW'] || this.keys['ArrowUp'];
    const down = this.keys['KeyS'] || this.keys['ArrowDown'];
    const left = this.keys['KeyA'] || this.keys['ArrowLeft'];
    const right = this.keys['KeyD'] || this.keys['ArrowRight'];

    const moveZ = (up ? 1 : 0) - (down ? 1 : 0);
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && moveZ > 0;

    const inputLength = Math.hypot(moveX, moveZ);
    this.isMoving = inputLength > 0.1;

    let moveDir = new THREE.Vector3();
    if (this.isMoving) {
      const forward = this.cameraCtrl.getForwardVector();
      const rightVec = this.cameraCtrl.getRightVector();
      moveDir.addScaledVector(forward, moveZ);
      moveDir.addScaledVector(rightVec, moveX);
      moveDir.normalize();

      if (this.isAiming) {
        this.rotation = this.cameraCtrl.yaw;
      } else {
        const targetAngle = Math.atan2(-moveDir.x, -moveDir.z);
        let diff = targetAngle - this.rotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.rotation += diff * Math.min(1.0, delta * 14.0);
      }
    } else if (this.isAiming) {
      this.rotation = this.cameraCtrl.yaw;
    }

    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
    const moveDelta = moveDir.clone().multiplyScalar(currentSpeed * delta);
    const nextPos = this.position.clone().add(moveDelta);

    if (!this.checkPlayerCollision(nextPos, cityObstacles, vehicles)) {
      this.position.copy(nextPos);
    }

    // Jump & Gravity
    if (this.keys['Space'] && this.isGrounded) {
      this.verticalVelocity = this.jumpForce;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.verticalVelocity -= this.gravity * delta;
      this.position.y += this.verticalVelocity * delta;

      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    this.updateAnimations(delta);

    // Weapons Firing
    if (this.mouseButtons[0]) {
      this.weaponMgr.tryFire(this, targetEntities);
      if (this.weaponMgr.current.id === 'fists') {
        this.isPunching = true;
        this.punchTimer = 0.25;
      }
    }

    if (this.isPunching) {
      this.punchTimer -= delta;
      if (this.punchTimer <= 0) this.isPunching = false;
    }

    this.checkVehiclePrompt(vehicles);
  }

  updateAnimations(delta) {
    if (this.isMoving) {
      const animSpeed = this.isSprinting ? 15 : 9.5;
      this.animTime += delta * animSpeed;
      const swing = Math.sin(this.animTime);

      this.leftLeg.rotation.x = swing * 0.72;
      this.rightLeg.rotation.x = -swing * 0.72;

      if (!this.isAiming && !this.isPunching) {
        this.leftArm.rotation.x = -swing * 0.65;
        this.rightArm.rotation.x = swing * 0.65;
      }
      this.pelvis.position.y = 0.95 + Math.abs(Math.sin(this.animTime * 2)) * 0.08;
    } else {
      this.animTime += delta * 2.5;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.pelvis.position.y = 0.95;

      if (!this.isAiming && !this.isPunching) {
        this.leftArm.rotation.x = Math.sin(this.animTime) * 0.05;
        this.rightArm.rotation.x = -Math.sin(this.animTime) * 0.05;
      }
    }

    if (this.isAiming) {
      this.rightArm.rotation.x = -Math.PI / 2 + this.cameraCtrl.pitch * 0.6;
      this.rightArm.rotation.y = -0.2;
      this.leftArm.rotation.x = -Math.PI / 2.5;
      this.leftArm.rotation.y = 0.4;
    } else if (this.isPunching) {
      this.rightArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.z = -0.3;
    } else {
      this.rightArm.rotation.y = 0;
      this.rightArm.rotation.z = 0;
      this.leftArm.rotation.y = 0;
    }
  }

  checkPlayerCollision(nextPos, obstacles, vehicles) {
    const radius = 0.48;
    for (const obs of obstacles) {
      if (!obs) continue;
      const oPos = obs.position;
      const size = obs.collisionSize || { x: 2, z: 2 };
      if (
        Math.abs(nextPos.x - oPos.x) < radius + size.x * 0.5 &&
        Math.abs(nextPos.z - oPos.z) < radius + size.z * 0.5
      ) {
        return true;
      }
    }

    for (const v of vehicles) {
      if (!v || v === this.currentVehicle) continue;
      const vPos = v.position;
      const vDim = v.dimensions || { l: 4.4, w: 2.1 };
      if (
        Math.abs(nextPos.x - vPos.x) < radius + vDim.w * 0.5 &&
        Math.abs(nextPos.z - vPos.z) < radius + vDim.l * 0.5
      ) {
        return true;
      }
    }
    return false;
  }

  checkVehiclePrompt(vehicles) {
    if (this.inVehicle) {
      if (window.ui) window.ui.showPromptTip('[ENTER / F] Exit Vehicle');
      return;
    }

    let nearestCar = null;
    let minDist = 6.5;

    for (const v of vehicles) {
      if (!v || v.isDestroyed) continue;
      const d = this.position.distanceTo(v.position);
      if (d < minDist) {
        minDist = d;
        nearestCar = v;
      }
      v.setPromptVisible(false);
    }

    if (nearestCar) {
      nearestCar.setPromptVisible(true);
      const msg = nearestCar.driver ? '[ENTER / F] Carjack Vehicle' : '[ENTER / F] Drive Vehicle';
      if (window.ui) window.ui.showPromptTip(msg);
    } else {
      if (window.ui) window.ui.hidePromptTip();
    }
  }

  tryEnterNearestVehicle() {
    const vehicles = window.game?.vehicles || [];
    let nearest = null;
    let minDist = 6.5;

    for (const v of vehicles) {
      if (!v || v.isDestroyed) continue;
      const d = this.position.distanceTo(v.position);
      if (d < minDist) {
        minDist = d;
        nearest = v;
      }
    }

    if (nearest) {
      this.enterVehicle(nearest);
    }
  }

  enterVehicle(vehicle) {
    if (vehicle.driver && vehicle.driver !== this) {
      if (vehicle.driver.onCarjacked) {
        vehicle.driver.onCarjacked();
      }
      if (window.policeManager) {
        window.policeManager.reportCarTheft(this.position);
      }
    }

    this.inVehicle = true;
    this.currentVehicle = vehicle;
    vehicle.driver = this;
    vehicle.setPromptVisible(false);

    window.soundEngine?.startEngine();
    window.soundEngine?.startRadio();

    if (window.ui) {
      window.ui.setVehicleMode(true, vehicle);
    }
  }

  exitVehicle() {
    if (!this.inVehicle || !this.currentVehicle) return;

    const v = this.currentVehicle;
    v.driver = null;

    this.position.copy(v.getDriverDoorPosition());
    this.position.y = 0;
    this.mesh.position.copy(this.position);
    this.pelvis.position.y = 0.95;
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;
    this.leftArm.rotation.x = 0;
    this.leftArm.rotation.y = 0;
    this.rightArm.rotation.x = 0;
    this.rightArm.rotation.y = 0;

    if (Math.abs(v.speed) > 14) {
      this.triggerKnockback(new THREE.Vector3(-Math.sin(v.rotation)*12, 4, -Math.cos(v.rotation)*12), 15);
    }

    this.inVehicle = false;
    this.currentVehicle = null;

    window.soundEngine?.stopEngine();
    window.soundEngine?.setTireScreech(false);
    window.soundEngine?.stopRadio();

    if (window.ui) {
      window.ui.setVehicleMode(false);
    }
  }

  onHit(damage, knockback = null) {
    if (this.isDead) return;

    window.soundEngine?.playPunch();

    if (this.armor > 0) {
      const absorbed = damage * 0.7;
      const direct = damage * 0.3;
      this.armor = Math.max(0, this.armor - absorbed);
      this.health = Math.max(0, this.health - direct);
    } else {
      this.health = Math.max(0, this.health - damage);
    }

    if (knockback && !this.inVehicle) {
      this.triggerKnockback(knockback, damage);
    }

    if (window.ui) {
      window.ui.updateVitals(this.health, this.armor);
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  triggerKnockback(force, damage) {
    this.isRagdoll = true;
    this.ragdollTime = 1.0;
    this.ragdollVelocity.copy(force);
  }

  onCarExplode() {
    this.health = 0;
    if (window.ui) window.ui.updateVitals(0, 0);
    this.die();
  }

  die() {
    this.isDead = true;
    window.soundEngine?.playWastedSound();
    if (window.ui) {
      window.ui.showDeathScreen('WASTED', 'Respawning at Vice Central Medical...');
    }

    setTimeout(() => {
      this.respawn();
    }, 3800);
  }

  respawn() {
    this.health = 100;
    this.armor = 100;
    this.isDead = false;
    this.inVehicle = false;
    this.currentVehicle = null;
    this.mesh.visible = true;

    this.position.set(0, 0, 12);
    this.mesh.position.copy(this.position);

    if (window.policeManager) {
      window.policeManager.clearWantedLevel();
    }

    if (window.ui) {
      window.ui.hideDeathScreen();
      window.ui.updateVitals(100, 100);
    }
  }

  addCash(amount) {
    this.cash += amount;
    window.soundEngine?.playCoin();
    if (window.ui) {
      window.ui.updateCash(this.cash);
    }
  }
}
