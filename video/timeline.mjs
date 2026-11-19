// One clock for picture and sound. Every time is in seconds from the first frame.
export const FPS = 30;
export const DURATION = 58.5;
export const DAY = 6; // mock puzzle N°006 = "How many people are men"

// Captions on the left of the frame.
export const CAPTIONS = [
  { t0: 0.5, t1: 3.8, kicker: 'Graticule · N°006', text: 'No title.\nNo legend.', narrow: true },
  { t0: 4.0, t1: 7.6, kicker: 'Darker = more', text: 'Every country is shaded by one real fact.', narrow: true },
  { t0: 8.5, t1: 11.9, kicker: 'A daily game on Reddit', text: 'One mystery map a day.', clipText: 'Lives right in a Reddit post.' },
  { t0: 12.2, t1: 18.7, kicker: 'Step 1', text: 'Tap countries to read them.' },
  { t0: 18.9, t1: 24.7, kicker: '4 answers · 3 tries', text: 'Miss, and a hint appears.' },
  { t0: 24.9, t1: 26.9, kicker: 'Step 2', text: 'Name what the map shows…' },
  { t0: 26.95, t1: 31.0, kicker: 'Step 2', text: '…and watch it bloom.' },
  { t0: 31.2, t1: 37.4, kicker: 'Real data · real sources', text: 'Every answer comes with a fact worth sharing.' },
  { t0: 37.6, t1: 43.8, kicker: 'Made for Reddit', text: 'Post your result.\nVote on tomorrow’s theme.' },
  { t0: 44.0, t1: 49.3, kicker: 'Come back tomorrow', text: 'Streaks, a leaderboard and an archive of every map.' },
];

// What the finger does on the phone. `sel` is a CSS selector inside the game iframe,
// `text` narrows it to the element containing that text, `iso` taps a country.
export const ACTIONS = [
  { t: 10.1, kind: 'tap', sel: 'button.bar', sfx: 'tap' },
  { t: 10.35, kind: 'goto', url: '/game.html' },
  { t: 11.7, kind: 'tap', sel: '.howto .bar', sfx: 'tap' },
  { t: 12.9, kind: 'tap', iso: 'CAN', sfx: 'probe' },
  { t: 14.5, kind: 'tap', iso: 'IND', sfx: 'probe' },
  { t: 16.3, kind: 'tap', iso: 'SAU', sfx: 'probe' },
  { t: 19.6, kind: 'tap', sel: '.choice', text: 'babies', sfx: 'tap' },
  { t: 20.8, kind: 'tap', sel: 'button.bar', sfx: 'lock', result: 'wrong' },
  { t: 23.2, kind: 'tap', iso: 'QAT', sfx: 'probe' },
  { t: 25.4, kind: 'tap', sel: '.choice', text: 'are men', sfx: 'tap' },
  { t: 26.7, kind: 'tap', sel: 'button.bar', sfx: 'lock', result: 'right' },
  { t: 39.7, kind: 'tap', sel: '.pill', text: 'Post to comments', sfx: 'pop' },
  { t: 42.7, kind: 'tap', sel: '.vote button', text: 'Planet', sfx: 'pop' },
  { t: 44.4, kind: 'tap', sel: '.tab', text: 'Archive', sfx: 'tap' },
  { t: 46.9, kind: 'tap', sel: '.tab', text: 'Leaderboard', sfx: 'tap' },
];

// Smooth scrolls inside the phone: scroll so `sel` sits `offset` px below the top.
export const SCROLLS = [
  { t0: 29.4, t1: 30.9, sel: '.answer', offset: 70 },
  { t0: 33.0, t1: 34.6, sel: '.extremes', offset: 70 },
  { t0: 37.6, t1: 38.9, sel: '.card', offset: 70 },
  { t0: 40.9, t1: 42.1, sel: '.vote', offset: 210 },
];

// Full-bleed blooms at the end.
export const MONTAGE = [
  { t0: 49.6, id: 'forest', n: 3 },
  { t0: 51.05, id: 'internet', n: 1 },
  { t0: 52.5, id: 'life-exp', n: 2 },
  { t0: 53.95, id: 'density', n: 4 },
];
export const MONTAGE_END = 55.5;

// Phases of the stage.
export const PHASE = {
  hookEnd: 8.0, // full-bleed map until here, then it hands over to the phone
  phoneIn: [7.6, 8.6],
  phoneOut: [49.2, 49.7],
  endIn: 55.5,
};

export const BLOOM_AT = 26.85; // correct answer lands

// Optional real-Reddit phone recording shown inside the phone (video/clips/reddit-clip.mp4, made by prep-clip.mjs).
export const INSERT = { t0: 8.6, t1: 11.4, frames: '/stage/reddit/', fps: 30 };

// Camera push-ins on the phone's map: [in start, in end, out start, out end, scale]
export const ZOOMS = [
  [12.3, 12.9, 18.3, 18.9, 1.3],
  [22.9, 23.4, 24.6, 25.1, 1.3],
  [26.6, 27.2, 29.0, 29.6, 1.42],
];

// Sound events not tied to a tap.
export const SFX = [
  { t: 0.15, kind: 'sweep' },
  { t: 20.95, kind: 'wrong' },
  { t: 21.1, kind: 'flip' },
  { t: BLOOM_AT, kind: 'bloom' },
  ...MONTAGE.map((m, i) => ({ t: m.t0 + 0.3, kind: 'chime', i })),
  { t: 55.6, kind: 'end' },
];
