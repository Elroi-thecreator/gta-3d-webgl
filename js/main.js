// ==========================================
// GTA 3D - FAST 60-FPS GAME ENGINE LOOP
// ==========================================
class GameEngine {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.vehicles = [];

    this.gameTime = 12.0;
    this.timeScale = 0.04;

    this.initThree();
    this.initSystems();
    this.setupInitialWorld();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.game = this;
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38bdf8);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.003);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      800
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // High performance
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Sun & Ambient Lighting
    this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.75);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    this.sunLight.position.set(80, 140, 80);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 300;
    const d = 90;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
  }

  initSystems() {
    this.ui = new UIManager();
    this.cameraCtrl = new CameraController(this.camera, this.container);
    this.weaponMgr = new WeaponManager(this.scene, this.camera);
    this.city = new CityBuilder(this.scene);
    this.player = new PlayerCharacter(this.scene, this.cameraCtrl, this.weaponMgr);
    this.traffic = new TrafficManager(this.scene, this.city);
    this.pedestrians = new PedestrianManager(this.scene, this.city);
    this.police = new PoliceManager(this.scene, this.city);
    this.missions = new MissionManager(this.scene);
    this.minimap = new MiniMap('radar-canvas', this.city);

    window.pedestrianManager = this.pedestrians;
    window.policeManager = this.police;
  }

  setupInitialWorld() {
    // SPAWN ON OPEN 4-LANE AVENUE (x = 40 is open road between blocks!)
    this.player.position.set(40, 0, 10);
    this.player.mesh.position.copy(this.player.position);

    // Starter Supercar right on the road next to player
    const starterCar = new Vehicle(this.scene, {
      type: 'sports',
      color: 0xef4444, // Red GT
      position: new THREE.Vector3(40, 0, 0),
      rotation: 0,
      maxSpeed: 48,
      acceleration: 36
    });
    this.vehicles.push(starterCar);

    this.ui.updateVitals(100, 100);
    this.ui.updateCash(this.player.cash);
    this.ui.updateWeapon(this.weaponMgr.current);
    this.ui.showPromptTip('Use ARROW KEYS or WASD to move! Press [ENTER] or [F] to drive.');
  }

  updateDayNightCycle(delta) {
    this.gameTime = (this.gameTime + delta * this.timeScale) % 24;
    const hour = Math.floor(this.gameTime);
    const minute = Math.floor((this.gameTime % 1) * 60);
    this.ui.updateClock(hour, minute);

    const sunAngle = ((this.gameTime - 6) / 24) * Math.PI * 2;
    this.sunLight.position.x = Math.cos(sunAngle) * 160;
    this.sunLight.position.y = Math.sin(sunAngle) * 160;

    const isNight = this.gameTime < 5.5 || this.gameTime > 19.5;
    const isDusk = (this.gameTime >= 18 && this.gameTime <= 19.5) || (this.gameTime >= 5 && this.gameTime <= 6.5);

    if (isNight) {
      this.scene.background.setHex(0x060714);
      this.scene.fog.color.setHex(0x060714);
      this.sunLight.intensity = 0.05;
      this.ambientLight.intensity = 0.3;
    } else if (isDusk) {
      this.scene.background.setHex(0xb45309);
      this.scene.fog.color.setHex(0xb45309);
      this.sunLight.intensity = 0.7;
      this.ambientLight.intensity = 0.5;
    } else {
      this.scene.background.setHex(0x38bdf8);
      this.scene.fog.color.setHex(0x87ceeb);
      this.sunLight.intensity = 1.3;
      this.ambientLight.intensity = 0.75;
    }

    const lightsOn = isNight || isDusk;
    this.vehicles.forEach(v => {
      v.headlights?.forEach(hl => {
        hl.intensity = lightsOn ? 2.5 : 0;
      });
    });
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const rawDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const timeScale = window.bulletTime || 1.0;
    const delta = Math.min(rawDelta, 0.05) * timeScale;

    if (this.ui.isPaused) return;

    this.updateDayNightCycle(delta);

    const targetEntities = [
      ...this.pedestrians.pedestrians,
      ...this.vehicles,
      ...this.police.policeOfficers,
      ...(this.missions.activeMission?.gangEnemies || [])
    ];

    this.player.update(delta, this.city.obstacles, this.vehicles, targetEntities);
    this.cameraCtrl.update(delta, this.player.mesh, this.player.currentVehicle);
    this.weaponMgr.update(delta, targetEntities);
    this.traffic.update(delta, this.player.position);
    this.pedestrians.update(delta, this.player, this.player.isAiming);
    this.police.update(delta, this.player);
    this.missions.update(delta, this.player);

    this.minimap.update(
      this.player,
      this.vehicles,
      [...this.police.policeUnits, ...this.police.policeOfficers],
      this.missions.beacons
    );

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
