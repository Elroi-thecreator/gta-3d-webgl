// ==========================================
// GTA 3D - PROCEDURAL WEB AUDIO SYNTHESIZER
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.screechNode = null;
    this.screechGain = null;
    this.sirenOsc = null;
    this.sirenLfo = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;
    this.radioPlaying = false;
    this.radioInterval = null;
    this.radioStationIndex = 0;
    this.radioStations = [
      { name: "Flash 98.2 FM (Synthwave)", tempo: 120, type: "synth" },
      { name: "Liberty Beats 102.5 (Hip Hop)", tempo: 92, type: "hiphop" },
      { name: "Radio X 94.0 (Rock Drive)", tempo: 135, type: "rock" },
      { name: "Radio OFF", tempo: 0, type: "off" }
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- WEAPON SOUNDS ---
  playPistol() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Punch transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);

    // Noise burst crack
    this.playNoiseBurst(t, 0.12, 0.4, 1800);
  }

  playSMG() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);

    this.playNoiseBurst(t, 0.07, 0.35, 2200);
  }

  playShotgun() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);

    this.playNoiseBurst(t, 0.25, 0.7, 1200);
  }

  playRPGLaunch() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(350, t + 0.4);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
    this.playNoiseBurst(t, 0.5, 0.6, 900);
  }

  playExplosion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Sub rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 1.2);
    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 1.2);

    // Filtered noise blast
    this.playNoiseBurst(t, 1.4, 0.9, 600);
  }

  playPunch() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playCrash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);

    this.playNoiseBurst(t, 0.4, 0.6, 1100);
  }

  playPedestrianScream() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    const startFreq = 400 + Math.random() * 200;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.linearRampToValueAtTime(startFreq + 150, t + 0.15);
    osc.frequency.linearRampToValueAtTime(startFreq - 200, t + 0.45);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  playCarHorn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 494].forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  playCoin() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987, t);
    osc.frequency.setValueAtTime(1318, t + 0.08);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  playMissionPassed() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.4, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  playWastedSound() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 2.5);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 2.5);
  }

  // --- CONTINUOUS VEHICLE ENGINE SYNTH ---
  startEngine() {
    if (!this.ctx || this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineFilter = this.ctx.createBiquadFilter();

    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(45, t);

    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(250, t);

    this.engineGain.gain.setValueAtTime(0.12, t);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start(t);
  }

  updateEngine(speed, throttle) {
    if (!this.engineOsc || !this.ctx) return;
    const absSpeed = Math.abs(speed);
    const targetFreq = 40 + (absSpeed * 2.2) + (throttle ? 18 : 0);
    const filterFreq = 180 + (absSpeed * 8) + (throttle ? 150 : 0);

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
  }

  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch(e) {}
      this.engineOsc = null;
    }
  }

  // --- TIRE DRIFT SCREECH ---
  setTireScreech(active) {
    if (!this.ctx) return;
    if (active && !this.screechNode) {
      const bufferSize = this.ctx.sampleRate * 1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.screechNode = this.ctx.createBufferSource();
      this.screechNode.buffer = buffer;
      this.screechNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.screechNode.connect(filter);
      filter.connect(this.screechGain);
      this.screechGain.connect(this.ctx.destination);
      this.screechNode.start();
    } else if (!active && this.screechNode) {
      try {
        this.screechNode.stop();
        this.screechNode.disconnect();
      } catch(e) {}
      this.screechNode = null;
    }
  }

  // --- POLICE SIREN ---
  setPoliceSiren(active) {
    if (!this.ctx) return;
    if (active && !this.isSirenPlaying) {
      this.isSirenPlaying = true;
      const t = this.ctx.currentTime;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      this.sirenOsc.type = "sine";
      this.sirenOsc.frequency.setValueAtTime(750, t);

      this.sirenLfo.type = "sine";
      this.sirenLfo.frequency.setValueAtTime(1.8, t); // Siren sweep speed
      lfoGain.gain.setValueAtTime(220, t); // Modulation depth

      this.sirenLfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);

      this.sirenGain.gain.setValueAtTime(0.22, t);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc.start(t);
      this.sirenLfo.start(t);
    } else if (!active && this.isSirenPlaying) {
      this.isSirenPlaying = false;
      if (this.sirenOsc) {
        try {
          this.sirenOsc.stop();
          this.sirenLfo.stop();
          this.sirenOsc.disconnect();
          this.sirenLfo.disconnect();
        } catch(e) {}
        this.sirenOsc = null;
      }
    }
  }

  // --- PROCEDURAL RADIO STATIONS ---
  cycleRadio() {
    this.radioStationIndex = (this.radioStationIndex + 1) % this.radioStations.length;
    const currentStation = this.radioStations[this.radioStationIndex];
    if (currentStation.type === "off") {
      this.stopRadio();
    } else {
      this.startRadio();
    }
    return currentStation.name;
  }

  getCurrentRadioName() {
    return this.radioStations[this.radioStationIndex].name;
  }

  startRadio() {
    this.stopRadio();
    if (!this.ctx) return;
    const station = this.radioStations[this.radioStationIndex];
    if (station.type === "off") return;

    this.radioPlaying = true;
    let step = 0;
    const intervalMs = (60 / station.tempo) * 1000 / 2; // 8th notes

    this.radioInterval = setInterval(() => {
      if (!this.radioPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;

      if (station.type === "synth") {
        // Synthwave Bassline & Arp
        const bassNotes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 110];
        const arpNotes = [440, 523.25, 659.25, 880, 659.25, 523.25];
        
        // Bass note
        const bFreq = bassNotes[step % bassNotes.length];
        this.playRadioSynthNote(bFreq, 0.12, "sawtooth", 0.08, 300);

        // Hi-hat noise on offbeats
        if (step % 2 === 1) {
          this.playNoiseBurst(t, 0.04, 0.05, 7000);
        }
        // Snare on 2 and 4
        if (step % 4 === 2) {
          this.playNoiseBurst(t, 0.1, 0.1, 2000);
        }
        // Arp lead
        if (step % 2 === 0) {
          const aFreq = arpNotes[(step / 2) % arpNotes.length];
          this.playRadioSynthNote(aFreq, 0.1, "square", 0.04, 1500);
        }
      } else if (station.type === "hiphop") {
        // Boom bap groove
        if (step % 8 === 0 || step % 8 === 6) {
          // Kick
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(110, t);
          osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.15);
        }
        if (step % 8 === 4) {
          // Snare
          this.playNoiseBurst(t, 0.14, 0.15, 1800);
        }
        if (step % 2 === 0) {
          // Bass hit
          const funkNotes = [73.42, 73.42, 82.41, 87.31, 98.00];
          const f = funkNotes[(step / 2) % funkNotes.length];
          this.playRadioSynthNote(f, 0.18, "triangle", 0.12, 450);
        }
      } else if (station.type === "rock") {
        // Fast drive rock riff
        const riff = [82.41, 82.41, 98.0, 110.0, 123.47, 110.0, 98.0, 82.41];
        const freq = riff[step % riff.length];
        this.playRadioSynthNote(freq, 0.09, "sawtooth", 0.09, 800);

        if (step % 4 === 2) {
          this.playNoiseBurst(t, 0.08, 0.12, 2500);
        }
      }

      step++;
    }, intervalMs);
  }

  playRadioSynthNote(freq, duration, type, volume, cutoff) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, t);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  stopRadio() {
    this.radioPlaying = false;
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }

  // --- NOISE HELPER ---
  playNoiseBurst(time, duration, volume, filterFreq) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(time);
    noise.stop(time + duration);
  }
}

window.soundEngine = new SoundEngine();
