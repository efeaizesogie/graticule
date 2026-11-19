// Render the demo video frame by frame in headless Edge.
//   node video/capture.mjs                 -> video/out/graticule-demo-silent.mp4
//   node video/capture.mjs --stills 3,21,28 -> video/out/stills/*.png only
// Needs the mock server on :5178 (node tools/mock-server.mjs) and `vite build --config video/vite.config.mjs`.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ACTIONS, DURATION, FPS, DAY } from './timeline.mjs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const WG = (process.env.LOCALAPPDATA || '') + '/Microsoft/WinGet/Links/ffmpeg.exe';
const FFMPEG = existsSync(WG) ? WG : 'ffmpeg';
const OUT = new URL('./out/', import.meta.url);
mkdirSync(new URL('./stills/', OUT), { recursive: true });

const argStills = process.argv.indexOf('--stills');
const stills = argStills > 0 ? process.argv[argStills + 1].split(',').map(Number) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--font-render-hinting=none'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('[page]', m.text()));
await page.goto(`http://localhost:5178/stage/index.html?fresh&day=${DAY}`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await sleep(1500);

const frame = (T) => page.evaluate((t) => window.__frame(t), T);
const shot = () => page.screenshot({ type: 'png', optimizeForSpeed: true });

let ff = null;
if (!stills) {
  ff = spawn(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    fileURLToPath(new URL('./graticule-demo-silent.mp4', OUT))], { stdio: ['pipe', 'inherit', 'inherit'] });
}

const total = Math.round(DURATION * FPS);
let next = 0;
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const T = f / FPS;
  while (next < ACTIONS.length && ACTIONS[next].t <= T) {
    const a = ACTIONS[next];
    await frame(a.t);
    const r = await page.evaluate((i) => window.__act(i), next);
    if (r !== 'ok' && r !== 'goto') console.warn(`action ${next} @${a.t}s: ${r}`);
    await sleep(a.kind === 'goto' ? 1800 : 600);
    await frame(a.t + 0.01);
    next++;
  }
  if (stills) {
    const want = stills.find((s) => Math.round(s * FPS) === f);
    if (want === undefined) continue;
    await frame(T);
    writeFileSync(new URL(`./stills/t${String(want).replace('.', '_')}.png`, OUT), await shot());
    console.log('still', want);
    if (Math.round(Math.max(...stills) * FPS) === f) break;
    continue;
  }
  await frame(T);
  const buf = await shot();
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
if (ff) {
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await browser.close();
