// audio.js — synthesized WebAudio sounds for Ember Court.
// No audio files: every sound is oscillators and filtered noise, created
// lazily on the first user gesture so Chrome's autoplay policy is happy.

let ctx = null;
let master = null;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

function tone(freq, dur, type, vol, slideTo) {
  const c = ensureContext();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(c.currentTime + dur);
}

function noiseBurst(dur, vol, freq) {
  const c = ensureContext();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq || 1200;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
}

export function playDeal() {
  noiseBurst(0.08, 0.25, 2400);
}

export function playSelect() {
  tone(660, 0.06, 'triangle', 0.15);
}

export function playCardSound(kind, resonance) {
  if (kind === 'attack') {
    noiseBurst(0.16, 0.4, 700);
    tone(180, 0.18, 'sawtooth', 0.2, 60);
  } else if (kind === 'block') {
    tone(320, 0.14, 'sine', 0.3, 480);
  } else if (kind === 'poison') {
    tone(240, 0.3, 'sine', 0.25, 90);
  } else if (kind === 'heal') {
    tone(520, 0.2, 'sine', 0.22, 780);
  } else if (kind === 'draw') {
    noiseBurst(0.1, 0.3, 3000);
    tone(880, 0.08, 'triangle', 0.15);
  }
  if (resonance) {
    setTimeout(() => tone(1180, 0.16, 'triangle', 0.2, 1560), 70);
  }
}

export function playHurt() {
  tone(140, 0.2, 'square', 0.18, 70);
}

export function playTurnChime() {
  tone(523, 0.1, 'triangle', 0.18);
  setTimeout(() => tone(784, 0.12, 'triangle', 0.18), 90);
}

export function playWinFanfare() {
  const notes = [523, 659, 784, 1046, 784, 1046];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.28, 'triangle', 0.28), i * 130));
}

export function playLoseDirge() {
  const notes = [392, 370, 349, 311];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.4, 'sine', 0.26, n * 0.94), i * 220));
}
