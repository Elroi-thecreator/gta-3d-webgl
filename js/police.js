// ==========================================
// GTA 3D - 5-STAR WANTED LEVEL & POLICE AI
// ==========================================
class PoliceManager {
  constructor(scene, cityBuilder) {
    this.scene = scene;
    this.city = cityBuilder;

    this.wantedLevel = 0; // 0 to 5 Stars
    this.wantedPoints = 0;
    this.evasionTimer = 0;
    this.isEvasive = false;

    this.policeUnits = []; // Active police cars
    this.policeOfficers = []; // Active on-foot cops
    this.spawnCooldown = 0;

    window.policeManager = this;
  }

  addCrime(points) {
    this.wantedPoints += points;
    const oldLevel = this.wantedLevel;

    if (this.wantedPoints >= 100) this.wantedLevel = 5;
    else if (this.wantedPoints >= 65) this.wantedLevel = 4;
    else if (this.wantedPoints >= 40) this.wantedLevel = 3;
    else if (this.wantedPoints >= 20) this.wantedLevel = 2;
    else if (this.wantedPoints >= 8) this.wantedLevel = 1;
    else this.wantedLevel = 0;

    if (this.wantedLevel > oldLevel) {
      this.evasionTimer = 18.0; // Reset evasion search
      this.isEvasive = false;
      window.soundEngine?.setPoliceSiren(true);
    }

    if (window.ui) {
      window.ui.updateWantedLevel(this.wantedLevel, this.isEvasive);
    }
  }

  reportCarTheft(pos) {
    this.addCrime(10);
  }

  reportGunshot(pos) {
    if (this.wantedLevel === 0) {
      this.addCrime(8);
    }
    // Alert nearby crowd
    if (window.pedestrianManager) {
      window.pedestrianManager.alertNearbyPedestrians(pos, 40);
    }
  }

  reportHitPedestrian(pos) {
    this.addCrime(15);
  }

  reportCopCasualty() {
    this.addCrime(25);
  }

  clearWantedLevel() {
    this.wantedLevel = 0;
    this.wantedPoints = 0;
    this.isEvasive = false;
    window.soundEngine?.setPoliceSiren(false);

    // Despawn police units
    this.policeUnits.forEach(u => {
      if (u.mesh) this.scene.remove(u.mesh);
    });
    this.policeUnits = [];

    this.policeOfficers.forEach(o => {
      if (o.mesh) this.scene.remove(o.mesh);
    });
    this.policeOfficers = [];

    if (window.ui) window.ui.updateWantedLevel(0, false);
  }

  update(delta, player) {
    if (this.wantedLevel === 0) {
      if (this.policeUnits.length > 0) {
        this.clearWantedLevel();
      }
      return;
    }

    const pPos = player.position;

    // --- EVASION SEARCH LOGIC ---
    let copNear = false;
    for (const unit of this.policeUnits) {
      if (!unit.isDestroyed && unit.position.distanceTo(pPos) < 45) {
        copNear = true;
        break;
      }
    }

    if (!copNear) {
      this.isEvasive = true;
      this.evasionTimer -= delta;
      if (this.evasionTimer <= 0) {
        this.clearWantedLevel();
        return;
      }
    } else {
      this.isEvasive = false;
      this.evasionTimer = 16.0;
    }

    if (window.ui) {
      window.ui.updateWantedLevel(this.wantedLevel, this.isEvasive);
    }

    // --- POLICE SPAWN DISPATCH ---
    this.spawnCooldown -= delta;
    const targetCops = Math.min(6, this.wantedLevel * 2);

    if (this.spawnCooldown <= 0 && this.policeUnits.length < targetCops) {
      this.spawnCooldown = 4.0;
      this.dispatchPoliceCruiser(pPos);
    }

    // --- UPDATE ACTIVE POLICE CRUISERS ---
    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const cruiser = this.policeUnits[i];

      if (cruiser.isDestroyed) {
        // Officer dismounts and fights on foot
        if (!cruiser.officerSpawned) {
          cruiser.officerSpawned = true;
          this.spawnPoliceOfficer(cruiser.position);
        }
        continue;
      }

      this.updateCruiserAI(cruiser, pPos, player, delta);
    }

    // --- UPDATE ON-FOOT POLICE OFFICERS ---
    for (let i = this.policeOfficers.length - 1; i >= 0; i--) {
      const cop = this.policeOfficers[i];
      if (cop.isDead) {
        this.policeOfficers.splice(i, 1);
        continue;
      }
      cop.update(delta, player);
    }
  }

  dispatchPoliceCruiser(playerPos) {
    // Spawn cruiser on road 80-110m ahead/behind player
    const angle = Math.random() * Math.PI * 2;
    const dist = 90;
    const spawnX = playerPos.x + Math.cos(angle) * dist;
    const spawnZ = playerPos.z + Math.sin(angle) * dist;

    const cruiser = new Vehicle(this.scene, {
      type: 'police',
      position: new THREE.Vector3(spawnX, 0, spawnZ),
      maxSpeed: 38 + this.wantedLevel * 3,
      acceleration: 30
    });
    cruiser.sirenActive = true;

    this.policeUnits.push(cruiser);
    if (window.game) window.game.vehicles.push(cruiser);
  }

  updateCruiserAI(cruiser, pPos, player, delta) {
    const toPlayer = pPos.clone().sub(cruiser.position);
    const dist = toPlayer.length();

    // Despawn if lost far away
    if (dist > 300) {
      this.scene.remove(cruiser.mesh);
      const idx = this.policeUnits.indexOf(cruiser);
      if (idx !== -1) this.policeUnits.splice(idx, 1);
      return;
    }

    // Calculate heading toward player
    const desiredAngle = Math.atan2(-toPlayer.x, -toPlayer.z);
    let diff = desiredAngle - cruiser.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const steer = Math.max(-0.5, Math.min(0.5, diff * 1.5));
    cruiser.steerAngle = steer;

    const input = {
      forward: dist > 5.0,
      backward: false,
      left: diff > 0.1,
      right: diff < -0.1,
      handbrake: dist < 8.0 && Math.abs(diff) > 1.0
    };

    cruiser.update(delta, input, this.city.obstacles);

    // If close and player is on foot, police officer exits to engage
    if (dist < 15 && !player.inVehicle && !cruiser.officerSpawned) {
      cruiser.officerSpawned = true;
      this.spawnPoliceOfficer(cruiser.position);
    }
  }

  spawnPoliceOfficer(pos) {
    const cop = new PoliceOfficer(this.scene, pos.clone().add(new THREE.Vector3(2, 0, 0)));
    this.policeOfficers.push(cop);
  }
}

class PoliceOfficer {
  constructor(scene, pos) {
    this.scene = scene;
    this.position = pos.clone();
    this.health = 80;
    this.isDead = false;
    this.shotCooldown = 1.0;
    this.speed = 4.8;
    this.rotation = 0;

    this.createModel();
  }

  createModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 }); // Police Blue
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 });
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 });

    // Torso with badge
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.3), uniformMat);
    torso.position.y = 1.1;
    this.mesh.add(torso);

    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), badgeMat);
    badge.position.set(0.12, 0.14, -0.16);
    torso.add(badge);

    // Head with Police Cap
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), skinMat);
    head.position.y = 0.52;
    torso.add(head);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.4), uniformMat);
    cap.position.y = 0.18;
    head.add(cap);

    // Limbs
    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    this.rightArm = new THREE.Mesh(armGeo, uniformMat);
    this.rightArm.position.set(0.34, 0.15, 0);
    torso.add(this.rightArm);

    // Gun in hand
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.22), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    gun.position.set(0, -0.3, -0.12);
    this.rightArm.add(gun);

    this.mesh.userData = { entity: this };
    this.scene.add(this.mesh);
  }

  update(delta, player) {
    if (this.isDead) return;

    const toPlayer = player.position.clone().sub(this.position);
    const dist = toPlayer.length();

    this.rotation = Math.atan2(-toPlayer.x, -toPlayer.z);
    this.mesh.rotation.y = this.rotation;

    // Advance if too far, stop and shoot if within combat range
    if (dist > 12) {
      const step = this.speed * delta;
      this.position.x += -Math.sin(this.rotation) * step;
      this.position.z += -Math.cos(this.rotation) * step;
      this.mesh.position.copy(this.position);
    }

    // Aim right arm at player
    this.rightArm.rotation.x = -Math.PI / 2.2;

    // Fire weapon at player
    this.shotCooldown -= delta;
    if (this.shotCooldown <= 0 && dist < 35) {
      this.shotCooldown = 0.9 + Math.random() * 0.4;
      this.shootAtPlayer(player);
    }
  }

  shootAtPlayer(player) {
    window.soundEngine?.playPistol();

    // 40% chance to hit player if within range
    if (Math.random() < 0.45) {
      player.onHit(18);
    }

    // Muzzle flash
    const flash = new THREE.PointLight(0xffbb33, 4, 6);
    flash.position.copy(this.position).add(new THREE.Vector3(0, 1.2, 0));
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 40);
  }

  onHit(damage, knockback = null) {
    if (this.isDead) return;
    this.health -= damage;
    window.soundEngine?.playPunch();

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.2;

    if (window.policeManager) {
      window.policeManager.reportCopCasualty();
    }
    // Drop ammo/cash
    if (window.pedestrianManager) {
      window.pedestrianManager.spawnCashPickup(this.position, 120);
    }
  }
}
