// Turn a phone screen recording into the 3.4 s insert shown inside the phone frame.
//   node video/prep-clip.mjs <recording.mp4|.mov> [startSeconds]
// Crops to the phone screen's shape and writes one JPEG per frame -> video/clips/reddit/0001.jpg ...
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { INSERT } from './timeline.mjs';

const [input, start = '0'] = process.argv.slice(2);
if (!input || !existsSync(input)) {
  console.error('usage: node video/prep-clip.mjs <recording> [startSeconds]');
  process.exit(1);
}
const WG = (process.env.LOCALAPPDATA || '') + '/Microsoft/WinGet/Links/ffmpeg.exe';
const FFMPEG = existsSync(WG) ? WG : 'ffmpeg';
const dir = fileURLToPath(new URL('./clips/', import.meta.url));
rmSync(dir + 'reddit', { recursive: true, force: true });
mkdirSync(dir + 'reddit', { recursive: true });
const W = 858; // 2x the phone screen (429 x 920)
const H = 1840;
const dur = (INSERT.t1 - INSERT.t0 + 0.2).toFixed(2);
const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', start, '-i', input, '-t', dur,
  '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,format=yuv420p`,
  '-q:v', '2', dir + 'reddit/%04d.jpg'], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('clip frames ready:', dir + 'reddit/');
