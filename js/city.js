// ==========================================
// GTA 3D - REALISTIC OPEN WORLD CITY & SHADERS
// ==========================================
class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.hydrants = [];
    this.streetLamps = [];
    this.roads = [];
    this.ramps = [];

    this.blockSize = 80;
    this.roadWidth = 20;
    this.gridWidth = 5;
    this.gridHeight = 5;

    // Generate procedural canvas textures for realism
    this.initProceduralTextures();
    this.buildCity();
  }

  initProceduralTextures() {
    // 1. Realistic Asphalt Road Texture (with noise, double yellow center line, white lane dashes)
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 512;
    const rCtx = roadCanvas.getContext('2d');

    // Dark asphalt base with grain
    rCtx.fillStyle = '#1e232a';
    rCtx.fillRect(0, 0, 512, 512);

    // Asphalt noise grain
    const imgData = rCtx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    rCtx.putImageData(imgData, 0, 0);

    // Double yellow center line
    rCtx.fillStyle = '#eab308';
    rCtx.fillRect(250, 0, 4, 512);
    rCtx.fillRect(258, 0, 4, 512);

    // White dashed lane markers
    rCtx.fillStyle = '#f8fafc';
    for (let y = 0; y < 512; y += 48) {
      rCtx.fillRect(126, y, 4, 28);
      rCtx.fillRect(382, y, 4, 28);
    }

    this.roadTexture = new THREE.CanvasTexture(roadCanvas);
    this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;

    // 2. Concrete Sidewalk Paver Texture
    const walkCanvas = document.createElement('canvas');
    walkCanvas.width = 256;
    walkCanvas.height = 256;
    const wCtx = walkCanvas.getContext('2d');
    wCtx.fillStyle = '#64748b';
    wCtx.fillRect(0, 0, 256, 256);

    // Paver grid grooves
    wCtx.strokeStyle = '#475569';
    wCtx.lineWidth = 3;
    for (let p = 0; p < 256; p += 64) {
      wCtx.beginPath();
      wCtx.moveTo(0, p);
      wCtx.lineTo(256, p);
      wCtx.stroke();
      wCtx.beginPath();
      wCtx.moveTo(p, 0);
      wCtx.lineTo(p, 256);
      wCtx.stroke();
    }
    this.sidewalkTexture = new THREE.CanvasTexture(walkCanvas);
    this.sidewalkTexture.wrapS = THREE.RepeatWrapping;
    this.sidewalkTexture.wrapT = THREE.RepeatWrapping;
    this.sidewalkTexture.repeat.set(6, 6);

    // 3. Realistic Skyscraper Window Grid Texture
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 512;
    winCanvas.height = 512;
    const bCtx = winCanvas.getContext('2d');
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 512, 512);

    for (let gx = 16; gx < 512; gx += 48) {
      for (let gy = 16; gy < 512; gy += 48) {
        const rand = Math.random();
        if (rand > 0.45) {
          // Warm glowing lit office window
          bCtx.fillStyle = rand > 0.85 ? '#fef08a' : '#93c5fd';
        } else {
          // Dark reflective window
          bCtx.fillStyle = '#1e293b';
        }
        bCtx.fillRect(gx, gy, 32, 32);
        // Window frame
        bCtx.strokeStyle = '#334155';
        bCtx.lineWidth = 2;
        bCtx.strokeRect(gx, gy, 32, 32);
      }
    }
    this.windowTexture = new THREE.CanvasTexture(winCanvas);
    this.windowTexture.wrapS = THREE.RepeatWrapping;
    this.windowTexture.wrapT = THREE.RepeatWrapping;
  }

  buildCity() {
    // Ground plane base with dark asphalt
    const groundGeo = new THREE.PlaneGeometry(650, 650);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 });
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

    // Concrete sidewalk base with curb height
    const sideGeo = new THREE.BoxGeometry(lotSize, 0.35, lotSize);
    const sideMat = new THREE.MeshStandardMaterial({
      map: this.sidewalkTexture,
      roughness: 0.8
    });
    const sidewalk = new THREE.Mesh(sideGeo, sideMat);
    sidewalk.position.set(cx, 0.175, cz);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    // Curb edge borders (dark stone)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const curbNorth = new THREE.Mesh(new THREE.BoxGeometry(lotSize, 0.4, 0.4), curbMat);
    curbNorth.position.set(cx, 0.2, cz + halfLot);
    this.scene.add(curbNorth);

    const curbSouth = new THREE.Mesh(new THREE.BoxGeometry(lotSize, 0.4, 0.4), curbMat);
    curbSouth.position.set(cx, 0.2, cz - halfLot);
    this.scene.add(curbSouth);

    const styleIndex = (gx * 3 + gz * 7) % 6;

    if (styleIndex === 0) {
      this.buildSkyscraper(cx, cz, 55 + Math.random() * 25, 0x1e3a8a);
    } else if (styleIndex === 1) {
      this.buildStorefrontBlock(cx, cz, lotSize);
    } else if (styleIndex === 2) {
      this.buildApartmentBlock(cx, cz, lotSize);
    } else if (styleIndex === 3) {
      this.buildIndustrialBlock(cx, cz, lotSize);
    } else if (styleIndex === 4) {
      this.buildGasStation(cx, cz);
    } else {
      this.buildSkyscraper(cx - 12, cz - 12, 42, 0x0f766e);
      this.buildSkyscraper(cx + 12, cz + 12, 58, 0x1e293b);
      this.addPalmTree(cx - 14, cz + 14);
      this.addPalmTree(cx + 14, cz - 14);
    }

    this.addPerimeterProps(cx, cz, halfLot);
  }

  buildSkyscraper(x, z, height, colorHex) {
    const w = 26 + Math.random() * 6;
    const l = 26 + Math.random() * 6;

    const bGeo = new THREE.BoxGeometry(w, height, l);
    const winTex = this.windowTexture.clone();
    winTex.needsUpdate = true;
    winTex.repeat.set(w / 8, height / 10);

    const bMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      map: winTex,
      roughness: 0.25,
      metalness: 0.7
    });

    const building = new THREE.Mesh(bGeo, bMat);
    building.position.set(x, height / 2 + 0.35, z);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);

    // Architectural crown / cornice
    const crownGeo = new THREE.BoxGeometry(w * 1.05, 1.8, l * 1.05);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(x, height + 1.25, z);
    this.scene.add(crown);

    // Rooftop Antenna / Satellite
    const antGeo = new THREE.CylinderGeometry(0.1, 0.2, 8, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(x, height + 6.0, z);
    this.scene.add(ant);

    // Red warning beacon on antenna tip
    const redLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    redLight.position.set(x, height + 10.0, z);
    this.scene.add(redLight);

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: w, z: l }
    });
  }

  buildStorefrontBlock(cx, cz, lotSize) {
    const w = lotSize * 0.44;
    const l = lotSize * 0.88;
    const h = 10;

    [-lotSize * 0.23, lotSize * 0.23].forEach((offsetX, idx) => {
      const bGeo = new THREE.BoxGeometry(w, h, l);
      const bMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x991b1b : 0x0f172a,
        roughness: 0.6
      });
      const store = new THREE.Mesh(bGeo, bMat);
      store.position.set(cx + offsetX, h / 2 + 0.35, cz);
      store.castShadow = true;
      this.scene.add(store);

      // Large Glass Shop Window at ground
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85
      });
      const shopWin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 3.8, 0.4), glassMat);
      shopWin.position.set(cx + offsetX, 2.3, cz - l * 0.51);
      this.scene.add(shopWin);

      // Glowing Storefront Neon Sign (Ammu-Nation / Burger Shot)
      const signText = idx === 0 ? 'AMMU-NATION' : 'BURGER SHOT';
      const signGeo = new THREE.BoxGeometry(w * 0.75, 1.6, 0.5);
      const signMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xef4444 : 0x38bdf8
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(cx + offsetX, h - 1.2, cz - l * 0.52);
      this.scene.add(sign);

      this.obstacles.push({
        position: new THREE.Vector3(cx + offsetX, 0, cz),
        collisionSize: { x: w, z: l }
      });
    });
  }

  buildApartmentBlock(cx, cz, lotSize) {
    const w = lotSize * 0.78;
    const l = lotSize * 0.78;
    const h = 22;

    const bGeo = new THREE.BoxGeometry(w, h, l);
    const winTex = this.windowTexture.clone();
    winTex.needsUpdate = true;
    winTex.repeat.set(4, 4);

    const bMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d, // Red brick
      map: winTex,
      roughness: 0.8
    });
    const apt = new THREE.Mesh(bGeo, bMat);
    apt.position.set(cx, h / 2 + 0.35, cz);
    apt.castShadow = true;
    this.scene.add(apt);

    // Balconies
    for (let floor = 1; floor <= 4; floor++) {
      const balGeo = new THREE.BoxGeometry(w * 0.85, 0.7, 1.4);
      const balMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 });
      const bal = new THREE.Mesh(balGeo, balMat);
      bal.position.set(cx, floor * 4.6, cz + l * 0.5 + 0.7);
      this.scene.add(bal);
    }

    this.obstacles.push({
      position: new THREE.Vector3(cx, 0, cz),
      collisionSize: { x: w, z: l }
    });
  }

  buildIndustrialBlock(cx, cz, lotSize) {
    const w = lotSize * 0.82;
    const l = lotSize * 0.52;
    const h = 9;

    const bGeo = new THREE.BoxGeometry(w, h, l);
    const bMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
    const warehouse = new THREE.Mesh(bGeo, bMat);
    warehouse.position.set(cx, h / 2 + 0.35, cz - 10);
    warehouse.castShadow = true;
    this.scene.add(warehouse);

    this.obstacles.push({
      position: warehouse.position,
      collisionSize: { x: w, z: l }
    });

    // Detailed shipping containers
    const colors = [0xd97706, 0x2563eb, 0x16a34a, 0x991b1b];
    for (let i = 0; i < 4; i++) {
      const cGeo = new THREE.BoxGeometry(3.6, 3.4, 8.5);
      const cMat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5, metalness: 0.5 });
      const cont = new THREE.Mesh(cGeo, cMat);
      cont.position.set(cx - 12 + i * 5.5, 2.0, cz + 16);
      cont.castShadow = true;
      this.scene.add(cont);

      this.obstacles.push({
        position: cont.position,
        collisionSize: { x: 3.6, z: 8.5 }
      });
    }
  }

  buildGasStation(cx, cz) {
    const canGeo = new THREE.BoxGeometry(24, 0.9, 18);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });
    const canopy = new THREE.Mesh(canGeo, canMat);
    canopy.position.set(cx, 6.0, cz - 4);
    canopy.castShadow = true;
    this.scene.add(canopy);

    [[-9, -9], [9, -9], [-9, 1], [9, 1]].forEach(([px, pz]) => {
      const pil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 6.0, 12),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.5 })
      );
      pil.position.set(cx + px, 3.0, cz + pz);
      this.scene.add(pil);
      this.obstacles.push({ position: pil.position, collisionSize: { x: 1, z: 1 } });
    });

    const store = new THREE.Mesh(
      new THREE.BoxGeometry(20, 5.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
    );
    store.position.set(cx, 3.0, cz + 15);
    store.castShadow = true;
    this.scene.add(store);

    this.obstacles.push({
      position: store.position,
      collisionSize: { x: 20, z: 12 }
    });
  }

  buildRoadNetwork(halfX, halfZ) {
    // North-South Avenues
    for (let gx = 0; gx <= this.gridWidth; gx++) {
      const rx = gx * this.blockSize - halfX;
      const roadGeo = new THREE.PlaneGeometry(this.roadWidth, halfZ * 2 + 50);

      const rTex = this.roadTexture.clone();
      rTex.needsUpdate = true;
      rTex.repeat.set(1, (halfZ * 2 + 50) / 25);

      const roadMat = new THREE.MeshStandardMaterial({
        map: rTex,
        roughness: 0.85
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, 0.03, 0);
      road.receiveShadow = true;
      this.scene.add(road);
    }

    // East-West Streets
    for (let gz = 0; gz <= this.gridHeight; gz++) {
      const rz = gz * this.blockSize - halfZ;
      const roadGeo = new THREE.PlaneGeometry(halfX * 2 + 50, this.roadWidth);

      const rTex = this.roadTexture.clone();
      rTex.needsUpdate = true;
      rTex.repeat.set((halfX * 2 + 50) / 25, 1);

      const roadMat = new THREE.MeshStandardMaterial({
        map: rTex,
        roughness: 0.85
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
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
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.0, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3.5, z);
    pole.castShadow = true;
    this.scene.add(pole);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff5cc })
    );
    bulb.position.set(x, 7.1, z);
    this.scene.add(bulb);

    const spot = new THREE.SpotLight(0xfff3b0, 2.2, 30, Math.PI / 3.5, 0.5);
    spot.position.set(x, 7.0, z);
    spot.target.position.set(x, 0, z);
    this.scene.add(spot);
    this.scene.add(spot.target);
    this.streetLamps.push(spot);

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: 0.6, z: 0.6 }
    });
  }

  addFireHydrant(x, z) {
    const hGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.9, 10);
    const hMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const hydrant = new THREE.Mesh(hGeo, hMat);
    hydrant.position.set(x, 0.45, z);
    hydrant.castShadow = true;
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
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 8.0, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 4.0, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(4.2, 3.0, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 8.8, z);
    leaves.castShadow = true;
    this.scene.add(leaves);

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: 0.8, z: 0.8 }
    });
  }

  buildStuntRamps() {
    const rampLocations = [
      { x: -35, z: 45, rot: 0 },
      { x: 45, z: -35, rot: Math.PI / 2 },
      { x: -75, z: -75, rot: Math.PI / 4 }
    ];

    rampLocations.forEach(loc => {
      const rGeo = new THREE.BoxGeometry(6.5, 3.0, 11);
      const rMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      const ramp = new THREE.Mesh(rGeo, rMat);
      ramp.position.set(loc.x, 1.5, loc.z);
      ramp.rotation.y = loc.rot;
      ramp.rotation.x = -0.27;
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      this.scene.add(ramp);
      this.ramps.push(ramp);
    });
  }
}
