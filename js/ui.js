// ==========================================
// GTA 5 - USER INTERFACE, WEAPON WHEEL & iFRUIT
// ==========================================
class UIManager {
  constructor() {
    this.healthBar = document.getElementById('health-bar-fill');
    this.armorBar = document.getElementById('armor-bar-fill');
    this.staminaBar = document.getElementById('stamina-bar-fill');
    this.cashDisplay = document.getElementById('cash-display');
    this.clockDisplay = document.getElementById('clock-display');
    this.wantedStars = [
      document.getElementById('star-1'),
      document.getElementById('star-2'),
      document.getElementById('star-3'),
      document.getElementById('star-4'),
      document.getElementById('star-5')
    ];

    this.weaponIcon = document.getElementById('weapon-icon');
    this.weaponName = document.getElementById('weapon-name');
    this.ammoDisplay = document.getElementById('ammo-display');

    this.vehicleHud = document.getElementById('vehicle-hud');
    this.vehicleName = document.getElementById('vehicle-name');
    this.speedValue = document.getElementById('speed-value');
    this.vehicleHealth = document.getElementById('vehicle-health-fill');
    this.nitroFill = document.getElementById('nitro-fill');

    this.crosshair = document.getElementById('crosshair');
    this.hitmarker = document.getElementById('hitmarker');
    this.promptTip = document.getElementById('prompt-tip');
    this.missionBanner = document.getElementById('mission-banner');
    this.missionTitle = document.getElementById('mission-title');
    this.missionDesc = document.getElementById('mission-desc');
    this.deathScreen = document.getElementById('death-screen');

    // GTA 5 Weapon Wheel
    this.weaponWheel = document.getElementById('weapon-wheel-overlay');
    this.wheelSlots = document.querySelectorAll('.wheel-slot');
    this.wheelCenterName = document.getElementById('wheel-center-name');
    this.selectedWheelIndex = 1;

    // iFruit Phone
    this.phone = document.getElementById('ifruit-phone');
    this.phoneClock = document.getElementById('phone-clock');
    this.isPhoneOpen = false;

    this.startScreen = document.getElementById('start-screen');
    this.isPaused = false;

    this.setupListeners();
    this.setupPhoneApps();
    this.setupWeaponWheel();
    window.ui = this;
  }

  setupListeners() {
    const dismissStart = () => {
      if (this.startScreen && this.startScreen.style.display !== 'none') {
        this.startScreen.style.display = 'none';
        window.soundEngine?.init();
        try {
          document.getElementById('canvas-container')?.requestPointerLock();
        } catch(e) {}
      }
    };
    this.startScreen?.addEventListener('click', dismissStart);
    window.addEventListener('keydown', dismissStart);

    window.addEventListener('keydown', (e) => {
      // Toggle iFruit Phone with P
      if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
        this.togglePhone();
      }

      // Open Weapon Wheel on TAB
      if (e.code === 'Tab') {
        e.preventDefault();
        this.showWeaponWheel();
      }

      if (e.code === 'Escape') {
        if (this.isPhoneOpen) {
          this.togglePhone(false);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      // Close Weapon Wheel on TAB release
      if (e.code === 'Tab') {
        e.preventDefault();
        this.hideWeaponWheel();
      }
    });
  }

  // --- GTA 5 WEAPON WHEEL (TAB) ---
  setupWeaponWheel() {
    const weaponKeys = ['fists', 'pistol', 'smg', 'shotgun', 'rpg', 'grenade', 'fists', 'pistol'];
    const weaponNames = ['Fists', '9mm Pistol', 'Micro SMG', 'Pump Shotgun', 'Rocket Launcher', 'Grenades', 'Knife Melee', 'Sniper Rifle'];

    this.wheelSlots.forEach((slot, idx) => {
      slot.addEventListener('mouseenter', () => {
        this.wheelSlots.forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        this.selectedWheelIndex = idx;
        if (this.wheelCenterName) {
          this.wheelCenterName.innerText = weaponNames[idx] || 'Weapon';
        }
        window.soundEngine?.playHitmarker();
      });

      slot.addEventListener('click', () => {
        this.selectedWheelIndex = idx;
        this.hideWeaponWheel();
      });
    });
  }

  showWeaponWheel() {
    if (this.weaponWheel) {
      this.weaponWheel.classList.add('visible');
      window.bulletTime = 0.2; // GTA 5 slow motion!
    }
  }

  hideWeaponWheel() {
    if (this.weaponWheel && this.weaponWheel.classList.contains('visible')) {
      this.weaponWheel.classList.remove('visible');
      window.bulletTime = 1.0; // Restore normal time

      // Equip chosen weapon
      const actualIndex = Math.min(4, this.selectedWheelIndex);
      if (window.game?.weaponMgr) {
        window.game.weaponMgr.selectWeapon(actualIndex);
      }
    }
  }

  // --- iFRUIT SMARTPHONE (P) ---
  togglePhone(force = null) {
    this.isPhoneOpen = (force !== null) ? force : !this.isPhoneOpen;
    if (this.phone) {
      if (this.isPhoneOpen) {
        this.phone.classList.add('visible');
        window.soundEngine?.playPhoneBeep();
      } else {
        this.phone.classList.remove('visible');
      }
    }
  }

  setupPhoneApps() {
    document.getElementById('phone-home-btn')?.addEventListener('click', () => {
      this.togglePhone(false);
    });

    // 1. Spawn Supercar Cheat
    document.getElementById('app-spawn-car')?.addEventListener('click', () => {
      window.soundEngine?.playPhoneBeep();
      const p = window.game?.player;
      if (p) {
        const car = new Vehicle(window.game.scene, {
          type: 'sports',
          color: 0xef4444,
          position: p.position.clone().add(new THREE.Vector3(4, 0, 0)),
          rotation: p.rotation
        });
        window.game.vehicles.push(car);
        this.showMissionBanner('CHEAT ACTIVATED', 'Pegassi Zentorno Supercar Delivered!');
      }
      this.togglePhone(false);
    });

    // 2. Add $100k Cash Cheat
    document.getElementById('app-max-cash')?.addEventListener('click', () => {
      window.soundEngine?.playPhoneBeep();
      window.game?.player?.addCash(100000);
      this.showMissionBanner('MAZE BANK ALERT', '+$100,000 Deposited into Account!');
      this.togglePhone(false);
    });

    // 3. Full Health & Armor Cheat
    document.getElementById('app-heal')?.addEventListener('click', () => {
      window.soundEngine?.playPhoneBeep();
      const p = window.game?.player;
      if (p) {
        p.health = 100;
        p.armor = 100;
        this.updateVitals(100, 100);
        this.showMissionBanner('CHEAT ACTIVATED', 'Health and Armor Restored!');
      }
      this.togglePhone(false);
    });

    // 4. Clear Wanted Stars Cheat
    document.getElementById('app-clear-wanted')?.addEventListener('click', () => {
      window.soundEngine?.playPhoneBeep();
      window.policeManager?.clearWantedLevel();
      this.showMissionBanner('LESTER CALLED', 'Police Pursuit Cancelled!');
      this.togglePhone(false);
    });

    // 5. Max Ammo & RPG Cheat
    document.getElementById('app-max-ammo')?.addEventListener('click', () => {
      window.soundEngine?.playPhoneBeep();
      const wm = window.game?.weaponMgr;
      if (wm) {
        Object.values(wm.weapons).forEach(w => {
          if (w.ammo !== Infinity) w.ammo = 999;
          if (w.mag !== Infinity) w.mag = w.maxMag;
        });
        wm.selectWeapon(4); // Select RPG!
        this.showMissionBanner('AMMU-NATION DROP', 'All Weapons & RPG Loaded with Max Ammo!');
      }
      this.togglePhone(false);
    });

    // 6. Lamar Instant Heist
    document.getElementById('app-mission')?.addEventListener('click', () => {
      window.soundEngine?.playPhoneBeep();
      const m = window.game?.missions;
      if (m && !m.activeMission) {
        m.startMission(m.missions[0], window.game.player);
      }
      this.togglePhone(false);
    });
  }

  // --- HITMARKERS ---
  triggerHitmarker() {
    if (this.hitmarker) {
      this.hitmarker.classList.add('active');
      setTimeout(() => {
        this.hitmarker.classList.remove('active');
      }, 140);
    }
  }

  updateVitals(health, armor, stamina = 100) {
    if (this.healthBar) {
      const hp = Math.max(0, Math.min(100, health));
      this.healthBar.style.width = `${hp}%`;
    }
    if (this.armorBar) {
      const arm = Math.max(0, Math.min(100, armor));
      this.armorBar.style.width = `${arm}%`;
    }
    if (this.staminaBar) {
      this.staminaBar.style.width = `${stamina}%`;
    }
  }

  updateCash(amount) {
    if (!this.cashDisplay) return;
    this.cashDisplay.innerText = `$${String(amount).padStart(8, '0')}`;
    this.cashDisplay.classList.add('cash-anim');
    setTimeout(() => this.cashDisplay.classList.remove('cash-anim'), 400);
  }

  updateWantedLevel(stars, isEvasive = false) {
    this.wantedStars.forEach((starEl, idx) => {
      if (!starEl) return;
      if (idx < stars) {
        starEl.classList.add('active');
        if (isEvasive) starEl.classList.add('flashing');
        else starEl.classList.remove('flashing');
      } else {
        starEl.classList.remove('active', 'flashing');
      }
    });
  }

  updateWeapon(weapon) {
    if (!weapon) return;
    if (this.weaponIcon) this.weaponIcon.innerText = weapon.icon || '🔫';
    if (this.weaponName) this.weaponName.innerText = weapon.name;
    if (this.ammoDisplay) {
      this.ammoDisplay.innerText = weapon.ammo === Infinity ? '∞' : `${weapon.mag} / ${weapon.ammo}`;
    }
  }

  setAiming(isAiming) {
    if (this.crosshair) {
      if (isAiming) this.crosshair.classList.add('aiming');
      else this.crosshair.classList.remove('aiming');
    }
  }

  setVehicleMode(inVehicle, vehicle = null) {
    if (this.vehicleHud) {
      this.vehicleHud.style.display = inVehicle ? 'flex' : 'none';
    }
    if (this.crosshair) {
      this.crosshair.style.display = inVehicle ? 'none' : 'block';
    }
    if (inVehicle && vehicle) {
      let vName = 'Pegassi Zentorno';
      if (vehicle.type === 'police') vName = 'VCPD Interceptor';
      else if (vehicle.type === 'truck') vName = 'Titan Heavy';
      if (this.vehicleName) this.vehicleName.innerText = vName;
    }
  }

  updateVehicleHUD(vehicle) {
    if (!vehicle) return;
    const mph = Math.round(Math.abs(vehicle.speed) * 2.236);
    if (this.speedValue) this.speedValue.innerText = mph;

    if (this.vehicleHealth) {
      const hp = Math.max(0, Math.min(100, (vehicle.health / vehicle.maxHealth) * 100));
      this.vehicleHealth.style.width = `${hp}%`;
    }

    if (this.nitroFill) {
      const nPercent = Math.max(0, Math.min(100, (vehicle.nitro / vehicle.maxNitro) * 100));
      this.nitroFill.style.width = `${nPercent}%`;
    }
  }

  showPromptTip(msg) {
    if (!this.promptTip) return;
    this.promptTip.innerHTML = msg;
    this.promptTip.classList.add('visible');
  }

  hidePromptTip() {
    if (this.promptTip) this.promptTip.classList.remove('visible');
  }

  showMissionBanner(title, desc) {
    if (!this.missionBanner) return;
    if (this.missionTitle) this.missionTitle.innerText = title;
    if (this.missionDesc) this.missionDesc.innerText = desc;
    this.missionBanner.classList.add('visible');

    setTimeout(() => {
      this.missionBanner?.classList.remove('visible');
    }, 4500);
  }

  showDeathScreen(title = 'WASTED', subtitle = 'Respawning...') {
    if (!this.deathScreen) return;
    this.deathScreen.classList.add('visible');
  }

  hideDeathScreen() {
    if (this.deathScreen) this.deathScreen.classList.remove('visible');
  }

  updateClock(gameHour, gameMinute) {
    if (!this.clockDisplay) return;
    const h = String(Math.floor(gameHour)).padStart(2, '0');
    const m = String(Math.floor(gameMinute)).padStart(2, '0');
    const timeStr = `${h}:${m}`;
    this.clockDisplay.innerText = timeStr;
    if (this.phoneClock) this.phoneClock.innerText = timeStr;
  }
}
