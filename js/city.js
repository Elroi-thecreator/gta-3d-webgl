// ==========================================
// GTA 3D - OPEN WORLD CITY & ENVIRONMENT
// ==========================================
class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.hydrants = [];
    this.streetLamps = [];
    this.roads = [];
    this.ramps = [];

    this.blockSize = 75; // Size of each city block
    this.roadWidth = 18;  // 4-lane avenue width
    this.gridWidth = 5;   // 5x5 city grid blocks
    this.gridHeight = 5;

    this.buildCity();
  }

  buildCity() {
    // Ground plane base
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Build grid blocks and roads
    const halfGridX = (this.gridWidth * this.blockSize) / 2;
    const halfGridZ = (this.gridHeight * this.blockSize) / 2;

    for (let gx = 0; gx < this.gridWidth; gx++) {
      for (let gz = 0; gz < this.gridHeight; gz++) {
        const blockCenterX = gx * this.blockSize - halfGridX + this.blockSize / 2;
        const blockCenterZ = gz * this.blockSize - halfGridZ + this.blockSize / 2;

        this.buildCityBlock(blockCenterX, blockCenterZ, gx, gz);
      }
    }

    // Build road network across the grid
    this.buildRoadNetwork(halfGridX, halfGridZ);

    // Build stunt ramps
    this.buildStuntRamps();
  }

  buildCityBlock(cx, cz, gx, gz) {
    const lotSize = this.blockSize - this.roadWidth;
    const halfLot = lotSize / 2;

    // Concrete sidewalk base
    const sideGeo = new THREE.BoxGeometry(lotSize, 0.25, lotSize);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.85 });
    const sidewalk = new THREE.Mesh(sideGeo, sideMat);
    sidewalk.position.set(cx, 0.125, cz);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    // Decide building type based on block coordinates
    const styleIndex = (gx * 3 + gz * 7) % 6;

    if (styleIndex === 0) {
      // Skyscraper Plaza
      this.buildSkyscraper(cx, cz, 40 + Math.random() * 30, 0x1e3a8a, true);
    } else if (styleIndex === 1) {
      // Commercial Hub: Ammu-Nation & Stores
      this.buildStorefrontBlock(cx, cz, lotSize);
    } else if (styleIndex === 2) {
      // Brick Apartment Complex
      this.buildApartmentBlock(cx, cz, lotSize);
    } else if (styleIndex === 3) {
      // Industrial Warehouse / Docks
      this.buildIndustrialBlock(cx, cz, lotSize);
    } else if (styleIndex === 4) {
      // Gas Station & Mini Mart
      this.buildGasStation(cx, cz);
    } else {
      // Twin Towers & Park
      this.buildSkyscraper(cx - 10, cz - 10, 35, 0x0f766e, true);
      this.buildSkyscraper(cx + 10, cz + 10, 45, 0x374151, true);
      this.addPalmTree(cx - 12, cz + 12);
      this.addPalmTree(cx + 12, cz - 12);
    }

    // Add perimeter street lamps, hydrants, trees
    this.addPerimeterProps(cx, cz, halfLot);
  }

  buildSkyscraper(x, z, height, colorHex, litWindows = true) {
    const w = 24 + Math.random() * 6;
    const l = 24 + Math.random() * 6;

    const bGeo = new THREE.BoxGeometry(w, height, l);
    const bMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.5
    });
    const building = new THREE.Mesh(bGeo, bMat);
    building.position.set(x, height / 2 + 0.25, z);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);

    // Glowing window strips
    if (litWindows) {
      const winGeo = new THREE.BoxGeometry(w * 1.01, height * 0.85, l * 1.01);
      const winMat = new THREE.MeshBasicMaterial({
        color: 0xfff3c4,
        transparent: true,
        opacity: 0.25
      });
      const windows = new THREE.Mesh(winGeo, winMat);
      windows.position.copy(building.position);
      this.scene.add(windows);
    }

    // Rooftop helipad / AC units
    const acGeo = new THREE.BoxGeometry(4, 2, 4);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const ac = new THREE.Mesh(acGeo, acMat);
    ac.position.set(x, height + 1.25, z);
    this.scene.add(ac);

    // Register obstacle
    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: w, z: l }
    });
  }

  buildStorefrontBlock(cx, cz, lotSize) {
    // 2 Strip-mall style buildings
    const w = lotSize * 0.42;
    const l = lotSize * 0.85;
    const h = 9;

    [-lotSize * 0.22, lotSize * 0.22].forEach((offsetX, idx) => {
      const bGeo = new THREE.BoxGeometry(w, h, l);
      const bMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x991b1b : 0x1e293b,
        roughness: 0.7
      });
      const store = new THREE.Mesh(bGeo, bMat);
      store.position.set(cx + offsetX, h / 2 + 0.25, cz);
      store.castShadow = true;
      this.scene.add(store);

      // Neon Sign
      const signGeo = new THREE.BoxGeometry(w * 0.8, 1.8, 0.4);
      const signMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xef4444 : 0x38bdf8
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(cx + offsetX, h - 1.0, cz - l * 0.52);
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
    const h = 18;

    const bGeo = new THREE.BoxGeometry(w, h, l);
    const bMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 }); // Red brick
    const apt = new THREE.Mesh(bGeo, bMat);
    apt.position.set(cx, h / 2 + 0.25, cz);
    apt.castShadow = true;
    this.scene.add(apt);

    // Balconies
    for (let floor = 1; floor <= 3; floor++) {
      const balGeo = new THREE.BoxGeometry(w * 0.85, 0.6, 1.2);
      const balMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 });
      const bal = new THREE.Mesh(balGeo, balMat);
      bal.position.set(cx, floor * 4.5, cz + l * 0.5 + 0.6);
      this.scene.add(bal);
    }

    this.obstacles.push({
      position: new THREE.Vector3(cx, 0, cz),
      collisionSize: { x: w, z: l }
    });
  }

  buildIndustrialBlock(cx, cz, lotSize) {
    // Metal warehouse
    const w = lotSize * 0.8;
    const l = lotSize * 0.5;
    const h = 8;

    const bGeo = new THREE.BoxGeometry(w, h, l);
    const bMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
    const warehouse = new THREE.Mesh(bGeo, bMat);
    warehouse.position.set(cx, h / 2 + 0.25, cz - 8);
    warehouse.castShadow = true;
    this.scene.add(warehouse);

    this.obstacles.push({
      position: warehouse.position,
      collisionSize: { x: w, z: l }
    });

    // Shipping containers
    const colors = [0xd97706, 0x2563eb, 0x16a34a];
    for (let i = 0; i < 3; i++) {
      const cGeo = new THREE.BoxGeometry(3.5, 3.2, 8);
      const cMat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5 });
      const cont = new THREE.Mesh(cGeo, cMat);
      cont.position.set(cx - 10 + i * 5, 1.85, cz + 14);
      cont.castShadow = true;
      this.scene.add(cont);

      this.obstacles.push({
        position: cont.position,
        collisionSize: { x: 3.5, z: 8 }
      });
    }
  }

  buildGasStation(cx, cz) {
    // Fuel pump canopy
    const canGeo = new THREE.BoxGeometry(22, 0.8, 16);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 }); // Green VP gas
    const canopy = new THREE.Mesh(canGeo, canMat);
    canopy.position.set(cx, 5.5, cz - 4);
    canopy.castShadow = true;
    this.scene.add(canopy);

    // Support pillars
    [[-8, -8], [8, -8], [-8, 0], [8, 0]].forEach(([px, pz]) => {
      const pilGeo = new THREE.CylinderGeometry(0.4, 0.4, 5.5, 8);
      const pilMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
      const pil = new THREE.Mesh(pilGeo, pilMat);
      pil.position.set(cx + px, 2.75, cz + pz);
      this.scene.add(pil);
      this.obstacles.push({ position: pil.position, collisionSize: { x: 1, z: 1 } });
    });

    // Convenience store
    const storeGeo = new THREE.BoxGeometry(18, 5, 10);
    const storeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const store = new THREE.Mesh(storeGeo, storeMat);
    store.position.set(cx, 2.75, cz + 14);
    store.castShadow = true;
    this.scene.add(store);

    this.obstacles.push({
      position: store.position,
      collisionSize: { x: 18, z: 10 }
    });
  }

  buildRoadNetwork(halfX, halfZ) {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.95 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Yellow stripes
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White lane dashes

    // Avenues running North-South
    for (let gx = 0; gx <= this.gridWidth; gx++) {
      const rx = gx * this.blockSize - halfX;
      const roadGeo = new THREE.PlaneGeometry(this.roadWidth, halfZ * 2 + 50);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, 0.02, 0);
      road.receiveShadow = true;
      this.scene.add(road);

      // Yellow Centerline
      const lineGeo = new THREE.PlaneGeometry(0.3, halfZ * 2 + 50);
      const line = new THREE.Mesh(lineGeo, stripeMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(rx, 0.03, 0);
      this.scene.add(line);
    }

    // Streets running East-West
    for (let gz = 0; gz <= this.gridHeight; gz++) {
      const rz = gz * this.blockSize - halfZ;
      const roadGeo = new THREE.PlaneGeometry(halfX * 2 + 50, this.roadWidth);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, rz);
      road.receiveShadow = true;
      this.scene.add(road);

      // Yellow Centerline
      const lineGeo = new THREE.PlaneGeometry(halfX * 2 + 50, 0.3);
      const line = new THREE.Mesh(lineGeo, stripeMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.03, rz);
      this.scene.add(line);
    }
  }

  addPerimeterProps(cx, cz, halfLot) {
    // Street lamps on corners
    const corners = [
      [cx - halfLot + 2, cz - halfLot + 2],
      [cx + halfLot - 2, cz - halfLot + 2],
      [cx - halfLot + 2, cz + halfLot - 2],
      [cx + halfLot - 2, cz + halfLot - 2]
    ];

    corners.forEach(([lx, lz]) => {
      this.addStreetLamp(lx, lz);
    });

    // Fire hydrant on one corner
    this.addFireHydrant(cx - halfLot + 2, cz + halfLot - 4);
  }

  addStreetLamp(x, z) {
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.14, 6.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3.25, z);
    pole.castShadow = true;
    this.scene.add(pole);

    // Lamp arm & bulb
    const bulbGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff5cc });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(x, 6.6, z);
    this.scene.add(bulb);

    // Night spotlight
    const spot = new THREE.SpotLight(0xfff3b0, 1.8, 25, Math.PI / 4, 0.5);
    spot.position.set(x, 6.5, z);
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
    const hGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.85, 8);
    const hMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 }); // Bright red
    const hydrant = new THREE.Mesh(hGeo, hMat);
    hydrant.position.set(x, 0.42, z);
    hydrant.castShadow = true;
    this.scene.add(hydrant);

    this.hydrants.push({
      mesh: hydrant,
      position: new THREE.Vector3(x, 0.42, z),
      isBroken: false,
      waterParticles: []
    });

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: 0.6, z: 0.6 }
    });
  }

  addPalmTree(x, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 7, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.castShadow = true;
    this.scene.add(trunk);

    // Palm fronds
    const leavesGeo = new THREE.ConeGeometry(3.5, 2.5, 6);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 7.5, z);
    leaves.castShadow = true;
    this.scene.add(leaves);

    this.obstacles.push({
      position: new THREE.Vector3(x, 0, z),
      collisionSize: { x: 0.8, z: 0.8 }
    });
  }

  buildStuntRamps() {
    // 3 Insane Stunt Ramps in the city
    const rampLocations = [
      { x: -35, z: 45, rot: 0 },
      { x: 45, z: -35, rot: Math.PI / 2 },
      { x: -75, z: -75, rot: Math.PI / 4 }
    ];

    rampLocations.forEach(loc => {
      const rGeo = new THREE.BoxGeometry(6, 2.8, 10);
      const rMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 }); // Yellow stunt ramp
      const ramp = new THREE.Mesh(rGeo, rMat);
      ramp.position.set(loc.x, 1.4, loc.z);
      ramp.rotation.y = loc.rot;
      ramp.rotation.x = -0.26; // Inclined slope
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      this.scene.add(ramp);
      this.ramps.push(ramp);
    });
  }

  checkHydrantCollision(pos) {
    for (const h of this.hydrants) {
      if (!h.isBroken && h.position.distanceTo(pos) < 1.6) {
        h.isBroken = true;
        // Water fountain geyser
        this.triggerWaterFountain(h);
      }
    }
  }

  triggerWaterFountain(h) {
    const geo = new THREE.CylinderGeometry(0.3, 0.8, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7
    });
    const water = new THREE.Mesh(geo, mat);
    water.position.set(h.position.x, 4.0, h.position.z);
    this.scene.add(water);
  }
}
