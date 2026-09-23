// ==========================================
// GTA 3D - ROTATING GPS RADAR MINIMAP
// ==========================================
class MiniMap {
  constructor(canvasId, cityBuilder) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.city = cityBuilder;

    this.scale = 0.55; // Pixels per world meter
    this.radarRadius = this.canvas.width / 2;

    this.districtEl = document.getElementById('district-label');
  }

  update(player, vehicles = [], cops = [], beacons = []) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = this.radarRadius;

    ctx.clearRect(0, 0, w, h);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();

    // Radar background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Transform coordinate system centered on player, rotated with heading
    const pX = player.position.x;
    const pZ = player.position.z;
    const heading = player.rotation;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(heading); // Rotate world around player

    // Draw Roads
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = this.city.roadWidth * this.scale;

    const halfX = (this.city.gridWidth * this.city.blockSize) / 2;
    const halfZ = (this.city.gridHeight * this.city.blockSize) / 2;

    // North-South Avenues
    for (let gx = 0; gx <= this.city.gridWidth; gx++) {
      const rx = (gx * this.city.blockSize - halfX - pX) * this.scale;
      ctx.beginPath();
      ctx.moveTo(rx, (-halfZ - pZ) * this.scale);
      ctx.lineTo(rx, (halfZ - pZ) * this.scale);
      ctx.stroke();
    }

    // East-West Streets
    for (let gz = 0; gz <= this.city.gridHeight; gz++) {
      const rz = (gz * this.city.blockSize - halfZ - pZ) * this.scale;
      ctx.beginPath();
      ctx.moveTo((-halfX - pX) * this.scale, rz);
      ctx.lineTo((halfX - pX) * this.scale, rz);
      ctx.stroke();
    }

    // Draw Building Lots
    ctx.fillStyle = '#1e293b';
    for (const obs of this.city.obstacles) {
      if (!obs.collisionSize || obs.collisionSize.x < 3) continue;
      const ox = (obs.position.x - pX) * this.scale;
      const oz = (obs.position.z - pZ) * this.scale;
      const bw = obs.collisionSize.x * this.scale;
      const bl = obs.collisionSize.z * this.scale;
      ctx.fillRect(ox - bw / 2, oz - bl / 2, bw, bl);
    }

    // Draw Ambient Vehicles (Gray/White blips)
    ctx.fillStyle = '#e2e8f0';
    for (const v of vehicles) {
      if (v === player.currentVehicle || v.isPolice || v.isDestroyed) continue;
      const vx = (v.position.x - pX) * this.scale;
      const vz = (v.position.z - pZ) * this.scale;
      ctx.fillRect(vx - 2, vz - 2, 4, 4);
    }

    // Draw Police Units (Flashing Red/Blue Blips)
    const flash = Math.floor(performance.now() / 250) % 2 === 0;
    ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
    for (const c of cops) {
      if (!c.isDestroyed) {
        const cxPos = (c.position.x - pX) * this.scale;
        const czPos = (c.position.z - pZ) * this.scale;
        ctx.beginPath();
        ctx.arc(cxPos, czPos, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Mission Markers (Bright Yellow / Cyan Squares)
    ctx.fillStyle = '#facc15';
    for (const b of beacons) {
      const bx = (b.pos.x - pX) * this.scale;
      const bz = (b.pos.z - pZ) * this.scale;
      ctx.fillRect(bx - 4, bz - 4, 8, 8);
    }

    ctx.restore(); // Restore rotation & translation

    // Radar distance rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    [r * 0.4, r * 0.75].forEach(radius => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Player Heading Pointer Chevron (Centered)
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // Restore clip

    // Update district name based on coords
    this.updateDistrictName(pX, pZ);
  }

  updateDistrictName(x, z) {
    let name = "Downtown Ocean Ave";
    if (x < -50 && z < -50) name = "Industrial Docks";
    else if (x > 50 && z < -50) name = "Little Haiti Hub";
    else if (x < -50 && z > 50) name = "Starfish Island";
    else if (x > 50 && z > 50) name = "Financial Plaza";
    else if (Math.abs(x) < 30 && Math.abs(z) < 30) name = "Vice Point Central";

    if (this.districtEl && this.districtEl.innerText !== name) {
      this.districtEl.innerText = name;
    }
  }
}
