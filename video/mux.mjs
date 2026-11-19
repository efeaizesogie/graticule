// Join picture + soundtrack, master to -14 LUFS / -2 dBTP, and grab a YouTube thumbnail.
// node video/mux.mjs -> video/out/graticule-demo.mp4 + video/out/thumbnail.jpg
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WG = (process.env.LOCALAPPDATA || '') + '/Microsoft/WinGet/Links/ffmpeg.exe';
const FFMPEG = existsSync(WG) ? WG : 'ffmpeg';
const p = (f) => fileURLToPath(new URL(`./out/${f}`, import.meta.url));
const run = (args) => {
  const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
};

run(['-i', p('graticule-demo-silent.mp4'), '-i', p('graticule-demo.wav'),
  '-af', 'loudnorm=I=-15.2:TP=-2.5:LRA=11', '-ar', '48000',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', p('graticule-demo.mp4')]);
// thumbnail: the bloom, pushed in
run(['-ss', '28.2', '-i', p('graticule-demo.mp4'), '-frames:v', '1', '-q:v', '2', p('thumbnail.jpg')]);
console.log('wrote', p('graticule-demo.mp4'));
