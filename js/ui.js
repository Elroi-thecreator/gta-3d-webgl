// ==========================================
// GTA 3D - USER INTERFACE & HUD MANAGER
// ==========================================
class UIManager {
  constructor() {
    this.healthBar = document.getElementById('health-bar-fill');
    this.armorBar = document.getElementById('armor-bar-fill');
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

    this.radioHud = document.getElementById('radio-hud');
    this.radioTitle = document.getElementById('radio-station-title');
    this.radioTimer = null;

    this.crosshair = document.getElementById('crosshair');
    this.promptTip = document.getElementById('prompt-tip');
    this.missionBanner = document.getElementById('mission-banner');
    this.missionTitle = document.getElementById('mission-title');
    this.missionDesc = document.getElementById('mission-desc');
    this.missionTimer = null;

    this.deathScreen = document.getElementById('death-screen');
    this.deathText = document.getElementById('death-text');
    this.deathSubtitle = document.getElementById('death-subtitle');

    this.controlsModal = document.getElementById('controls-modal');
    this.btnResume = document.getElementById('btn-resume');
    this.startScreen = document.getElementById('start-screen');

    this.isPaused = false;

    this.setupListeners();
    window.ui = this;
  }

  setupListeners() {
    // Start Game Overlay
    this.startScreen?.addEventListener('click', () => {
      this.startScreen.style.display = 'none';
      window.soundEngine?.init();
      document.getElementById('canvas-container')?.requestPointerLock();
    });

    // Resume button
    this.btnResume?.addEventListener('click', () => {
      this.togglePause(false);
      document.getElementById('canvas-container')?.requestPointerLock();
    });

    // Pause / Controls toggle with H or Escape
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH') {
        this.togglePause();
      }
      if (e.code === 'Escape') {
        this.togglePause(!this.isPaused);
      }
      // Radio cycle with R inside vehicle
      if (e.code === 'KeyR' && window.game?.player?.inVehicle) {
        const station = window.soundEngine?.cycleRadio();
        if (station) this.showRadioHUD(station);
      }
    });
  }

  togglePause(force = null) {
    this.isPaused = (force !== null) ? force : !this.isPaused;
    if (this.controlsModal) {
      if (this.isPaused) {
        this.controlsModal.classList.add('visible');
        document.exitPointerLock?.();
      } else {
        this.controlsModal.classList.remove('visible');
      }
    }
  }

  updateVitals(health, armor) {
    if (this.healthBar) {
      const hPercent = Math.max(0, Math.min(100, health));
      this.healthBar.style.width = `${hPercent}%`;
    }
    if (this.armorBar) {
      const aPercent = Math.max(0, Math.min(100, armor));
      this.armorBar.style.width = `${aPercent}%`;
    }
  }

  updateCash(amount) {
    if (!this.cashDisplay) return;
    const str = `$${String(amount).padStart(8, '0')}`;
    this.cashDisplay.innerText = str;
    this.cashDisplay.classList.add('cash-anim');
    setTimeout(() => this.cashDisplay.classList.remove('cash-anim'), 500);
  }

  updateWantedLevel(stars, isEvasive = false) {
    this.wantedStars.forEach((starEl, idx) => {
      if (!starEl) return;
      if (idx < stars) {
        starEl.classList.add('active');
        if (isEvasive) {
          starEl.classList.add('flashing');
        } else {
          starEl.classList.remove('flashing');
        }
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
      if (weapon.ammo === Infinity) {
        this.ammoDisplay.innerText = '∞';
      } else {
        this.ammoDisplay.innerText = `${weapon.mag} / ${weapon.ammo}`;
      }
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
      let vName = 'Cruiser 90';
      if (vehicle.type === 'sports') vName = 'Banshee GT';
      else if (vehicle.type === 'police') vName = 'VCPD Interceptor';
      else if (vehicle.type === 'muscle') vName = 'Stallion 454';
      else if (vehicle.type === 'truck') vName = 'Titan Heavy';

      if (this.vehicleName) this.vehicleName.innerText = vName;

      // Show radio station pill
      this.showRadioHUD(window.soundEngine?.getCurrentRadioName() || 'Flash 98.2 FM');
    }
  }

  updateVehicleHUD(vehicle) {
    if (!vehicle) return;
    const mph = Math.round(Math.abs(vehicle.speed) * 2.236);
    if (this.speedValue) this.speedValue.innerText = mph;

    if (this.vehicleHealth) {
      const hpPercent = Math.max(0, Math.min(100, (vehicle.health / vehicle.maxHealth) * 100));
      this.vehicleHealth.style.width = `${hpPercent}%`;
    }
  }

  showRadioHUD(stationName) {
    if (!this.radioHud || !this.radioTitle) return;
    this.radioTitle.innerText = stationName;
    this.radioHud.classList.add('visible');

    if (this.radioTimer) clearTimeout(this.radioTimer);
    this.radioTimer = setTimeout(() => {
      this.radioHud.classList.remove('visible');
    }, 3500);
  }

  showPromptTip(msg) {
    if (!this.promptTip) return;
    this.promptTip.innerHTML = msg;
    this.promptTip.classList.add('visible');
  }

  hidePromptTip() {
    if (this.promptTip) {
      this.promptTip.classList.remove('visible');
    }
  }

  showMissionBanner(title, desc) {
    if (!this.missionBanner) return;
    if (this.missionTitle) this.missionTitle.innerText = title;
    if (this.missionDesc) this.missionDesc.innerText = desc;
    this.missionBanner.classList.add('visible');

    if (this.missionTimer) clearTimeout(this.missionTimer);
    this.missionTimer = setTimeout(() => {
      this.missionBanner.classList.remove('visible');
    }, 4500);
  }

  showDeathScreen(title = 'WASTED', subtitle = 'Respawning...') {
    if (!this.deathScreen) return;
    if (this.deathText) this.deathText.innerText = title;
    if (this.deathSubtitle) this.deathSubtitle.innerText = subtitle;
    this.deathScreen.classList.add('visible');
  }

  hideDeathScreen() {
    if (this.deathScreen) {
      this.deathScreen.classList.remove('visible');
    }
  }

  updateClock(gameHour, gameMinute) {
    if (!this.clockDisplay) return;
    const h = String(Math.floor(gameHour)).padStart(2, '0');
    const m = String(Math.floor(gameMinute)).padStart(2, '0');
    this.clockDisplay.innerText = `${h}:${m}`;
  }
}
