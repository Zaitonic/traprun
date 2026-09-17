// ============================================
// TRAP RUN — Audio Manager (Web Audio API)
// ============================================
const AudioManager = (() => {
  let ctx = null;
  // Music is intentionally foregrounded: the score should be clearly audible
  // over gameplay without requiring players to open Settings first.
  let musicVolume = 0.85;
  let sfxVolume = 0.7;
  let musicGain = null;
  let musicBus = null;
  let musicCompressor = null;
  let musicTimer = null;
  let musicPlaying = false;
  let musicMode = null;
  let musicGeneration = 0;
  let musicStep = 0;
  let currentLevel = 1;
  let currentProfile = null;
  let sectionIntensity = 0;
  let smoothedSectionIntensity = 0;
  let bossDanger = 0;
  let bossProgress = 0;
  let bossEscapeClimax = false;
  let musicNoiseBuffer = null;
  const distortionCurves = new Map();

  // Original phonk-inspired profiles. Each uses the same core beat, but gains
  // tempo, bass drive, cowbell density, and drum weight with the level band.
  const MUSIC_PROFILES = [
    {
      id: 'dark', maxLevel: 5, tempo: 128, rootNotes: [49, 46, 43, 52],
      bassType: 'sawtooth', bass: 0.56, kick: 0.46, snare: 0.30, hat: 0.08,
      cowbell: 0.13, drive: 0.65, arp: 0.08, drone: 0.10, filter: 720, hatEvery: 4, extraKick: false,
      description: 'dark phonk'
    },
    {
      id: 'tense', maxLevel: 10, tempo: 148, rootNotes: [46, 49, 43, 52],
      bassType: 'sawtooth', bass: 0.68, kick: 0.62, snare: 0.45, hat: 0.15,
      cowbell: 0.20, drive: 1.0, arp: 0.12, drone: 0.08, filter: 950, hatEvery: 2, extraKick: true,
      description: 'fast, energetic phonk'
    },
    {
      id: 'intense', maxLevel: 15, tempo: 166, rootNotes: [43, 46, 49, 41],
      bassType: 'sawtooth', bass: 0.82, kick: 0.78, snare: 0.61, hat: 0.22,
      cowbell: 0.29, drive: 1.45, arp: 0.15, drone: 0.07, filter: 1250, hatEvery: 1, extraKick: true,
      description: 'heavy, aggressive phonk'
    },
    {
      id: 'very-intense', maxLevel: 19, tempo: 184, rootNotes: [41, 43, 46, 39],
      bassType: 'sawtooth', bass: 0.94, kick: 0.91, snare: 0.72, hat: 0.29,
      cowbell: 0.36, drive: 1.9, arp: 0.19, drone: 0.05, filter: 1550, hatEvery: 1, extraKick: true,
      description: 'very intense phonk'
    },
    {
      id: 'boss', maxLevel: Infinity, tempo: 202, rootNotes: [39, 43, 41, 46],
      bassType: 'sawtooth', bass: 1.04, kick: 1.04, snare: 0.86, hat: 0.36,
      cowbell: 0.44, drive: 2.4, arp: 0.24, drone: 0.05, filter: 1950, hatEvery: 1, extraKick: true,
      description: 'extreme final-boss phonk'
    }
  ];

  // An original dark-phonk menu cue. It has no vocals or sampled material.
  const MENU_PROFILE = {
    id: 'menu', tempo: 108, rootNotes: [49, 46, 43, 52],
    bassType: 'sawtooth', bass: 0.44, kick: 0.31, snare: 0.19, hat: 0.06,
    cowbell: 0.10, drive: 0.45, arp: 0.10, drone: 0.12, filter: 900, hatEvery: 4, extraKick: false,
    description: 'original dark phonk menu theme'
  };

  const PHONK_PATTERNS = {
    menu:         { kick: [0, 7, 8, 14],             bass: [0, 8],                 cowbell: [2, 6, 10, 14] },
    dark:         { kick: [0, 6, 8, 14],             bass: [0, 6, 8],              cowbell: [2, 6, 10, 14] },
    tense:        { kick: [0, 3, 6, 8, 11, 14],      bass: [0, 3, 6, 8, 11, 14],   cowbell: [1, 3, 6, 9, 11, 14] },
    intense:      { kick: [0, 2, 3, 6, 7, 8, 11, 14], bass: [0, 3, 6, 8, 11, 14],   cowbell: [1, 3, 5, 6, 9, 11, 13, 14] },
    'very-intense': { kick: [0, 2, 3, 5, 6, 7, 8, 10, 11, 13, 14, 15], bass: [0, 2, 5, 6, 8, 10, 11, 14], cowbell: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15] },
    boss:         { kick: [0, 1, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15], bass: [0, 3, 5, 6, 8, 10, 11, 13, 14], cowbell: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15] }
  };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function ensureContext() {
    if (!ctx) init();
    if (ctx.state === 'suspended') {
      // Browsers may wait for the player's first click before allowing audio.
      // Ignore that expected rejection; the next menu interaction resumes it.
      const resume = ctx.resume();
      if (resume && resume.catch) resume.catch(() => {});
    }
  }

  function profileForLevel(level) {
    return MUSIC_PROFILES.find(profile => level <= profile.maxLevel) || MUSIC_PROFILES[0];
  }

  function createMusicGraph() {
    if (musicBus) return;

    musicBus = ctx.createGain();
    musicCompressor = ctx.createDynamicsCompressor();
    musicGain = ctx.createGain();

    // The compressor lets the late-game percussion become heavy without making
    // the user's volume control or the game's sound effects uncomfortable.
    musicCompressor.threshold.value = -12;
    musicCompressor.knee.value = 12;
    musicCompressor.ratio.value = 5;
    musicCompressor.attack.value = 0.008;
    musicCompressor.release.value = 0.18;

    musicBus.connect(musicCompressor);
    musicCompressor.connect(musicGain);
    musicGain.connect(ctx.destination);
    musicGain.gain.value = 0;
  }

  function setMusicGain(immediate = false) {
    if (!musicGain || !ctx) return;
    // The prior mix left the procedural score too far behind the sound effects.
    // This lift is protected by the compressor above, avoiding distortion in
    // the intense late-game and boss arrangements.
    const target = musicPlaying ? musicVolume * 0.82 : 0;
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(target, now + (immediate ? 0.02 : 0.18));
  }

  // Play a tone with envelope
  function playTone(freq, duration, type = 'square', vol = 0.3, detune = 0) {
    ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = vol * sfxVolume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // Play noise burst
  function playNoise(duration, vol = 0.2) {
    ensureContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol * sfxVolume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  // Sound effects
  function jump() {
    playTone(300, 0.15, 'square', 0.25);
    setTimeout(() => playTone(450, 0.1, 'square', 0.2), 50);
  }

  function land() {
    playNoise(0.05, 0.1);
  }

  function death() {
    playTone(400, 0.1, 'square', 0.4);
    setTimeout(() => playTone(300, 0.1, 'square', 0.35), 80);
    setTimeout(() => playTone(200, 0.15, 'square', 0.3), 160);
    setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.25), 240);
    setTimeout(() => playNoise(0.3, 0.2), 100);
  }

  function trapTrigger() {
    playTone(800, 0.05, 'square', 0.3);
    playTone(600, 0.08, 'square', 0.25, 10);
    playNoise(0.1, 0.15);
  }

  function levelComplete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'square', 0.3), i * 120);
    });
  }

  function victoryFanfare() {
    ensureContext();
    stopMusic();
    const now = ctx.currentTime;
    // Grand orchestral/synth arpeggiated fanfare
    const notes = [
      { t: 0.00, f: 392.00, d: 0.22, vol: 0.3 },  // G4
      { t: 0.14, f: 523.25, d: 0.22, vol: 0.32 }, // C5
      { t: 0.28, f: 659.25, d: 0.22, vol: 0.34 }, // E5
      { t: 0.42, f: 783.99, d: 0.45, vol: 0.38 }, // G5
      { t: 0.82, f: 659.25, d: 0.18, vol: 0.32 }, // E5
      { t: 0.98, f: 783.99, d: 0.18, vol: 0.36 }, // G5
      { t: 1.15, f: 1046.50, d: 0.85, vol: 0.45 },// C6
      // Harmonizing chord layers
      { t: 1.15, f: 523.25, d: 0.85, vol: 0.25 }, // C5
      { t: 1.15, f: 659.25, d: 0.85, vol: 0.25 }, // E5
      { t: 1.15, f: 261.63, d: 0.85, vol: 0.25 }  // C4
    ];

    notes.forEach(({ t, f, d, vol }) => {
      setTimeout(() => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = f > 1000 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        gain.gain.setValueAtTime(vol * sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + d);
      }, t * 1000);
    });
  }

  function menuClick() {
    playTone(600, 0.06, 'square', 0.15);
  }

  function menuBack() {
    playTone(400, 0.06, 'square', 0.12);
  }

  // ---- Procedural soundtrack ------------------------------------------------
  // A step is a sixteenth-note. Keeping the musical content in a single
  // sequencer means transitions preserve the beat rather than restarting a song
  // every time a level-loading card appears.
  function getLiveProfile() {
    const profile = currentProfile || profileForLevel(currentLevel);
    smoothedSectionIntensity += (sectionIntensity - smoothedSectionIntensity) * 0.14;

    let dynamicIntensity = smoothedSectionIntensity;
    if (profile.id === 'boss') {
      // A close boss matters most, with corridor progress providing a constant
      // rise even when the player maintains a safe gap.
      dynamicIntensity = bossEscapeClimax
        ? 1
        : Math.min(1, bossDanger * 0.78 + bossProgress * 0.34);
    }

    return {
      ...profile,
      dynamicIntensity,
      tempo: profile.tempo * (1 + dynamicIntensity * (profile.id === 'boss' ? 0.10 : 0.055))
    };
  }

  function getMusicNoiseBuffer() {
    if (musicNoiseBuffer) return musicNoiseBuffer;
    const length = Math.max(1, Math.floor(ctx.sampleRate));
    musicNoiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = musicNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return musicNoiseBuffer;
  }

  function getDistortionCurve(drive) {
    const key = Math.round(drive * 100);
    if (distortionCurves.has(key)) return distortionCurves.get(key);

    const amount = Math.max(1, drive * 95);
    const curve = new Float32Array(44100);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / (curve.length - 1) - 1;
      curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    distortionCurves.set(key, curve);
    return curve;
  }

  function playMusicOscillator({
    frequency,
    duration,
    volume,
    type = 'sawtooth',
    filter = 1800,
    filterType = 'lowpass',
    detune = 0,
    sweepTo = null,
    drive = 0
  }) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filterNode = ctx.createBiquadFilter();
    const shaper = drive > 0 ? ctx.createWaveShaper() : null;
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, frequency), now);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), now + duration);
    osc.detune.value = detune;
    filterNode.type = filterType;
    filterNode.frequency.setValueAtTime(filter, now);
    filterNode.Q.value = filterType === 'bandpass' ? 7 : type === 'sawtooth' ? 1.5 : 0.6;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filterNode);
    if (shaper) {
      shaper.curve = getDistortionCurve(drive);
      shaper.oversample = '4x';
      filterNode.connect(shaper);
      shaper.connect(gain);
    } else {
      filterNode.connect(gain);
    }
    gain.connect(musicBus);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playMusicNoise({ duration, volume, highpass = 0, lowpass = 10000 }) {
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    const highFilter = ctx.createBiquadFilter();
    const lowFilter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = getMusicNoiseBuffer();
    highFilter.type = 'highpass';
    highFilter.frequency.value = highpass;
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = lowpass;
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(highFilter);
    highFilter.connect(lowFilter);
    lowFilter.connect(gain);
    gain.connect(musicBus);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  function playKick(profile, accent = 1) {
    playMusicOscillator({
      frequency: profile.id === 'boss' ? 172 : 150,
      sweepTo: profile.id === 'boss' ? 29 : 35,
      duration: profile.id === 'boss' ? 0.17 : 0.20,
      volume: profile.kick * accent,
      type: 'sine',
      filter: 210
    });
    // A short attack makes the 808 kick cut through the distorted bass.
    playMusicNoise({ duration: 0.022, volume: 0.055 * accent, highpass: 1800, lowpass: 7500 });
  }

  function playSnare(profile, accent = 1) {
    // Wide clap/noise layer for the characteristic phonk backbeat.
    playMusicNoise({
      duration: profile.id === 'boss' ? 0.15 : 0.12,
      volume: profile.snare * accent,
      highpass: 1250,
      lowpass: 7600
    });
    playMusicOscillator({
      frequency: 210,
      sweepTo: 118,
      duration: 0.09,
      volume: profile.snare * 0.28 * accent,
      type: 'triangle',
      filter: 980
    });
  }

  function playHat(profile, accent = 1) {
    playMusicNoise({ duration: 0.028, volume: profile.hat * accent, highpass: 6200, lowpass: 12000 });
  }

  function playDrone(root, profile, stepDuration) {
    const duration = stepDuration * 15.5;
    playMusicOscillator({
      frequency: root * 0.5,
      duration,
      volume: profile.drone,
      type: 'triangle',
      filter: profile.filter * 0.42,
      detune: -9
    });
    if (profile.id === 'menu') {
      // A restrained minor chord keeps the menu dark while the cowbell carries
      // the hook. All notes are synthesized from this game's own pattern.
      playMusicOscillator({
        frequency: root * 1.189,
        duration,
        volume: profile.drone * 0.46,
        type: 'triangle',
        filter: profile.filter * 0.68,
        detune: 4
      });
      playMusicOscillator({
        frequency: root * 1.498,
        duration,
        volume: profile.drone * 0.40,
        type: 'sine',
        filter: profile.filter * 0.76,
        detune: -3
      });
    } else if (profile.id !== 'dark') {
      playMusicOscillator({
        frequency: root * 1.067,
        duration,
        volume: profile.drone * 0.42,
        type: 'sawtooth',
        filter: profile.filter * 0.34,
        detune: 7
      });
    }
  }

  function playBass(root, profile, stepDuration, accent = 1) {
    const duration = Math.max(0.08, stepDuration * (profile.id === 'boss' ? 1.7 : 2.15));
    playMusicOscillator({
      frequency: root,
      duration,
      volume: profile.bass * accent,
      type: profile.bassType,
      filter: profile.filter * 0.52,
      sweepTo: root * (profile.id === 'boss' ? 0.68 : 0.76),
      drive: profile.drive
    });
    // Clean sub below the distorted 808 preserves weight on headphones as well
    // as speakers, while the compressor prevents it from clipping.
    playMusicOscillator({
      frequency: root * 0.5,
      duration: duration * 1.12,
      volume: profile.bass * 0.48 * accent,
      type: 'sine',
      filter: 155
    });
  }

  function playCowbell(root, profile, step, stepDuration) {
    const melody = profile.id === 'dark' || profile.id === 'menu'
      ? [0, 3, 7, 10, 7, 3, 12, 10]
      : [0, 3, 7, 10, 12, 10, 7, 3, 15, 12, 10, 7, 3, 0, 7, 10];
    const semitones = melody[(Math.floor(musicStep / 16) * 3 + step) % melody.length];
    const frequency = root * 4 * Math.pow(2, semitones / 12);
    playMusicOscillator({
      frequency,
      duration: Math.max(0.045, stepDuration * 0.72),
      volume: profile.cowbell * (step % 4 === 0 ? 1.1 : 0.82),
      type: 'square',
      filter: 1450 + profile.drive * 240,
      filterType: 'bandpass',
      detune: step % 2 ? 5 : -4,
      drive: profile.drive * 0.34
    });
  }

  function playMusicStep(generation) {
    if (!musicPlaying || generation !== musicGeneration) return;

    const profile = getLiveProfile();
    const step = musicStep % 16;
    const bar = Math.floor(musicStep / 16);
    const root = profile.rootNotes[bar % profile.rootNotes.length];
    const stepDuration = 60 / profile.tempo / 4;
    const pattern = PHONK_PATTERNS[profile.id] || PHONK_PATTERNS.dark;
    const isHeavy = profile.id === 'intense' || profile.id === 'very-intense' || profile.id === 'boss';
    const isBoss = profile.id === 'boss';

    if (step === 0) {
      playDrone(root, profile, stepDuration);
    }

    if (pattern.kick.includes(step)) {
      playKick(profile, step === 0 || step === 8 ? 1.12 : 0.70 + profile.dynamicIntensity * 0.24);
    }

    if (pattern.bass.includes(step)) {
      const variation = step === 6 || step === 14 ? 1.189 : step === 3 || step === 11 ? 0.944 : 1;
      playBass(root * variation, profile, stepDuration, step === 0 || step === 8 ? 1.04 : 0.76);
    }

    if (step === 4 || step === 12) playSnare(profile, step === 12 ? 1.05 : 0.88);
    if (isHeavy && (step === 7 || step === 15)) playSnare(profile, 0.28 + profile.dynamicIntensity * 0.24);
    if (isBoss && bossEscapeClimax && step === 14) playSnare(profile, 0.5);

    if (step % profile.hatEvery === 0) {
      playHat(profile, step % 4 === 0 ? 1 : 0.62);
    }
    if (isBoss && bossEscapeClimax && step % 2 === 1) playHat(profile, 0.45);

    if (pattern.cowbell.includes(step)) playCowbell(root, profile, step, stepDuration);

    musicStep++;
    musicTimer = setTimeout(() => playMusicStep(generation), stepDuration * 1000);
  }

  function setLevel(level) {
    currentLevel = Math.max(1, Math.floor(level) || 1);
    const nextProfile = profileForLevel(currentLevel);
    const profileChanged = !currentProfile || currentProfile.id !== nextProfile.id;
    currentProfile = nextProfile;
    sectionIntensity = 0;
    smoothedSectionIntensity = 0;
    bossEscapeClimax = false;
    if (nextProfile.id !== 'boss') {
      bossDanger = 0;
      bossProgress = 0;
    }
    if (profileChanged) setMusicGain();
  }

  // Called while Levels 16–19 are played. It raises rhythmic density inside
  // their tougher stretches without touching level logic or player movement.
  function setSectionIntensity(intensity) {
    sectionIntensity = Math.max(0, Math.min(1, Number(intensity) || 0));
  }

  // Boss proximity is supplied by FinalBoss. It changes tempo and the density
  // of the final track continuously, so a closing gap is audible before it is fatal.
  function setBossIntensity(proximity, progress = bossProgress) {
    bossDanger = Math.max(0, Math.min(1, Number(proximity) || 0));
    bossProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  }

  function startBossEscapeClimax() {
    if (!musicPlaying) return;
    currentLevel = 20;
    currentProfile = profileForLevel(20);
    bossEscapeClimax = true;
    bossDanger = 1;
    bossProgress = 1;
  }

  function startMusic(level = currentLevel) {
    ensureContext();
    createMusicGraph();
    // The gameplay score takes over cleanly when the player leaves the menu.
    if (musicPlaying && musicMode !== 'game') stopMusic();
    musicMode = 'game';
    setLevel(level);
    if (musicPlaying) return;

    musicPlaying = true;
    musicGeneration++;
    musicStep = 0;
    setMusicGain(true);
    playMusicStep(musicGeneration);
  }

  function startMenuMusic() {
    ensureContext();
    createMusicGraph();
    if (musicPlaying && musicMode === 'menu') return;
    if (musicPlaying) stopMusic();

    musicMode = 'menu';
    currentProfile = MENU_PROFILE;
    sectionIntensity = 0;
    smoothedSectionIntensity = 0;
    bossDanger = 0;
    bossProgress = 0;
    bossEscapeClimax = false;
    musicPlaying = true;
    musicGeneration++;
    musicStep = 0;
    setMusicGain(true);
    playMusicStep(musicGeneration);
  }

  function stopMenuMusic() {
    if (musicMode === 'menu') stopMusic();
  }

  function stopMusic() {
    musicPlaying = false;
    musicMode = null;
    musicGeneration++;
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
    setMusicGain();
  }

  function setMusicVolume(v) {
    musicVolume = Math.max(0, Math.min(1, v));
    setMusicGain();
  }

  function setSfxVolume(v) {
    sfxVolume = Math.max(0, Math.min(1, v));
  }

  return {
    init,
    jump,
    land,
    death,
    trapTrigger,
    levelComplete,
    victoryFanfare,
    menuClick,
    menuBack,
    startMusic,
    startMenuMusic,
    stopMusic,
    stopMenuMusic,
    setLevel,
    setSectionIntensity,
    setBossIntensity,
    startBossEscapeClimax,
    setMusicVolume,
    setSfxVolume,
    // Used by the existing boss effects so they share the game audio context.
    playNoise,
    get _ctx() { return ctx; },
    get musicVolume() { return musicVolume; },
    get sfxVolume() { return sfxVolume; }
  };
})();
