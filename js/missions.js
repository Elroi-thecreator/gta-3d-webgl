// ==========================================
// GTA 3D - MISSIONS & OBJECTIVES SYSTEM
// ==========================================
class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.activeMission = null;
    this.missionIndex = 0;
    this.missionTimer = 0;

    this.beacons = [];
    this.targets = [];

    this.missions = [
      {
        id: 'heist',
        title: 'THE GRAND HEIST',
        desc: 'Steal the Banshee GT from the Docks, evade the 2-Star police response, and deliver it to the Safehouse.',
        reward: 5000,
        startPos: new THREE.Vector3(-45, 0, 85),
        safehousePos: new THREE.Vector3(75, 0, -65)
      },
      {
        id: 'turf',
        title: 'TURF WAR SYNDICATE',
        desc: 'Eliminate the 3 rival gang guards stationed at the Industrial Warehouse.',
        reward: 8000,
        startPos: new THREE.Vector3(65, 0, 75)
      },
      {
        id: 'race',
        title: 'NEON NITRO RUSH',
        desc: 'Hit all 5 street checkpoints across the neon downtown district before the 60s timer expires!',
        reward: 10000,
        timeLimit: 60,
        startPos: new THREE.Vector3(-75, 0, -65),
        checkpoints: [
          new THREE.Vector3(-75, 0, 0),
          new THREE.Vector3(0, 0, 75),
          new THREE.Vector3(75, 0, 0),
          new THREE.Vector3(0, 0, -75),
          new THREE.Vector3(-75, 0, -65)
        ]
      }
    ];

    this.spawnMissionStartBeacon();
  }

  spawnMissionStartBeacon() {
    this.clearBeacons();
    const current = this.missions[this.missionIndex % this.missions.length];

    // Pulsing cylindrical light beacon
    const geo = new THREE.CylinderGeometry(2.5, 2.5, 8, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const beacon = new THREE.Mesh(geo, mat);
    beacon.position.copy(current.startPos).add(new THREE.Vector3(0, 4, 0));
    this.scene.add(beacon);

    // Glowing ground circle
    const ringGeo = new THREE.RingGeometry(2.0, 2.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(current.startPos).add(new THREE.Vector3(0, 0.08, 0));
    this.scene.add(ring);

    this.beacons.push({ mesh: beacon, ring: ring, pos: current.startPos, mission: current });
  }

  clearBeacons() {
    this.beacons.forEach(b => {
      if (b.mesh) this.scene.remove(b.mesh);
      if (b.ring) this.scene.remove(b.ring);
    });
    this.beacons = [];
  }

  update(delta, player) {
    // Animate beacons
    const time = performance.now() * 0.003;
    this.beacons.forEach(b => {
      b.mesh.rotation.y += delta * 1.5;
      b.mesh.material.opacity = 0.35 + Math.sin(time) * 0.2;
    });

    // Check starting a mission
    if (!this.activeMission) {
      for (const b of this.beacons) {
        if (player.position.distanceTo(b.pos) < 3.5) {
          this.startMission(b.mission, player);
          break;
        }
      }
      return;
    }

    // Update active mission logic
    this.updateActiveMission(delta, player);
  }

  startMission(mission, player) {
    this.activeMission = {
      ...mission,
      state: 'in_progress',
      step: 0,
      timer: mission.timeLimit || 0
    };
    this.clearBeacons();

    window.soundEngine?.playMissionPassed();
    if (window.ui) {
      window.ui.showMissionBanner(mission.title, mission.desc);
    }

    // Setup mission specifics
    if (mission.id === 'heist') {
      // Spawn target supercar at startPos
      const targetCar = new Vehicle(this.scene, {
        type: 'sports',
        color: 0xef4444,
        position: mission.startPos.clone().add(new THREE.Vector3(4, 0, 4)),
        maxSpeed: 45
      });
      if (window.game) window.game.vehicles.push(targetCar);
      this.activeMission.targetCar = targetCar;

      // Spawn safehouse drop zone beacon
      this.spawnBeacon(mission.safehousePos, 0x10b981);
    } else if (mission.id === 'turf') {
      // Spawn 3 rival gang members
      this.activeMission.gangEnemies = [];
      [-6, 0, 6].forEach(offset => {
        const gangPos = mission.startPos.clone().add(new THREE.Vector3(offset, 0, 8));
        const gang = new GangEnemy(this.scene, gangPos);
        this.activeMission.gangEnemies.push(gang);
      });
    } else if (mission.id === 'race') {
      this.activeMission.currentCheckpoint = 0;
      this.spawnBeacon(mission.checkpoints[0], 0x38bdf8);
    }
  }

  spawnBeacon(pos, colorHex = 0xfacc15) {
    this.clearBeacons();
    const geo = new THREE.CylinderGeometry(3.0, 3.0, 9, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const beacon = new THREE.Mesh(geo, mat);
    beacon.position.copy(pos).add(new THREE.Vector3(0, 4.5, 0));
    this.scene.add(beacon);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 3.2, 32),
      new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).add(new THREE.Vector3(0, 0.08, 0));
    this.scene.add(ring);

    this.beacons.push({ mesh: beacon, ring: ring, pos: pos });
  }

  updateActiveMission(delta, player) {
    const m = this.activeMission;

    if (m.id === 'heist') {
      // Step 0: Enter the car
      if (m.step === 0) {
        if (player.inVehicle && player.currentVehicle === m.targetCar) {
          m.step = 1;
          // Trigger 2-star police chase!
          if (window.policeManager) window.policeManager.addCrime(25);
          if (window.ui) {
            window.ui.showMissionBanner(m.title, 'Lose the Cops and deliver the car to the Green Safehouse!');
          }
        }
      } else if (m.step === 1) {
        // Step 1: Reach safehouse while cops evaded
        const distToSafe = player.position.distanceTo(m.safehousePos);
        const wanted = window.policeManager ? window.policeManager.wantedLevel : 0;

        if (distToSafe < 6.0) {
          if (wanted === 0) {
            this.completeMission(player);
          } else {
            if (window.ui) window.ui.showPromptTip('Lose the Police before entering the Safehouse!');
          }
        }
      }
    } else if (m.id === 'turf') {
      // Update gang enemies
      let allDead = true;
      m.gangEnemies.forEach(e => {
        e.update(delta, player);
        if (!e.isDead) allDead = false;
      });

      if (allDead) {
        this.completeMission(player);
      }
    } else if (m.id === 'race') {
      m.timer -= delta;
      if (m.timer <= 0) {
        this.failMission('TIME RAN OUT!');
        return;
      }

      const cpPos = m.checkpoints[m.currentCheckpoint];
      if (player.position.distanceTo(cpPos) < 7.0) {
        window.soundEngine?.playCoin();
        m.currentCheckpoint++;

        if (m.currentCheckpoint >= m.checkpoints.length) {
          this.completeMission(player);
        } else {
          this.spawnBeacon(m.checkpoints[m.currentCheckpoint], 0x38bdf8);
        }
      }
    }
  }

  completeMission(player) {
    const m = this.activeMission;
    window.soundEngine?.playMissionPassed();
    player.addCash(m.reward);

    if (window.ui) {
      window.ui.showMissionBanner('MISSION PASSED!', `+ $${m.reward.toLocaleString()} REWARD`);
    }

    this.activeMission = null;
    this.missionIndex++;
    this.clearBeacons();

    // Spawn next mission start beacon
    setTimeout(() => {
      this.spawnMissionStartBeacon();
    }, 4000);
  }

  failMission(reason) {
    if (window.ui) {
      window.ui.showMissionBanner('MISSION FAILED', reason);
    }
    this.activeMission = null;
    this.clearBeacons();

    setTimeout(() => {
      this.spawnMissionStartBeacon();
    }, 4000);
  }
}

class GangEnemy {
  constructor(scene, pos) {
    this.scene = scene;
    this.position = pos.clone();
    this.health = 70;
    this.isDead = false;
    this.shotCooldown = 0.8;
    this.rotation = 0;

    this.createModel();
  }

  createModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12 }); // Red gang bandana/shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), shirtMat);
    torso.position.y = 1.1;
    this.mesh.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    head.position.y = 0.5;
    torso.add(head);

    this.arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), shirtMat);
    this.arm.position.set(0.33, 0.15, 0);
    torso.add(this.arm);

    this.mesh.userData = { entity: this };
    this.scene.add(this.mesh);
  }

  update(delta, player) {
    if (this.isDead) return;
    const toP = player.position.clone().sub(this.position);
    const dist = toP.length();

    this.rotation = Math.atan2(-toP.x, -toP.z);
    this.mesh.rotation.y = this.rotation;

    this.arm.rotation.x = -Math.PI / 2.2;

    this.shotCooldown -= delta;
    if (this.shotCooldown <= 0 && dist < 30) {
      this.shotCooldown = 0.6 + Math.random() * 0.4;
      window.soundEngine?.playSMG();
      if (Math.random() < 0.35) {
        player.onHit(14);
      }
    }
  }

  onHit(damage, knock = null) {
    if (this.isDead) return;
    this.health -= damage;
    window.soundEngine?.playPunch();
    if (this.health <= 0) {
      this.isDead = true;
      this.mesh.rotation.z = Math.PI / 2;
      this.mesh.position.y = 0.2;
      if (window.pedestrianManager) {
        window.pedestrianManager.spawnCashPickup(this.position, 150);
      }
    }
  }
}
