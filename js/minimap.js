// ==========================================
// GTA 5 - RECTANGULAR GPS RADAR SYSTEM
// ==========================================
class MiniMap {
  constructor(canvasId, cityBuilder) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.city = cityBuilder;

    this.scale = 0.52; // Pixels per world meter
    this.districtEl = document.getElementById('district-label');
    this.radarFrame = document.getElementById('radar-frame');
  }

  update(player, vehicles = [], cops = [], beacons = []) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Dark GPS background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const pX = player.position.x;
    const pZ = player.position.z;
    const heading = player.rotation;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(heading);

    // Draw Roads (Los Santos Avenues)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = this.city.roadWidth * this.scale;

    const halfX = (this.city.gridWidth * this.city.blockSize) / 2;
    const halfZ = (this.city.gridHeight * this.city.blockSize) / 2;

    for (let gx = 0; gx <= this.city.gridWidth; gx++) {
      const rx = (gx * this.city.blockSize - halfX - pX) * this.scale;
      ctx.beginPath();
      ctx.moveTo(rx, (-halfZ - pZ) * this.scale);
      ctx.lineTo(rx, (halfZ - pZ) * this.scale);
      ctx.stroke();
    }

    for (let gz = 0; gz <= this.city.gridHeight; gz++) {
      const rz = (gz * this.city.blockSize - halfZ - pZ) * this.scale;
      ctx.beginPath();
      ctx.moveTo((-halfX - pX) * this.scale, rz);
      ctx.lineTo((halfX - pX) * this.scale, rz);
      ctx.stroke();
    }

    // Draw Building footprints
    ctx.fillStyle = '#1e293b';
    for (const obs of this.city.obstacles) {
      if (!obs.collisionSize || obs.collisionSize.x < 3) continue;
      const ox = (obs.position.x - pX) * this.scale;
      const oz = (obs.position.z - pZ) * this.scale;
      const bw = obs.collisionSize.x * this.scale;
      const bl = obs.collisionSize.z * this.scale;
      ctx.fillRect(ox - bw / 2, oz - bl / 2, bw, bl);
    }

    // Ambient Vehicles (White Rectangles)
    ctx.fillStyle = '#f8fafc';
    for (const v of vehicles) {
      if (v === player.currentVehicle || v.isPolice || v.isDestroyed) continue;
      const vx = (v.position.x - pX) * this.scale;
      const vz = (v.position.z - pZ) * this.scale;
      ctx.fillRect(vx - 2.5, vz - 2.5, 5, 5);
    }

    // Police Units (Flashing Red/Blue)
    const flash = Math.floor(performance.now() / 220) % 2 === 0;
    ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
    for (const c of cops) {
      if (!c.isDestroyed) {
        const cxPos = (c.position.x - pX) * this.scale;
        const czPos = (c.position.z - pZ) * this.scale;
        ctx.beginPath();
        ctx.arc(cxPos, czPos, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mission Markers (Bright Yellow / Cyan Squares)
    ctx.fillStyle = '#facc15';
    for (const b of beacons) {
      const bx = (b.pos.x - pX) * this.scale;
      const bz = (b.pos.z - pZ) * this.scale;
      ctx.fillRect(bx - 4.5, bz - 4.5, 9, 9);
    }

    ctx.restore();

    // Center Player Heading Chevron
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

    // Flash radar border if wanted
    const wanted = window.policeManager?.wantedLevel || 0;
    if (this.radarFrame) {
      if (wanted > 0) {
        this.radarFrame.classList.add('wanted-flashing');
      } else {
        this.radarFrame.classList.remove('wanted-flashing');
      }
    }

    this.updateDistrictName(pX, pZ);
  }

  updateDistrictName(x, z) {
    let name = "Vinewood Blvd";
    if (x < -50 && z < -50) name = "Port of Los Santos";
    else if (x > 50 && z < -50) name = "Davis & Strawberry";
    else if (x < -50 && z > 50) name = "Del Perro Freeway";
    else if (x > 50 && z > 50) name = "Pillbox Hill Financial";
    else if (Math.abs(x) < 40 && Math.abs(z) < 40) name = "Legion Square Central";

    if (this.districtEl && this.districtEl.innerText !== name) {
      this.districtEl.innerText = name;
    }
  }
}
