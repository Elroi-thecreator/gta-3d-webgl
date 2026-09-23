// ==========================================
// GTA 3D - OPTIMIZED HIGH-FPS CITY & SHADERS
// ==========================================
class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.hydrants = [];
    this.roads = [];
    this.ramps = [];

    this.blockSize = 80;
    this.roadWidth = 20;
    this.gridWidth = 5;
    this.gridHeight = 5;

    this.initProceduralTextures();
    this.buildCity();
  }

  initProceduralTextures() {
    // 1. High-Performance Asphalt Road Texture
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 256;
    roadCanvas.height = 256;
    const rCtx = roadCanvas.getContext('2d');

    rCtx.fillStyle = '#1c2128';
    rCtx.fillRect(0, 0, 256, 256);

    // Double yellow center line
    rCtx.fillStyle = '#facc15';
    rCtx.fillRect(125, 0, 2, 256);
    rCtx.fillRect(129, 0, 2, 256);

    // White dashed lane markers
    rCtx.fillStyle = '#f1f5f9';
    for (let y = 0; y < 256; y += 32) {
      rCtx.fillRect(63, y, 2, 16);
      rCtx.fillRect(191, y, 2, 16);
    }

    this.roadTexture = new THREE.CanvasTexture(roadCanvas);
    this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;

    // 2. Concrete Sidewalk Paver Texture
    const walkCanvas = document.createElement('canvas');
    walkCanvas.width = 128;
    walkCanvas.height = 128;
    const wCtx = walkCanvas.getContext('2d');
    wCtx.fillStyle = '#64748b';
    wCtx.fillRect(0, 0, 128, 128);

    wCtx.strokeStyle = '#475569';
    wCtx.lineWidth = 2;
    for (let p = 0; p < 128; p += 32) {
      wCtx.beginPath();
      wCtx.moveTo(0, p);
      wCtx.lineTo(128, p);
      wCtx.stroke();
      wCtx.beginPath();
      wCtx.moveTo(p, 0);
      wCtx.lineTo(p, 128);
      wCtx.stroke();
    }
    this.sidewalkTexture = new THREE.CanvasTexture(walkCanvas);
    this.sidewalkTexture.wrapS = THREE.RepeatWrapping;
    this.sidewalkTexture.wrapT = THREE.RepeatWrapping;
    this.sidewalkTexture.repeat.set(4, 4);

    // 3. Optimized Skyscraper Window Grid Texture
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 256;
    winCanvas.height = 256;
    const bCtx = winCanvas.getContext('2d');
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 256, 256);

    for (let gx = 8; gx < 256; gx += 24) {
      for (let gy = 8; gy < 256; gy += 24) {
        const rand = Math.random();
        bCtx.fillStyle = rand > 0.5 ? (rand > 0.85 ? '#fef08a' : '#93c5fd') : '#1e293b';
        bCtx.fillRect(gx, gy, 16, 16);
      }
    }
    this.windowTexture = new THREE.CanvasTexture(winCanvas);
    this.windowTexture.wrapS = THREE.RepeatWrapping;
    this.windowTexture.wrapT = THREE.RepeatWrapping;
  }

  buildCity() {
    // Ground plane base
    const groundGeo = new THREE.PlaneGeometry(650, 650);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const halfGridX = (this.gridWidth * this.blockSize) / 2;
    const halfGridZ = (this.gridHeight * this.blockSize) / 2;

    for (let gx = 0; gx < this.gridWidth; gx++) {
      for (let gz = 0; gz < this.gridHeight; gz++) {
        const blockCenterX = gx * this.blockSize - halfGridX + this.blockSize / 2;
        const blockCenterZ = gz * this.blockSize - halfGridZ + this.blockSize / 2;
        this.buildCityBlock(blockCenterX, blockCenterZ, gx, gz);
      }
    }

    this.buildRoadNetwork(halfGridX, halfGridZ);
    this.buildStuntRamps();
  }

  buildCityBlock(cx, cz, gx, gz) {
    const lotSize = this.blockSize - this.roadWidth;
    const halfLot = lotSize / 2;

    // Sidewalk
    const sideGeo = new THREE.BoxGeometry(lotSize, 0.3, lotSize);
    const sideMat = new THREE.MeshStandardMaterial({
      map: this.sidewalkTexture,
      roughness: 0.8
    });
    const sidewalk = new THREE.Mesh(sideGeo, sideMat);
    sidewalk.position.set(cx, 0.15, cz);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    const styleIndex = (gx * 3 + gz * 7) % 6;

    if (styleIndex === 0) {
      this.buildSkyscraper(cx, cz, 55 + Math.random() * 20, 0x1e3a8a);
    } else if (styleIndex === 1) {
      this.buildStorefrontBlock(cx, cz, lotSize);
    } else if (styleIndex === 2) {
      this.buildApartmentBlock(cx, cz, lotSize);
    } else if (styleIndex === 3) {
      this.buildIndustrialBlock(cx, cz, lotSize);
    } else if (styleIndex === 4) {
      this.buildGasStation(cx, cz);
    } else {
      this.buildSkyscraper(cx - 12, cz - 12, 45, 0x0f766e);
      this.buildSkyscraper(cx + 12, cz + 12, 55, 0x1e293b);
      this.addPalmTree(cx - 14, cz + 14);
      this.addPalmTree(cx + 14, cz - 14);
    }

    this.addPerimeterProps(cx, cz, halfLot);
  }

  buildSkyscraper(x, z, height, colorHex) {
    const w = 26;
    const l = 26;

    const bGeo = new THREE.BoxGeometry(w, height, l);
    const winTex = this.windowTexture.clone();
    winTex.needsUpdate = true;
    winTex.repeat.set(2, height / 16);

    const bMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      map: winTex,
      roughness: 0.3,
      metalness: 0.6
    });

    const building = new THREE.Mesh(bGeo, bMat);
    building.position.set(x, height / 2 + 0.3, z);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);

    // Crown
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.04, 1.8, l * 1.04),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    crown.position.set(x, height + 1.2, z);
    this.scene.add(crown);

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: w, z: l }
    });
  }

  buildStorefrontBlock(cx, cz, lotSize) {
    const w = lotSize * 0.42;
    const l = lotSize * 0.85;
    const h = 10;

    [-lotSize * 0.23, lotSize * 0.23].forEach((offsetX, idx) => {
      const store = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, l),
        new THREE.MeshStandardMaterial({ color: idx === 0 ? 0x991b1b : 0x0f172a, roughness: 0.6 })
      );
      store.position.set(cx + offsetX, h / 2 + 0.3, cz);
      store.castShadow = true;
      this.scene.add(store);

      // Glass front
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.1, metalness: 0.8 });
      const shopWin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 3.5, 0.4), glassMat);
      shopWin.position.set(cx + offsetX, 2.2, cz - l * 0.51);
      this.scene.add(shopWin);

      // Neon Sign
      const signMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xef4444 : 0x38bdf8 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 1.5, 0.4), signMat);
      sign.position.set(cx + offsetX, h - 1.2, cz - l * 0.52);
      this.scene.add(sign);

      this.obstacles.push({
        position: new THREE.Vector3(cx + offsetX, 0, cz),
        collisionSize: { x: w, z: l }
      });
    });
  }

  buildApartmentBlock(cx, cz, lotSize) {
    const w = lotSize * 0.75;
    const l = lotSize * 0.75;
    const h = 22;

    const winTex = this.windowTexture.clone();
    winTex.needsUpdate = true;
    winTex.repeat.set(3, 3);

    const apt = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, l),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, map: winTex, roughness: 0.8 })
    );
    apt.position.set(cx, h / 2 + 0.3, cz);
    apt.castShadow = true;
    this.scene.add(apt);

    this.obstacles.push({
      position: new THREE.Vector3(cx, 0, cz),
      collisionSize: { x: w, z: l }
    });
  }

  buildIndustrialBlock(cx, cz, lotSize) {
    const w = lotSize * 0.8;
    const l = lotSize * 0.5;
    const h = 9;

    const warehouse = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, l),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 })
    );
    warehouse.position.set(cx, h / 2 + 0.3, cz - 10);
    warehouse.castShadow = true;
    this.scene.add(warehouse);

    this.obstacles.push({
      position: warehouse.position,
      collisionSize: { x: w, z: l }
    });

    const colors = [0xd97706, 0x2563eb, 0x16a34a, 0x991b1b];
    for (let i = 0; i < 4; i++) {
      const cont = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 3.4, 8.5),
        new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5, metalness: 0.4 })
      );
      cont.position.set(cx - 12 + i * 5.5, 1.9, cz + 16);
      cont.castShadow = true;
      this.scene.add(cont);

      this.obstacles.push({
        position: cont.position,
        collisionSize: { x: 3.6, z: 8.5 }
      });
    }
  }

  buildGasStation(cx, cz) {
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.9, 18),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 })
    );
    canopy.position.set(cx, 5.8, cz - 4);
    canopy.castShadow = true;
    this.scene.add(canopy);

    [[-9, -9], [9, -9], [-9, 1], [9, 1]].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 5.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9 })
      );
      pil.position.set(cx + px, 2.9, cz + pz);
      this.scene.add(pil);
      this.obstacles.push({ position: pil.position, collisionSize: { x: 1, z: 1 } });
    });

    const store = new THREE.Mesh(
      new THREE.BoxGeometry(20, 5.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
    );
    store.position.set(cx, 2.9, cz + 15);
    store.castShadow = true;
    this.scene.add(store);

    this.obstacles.push({
      position: store.position,
      collisionSize: { x: 20, z: 12 }
    });
  }

  buildRoadNetwork(halfX, halfZ) {
    for (let gx = 0; gx <= this.gridWidth; gx++) {
      const rx = gx * this.blockSize - halfX;
      const roadGeo = new THREE.PlaneGeometry(this.roadWidth, halfZ * 2 + 50);

      const rTex = this.roadTexture.clone();
      rTex.needsUpdate = true;
      rTex.repeat.set(1, (halfZ * 2 + 50) / 20);

      const road = new THREE.Mesh(
        roadGeo,
        new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.85 })
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, 0.03, 0);
      road.receiveShadow = true;
      this.scene.add(road);
    }

    for (let gz = 0; gz <= this.gridHeight; gz++) {
      const rz = gz * this.blockSize - halfZ;
      const roadGeo = new THREE.PlaneGeometry(halfX * 2 + 50, this.roadWidth);

      const rTex = this.roadTexture.clone();
      rTex.needsUpdate = true;
      rTex.repeat.set((halfX * 2 + 50) / 20, 1);

      const road = new THREE.Mesh(
        roadGeo,
        new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.85 })
      );
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = Math.PI / 2;
      road.position.set(0, 0.04, rz);
      road.receiveShadow = true;
      this.scene.add(road);
    }
  }

  addPerimeterProps(cx, cz, halfLot) {
    const corners = [
      [cx - halfLot + 2.5, cz - halfLot + 2.5],
      [cx + halfLot - 2.5, cz - halfLot + 2.5],
      [cx - halfLot + 2.5, cz + halfLot - 2.5],
      [cx + halfLot - 2.5, cz + halfLot - 2.5]
    ];

    corners.forEach(([lx, lz]) => {
      this.addStreetLamp(lx, lz);
    });

    this.addFireHydrant(cx - halfLot + 2.5, cz + halfLot - 4.5);
  }

  addStreetLamp(x, z) {
    // Fast lightweight lamp without heavy dynamic spotlight
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 6.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 })
    );
    pole.position.set(x, 3.4, z);
    this.scene.add(pole);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff5cc })
    );
    bulb.position.set(x, 6.9, z);
    this.scene.add(bulb);

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: 0.6, z: 0.6 }
    });
  }

  addFireHydrant(x, z) {
    const hydrant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.28, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
    );
    hydrant.position.set(x, 0.45, z);
    this.scene.add(hydrant);

    this.hydrants.push({
      mesh: hydrant,
      position: new THREE.Vector3(x, 0.45, z),
      isBroken: false
    });

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: 0.6, z: 0.6 }
    });
  }

  addPalmTree(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.48, 7.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
    );
    trunk.position.set(x, 3.75, z);
    this.scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(4.0, 2.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 })
    );
    leaves.position.set(x, 8.2, z);
    this.scene.add(leaves);

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: 0.8, z: 0.8 }
    });
  }

  buildStuntRamps() {
    const rampLocations = [
      { x: -40, z: 40, rot: 0 },
      { x: 40, z: -40, rot: Math.PI / 2 }
    ];

    rampLocations.forEach(loc => {
      const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 3.0, 11),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
      );
      ramp.position.set(loc.x, 1.5, loc.z);
      ramp.rotation.y = loc.rot;
      ramp.rotation.x = -0.27;
      ramp.receiveShadow = true;
      this.scene.add(ramp);
      this.ramps.push(ramp);
    });
  }
}
