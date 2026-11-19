// The demo-video stage: 1920x1080, every frame a pure function of time T.
// The phone shows the REAL game (dist/client/game.html served by the mock API),
// driven by taps from timeline.mjs. window.__frame(T) draws time T; window.__act(i) performs action i.
import '../../src/client/styles.css';
import './stage.css';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MapView } from '../../src/client/map/MapView';
import { H as MAP_H, RAMPS, W as MAP_W } from '../../src/client/map/geo';
import bank from '../../src/server/bank.json';
import { ACTIONS, CAPTIONS, MONTAGE, MONTAGE_END, PHASE, SCROLLS, BLOOM_AT, DAY, ZOOMS, INSERT } from '../timeline.mjs';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const out = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, x) => a + (b - a) * x;

const byId = Object.fromEntries(bank.map((d) => [d.id, d]));
const bandsOf = (d) => Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, d.thresholds.filter((t) => v >= t).length]));
const HOOK = byId['male-share'];
const HOOK_BANDS = bandsOf(HOOK);
const MONT = MONTAGE.map((m) => ({ ...m, d: byId[m.id], bands: bandsOf(byId[m.id]) }));

// phone geometry (stage px)
const PHONE = { cx: 1330, cy: 540, w: 390, h: 800, scale: 1.1, status: 40 };
const SCREEN = { w: PHONE.w * PHONE.scale, h: PHONE.h * PHONE.scale + PHONE.status };
const SCREEN_TOP = PHONE.cy - SCREEN.h / 2; // stage y of the screen's top edge
const MAP_FOCUS_Y = SCREEN_TOP + PHONE.status + 175; // the game's map, in stage px
const taps = [];

function Caption({ c, T }) {
  const a = out(prog(T, c.t0, c.t0 + 0.45));
  const z = 1 - prog(T, c.t1 - 0.3, c.t1);
  const o = Math.min(a, z);
  if (o <= 0) return null;
  return (
    <div className={`cap ${c.narrow ? 'cap--narrow' : ''}`} style={{ opacity: o, transform: `translateY(${(1 - a) * 26}px)` }}>
      <div className="cap__kicker"><i />{c.kicker}</div>
      <div className="cap__text">{(window.__HAS_CLIP && c.clipText ? c.clipText : c.text).split('\n').map((l, i) => <div key={i}>{l}</div>)}</div>
    </div>
  );
}

function Stage({ T }) {
  // ---- hook map → phone hand-over
  const hand = ease(prog(T, PHASE.phoneIn[0], PHASE.phoneIn[1]));
  const hookO = 1 - prog(T, PHASE.phoneIn[0] + 0.55, PHASE.phoneIn[1]);
  const push = 1 + 0.035 * ease(prog(T, 0.5, 7.6));
  const hookW = 1340;
  const hookH = (hookW * MAP_H) / MAP_W;
  const hookScale = lerp(push, 382 / hookW, hand);
  const hookX = lerp(1180, PHONE.cx, hand);
  const hookY = lerp(560, SCREEN_TOP + PHONE.status + 165, hand);

  // ---- phone
  const phoneO = Math.min(prog(T, PHASE.phoneIn[0], PHASE.phoneIn[0] + 0.5), 1 - prog(T, PHASE.phoneOut[0], PHASE.phoneOut[1]));
  const phoneLift = (1 - out(prog(T, PHASE.phoneIn[0], PHASE.phoneIn[1] + 0.3))) * 60;
  let zoom = 1;
  for (const [a, b, c, d, s] of ZOOMS) {
    if (T < a || T > d) continue;
    const up = lerp(1, s, ease(prog(T, a, b)));
    zoom = up - (up - 1) * ease(prog(T, c, d));
  }

  // ---- montage + end card
  const m = [...MONT].reverse().find((x) => T >= x.t0 && T < MONTAGE_END + 3.5);
  const montO = m ? Math.min(prog(T, MONT[0].t0, MONT[0].t0 + 0.35), 1) * (1 - 0.9 * prog(T, PHASE.endIn - 0.1, PHASE.endIn + 0.5)) : 0;
  const endO = out(prog(T, PHASE.endIn, PHASE.endIn + 0.7));
  const paper = T >= BLOOM_AT - 0.05 && T < PHASE.phoneOut[1] ? prog(T, BLOOM_AT, BLOOM_AT + 0.6) : T >= MONT[0].t0 ? 1 : 0;

  return (
    <div className="stage" style={{ '--paperMix': paper }}>
      <div className="paperwash" style={{ opacity: paper }} />
      <svg className="grid" width="1920" height="1080" aria-hidden>
        {Array.from({ length: 17 }, (_, i) => <line key={`v${i}`} x1={i * 120} y1="0" x2={i * 120} y2="1080" />)}
        {Array.from({ length: 10 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 120} x2="1920" y2={i * 120} />)}
      </svg>
      <div className="reg reg--tl" /><div className="reg reg--tr" /><div className="reg reg--bl" /><div className="reg reg--br" />
      <div className="ticker mono">
        <span>Graticule</span><span>A daily map game for Reddit</span><span>Built on Devvit</span>
        <span className="ticker__t">{fmtT(T)}</span>
      </div>

      <div className="captions">
        {CAPTIONS.map((c, i) => <Caption key={i} c={c} T={T} />)}
      </div>

      <div className="phone" style={{ opacity: phoneO, left: PHONE.cx - SCREEN.w / 2 - 14, top: SCREEN_TOP - 14 + phoneLift,
        transformOrigin: `${SCREEN.w / 2 + 14}px ${MAP_FOCUS_Y - SCREEN_TOP + 14}px`, transform: `scale(${zoom})` }}>
        <div className="phone__screen" style={{ width: SCREEN.w, height: SCREEN.h }}>
          <div className="phone__status"><span>9:41</span><span className="phone__notch" /><span className="phone__icons"><i /><i /><b /></span></div>
          <iframe id="game" title="game" src={`/splash.html`} style={{ top: PHONE.status, width: PHONE.w, height: PHONE.h, transform: `scale(${PHONE.scale})` }} />
          {window.__HAS_CLIP && T > INSERT.t0 - 0.05 && T < INSERT.t1 && <img id="clip" className="phone__clip" alt="" src={clipFrame(T)}
            style={{ opacity: Math.min(prog(T, INSERT.t0, INSERT.t0 + 0.25), 1 - prog(T, INSERT.t1 - 0.25, INSERT.t1)) }} />}
        </div>
      </div>

      {hookO > 0 && (
        <div className="hook" style={{ opacity: hookO, left: hookX - hookW / 2, top: hookY - hookH / 2, width: hookW, transform: `scale(${hookScale})` }}>
          <div className="hook__label mono" style={{ opacity: 1 - hand }}>Mystery map · darker = more</div>
          <MapView bands={HOOK_BANDS} bandCount={HOOK.thresholds.length + 1} ramp={null} compact />
        </div>
      )}

      {taps.map((tp, i) => {
        const k = (T - tp.t) / 0.65;
        if (k < 0 || k > 1) return null;
        if (window.__HAS_CLIP && tp.t >= INSERT.t0 && tp.t < INSERT.t1) return null; // the recording shows its own taps
        return (
          <div key={i} className="tap" style={{ left: tp.x, top: tp.y }}>
            <span className="tap__ring" style={{ transform: `translate(-50%,-50%) scale(${0.5 + out(k) * 1.1})`, opacity: 0.9 * (1 - k) }} />
            <span className="tap__dot" style={{ opacity: k < 0.35 ? 0.85 : 0.85 * (1 - (k - 0.35) / 0.65) }} />
          </div>
        );
      })}

      {montO > 0 && m && <Montage m={m} T={T} o={montO} />}
      {endO > 0 && <EndCard o={endO} T={T} />}
    </div>
  );
}

function Montage({ m, T, o }) {
  const local = T - m.t0;
  const ramp = local < 0.22 ? null : RAMPS[m.d.cat];
  const lab = out(prog(local, 0.25, 0.7)) * (1 - prog(T, PHASE.endIn - 0.2, PHASE.endIn + 0.1));
  return (
    <div className="montage" style={{ opacity: o }}>
      <div className="montage__map">
        <MapView key={m.id} bands={m.bands} bandCount={m.d.thresholds.length + 1} ramp={ramp} origin={m.d.top[0][0]} compact />
      </div>
      <div className="montage__label" style={{ opacity: lab, transform: `translateY(${(1 - lab) * 18}px)` }}>
        <div className="cap__kicker"><i />N°{String(m.n).padStart(3, '0')} · World Bank data</div>
        <div className="montage__answer">{m.d.answer}</div>
      </div>
    </div>
  );
}

function EndCard({ o, T }) {
  const a = out(prog(T, PHASE.endIn + 0.35, PHASE.endIn + 1.1));
  return (
    <div className="end" style={{ opacity: o }}>
      <div className="end__mark mono">Graticule</div>
      <div className="end__line" style={{ opacity: a, transform: `translateY(${(1 - a) * 16}px)` }}>One mystery map a day.</div>
      <div className="end__sub mono" style={{ opacity: a }}>r/GraticuleDaily · Built on Reddit’s Developer Platform</div>
    </div>
  );
}

const fmtT = (T) => `00:${String(Math.floor(T)).padStart(2, '0')}`;

// ---------------------------------------------------------------- clock + actions
const root = createRoot(document.getElementById('root'));
const born = new WeakMap();
function tick(doc, T) {
  if (!doc) return;
  for (const a of doc.getAnimations()) {
    if (!born.has(a)) born.set(a, T);
    a.pause();
    a.currentTime = Math.max(0, (T - born.get(a)) * 1000);
  }
}
const frameDoc = () => document.getElementById('game')?.contentDocument;
const frameWin = () => document.getElementById('game')?.contentWindow;

function scrollFor(T) {
  const doc = frameDoc();
  const win = frameWin();
  if (!doc || !win || T >= 44.3) return;
  let y = 0;
  for (const s of SCROLLS) {
    if (T < s.t0) break;
    const el = doc.querySelector(s.sel);
    if (!el) continue;
    const target = el.getBoundingClientRect().top + win.scrollY - s.offset;
    y = lerp(y, target, ease(prog(T, s.t0, s.t1)));
  }
  win.scrollTo(0, Math.max(0, y));
}

function injectFrameCss() {
  const doc = frameDoc();
  if (!doc || doc.getElementById('stage-css')) return;
  const st = doc.createElement('style');
  st.id = 'stage-css';
  st.textContent = '.toast{display:none!important} html{scrollbar-width:none} ::-webkit-scrollbar{display:none}';
  doc.head?.appendChild(st);
}

function clipFrame(T) {
  const i = Math.max(1, Math.round((T - INSERT.t0) * INSERT.fps) + 1);
  return `${INSERT.frames}${String(i).padStart(4, '0')}.jpg`;
}
async function seekClip() {
  const img = document.getElementById('clip');
  if (img) await img.decode().catch(() => undefined);
}

window.__frame = async (T) => {
  flushSync(() => root.render(<Stage T={T} />));
  await seekClip();
  injectFrameCss();
  scrollFor(T);
  tick(document, T);
  tick(frameDoc(), T);
  return true;
};

window.__act = (i) => {
  const a = ACTIONS[i];
  const iframe = document.getElementById('game');
  if (a.kind === 'goto') {
    iframe.src = a.url;
    return 'goto';
  }
  const doc = frameDoc();
  let el = null;
  if (a.iso) el = doc.querySelector(`.map__countries [data-id="${a.iso}"]`) ?? doc.querySelector(`[data-id="${a.iso}"]`);
  else el = [...doc.querySelectorAll(a.sel)].find((e) => !a.text || e.textContent.includes(a.text)) ?? null;
  if (!el) return `missing ${a.sel ?? a.iso}`;
  const r = el.getBoundingClientRect();
  const f = iframe.getBoundingClientRect();
  const k = f.width / PHONE.w; // includes any camera zoom
  taps.push({ t: a.t, x: f.left + (r.left + r.width / 2) * k, y: f.top + (r.top + r.height / 2) * k });
  if (typeof el.click === 'function') el.click();
  else el.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
  return 'ok';
};

try {
  localStorage.removeItem('graticule.help.v1'); // show the how-to card once, on camera
} catch {
  /* ignore */
}
window.__DAY = DAY;
window.__HAS_CLIP = false;
fetch(`${INSERT.frames}0001.jpg`, { method: 'HEAD' })
  .then((r) => { window.__HAS_CLIP = r.ok; })
  .catch(() => undefined)
  .finally(() => window.__frame(0));
