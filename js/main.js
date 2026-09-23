// ==========================================
// GTA 3D - MAIN GAME ENGINE & INITIALIZER
// ==========================================
class GameEngine {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.vehicles = [];

    // Time & Day/Night Cycle
    this.gameTime = 12.0; // Starts at 12:00 PM
    this.timeScale = 0.05; // 1 real minute = ~20 game minutes

    this.initThree();
    this.initSystems();
    this.setupInitialWorld();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.game = this;
  }

  initThree() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);

    // Responsive Resizing
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Sun & Ambient Lighting
    this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.7);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.sunLight.position.set(120, 180, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    const d = 120;
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
    // Position player on initial sidewalk
    this.player.position.set(0, 0, 12);
    this.player.mesh.position.copy(this.player.position);

    // Spawn Player's Initial Starter Supercar (Banshee Red) right on the avenue in front!
    const starterCar = new Vehicle(this.scene, {
      type: 'sports',
      color: 0xef4444,
      position: new THREE.Vector3(0, 0, 2),
      rotation: Math.PI / 2,
      maxSpeed: 44,
      acceleration: 30
    });
    this.vehicles.push(starterCar);

    // Initial HUD update
    this.ui.updateVitals(100, 100);
    this.ui.updateCash(this.player.cash);
    this.ui.updateWeapon(this.weaponMgr.current);
    this.ui.showPromptTip('Press [W,A,S,D] to move, [F] to drive car, [H] for controls');
  }

  updateDayNightCycle(delta) {
    this.gameTime = (this.gameTime + delta * this.timeScale) % 24;

    const hour = Math.floor(this.gameTime);
    const minute = Math.floor((this.gameTime % 1) * 60);
    this.ui.updateClock(hour, minute);

    // Sun movement (elevation angle based on hour)
    const sunAngle = ((this.gameTime - 6) / 24) * Math.PI * 2;
    this.sunLight.position.x = Math.cos(sunAngle) * 200;
    this.sunLight.position.y = Math.sin(sunAngle) * 200;

    // Day vs Night visuals
    const isNight = this.gameTime < 5.5 || this.gameTime > 19.5;
    const isDusk = (this.gameTime >= 18 && this.gameTime <= 19.5) || (this.gameTime >= 5 && this.gameTime <= 6.5);

    if (isNight) {
      this.scene.background.setHex(0x060714);
      this.scene.fog.color.setHex(0x060714);
      this.sunLight.intensity = 0.05;
      this.ambientLight.intensity = 0.25;
    } else if (isDusk) {
      this.scene.background.setHex(0xb45309);
      this.scene.fog.color.setHex(0xb45309);
      this.sunLight.intensity = 0.8;
      this.ambientLight.intensity = 0.55;
    } else {
      this.scene.background.setHex(0x38bdf8);
      this.scene.fog.color.setHex(0x87ceeb);
      this.sunLight.intensity = 1.35;
      this.ambientLight.intensity = 0.75;
    }

    // Toggle street lamps and headlights
    const lightsOn = isNight || isDusk;
    this.city.streetLamps.forEach(lamp => {
      lamp.intensity = lightsOn ? 2.0 : 0;
    });

    this.vehicles.forEach(v => {
      v.headlights.forEach(hl => {
        hl.intensity = lightsOn ? 2.2 : 0;
      });
    });
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    // Delta time in seconds with safe clamp
    const rawDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const delta = Math.min(rawDelta, 0.08);

    if (this.ui.isPaused) return;

    // Day / Night Cycle
    this.updateDayNightCycle(delta);

    // Collect all shootable target entities (pedestrians, vehicles, cops, gang enemies)
    const targetEntities = [
      ...this.pedestrians.pedestrians,
      ...this.vehicles,
      ...this.police.policeOfficers,
      ...(this.missions.activeMission?.gangEnemies || [])
    ];

    // 1. Update Player Character
    this.player.update(delta, this.city.obstacles, this.vehicles, targetEntities);

    // 2. Update Camera
    this.cameraCtrl.update(delta, this.player.mesh, this.player.currentVehicle);

    // 3. Update Weapons, Projectiles & Particles
    this.weaponMgr.update(delta, targetEntities);

    // 4. Update Ambient Traffic
    this.traffic.update(delta, this.player.position);

    // 5. Update Civilian Pedestrians
    this.pedestrians.update(delta, this.player, this.player.isAiming);

    // 6. Update Police AI & Wanted Level
    this.police.update(delta, this.player);

    // 7. Update Missions & Beacons
    this.missions.update(delta, this.player);

    // 8. Update Radar Minimap
    this.minimap.update(
      this.player,
      this.vehicles,
      [...this.police.policeUnits, ...this.police.policeOfficers],
      this.missions.beacons
    );

    // 9. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game on Page Load
window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
