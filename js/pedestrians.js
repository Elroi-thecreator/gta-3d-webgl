// ==========================================
// GTA 3D - CIVILIAN PEDESTRIANS & CROWD AI
// ==========================================
class PedestrianManager {
  constructor(scene, cityBuilder) {
    this.scene = scene;
    this.city = cityBuilder;
    this.pedestrians = [];
    this.cashPickups = [];
    this.maxPeds = 14;

    this.initPedestrians();
  }

  initPedestrians() {
    for (let i = 0; i < this.maxPeds; i++) {
      this.spawnPedestrian();
    }
  }

  spawnPedestrian(nearPos = null) {
    const halfX = (this.city.gridWidth * this.city.blockSize) / 2;
    const halfZ = (this.city.gridHeight * this.city.blockSize) / 2;

    // Place on sidewalk
    const bx = Math.floor(Math.random() * this.city.gridWidth);
    const bz = Math.floor(Math.random() * this.city.gridHeight);
    const cx = bx * this.city.blockSize - halfX + this.city.blockSize / 2;
    const cz = bz * this.city.blockSize - halfZ + this.city.blockSize / 2;

    const offset = (this.city.blockSize - this.city.roadWidth) * 0.45;
    const x = cx + (Math.random() > 0.5 ? offset : -offset);
    const z = cz + (Math.random() - 0.5) * offset * 1.8;

    const ped = new Pedestrian(this.scene, new THREE.Vector3(x, 0, z));
    this.pedestrians.push(ped);
  }

  update(delta, player, playerAiming) {
    const pPos = player.position;

    // Check panic triggers (gunfire, car near, aiming)
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const ped = this.pedestrians[i];

      if (ped.isDead) {
        if (ped.despawnTimer <= 0) {
          this.scene.remove(ped.mesh);
          this.pedestrians.splice(i, 1);
          this.spawnPedestrian(pPos);
        } else {
          ped.despawnTimer -= delta;
        }
        continue;
      }

      // Check distance to player
      const dist = ped.position.distanceTo(pPos);
      if (playerAiming && dist < 22) {
        ped.triggerPanic(pPos);
      }

      // Check car collision with pedestrian
      if (player.inVehicle && player.currentVehicle) {
        const v = player.currentVehicle;
        const vDist = ped.position.distanceTo(v.position);
        if (vDist < 2.5 && Math.abs(v.speed) > 5) {
          const knock = ped.position.clone().sub(v.position).normalize().multiplyScalar(v.speed * 0.8);
          knock.y = 5;
          ped.onHit(Math.abs(v.speed) * 3, knock);
          // Crime report
          if (window.policeManager) {
            window.policeManager.reportHitPedestrian(ped.position);
          }
        }
      }

      ped.update(delta, this.city.obstacles);
    }

    // Update floating cash pickups
    for (let i = this.cashPickups.length - 1; i >= 0; i--) {
      const pickup = this.cashPickups[i];
      pickup.mesh.rotation.y += delta * 3;
      pickup.mesh.position.y = 0.6 + Math.sin(performance.now() * 0.005) * 0.15;

      if (pickup.mesh.position.distanceTo(pPos) < 2.2) {
        player.addCash(pickup.amount);
        this.scene.remove(pickup.mesh);
        this.cashPickups.splice(i, 1);
      }
    }
  }

  alertNearbyPedestrians(pos, radius = 35) {
    this.pedestrians.forEach(ped => {
      if (ped.position.distanceTo(pos) < radius) {
        ped.triggerPanic(pos);
      }
    });
  }

  spawnCashPickup(pos, amount = 50) {
    const geo = new THREE.BoxGeometry(0.5, 0.12, 0.3);
    const mat = new THREE.MeshBasicMaterial({ color: 0x48bb78 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
    this.scene.add(mesh);

    this.cashPickups.push({
      mesh: mesh,
      amount: amount
    });
  }
}

class Pedestrian {
  constructor(scene, pos) {
    this.scene = scene;
    this.position = pos.clone();
    this.rotation = Math.random() * Math.PI * 2;
    this.health = 50;
    this.isDead = false;
    this.state = 'walk'; // 'walk', 'panic', 'ragdoll'
    this.speed = 2.4;
    this.despawnTimer = 8.0;
    this.animTime = Math.random() * 10;

    this.velocity = new THREE.Vector3();

    this.createModel();
  }

  createModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Random civilian clothes
    const shirtColors = [0xe11d48, 0x0284c7, 0x16a34a, 0xd97706, 0x9333ea, 0x475569];
    const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), shirtMat);
    this.torso.position.y = 1.1;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    head.position.y = 0.5;
    head.castShadow = true;
    this.torso.add(head);

    // Limbs
    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    this.leftArm = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.33, 0.15, 0);
    this.torso.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.33, 0.15, 0);
    this.torso.add(this.rightArm);

    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.14, 0.4, 0);
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.14, 0.4, 0);
    this.mesh.add(this.rightLeg);

    this.mesh.userData = { entity: this };
    this.scene.add(this.mesh);
  }

  triggerPanic(fromPos) {
    if (this.state === 'ragdoll' || this.isDead) return;
    this.state = 'panic';
    this.speed = 6.2;
    window.soundEngine?.playPedestrianScream();

    // Run away from threat
    const away = this.position.clone().sub(fromPos).normalize();
    this.rotation = Math.atan2(-away.x, -away.z);
  }

  update(delta, obstacles) {
    if (this.isDead) return;

    if (this.state === 'ragdoll') {
      this.position.addScaledVector(this.velocity, delta);
      this.velocity.multiplyScalar(0.92);
      this.mesh.position.copy(this.position);
      if (this.velocity.length() < 0.2) {
        this.die();
      }
      return;
    }

    // Step forward
    const moveDist = this.speed * delta;
    const moveX = -Math.sin(this.rotation) * moveDist;
    const moveZ = -Math.cos(this.rotation) * moveDist;

    this.position.x += moveX;
    this.position.z += moveZ;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // Procedural walk/panic run animation
    this.animTime += delta * (this.state === 'panic' ? 14 : 7);
    const swing = Math.sin(this.animTime);

    this.leftLeg.rotation.x = swing * 0.6;
    this.rightLeg.rotation.x = -swing * 0.6;

    if (this.state === 'panic') {
      // Arms flailing in air
      this.leftArm.rotation.x = -Math.PI * 0.8 + swing * 0.3;
      this.rightArm.rotation.x = -Math.PI * 0.8 - swing * 0.3;
    } else {
      this.leftArm.rotation.x = -swing * 0.5;
      this.rightArm.rotation.x = swing * 0.5;
    }

    // Turn randomly at sidewalk boundaries
    if (Math.random() < 0.015) {
      this.rotation += (Math.random() - 0.5) * 1.5;
    }
  }

  onHit(damage, knockback = null) {
    if (this.isDead) return;
    this.health -= damage;
    window.soundEngine?.playPunch();

    if (knockback) {
      this.state = 'ragdoll';
      this.velocity.copy(knockback);
      this.torso.rotation.z = Math.PI / 2; // Knocked down
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.2;

    // Drop cash bundle
    if (window.pedestrianManager) {
      const drop = Math.floor(Math.random() * 60) + 25;
      window.pedestrianManager.spawnCashPickup(this.position, drop);
    }
  }
}
