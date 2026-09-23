// ==========================================
// GTA 3D - WEAPONS & COMBAT ARSENAL
// ==========================================
class WeaponManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.weapons = {
      fists: {
        id: 'fists',
        name: 'Fists',
        icon: '👊',
        fireRate: 0.35,
        range: 2.5,
        damage: 25,
        ammo: Infinity,
        mag: Infinity,
        maxMag: Infinity,
        auto: false
      },
      pistol: {
        id: 'pistol',
        name: '9mm Pistol',
        icon: '🔫',
        fireRate: 0.22,
        range: 90,
        damage: 35,
        ammo: 120,
        mag: 17,
        maxMag: 17,
        auto: false
      },
      smg: {
        id: 'smg',
        name: 'Micro SMG',
        icon: '⚡',
        fireRate: 0.08,
        range: 80,
        damage: 20,
        ammo: 240,
        mag: 30,
        maxMag: 30,
        auto: true
      },
      shotgun: {
        id: 'shotgun',
        name: 'Pump Shotgun',
        icon: '💥',
        fireRate: 0.75,
        range: 45,
        damage: 18,
        pellets: 7,
        ammo: 48,
        mag: 8,
        maxMag: 8,
        auto: false
      },
      rpg: {
        id: 'rpg',
        name: 'Rocket Launcher',
        icon: '🚀',
        fireRate: 1.4,
        range: 200,
        damage: 250,
        ammo: 12,
        mag: 1,
        maxMag: 1,
        auto: false
      }
    };

    this.weaponKeys = ['fists', 'pistol', 'smg', 'shotgun', 'rpg'];
    this.currentWeaponIndex = 1; // start with pistol
    this.current = this.weapons[this.weaponKeys[this.currentWeaponIndex]];
    this.lastFireTime = 0;

    // Active projectiles (rockets, grenades)
    this.projectiles = [];
    this.particles = [];
    this.tracers = [];

    // Raycaster for hitscan shots
    this.raycaster = new THREE.Raycaster();

    this.setupInputs();
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= this.weaponKeys.length) {
        this.selectWeapon(num - 1);
      }
      if (e.code === 'KeyR' && !window.game?.player?.inVehicle) {
        this.reload();
      }
    });

    window.addEventListener('wheel', (e) => {
      if (window.game?.player?.inVehicle) return;
      if (e.deltaY > 0) {
        this.selectWeapon((this.currentWeaponIndex + 1) % this.weaponKeys.length);
      } else {
        this.selectWeapon((this.currentWeaponIndex - 1 + this.weaponKeys.length) % this.weaponKeys.length);
      }
    });
  }

  selectWeapon(index) {
    this.currentWeaponIndex = index;
    this.current = this.weapons[this.weaponKeys[index]];
    if (window.ui) {
      window.ui.updateWeapon(this.current);
    }
  }

  reload() {
    const w = this.current;
    if (w.id === 'fists' || w.ammo <= 0 || w.mag >= w.maxMag) return;

    const needed = w.maxMag - w.mag;
    const toLoad = Math.min(needed, w.ammo);
    w.mag += toLoad;
    w.ammo -= toLoad;

    if (window.ui) window.ui.updateWeapon(w);
  }

  tryFire(player, targetList = []) {
    const now = performance.now() / 1000;
    if (now - this.lastFireTime < this.current.fireRate) return false;

    if (this.current.id !== 'fists' && this.current.mag <= 0) {
      this.reload();
      return false;
    }

    this.lastFireTime = now;

    if (this.current.id !== 'fists') {
      this.current.mag--;
      if (window.ui) window.ui.updateWeapon(this.current);
    }

    // Trigger Audio & Visuals
    this.executeShot(player, targetList);
    return true;
  }

  executeShot(player, targetList) {
    const w = this.current;
    const sound = window.soundEngine;

    // Report gunshot crime to police if not fists
    if (w.id !== 'fists' && window.policeManager) {
      window.policeManager.reportGunshot(player.position);
    }

    if (w.id === 'fists') {
      sound.playPunch();
      this.checkMeleeHit(player, targetList);
      return;
    }

    if (w.id === 'pistol') {
      sound.playPistol();
      this.fireBullet(player, targetList, 0.015);
    } else if (w.id === 'smg') {
      sound.playSMG();
      this.fireBullet(player, targetList, 0.04);
    } else if (w.id === 'shotgun') {
      sound.playShotgun();
      for (let i = 0; i < (w.pellets || 7); i++) {
        this.fireBullet(player, targetList, 0.09);
      }
    } else if (w.id === 'rpg') {
      sound.playRPGLaunch();
      this.fireRocket(player);
    }

    // Muzzle flash light
    this.createMuzzleFlash(player.position);
  }

  checkMeleeHit(player, targetList) {
    const pPos = player.position;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.rotation, 0));

    targetList.forEach(target => {
      if (!target || !target.position) return;
      const dist = pPos.distanceTo(target.position);
      if (dist < 2.6) {
        const toTarget = target.position.clone().sub(pPos).normalize();
        if (forward.dot(toTarget) > 0.4) {
          target.onHit(this.current.damage, toTarget.multiplyScalar(6));
          this.createHitSparks(target.position, 0xef4444);
        }
      }
    });
  }

  fireBullet(player, targetList, spread) {
    // Raycast from camera center with slight spread
    const screenCenter = new THREE.Vector2(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * spread * 2
    );

    this.raycaster.setFromCamera(screenCenter, this.camera);
    const origin = player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const rayDir = this.raycaster.ray.direction.clone();

    // Check hit candidates
    const hits = this.raycaster.intersectObjects(targetList.map(t => t.mesh).filter(Boolean), true);

    let hitPoint = null;
    let hitObject = null;

    if (hits.length > 0 && hits[0].distance < this.current.range) {
      hitPoint = hits[0].point;
      hitObject = hits[0].object;

      // Find owning entity
      let current = hitObject;
      while (current && !current.userData?.entity) {
        current = current.parent;
      }
      if (current && current.userData?.entity) {
        const entity = current.userData.entity;
        entity.onHit(this.current.damage, rayDir.clone().multiplyScalar(4));
        this.createHitSparks(hitPoint, 0xff2222);
        
        // GTA 5 Hitmarker Feedback!
        window.ui?.triggerHitmarker();
        window.soundEngine?.playHitmarker();
      } else {
        this.createHitSparks(hitPoint, 0xf6ad55);
      }
    } else {
      hitPoint = origin.clone().add(rayDir.clone().multiplyScalar(this.current.range));
    }

    // Spawn bullet tracer
    this.createTracer(origin, hitPoint);
  }

  fireRocket(player) {
    const origin = player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const dir = this.raycaster.ray.direction.clone();

    // Rocket mesh
    const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh: mesh,
      velocity: dir.multiplyScalar(45),
      lifetime: 3.5,
      type: 'rocket'
    });
  }

  createMuzzleFlash(pos) {
    const light = new THREE.PointLight(0xffaa22, 5, 8);
    light.position.copy(pos).add(new THREE.Vector3(0, 1.4, 0));
    this.scene.add(light);
    setTimeout(() => {
      this.scene.remove(light);
    }, 45);
  }

  createTracer(from, to) {
    const points = [from, to];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffea79,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({ mesh: line, time: 0.06 });
  }

  createHitSparks(pos, color = 0xf6ad55) {
    for (let i = 0; i < 6; i++) {
      const pGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const pMat = new THREE.MeshBasicMaterial({ color: color });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(pos);
      this.scene.add(pMesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 6
      );

      this.particles.push({
        mesh: pMesh,
        vel: vel,
        life: 0.35,
        decay: 1.0
      });
    }
  }

  createExplosion(pos, targetList = []) {
    window.soundEngine.playExplosion();

    // Shockwave & Damage to nearby entities
    targetList.forEach(t => {
      if (!t || !t.position) return;
      const d = pos.distanceTo(t.position);
      if (d < 12) {
        const falloff = Math.max(0, 1 - d / 12);
        const knock = t.position.clone().sub(pos).normalize().multiplyScalar(25 * falloff);
        knock.y = 8 * falloff;
        t.onHit(220 * falloff, knock);
      }
    });

    // Fireball sphere
    const fireGeo = new THREE.SphereGeometry(3.5, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.9
    });
    const fireball = new THREE.Mesh(fireGeo, fireMat);
    fireball.position.copy(pos);
    this.scene.add(fireball);

    // Light flash
    const flash = new THREE.PointLight(0xff6600, 15, 30);
    flash.position.copy(pos);
    this.scene.add(flash);

    setTimeout(() => {
      this.scene.remove(fireball);
      this.scene.remove(flash);
    }, 350);

    // Smoke particles
    for (let i = 0; i < 24; i++) {
      const sGeo = new THREE.SphereGeometry(Math.random() * 0.8 + 0.3, 6, 6);
      const sMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.4 ? 0x222222 : 0xdd4400,
        transparent: true,
        opacity: 0.8
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.copy(pos);
      this.scene.add(sMesh);

      this.particles.push({
        mesh: sMesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 16,
          Math.random() * 12 + 2,
          (Math.random() - 0.5) * 16
        ),
        life: 1.2,
        decay: 0.8
      });
    }
  }

  update(delta, targetList = []) {
    // Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.time -= delta;
      if (t.time <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta * p.decay;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= 9.8 * delta; // Gravity

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Update Projectiles (Rockets)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.lifetime -= delta;
      proj.mesh.position.addScaledVector(proj.velocity, delta);

      // Check collision with ground or targets
      let exploded = false;
      if (proj.mesh.position.y <= 0.2 || proj.lifetime <= 0) {
        exploded = true;
      } else {
        for (const t of targetList) {
          if (t?.position && proj.mesh.position.distanceTo(t.position) < 2.0) {
            exploded = true;
            break;
          }
        }
      }

      if (exploded) {
        this.createExplosion(proj.mesh.position, targetList);
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
}
