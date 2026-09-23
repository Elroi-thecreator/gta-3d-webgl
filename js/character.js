// ==========================================
// GTA 3D - BULLETPROOF PLAYER CHARACTER CONTROLLER
// ==========================================
class PlayerCharacter {
  constructor(scene, cameraController, weaponManager) {
    this.scene = scene;
    this.cameraCtrl = cameraController;
    this.weaponMgr = weaponManager;

    this.position = new THREE.Vector3(40, 0, 10);
    this.rotation = 0;
    this.velocity = new THREE.Vector3();

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 100;
    this.maxArmor = 100;
    this.cash = 350;
    this.isDead = false;

    // Movement speeds (fast & snappy)
    this.walkSpeed = 8.0;
    this.sprintSpeed = 15.5;
    this.jumpForce = 9.2;
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

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.65 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.1 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.7 });
    const shadesMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.95, roughness: 0.1 });

    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.95;
    this.mesh.add(this.pelvis);

    // Torso Base
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.34), jacketMat);
    this.torso.position.y = 0.36;
    this.torso.castShadow = true;
    this.pelvis.add(this.torso);

    // V-Shirt
    const vShirt = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.05), shirtMat);
    vShirt.position.set(0, 0.12, -0.16);
    this.torso.add(vShirt);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), skinMat);
    this.head.position.y = 0.60;
    this.head.castShadow = true;
    this.torso.add(this.head);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.36), hairMat);
    hair.position.set(0, 0.16, -0.02);
    this.head.add(hair);

    // Shades
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.12), shadesMat);
    shades.position.set(0, 0.05, -0.16);
    this.head.add(shades);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.68, 0.18);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 0.28, 0);
    const lArmMesh = new THREE.Mesh(armGeo, jacketMat);
    lArmMesh.position.y = -0.30;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);
    this.torso.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 0.28, 0);
    const rArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rArmMesh.position.y = -0.30;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);

    // Weapon Prop in hand
    this.weaponProp = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.18, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85 })
    );
    this.weaponProp.position.set(0, -0.62, -0.16);
    this.rightArm.add(this.weaponProp);
    this.torso.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.74, 0.24);

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
      this.keys[e.key] = true;

      // Prevent window scroll on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) ||
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Enter / Exit vehicle with ENTER, NUMPAD ENTER, F, or E
      if (['Enter', 'NumpadEnter', 'KeyF', 'KeyE'].includes(e.code) ||
          ['Enter', 'f', 'F', 'e', 'E'].includes(e.key)) {
        if (!this.inVehicle) {
          this.tryEnterNearestVehicle();
        } else {
          this.exitVehicle();
        }
      }

      if ((e.code === 'KeyH' || e.key === 'h' || e.key === 'H') && this.inVehicle) {
        window.soundEngine?.playCarHorn();
      }

      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && this.inVehicle && this.currentVehicle?.isPolice) {
        this.currentVehicle.sirenActive = !this.currentVehicle.sirenActive;
        window.soundEngine?.setPoliceSiren(this.currentVehicle.sirenActive);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    });

    // Click on car to enter
    window.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;

      if (e.button === 0 && !this.inVehicle) {
        const vehicles = window.game?.vehicles || [];
        for (const v of vehicles) {
          if (!v || v.isDestroyed) continue;
          if (this.position.distanceTo(v.position) < 6.5) {
            this.enterVehicle(v);
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

  isUp() {
    return this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W'] || this.keys['Up'];
  }
  isDown() {
    return this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S'] || this.keys['Down'];
  }
  isLeft() {
    return this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A'] || this.keys['Left'];
  }
  isRight() {
    return this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'] || this.keys['D'] || this.keys['Right'];
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

    // --- VEHICLE DRIVING MODE ---
    if (this.inVehicle && this.currentVehicle) {
      const v = this.currentVehicle;

      const vInput = {
        forward: this.isUp(),
        backward: this.isDown(),
        left: this.isLeft(),
        right: this.isRight(),
        handbrake: this.keys['Space'] || this.keys[' '] || false
      };

      v.update(delta, vInput, [...cityObstacles, ...vehicles]);
      this.position.copy(v.position);

      // Character sits visibly inside cockpit
      this.mesh.visible = true;
      const seatOffset = new THREE.Vector3(-v.dimensions.w * 0.23, v.dimensions.h * 0.38, -v.dimensions.l * 0.05);
      seatOffset.applyEuler(new THREE.Euler(0, v.rotation, 0));
      this.mesh.position.copy(v.position).add(seatOffset);
      this.mesh.rotation.y = v.rotation;

      // Sitting pose
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

    // Restore weapon on-foot
    this.weaponProp.visible = (this.weaponMgr.current.id !== 'fists');

    // --- ON-FOOT MOVEMENT (WASD & ARROW KEYS) ---
    const up = this.isUp();
    const down = this.isDown();
    const left = this.isLeft();
    const right = this.isRight();

    const moveZ = (up ? 1 : 0) - (down ? 1 : 0);
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['Shift']) && moveZ > 0;

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
        this.rotation += diff * Math.min(1.0, delta * 15.0);
      }
    } else if (this.isAiming) {
      this.rotation = this.cameraCtrl.yaw;
    }

    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
    const moveDelta = moveDir.clone().multiplyScalar(currentSpeed * delta);
    const nextPos = this.position.clone().add(moveDelta);

    // Smooth collision resolution
    if (!this.checkPlayerCollision(nextPos, cityObstacles, vehicles)) {
      this.position.copy(nextPos);
    } else {
      // Try sliding along X or Z axis separately (wall sliding)
      const tryX = new THREE.Vector3(nextPos.x, this.position.y, this.position.z);
      if (!this.checkPlayerCollision(tryX, cityObstacles, vehicles)) {
        this.position.x = nextPos.x;
      } else {
        const tryZ = new THREE.Vector3(this.position.x, this.position.y, nextPos.z);
        if (!this.checkPlayerCollision(tryZ, cityObstacles, vehicles)) {
          this.position.z = nextPos.z;
        }
      }
    }

    // Jump & Gravity
    if ((this.keys['Space'] || this.keys[' ']) && this.isGrounded) {
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
      const animSpeed = this.isSprinting ? 16 : 11;
      this.animTime += delta * animSpeed;
      const swing = Math.sin(this.animTime);

      this.leftLeg.rotation.x = swing * 0.75;
      this.rightLeg.rotation.x = -swing * 0.75;

      if (!this.isAiming && !this.isPunching) {
        this.leftArm.rotation.x = -swing * 0.7;
        this.rightArm.rotation.x = swing * 0.7;
      }
      this.pelvis.position.y = 0.95 + Math.abs(Math.sin(this.animTime * 2)) * 0.1;
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
    const radius = 0.42;

    for (const obs of obstacles) {
      if (!obs) continue;
      const oPos = obs.position;
      const size = obs.collisionSize || { x: 2, z: 2 };
      const minX = oPos.x - size.x * 0.5 - radius;
      const maxX = oPos.x + size.x * 0.5 + radius;
      const minZ = oPos.z - size.z * 0.5 - radius;
      const maxZ = oPos.z + size.z * 0.5 + radius;

      // If next position intersects
      if (nextPos.x > minX && nextPos.x < maxX && nextPos.z > minZ && nextPos.z < maxZ) {
        // If player was already inside, allow them to move out
        const curInside = (this.position.x > minX && this.position.x < maxX && this.position.z > minZ && this.position.z < maxZ);
        if (!curInside) {
          return true;
        }
      }
    }

    // Vehicle collisions
    for (const v of vehicles) {
      if (!v || v === this.currentVehicle) continue;
      const vPos = v.position;
      const vDim = v.dimensions || { l: 4.4, w: 2.1 };
      const minX = vPos.x - vDim.w * 0.5 - radius;
      const maxX = vPos.x + vDim.w * 0.5 + radius;
      const minZ = vPos.z - vDim.l * 0.5 - radius;
      const maxZ = vPos.z + vDim.l * 0.5 + radius;

      if (nextPos.x > minX && nextPos.x < maxX && nextPos.z > minZ && nextPos.z < maxZ) {
        return true;
      }
    }
    return false;
  }

  checkVehiclePrompt(vehicles) {
    if (this.inVehicle) {
      if (window.ui) window.ui.showPromptTip('Press [ENTER] or [F] to Exit Vehicle');
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
      const msg = nearestCar.driver ? 'Press [ENTER] or [F] to Carjack' : 'Press [ENTER] or [F] to Drive';
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

    this.position.set(40, 0, 10);
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
