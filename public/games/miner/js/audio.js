// ─── Tiny WebAudio synth — no asset files (works under COEP credentialless) ──
const MUTE_KEY = 'miner_mute_v1';
let ctx = null;
let muted = localStorage.getItem(MUTE_KEY) === '1';

function ac() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  return muted;
}

// one decaying oscillator note
function tone(freq, t0, dur, type = 'sine', gain = 0.2, glideTo = null) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}

// filtered noise burst (for the explosion)
function noise(t0, dur, gain = 0.3, filterFreq = 800) {
  const c = ac(); if (!c) return;
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

const now = () => { const c = ac(); return c ? c.currentTime : 0; };

export const Sound = {
  resume() { ac(); },                                              // call on first user gesture
  step()   { tone(170, now(), 0.06, 'triangle', 0.04); },
  reveal() { tone(520, now(), 0.09, 'sine', 0.11, 680); },
  flag()   { const t = now(); tone(440, t, 0.05, 'square', 0.07); tone(660, t + 0.04, 0.06, 'square', 0.05); },
  unflag() { tone(300, now(), 0.06, 'square', 0.06, 220); },
  pickup() { const t = now(); [660, 880, 1175].forEach((f, i) => tone(f, t + i * 0.06, 0.12, 'triangle', 0.12)); },
  echo()   { tone(1300, now(), 0.55, 'sine', 0.1, 360); },
  drone()  { const t = now(); for (let i = 0; i < 5; i++) tone(880 + i * 30, t + i * 0.07, 0.1, 'sawtooth', 0.04); },
  probe()  { const t = now(); tone(900, t, 0.07, 'sine', 0.08); tone(1300, t + 0.06, 0.1, 'sine', 0.07); },
  save()   { const t = now(); [392, 523, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.18, 'sine', 0.14)); },
  boom()   { const t = now(); noise(t, 0.6, 0.5, 520); tone(85, t, 0.5, 'sine', 0.3, 38); },
  win()    { const t = now(); [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.12, 0.24, 'triangle', 0.15)); },
  rankup() { const t = now(); [784, 988, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.1, 0.26, 'sine', 0.16)); },
  click()  { tone(280, now(), 0.03, 'square', 0.05); },
  deny()   { tone(160, now(), 0.12, 'sawtooth', 0.08, 110); },
};
