// Synthesize the soundtrack from the same timeline as the picture: no samples, no voice.
// node video/audio.mjs -> video/out/graticule-demo.wav (48 kHz stereo float)
import { writeFileSync, mkdirSync } from 'node:fs';
import { ACTIONS, BLOOM_AT, DURATION, MONTAGE, PHASE, SFX } from './timeline.mjs';

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const LAG = 0.017; // sounds land one frame after the picture event

// deterministic noise
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function add(t0, dur, fn, gain = 1, pan = 0) {
  const s0 = Math.max(0, Math.floor(t0 * SR));
  const s1 = Math.min(N, Math.floor((t0 + dur) * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let s = s0; s < s1; s++) {
    const t = (s - s0) / SR;
    const v = fn(t, s);
    L[s] += v * gl;
    R[s] += v * gr;
  }
}

// ---------- instruments
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
function pluck(t0, m, gain = 0.12, pan = 0, decay = 0.45) {
  const f = midi(m);
  add(t0, decay * 5, (t) => env(t, 0.004, decay) * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / 0.08) + 0.12 * Math.sin(2 * Math.PI * 4 * f * t) * Math.exp(-t / 0.03)), gain, pan);
}
function bell(t0, m, gain = 0.1, pan = 0) {
  const f = midi(m);
  add(t0, 3, (t) => env(t, 0.003, 0.9) * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.35) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / 0.12)), gain, pan);
}
function pad(t0, dur, notes, gain = 0.035, attack = 0.8, release = 1.2) {
  for (const [i, m] of notes.entries()) {
    const f = midi(m);
    const det = 1 + (i % 2 ? 0.0021 : -0.0018);
    add(t0, dur + release, (t) => {
      const e = Math.min(1, t / attack) * (t > dur ? Math.exp(-(t - dur) / (release / 3)) : 1);
      return e * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * det * 2 * t) * 0.35 + 0.3 * Math.sin(2 * Math.PI * f * det * t + 1.3));
    }, gain, i % 2 ? 0.35 : -0.35);
  }
}
function click(t0, gain = 0.25, pan = 0, tone = 2200) {
  add(t0, 0.05, (t) => (rnd() * Math.exp(-t / 0.004) * 0.6 + Math.sin(2 * Math.PI * tone * t) * Math.exp(-t / 0.012)), gain, pan);
}
function thock(t0, gain = 0.5) {
  add(t0, 0.3, (t) => { const f = 150 - 60 * Math.min(1, t / 0.06); return Math.sin(2 * Math.PI * f * t) * env(t, 0.003, 0.07) + rnd() * Math.exp(-t / 0.006) * 0.3; }, gain);
}
function blip(t0, gain = 0.14, pan = 0.2) {
  add(t0, 0.15, (t) => Math.sin(2 * Math.PI * (1320 + 400 * t) * t) * env(t, 0.002, 0.035), gain, pan);
}
function pop(t0, gain = 0.2) {
  add(t0, 0.18, (t) => Math.sin(2 * Math.PI * (600 + 900 * Math.min(1, t / 0.05)) * t) * env(t, 0.003, 0.05), gain);
}
function wrong(t0) {
  pluck(t0, 50, 0.16, -0.1, 0.12);
  pluck(t0 + 0.13, 46, 0.16, 0.1, 0.18);
}
function swell(t0, dur, gain = 0.06) {
  let lp = 0;
  add(t0, dur, (t) => { lp += 0.06 * (rnd() - lp); return lp * Math.sin((Math.PI * t) / dur) ** 2; }, gain * 6);
}

// ---------- music: Dmaj9 – Bm11 – Gmaj7 – A6sus, 100 bpm, 2.4 s per bar
const BAR = 2.4;
const CHORDS = [
  { root: 50, pad: [50, 57, 61, 64, 66], arp: [62, 66, 69, 73, 76, 73, 69, 66] },
  { root: 47, pad: [47, 54, 57, 62, 64], arp: [59, 62, 66, 69, 71, 69, 66, 64] },
  { root: 43, pad: [43, 50, 54, 59, 62], arp: [55, 59, 62, 66, 67, 66, 62, 59] },
  { root: 45, pad: [45, 52, 57, 59, 64], arp: [57, 61, 64, 66, 69, 66, 64, 61] },
];
const HOLE = [BLOOM_AT - 0.45, BLOOM_AT + 0.05]; // stop-time before the bloom
const inHole = (t) => t > HOLE[0] && t < HOLE[1];

for (let bar = 0; bar * BAR < PHASE.endIn; bar++) {
  const t = bar * BAR;
  const c = CHORDS[bar % 4];
  pad(t, BAR * 0.98, c.pad, t < 8 ? 0.022 : 0.03);
  // bass
  if (t >= 8) add(t, BAR, (x) => Math.sin(2 * Math.PI * midi(c.root - 12) * x) * env(x, 0.02, 0.9), 0.11);
  // arpeggio in 8ths once the phone is up; sparse ticks before
  for (let k = 0; k < 8; k++) {
    const tk = t + (k * BAR) / 8;
    if (tk >= PHASE.endIn || inHole(tk)) continue;
    if (tk < 8) {
      if (k % 4 === 0) click(tk, 0.05, 0.3, 3200);
      continue;
    }
    const after = tk > BLOOM_AT;
    pluck(tk, c.arp[k] + (after ? 12 : 0), after ? 0.06 : 0.05, k % 2 ? 0.4 : -0.4, 0.3);
  }
}
// ending chord
pad(PHASE.endIn, 2.6, [50, 57, 62, 66, 69, 73], 0.045, 0.3, 1.5);
bell(PHASE.endIn + 0.02, 74, 0.09);
bell(PHASE.endIn + 0.32, 78, 0.07, 0.3);
bell(PHASE.endIn + 0.62, 81, 0.06, -0.3);

// ---------- sound effects from the shared timeline
for (const a of ACTIONS) {
  const t = a.t + LAG;
  if (a.sfx === 'tap') click(t, 0.22, 0.25);
  if (a.sfx === 'probe') blip(t);
  if (a.sfx === 'lock') thock(t);
  if (a.sfx === 'pop') pop(t);
}
for (const e of SFX) {
  const t = e.t + LAG;
  if (e.kind === 'sweep') swell(t, 2.2, 0.05);
  if (e.kind === 'wrong') wrong(t);
  if (e.kind === 'flip') click(t, 0.12, -0.2, 900);
  if (e.kind === 'bloom') {
    // shimmer up the D major scale + a warm chord
    [62, 66, 69, 73, 74, 78, 81, 85].forEach((m, i) => bell(t + i * 0.055, m, 0.07, i % 2 ? 0.45 : -0.45));
    pad(t, 2.2, [38, 50, 57, 62, 66, 69], 0.05, 0.05, 1.4);
    swell(t - 0.1, 1.6, 0.04);
  }
  if (e.kind === 'chime') bell(t, [74, 78, 81, 86][e.i % 4], 0.1, [-0.4, 0.4, -0.2, 0.2][e.i % 4]);
}
// montage whoosh into each map
for (const m of MONTAGE) swell(m.t0 - 0.2, 0.7, 0.035);

// ---------- master: gentle soft-clip, fade out the tail
let peak = 0;
for (let s = 0; s < N; s++) {
  const tail = Math.min(1, (DURATION - s / SR) / 1.2);
  L[s] = Math.tanh(L[s] * 1.1) * tail;
  R[s] = Math.tanh(R[s] * 1.1) * tail;
  peak = Math.max(peak, Math.abs(L[s]), Math.abs(R[s]));
}

// write 32-bit float WAV
const data = Buffer.alloc(N * 8);
for (let s = 0; s < N; s++) {
  data.writeFloatLE(L[s] / (peak * 1.05), s * 8);
  data.writeFloatLE(R[s] / (peak * 1.05), s * 8 + 4);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
h.write('data', 36); h.writeUInt32LE(data.length, 40);
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/graticule-demo.wav', import.meta.url), Buffer.concat([h, data]));
console.log('wav written, peak before normalise', peak.toFixed(3));
