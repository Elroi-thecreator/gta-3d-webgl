// ==========================================
// GTA 3D - PLAYER CHARACTER & ANIMATION
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
    this.walkSpeed = 5.2;
    this.sprintSpeed = 10.5;
    this.jumpForce = 8.5;
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

    // --- MATERIALS ---
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.5 }); // Blue Vice Jacket
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.8 }); // Dark jeans
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }); // White sneakers
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 0.7 });
    const shadesMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });

    // Hips / Pelvis root
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.95;
    this.mesh.add(this.pelvis);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.32);
    this.torso = new THREE.Mesh(torsoGeo, jacketMat);
    this.torso.position.y = 0.35;
    this.torso.castShadow = true;
    this.pelvis.add(this.torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 0.55;
    this.head.castShadow = true;
    this.torso.add(this.head);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.34), hairMat);
    hair.position.y = 0.16;
    this.head.add(hair);

    // Aviator Sunglasses
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.1), shadesMat);
    shades.position.set(0, 0.04, -0.16);
    this.head.add(shades);

    // --- ARMS ---
    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.36, 0.28, 0);
    const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    const leftArmMesh = new THREE.Mesh(armGeo, jacketMat);
    leftArmMesh.position.y = -0.28;
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);
    this.torso.add(this.leftArm);

    // Right Arm (Weapon holder)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.36, 0.28, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rightArmMesh.position.y = -0.28;
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    // Handheld weapon prop
    this.weaponProp = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.18, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })
    );
    this.weaponProp.position.set(0, -0.55, -0.15);
    this.rightArm.add(this.weaponProp);
    this.torso.add(this.rightArm);

    // --- LEGS ---
    const legGeo = new THREE.BoxGeometry(0.22, 0.72, 0.22);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.y = -0.36;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), shoeMat);
    leftShoe.position.set(0, -0.72, -0.05);
    leftShoe.castShadow = true;
    this.leftLeg.add(leftShoe);
    this.pelvis.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.y = -0.36;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), shoeMat);
    rightShoe.position.set(0, -0.72, -0.05);
    rightShoe.castShadow = true;
    this.rightLeg.add(rightShoe);
    this.pelvis.add(this.rightLeg);

    // Assign reference
    this.mesh.userData = { entity: this };
    this.scene.add(this.mesh);
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Enter/Exit Vehicle
      if (e.code === 'KeyF' || e.code === 'KeyE') {
        if (!this.inVehicle) {
          this.tryEnterNearestVehicle();
        } else {
          this.exitVehicle();
        }
      }

      // Horn in vehicle
      if (e.code === 'KeyH' && this.inVehicle) {
        window.soundEngine?.playCarHorn();
      }

      // Siren in police vehicle
      if (e.code === 'KeyE' && this.inVehicle && this.currentVehicle?.isPolice) {
        this.currentVehicle.sirenActive = !this.currentVehicle.sirenActive;
        window.soundEngine?.setPoliceSiren(this.currentVehicle.sirenActive);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;
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

    // Disable browser right click menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(delta, cityObstacles = [], vehicles = [], targetEntities = []) {
    if (this.isDead) return;

    // --- RAGDOLL KNOCKBACK STATE ---
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
      this.pelvis.rotation.z = Math.PI / 2; // Flat on back

      if (this.ragdollTime <= 0) {
        this.isRagdoll = false;
        this.pelvis.rotation.z = 0;
      }
      return;
    }

    // --- VEHICLE DRIVING MODE ---
    if (this.inVehicle && this.currentVehicle) {
      const vInput = {
        forward: this.keys['KeyW'] || this.keys['ArrowUp'],
        backward: this.keys['KeyS'] || this.keys['ArrowDown'],
        left: this.keys['KeyA'] || this.keys['ArrowLeft'],
        right: this.keys['KeyD'] || this.keys['ArrowRight'],
        handbrake: this.keys['Space']
      };

      this.currentVehicle.update(delta, vInput, [...cityObstacles, ...vehicles]);
      this.position.copy(this.currentVehicle.position);
      this.mesh.position.copy(this.currentVehicle.position);

      // Sound engine rpm update
      window.soundEngine?.updateEngine(this.currentVehicle.speed, vInput.forward || vInput.backward);

      // Update vehicle UI
      if (window.ui) {
        window.ui.updateVehicleHUD(this.currentVehicle);
      }
      return;
    }

    // --- ON-FOOT MOVEMENT ---
    const moveZ = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0);
    const moveX = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && moveZ > 0;

    const inputLength = Math.hypot(moveX, moveZ);
    this.isMoving = inputLength > 0.1;

    // Movement direction relative to camera angle
    let moveDir = new THREE.Vector3();
    if (this.isMoving) {
      const forward = this.cameraCtrl.getForwardVector();
      const right = this.cameraCtrl.getRightVector();
      moveDir.addScaledVector(forward, moveZ);
      moveDir.addScaledVector(right, moveX);
      moveDir.normalize();

      // Face movement direction, or face camera direction if aiming
      if (this.isAiming) {
        this.rotation = this.cameraCtrl.yaw;
      } else {
        const targetAngle = Math.atan2(-moveDir.x, -moveDir.z);
        // Smooth rotation
        let diff = targetAngle - this.rotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.rotation += diff * Math.min(1.0, delta * 12.0);
      }
    } else if (this.isAiming) {
      this.rotation = this.cameraCtrl.yaw;
    }

    // Movement speed
    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
    const moveDelta = moveDir.clone().multiplyScalar(currentSpeed * delta);

    // Tentative next position
    const nextPos = this.position.clone().add(moveDelta);

    // Check collisions with city buildings and vehicles
    if (!this.checkPlayerCollision(nextPos, cityObstacles, vehicles)) {
      this.position.copy(nextPos);
    }

    // --- JUMP & GRAVITY ---
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

    // Update Mesh transform
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // --- PROCEDURAL ANIMATIONS ---
    this.updateAnimations(delta);

    // --- WEAPONS FIRING & ATTACK ---
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

    // Check interaction prompt for nearest car
    this.checkVehiclePrompt(vehicles);
  }

  updateAnimations(delta) {
    if (this.isMoving) {
      const animSpeed = this.isSprinting ? 14 : 9;
      this.animTime += delta * animSpeed;

      const swing = Math.sin(this.animTime);

      // Legs swing opposite each other
      this.leftLeg.rotation.x = swing * 0.7;
      this.rightLeg.rotation.x = -swing * 0.7;

      // Arms swing opposite legs unless aiming
      if (!this.isAiming && !this.isPunching) {
        this.leftArm.rotation.x = -swing * 0.6;
        this.rightArm.rotation.x = swing * 0.6;
      }

      // Torso slight vertical bob
      this.pelvis.position.y = 0.95 + Math.abs(Math.sin(this.animTime * 2)) * 0.08;
    } else {
      // Idle breathing
      this.animTime += delta * 2.5;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.pelvis.position.y = 0.95;

      if (!this.isAiming && !this.isPunching) {
        this.leftArm.rotation.x = Math.sin(this.animTime) * 0.05;
        this.rightArm.rotation.x = -Math.sin(this.animTime) * 0.05;
      }
    }

    // Aiming pose
    if (this.isAiming) {
      this.rightArm.rotation.x = -Math.PI / 2 + this.cameraCtrl.pitch * 0.6;
      this.rightArm.rotation.y = -0.2;
      this.leftArm.rotation.x = -Math.PI / 2.5;
      this.leftArm.rotation.y = 0.4;
    } else if (this.isPunching) {
      // Punch jab
      this.rightArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.z = -0.3;
    } else {
      this.rightArm.rotation.y = 0;
      this.rightArm.rotation.z = 0;
      this.leftArm.rotation.y = 0;
    }
  }

  checkPlayerCollision(nextPos, obstacles, vehicles) {
    const radius = 0.45;

    // Check buildings / walls
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

    // Check vehicles (cannot walk through vehicles)
    for (const v of vehicles) {
      if (!v || v === this.currentVehicle) continue;
      const vPos = v.position;
      const vDim = v.dimensions || { l: 4, w: 2 };
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
      if (window.ui) window.ui.showPromptTip('[F] Exit Vehicle');
      return;
    }

    let nearestCar = null;
    let minDist = 3.5;

    for (const v of vehicles) {
      if (!v || v.isDestroyed) continue;
      const d = this.position.distanceTo(v.position);
      if (d < minDist) {
        minDist = d;
        nearestCar = v;
      }
    }

    if (nearestCar) {
      const msg = nearestCar.driver ? '[F] Carjack Vehicle' : '[F] Enter Vehicle';
      if (window.ui) window.ui.showPromptTip(msg);
    } else {
      if (window.ui) window.ui.hidePromptTip();
    }
  }

  tryEnterNearestVehicle() {
    const vehicles = window.game?.vehicles || [];
    let nearest = null;
    let minDist = 3.8;

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
    // If vehicle has civilian driver, pull them out!
    if (vehicle.driver && vehicle.driver !== this) {
      if (vehicle.driver.onCarjacked) {
        vehicle.driver.onCarjacked();
      }
      // Report car theft crime to police
      if (window.policeManager) {
        window.policeManager.reportCarTheft(this.position);
      }
    }

    this.inVehicle = true;
    this.currentVehicle = vehicle;
    vehicle.driver = this;

    // Hide on-foot model while inside car
    this.mesh.visible = false;

    // Start engine sound
    window.soundEngine?.startEngine();
    window.soundEngine?.startRadio();

    // Notify UI
    if (window.ui) {
      window.ui.setVehicleMode(true, vehicle);
    }
  }

  exitVehicle() {
    if (!this.inVehicle || !this.currentVehicle) return;

    const v = this.currentVehicle;
    v.driver = null;

    // Exit at driver door
    this.position.copy(v.getDriverDoorPosition());
    this.position.y = 0;
    this.mesh.position.copy(this.position);
    this.mesh.visible = true;

    // If exited while car moving fast, roll / take minor tumble
    if (Math.abs(v.speed) > 15) {
      this.triggerKnockback(new THREE.Vector3(-Math.sin(v.rotation)*12, 4, -Math.cos(v.rotation)*12), 15);
    }

    this.inVehicle = false;
    this.currentVehicle = null;

    // Stop engine sound
    window.soundEngine?.stopEngine();
    window.soundEngine?.setTireScreech(false);
    window.soundEngine?.stopRadio();

    // Notify UI
    if (window.ui) {
      window.ui.setVehicleMode(false);
    }
  }

  onHit(damage, knockback = null) {
    if (this.isDead) return;

    window.soundEngine?.playPunch();

    // Armor absorbs 70% of damage
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

    // Reset position to hospital safehouse
    this.position.set(0, 0, 0);
    this.mesh.position.copy(this.position);

    // Clear wanted level
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
