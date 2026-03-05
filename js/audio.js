/* ──────────────────────────────────────────────────────────────
   AUDIO ENGINE — Web Audio API Procedural Sound
   Operation Silent Sight
   ────────────────────────────────────────────────────────────── */

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let currentBpm = 124;
  let isMusicPlaying = false;
  let musicMuted = false;
  let musicTimer = null;
  let step = 0;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
      masterGain.connect(ctx.destination);

      musicGain = ctx.createGain();
      // Initialize with correct volume based on mute state
      musicGain.gain.setValueAtTime(musicMuted ? 0 : 0.15, ctx.currentTime);
      musicGain.connect(masterGain);
    } catch (e) {
      console.error("Audio init failed", e);
    }
  }

  function beep(freq, type, dur, gain = 0.3, delay = 0) {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + delay + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.05);
  }

  function noise(dur, gain = 0.15, connectToMusic = false) {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;

    // Connect to either musicGain (which can be muted) or masterGain (SFX)
    src.connect(g);
    g.connect(connectToMusic ? musicGain : masterGain);

    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.start(); src.stop(ctx.currentTime + dur + 0.1);
  }

  // ── PROCEDURAL MUSIC LOOP ──
  function startMusic() {
    if (isMusicPlaying) return;
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    isMusicPlaying = true;
    playStep();
  }

  function playStep() {
    if (!isMusicPlaying) return;

    const secondsPerBeat = 60 / currentBpm;
    const sixteenth = secondsPerBeat / 4;

    // Distorted Bassline
    if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
      const f = step % 16 < 8 ? 55 : 48.99;
      oscNode(f, 'sawtooth', 0.2, 0.3);
    }

    // Industrial Kick
    if (step % 4 === 0) {
      oscNode(60, 'sine', 0.1, 0.4, true);
    }

    // Hi-hats
    if (step % 2 === 1) {
      noise(0.02, 0.08, true); // true = connect to musicGain
    }

    step = (step + 1) % 32;
    musicTimer = setTimeout(playStep, sixteenth * 1000);
  }

  function oscNode(freq, type, dur, gain, freqSlide = false) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqSlide) osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(musicGain);
    osc.start(); osc.stop(ctx.currentTime + dur + 0.05);
  }

  function toggleMusic() {
    musicMuted = !musicMuted;
    init();
    if (musicGain) {
      if (musicMuted) {
        musicGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        isMusicPlaying = false;
        if (musicTimer) clearTimeout(musicTimer);
      } else {
        musicGain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.1);
        if (!isMusicPlaying) startMusic();
      }
    }
    return musicMuted;
  }

  return {
    init,
    startMusic,
    toggleMusic,
    isMuted: () => musicMuted,
    gunshot() { gunshotSnd(); },
    hit() { noise(0.04, 0.2); beep(120, 'square', 0.08, 0.2); },
    miss() { beep(300, 'sine', 0.1, 0.05); },
    reload() {
      beep(500, 'square', 0.05, 0.15);
      beep(400, 'square', 0.05, 0.15, 0.07);
      beep(600, 'square', 0.07, 0.2, 0.14);
    },
    special() {
      beep(220, 'sine', 0.4, 0.3);
      beep(440, 'sine', 0.4, 0.2, 0.1);
      beep(880, 'sine', 0.3, 0.15, 0.2);
    },
    uiClick() { beep(800, 'square', 0.04, 0.15); },
    levelUp() {
      beep(400, 'sine', 0.1, 0.3);
      beep(600, 'sine', 0.1, 0.3, 0.12);
      beep(800, 'sine', 0.2, 0.3, 0.24);
    },
    enemyDie() { noise(0.06, 0.18); beep(200, 'sawtooth', 0.12, 0.15); },
    friendly() { beep(880, 'sine', 0.08, 0.3); beep(440, 'sine', 0.2, 0.3, 0.1); },
    boss() { noise(0.15, 0.5); beep(80, 'sawtooth', 0.5, 0.4); },
    laser() {
      beep(1200, 'sine', 0.1, 0.35);
      beep(800, 'sine', 0.2, 0.35, 0.05);
      beep(400, 'sine', 0.3, 0.25, 0.15);
    }
  };

  function gunshotSnd() {
    noise(0.08, 0.4);
    beep(180, 'sawtooth', 0.12, 0.25);
  }
})();
