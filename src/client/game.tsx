import './styles.css';

import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { showForm, showLoginPrompt, showShareSheet } from '@devvit/web/client';
import {
  MAX_TRIES,
  resultText,
  type ArchiveResponse,
  type LeaderboardResponse,
  type PuzzleState,
  type VoteState,
} from '../shared/api';
import { MapView } from './map/MapView';
import { iconFor } from '../shared/icons';
import { DISPLAY, RAMPS, colorFor, formatValue, nameOf } from './map/geo';
import { ApiError, api, pad3, prettyDate, useCountdown, useToast } from './lib';

type View = { kind: 'play'; n?: number } | { kind: 'archive' } | { kind: 'board' };
const KEYS = 'ABCD';
const LEVELS = ['Very low', 'Low', 'Below average', 'Middle', 'Above average', 'High', 'Very high'];
const levelOf = (band: number, count: number) => LEVELS[count <= 1 ? 6 : Math.round((band * 6) / (count - 1))]!;
const HELP_KEY = 'graticule.help.v1';
const helpSeen = () => {
  try {
    return localStorage.getItem(HELP_KEY) === '1';
  } catch {
    return false;
  }
};

function App() {
  const [view, setView] = useState<View>({ kind: 'play' });
  const [toast, setToast] = useToast();
  const [help, setHelp] = useState(() => !helpSeen());
  const closeHelp = () => {
    setHelp(false);
    try {
      localStorage.setItem(HELP_KEY, '1');
    } catch {
      /* private mode */
    }
  };
  const go = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  };
  return (
    <div className="app">
      <Nav view={view} go={go} onHelp={() => setHelp(true)} />
      {view.kind === 'play' && <Play key={view.n ?? 'today'} n={view.n} go={go} toast={setToast} />}
      {view.kind === 'archive' && <Archive go={go} />}
      {view.kind === 'board' && <Board />}
      {help && <HowTo close={closeHelp} />}
      {toast && <div className="toast mono" role="status">{toast}</div>}
    </div>
  );
}

function Nav({ view, go, onHelp }: { view: View; go: (v: View) => void; onHelp: () => void }) {
  const tab = (kind: View['kind'], label: string) => (
    <button
      className={`tab ${view.kind === kind && !(kind === 'play' && view.kind === 'play' && view.n) ? 'is-on' : ''}`}
      aria-current={view.kind === kind ? 'page' : undefined}
      onClick={() => go(kind === 'play' ? { kind: 'play' } : kind === 'archive' ? { kind: 'archive' } : { kind: 'board' })}
    >
      {label}
    </button>
  );
  return (
    <nav className="tabs" aria-label="Graticule">
      {tab('play', 'Today')}
      {tab('archive', 'Archive')}
      {tab('board', 'Leaderboard')}
      <button className="tab tab--help" onClick={onHelp} aria-label="How to play">How to play</button>
    </nav>
  );
}

// ---------------------------------------------------------------- play

function Play({ n, go, toast }: { n: number | undefined; go: (v: View) => void; toast: (m: string) => void }) {
  const [s, setS] = useState<PuzzleState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [probe, setProbe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<PuzzleState>(`/state${n ? `?n=${n}` : ''}`).then(setS, (e: Error) => setErr(e.message));
  }, [n]);

  const done = !!s?.game.done;
  useEffect(() => {
    document.body.classList.toggle('is-paper', done);
    return () => document.body.classList.remove('is-paper');
  }, [done]);

  const lockIn = async () => {
    if (!s || picked === null) return;
    if (!s.me.loggedIn) return safe(showLoginPrompt);
    setBusy(true);
    try {
      const next = await api<PuzzleState>('/guess', { n: s.n, choice: picked });
      setS(next);
      setPicked(null);
      if (!next.game.done) toast(next.game.guesses.length === 1 ? 'Not that. Hint 1 unlocked: the unit' : 'Not that. Last hint unlocked');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) safe(showLoginPrompt);
      else toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (err) return <Message text={err} go={go} />;
  if (!s) return <Loading />;

  const ramp = s.reveal ? RAMPS[s.reveal.category] : null;
  const wrong = new Set(s.game.solved ? s.game.guesses.slice(0, -1) : s.game.guesses);

  return (
    <>
      <header className="strip">
        <span className="wordmark">GRATICULE</span>
        <span className="mono muted">N°{pad3(s.n)}</span>
        <span className="spacer" />
        <span className="mono muted">{MAX_TRIES - s.game.guesses.length > 0 && !done ? `${MAX_TRIES - s.game.guesses.length} ${MAX_TRIES - s.game.guesses.length === 1 ? 'try' : 'tries'} left` : ''}</span>
        <Leds game={s.game} />
      </header>
      {!s.isToday && (
        <div className="banner">
          <span>Archive map from {prettyDate(s.date)}. It doesn&apos;t count toward your streak.</span>
          <button className="textlink" onClick={() => go({ kind: 'play' })}>Go to today&apos;s map</button>
        </div>
      )}

      <div className="display">
        <span className="reg" />
        <span className="display__label mono">{done ? `${s.reveal?.year ?? ''} · ${s.reveal?.unit ?? ''}` : 'Mystery map · darker = more'}</span>
        <MapView bands={s.bands} bandCount={s.bandCount} ramp={ramp} origin={s.reveal?.top[0]?.[0]} selected={probe} onPick={setProbe} />
      </div>
      <Readout s={s} probe={probe} ramp={ramp} />

      {!done && (
        <>
          <Clue s={s} onPick={setProbe} />
          <HintRail s={s} />
          <p className="q">What do these countries have in common? What does the map show?</p>
          <div className="choices" role="listbox">
            {s.choices.map((c, i) => (
              <button
                key={c}
                role="option"
                aria-selected={picked === i}
                disabled={wrong.has(i) || busy}
                className={`choice ${wrong.has(i) ? 'is-wrong' : ''} ${picked === i ? 'is-picked' : ''}`}
                onClick={() => setPicked(i)}
              >
                <span className="choice__key">{KEYS[i]}</span>
                <span className="choice__icon" aria-hidden>{iconFor(c)}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
          <button className="bar" disabled={picked === null || busy} onClick={lockIn}>
            {busy ? <span className="blink">Reading…</span> : picked === null ? 'Pick an answer' : `Lock in ${KEYS[picked]}`}
          </button>
          <p className="mono muted" style={{ textAlign: 'center', margin: '0 16px 24px' }}>
            {s.stats.players.toLocaleString()} people have played {s.isToday ? "today's map" : 'this map'}
          </p>
        </>
      )}
      {done && <RevealPanel s={s} go={go} toast={toast} />}
    </>
  );
}

function Leds({ game }: { game: PuzzleState['game'] }) {
  return (
    <span className="leds" aria-label={`${game.guesses.length} of ${MAX_TRIES} tries used`}>
      {Array.from({ length: MAX_TRIES }, (_, i) => {
        const used = i < game.guesses.length;
        const win = game.solved && i === game.guesses.length - 1;
        return <span key={i} className={`led ${used ? 'is-used' : ''} ${win ? 'is-win' : ''}`} />;
      })}
    </span>
  );
}

function Readout({ s, probe, ramp }: { s: PuzzleState; probe: string | null; ramp: string[] | null }) {
  const scale = (
    <span className="scale" aria-hidden>
      <span>less</span>
      <span className="ramp">
        {Array.from({ length: s.bandCount }, (_, b) => <span key={b} style={{ background: colorFor(ramp ?? DISPLAY, b, s.bandCount) }} />)}
      </span>
      <span>more</span>
    </span>
  );
  if (!probe) return <div className="readout mono muted"><span>Tap a country</span>{scale}</div>;
  const band = s.bands[probe];
  const value = s.reveal?.values[probe];
  return (
    <div className="readout mono">
      <span>
        <b>{nameOf(probe)}</b>{' '}
        {band === undefined
          ? '· no data'
          : value !== undefined
            ? `· ${formatValue(value)} ${s.reveal?.unit ?? ''}`
            : `· ${levelOf(band, s.bandCount)}`}
      </span>
      {scale}
    </div>
  );
}

function Clue({ s, onPick }: { s: PuzzleState; onPick: (id: string) => void }) {
  const row = (label: string, ids: string[], swatch: string) => (
    <div className="clue__row">
      <span className="clue__label mono"><i style={{ background: swatch }} />{label}</span>
      <span className="clue__names">
        {ids.map((id) => (
          <button key={id} className="clue__name" onClick={() => onPick(id)}>{nameOf(id)}</button>
        ))}
      </span>
    </div>
  );
  return (
    <div className="clue" aria-label="Clue">
      {row('Most', s.hints.most, colorFor(DISPLAY, s.bandCount - 1, s.bandCount))}
      {row('Least', s.hints.least, colorFor(DISPLAY, 0, s.bandCount))}
    </div>
  );
}

function HintRail({ s }: { s: PuzzleState }) {
  const h = s.hints;
  return (
    <div className="hints">
      <div className={`hint ${h.unit ? '' : 'is-locked'}`}>
        <div className="hint__title mono"><span>Hint 1</span><span>{h.unit ? '' : '⌧'}</span></div>
        <div className={`hint__body ${h.unit ? '' : 'muted'}`}>{h.unit ? `Measured in: ${h.unit}` : 'The unit. Unlocks after 1 miss'}</div>
      </div>
      <div className={`hint ${h.nudge ? '' : 'is-locked'}`}>
        <div className="hint__title mono"><span>Hint 2</span><span>{h.nudge ? '' : '⌧'}</span></div>
        <div className={`hint__body ${h.nudge ? '' : 'muted'}`}>{h.nudge ?? 'An everyday nudge. Unlocks after 2 misses'}</div>
      </div>
    </div>
  );
}

function HowTo({ close }: { close: () => void }) {
  return (
    <div className="howto" role="dialog" aria-modal="true" aria-labelledby="howto-title" onClick={close}>
      <div className="howto__card" onClick={(e) => e.stopPropagation()}>
        <div className="mono muted">How to play</div>
        <h2 id="howto-title">Guess what the map shows</h2>
        <ol>
          <li><b>Every country is shaded by one real fact.</b> Darker means more.</li>
          <li><b>Look at the clue:</b> which countries have the most, and which the least? Tap any country to check it.</li>
          <li><b>Pick 1 of 4 answers.</b> You get 3 tries, and each miss unlocks a hint.</li>
        </ol>
        <p className="muted">A new map every day. Solve it to grow your streak.</p>
        <button className="bar" style={{ width: '100%', margin: '14px 0 0' }} onClick={close}>Got it</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- reveal

function RevealPanel({ s, go, toast }: { s: PuzzleState; go: (v: View) => void; toast: (m: string) => void }) {
  const r = s.reveal!;
  const tries = s.game.guesses.length;
  const text = resultText(s.n, s.game, s.me.streak);
  const [shared, setShared] = useState(false);
  const total = s.stats.dist.reduce((a, b) => a + b, 0) || 1;
  const myRow = s.game.solved ? tries - 1 : MAX_TRIES;
  const isMe = useMemo(() => myRow, [myRow]);

  const share = async () => {
    try {
      await api('/share', { n: s.n });
      setShared(true);
      toast('Posted to the comments');
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const copy = async () => {
    try {
      await showShareSheet({ text, title: `Graticule N°${pad3(s.n)}` });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        toast('Copied');
      } catch {
        toast('Could not copy');
      }
    }
  };

  return (
    <section className="reveal">
      <div className="eyebrow mono">The map showed</div>
      <h1 className="answer">{r.answer}</h1>
      <div className="unit">{r.unit} · {r.year}</div>
      <span className={`verdict mono ${s.game.solved ? '' : 'is-miss'}`}>
        {s.game.solved ? `Read in ${tries} of ${MAX_TRIES}` : 'Not this time'}
        {s.isToday && s.me.streak > 1 ? ` · ▲ ${s.me.streak}` : ''}
      </span>

      <div className="factcard">
        <div className="mono">Surprising fact</div>
        <p>{r.fact}</p>
      </div>

      <div className="extremes">
        <div>
          <div className="mono eyebrow">Highest</div>
          <ol>{r.top.map(([id, v]) => <li key={id}><span>{nameOf(id)}</span><b>{formatValue(v)}</b></li>)}</ol>
        </div>
        <div>
          <div className="mono eyebrow">Lowest</div>
          <ol>{r.bottom.map(([id, v]) => <li key={id}><span>{nameOf(id)}</span><b>{formatValue(v)}</b></li>)}</ol>
        </div>
      </div>
      <p className="source">
        Source: {r.source.name}, &ldquo;{r.indicator}&rdquo; ({r.source.license}).{' '}
        <a href={r.source.url} target="_blank" rel="noreferrer">Data page</a>
      </p>

      <div className="card">
        <div className="mono eyebrow">Your result</div>
        <div className="resulttext">{text}</div>
        <div className="pills">
          {s.me.loggedIn ? (
            <button className="pill" onClick={share} disabled={shared}>{shared ? 'Posted ✓' : 'Post to comments'}</button>
          ) : (
            <button className="pill" onClick={() => safe(showLoginPrompt)}>Log in to post</button>
          )}
          <button className="pill pill--ghost" onClick={copy}>Share</button>
        </div>
        {s.me.loggedIn && !shared && <div className="mono muted" style={{ marginTop: 8 }}>Posts this card as a comment from u/{s.me.username}</div>}
        <div className="mono eyebrow" style={{ marginTop: 18 }}>How everyone did · {s.stats.players.toLocaleString()} players</div>
        <div className="dist">
          {['1', '2', '3', '✕'].map((label, i) => (
            <div key={label} className={`dist__row ${i === isMe ? 'is-me' : ''}`}>
              <span>{label}</span>
              <span className="dist__bar"><span style={{ width: `${(100 * s.stats.dist[i]!) / total}%` }} /></span>
              <span>{Math.round((100 * s.stats.dist[i]!) / total)}%</span>
            </div>
          ))}
        </div>
      </div>

      {s.isToday && <Vote toast={toast} />}

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <div className="mono eyebrow">Next map in</div>
        <Countdown at={s.nextAt} />
      </div>
      <div className="linkrow">
        <button className="textlink" onClick={() => go({ kind: 'archive' })}>Play past maps</button>
        <button className="textlink" onClick={() => go({ kind: 'board' })}>Leaderboard</button>
        <button className="textlink" onClick={() => suggest(toast)}>Suggest a map</button>
      </div>
    </section>
  );
}

function Countdown({ at }: { at: number }) {
  return <div className="countdown">{useCountdown(at)}</div>;
}

function Vote({ toast }: { toast: (m: string) => void }) {
  const [v, setV] = useState<VoteState | null>(null);
  useEffect(() => {
    api<VoteState>('/vote').then(setV, () => undefined);
  }, []);
  const cast = useCallback(async (theme: string) => {
    try {
      setV(await api<VoteState>('/vote', { theme }));
    } catch (e) {
      toast((e as Error).message);
    }
  }, [toast]);
  if (!v) return null;
  const total = v.options.reduce((a, o) => a + o.votes, 0);
  return (
    <div className="card" style={{ boxShadow: 'none', background: '#f7f3ec' }}>
      <div className="mono eyebrow">Steer tomorrow · N°{pad3(v.forN)} theme</div>
      <div className="vote">
        {v.options.map((o) => (
          <button key={o.id} className={v.mine === o.id ? 'is-mine' : ''} onClick={() => cast(o.id)}>
            {o.label}
            <small>{v.mine ? `${total ? Math.round((100 * o.votes) / total) : 0}%` : 'vote'}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

async function suggest(toast: (m: string) => void) {
  try {
    const res = await showForm({
      title: 'Suggest a mystery map',
      description: 'What should a future Graticule show? Moderators check every source before it goes in the bank.',
      fields: [
        { name: 'text', label: 'What should the map measure?', type: 'string', required: true },
        { name: 'source', label: 'Where is the data from? (link)', type: 'string' },
      ],
      acceptLabel: 'Send',
    } as const);
    if (res.action !== 'SUBMITTED') return;
    await api('/suggest', res.values);
    toast('Thanks! Sent to the mods');
  } catch (e) {
    toast((e as Error).message || 'Forms only work on Reddit');
  }
}

// ---------------------------------------------------------------- archive & board

function Archive({ go }: { go: (v: View) => void }) {
  const [a, setA] = useState<ArchiveResponse | null>(null);
  useEffect(() => {
    api<ArchiveResponse>('/archive').then(setA, () => setA({ type: 'archive', items: [] }));
  }, []);
  return (
    <>
      <Header />
      <section className="panel">
        <div className="mono eyebrow">Every map so far · tap one to play it</div>
        <h2>Archive</h2>
        {!a ? <Loading /> : (
          <div className="tiles">
            {a.items.map((it, i) => (
              <button key={it.n} className={`tile ${it.result?.done ? 'is-done' : ''} ${i === 0 ? 'is-today' : ''}`} onClick={() => go({ kind: 'play', n: it.n })}>
                <span className="mono">N°{pad3(it.n)}</span>
                <span className="tile__ans">{it.answer ?? (it.result ? 'In progress' : 'Not played yet')}</span>
                <span className="mono tile__meta">
                  {it.result?.done ? (it.result.solved ? `${it.result.guesses.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`) : prettyDate(it.date)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Board() {
  const [b, setB] = useState<LeaderboardResponse | null>(null);
  useEffect(() => {
    api<LeaderboardResponse>('/leaderboard').then(setB, () => undefined);
  }, []);
  return (
    <>
      <Header />
      <section className="panel">
        <div className="mono eyebrow">N°{b ? pad3(b.n) : '…'} · fewest tries, then fastest</div>
        <h2>Today&apos;s sharpest readers</h2>
        {!b ? <Loading /> : (
          <>
            <div className="rows">
              {b.today.length === 0 && <div className="empty">Nobody has solved today&apos;s map yet. Be first.</div>}
              {b.today.map((r) => (
                <div key={r.username} className={`row ${b.myRank === r.rank ? 'is-me' : ''}`}>
                  <span className="mono">{String(r.rank).padStart(2, '0')}</span>
                  <span>u/{r.username}</span>
                  <span className="mono">{r.tries}/{MAX_TRIES} · {fmtSecs(r.seconds ?? 0)}</span>
                </div>
              ))}
            </div>
            <h2 style={{ marginTop: 28 }}>Longest streaks</h2>
            <div className="rows">
              {b.streaks.length === 0 && <div className="empty">No streaks yet.</div>}
              {b.streaks.map((r) => (
                <div key={r.username} className="row">
                  <span className="mono">{String(r.rank).padStart(2, '0')}</span>
                  <span>u/{r.username}</span>
                  <span className="mono">▲ {r.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

const fmtSecs = (s: number) => (s >= 3600 ? '1h+' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

function Header() {
  return (
    <header className="strip">
      <span className="wordmark">GRATICULE</span>
    </header>
  );
}

function Loading() {
  return <div className="loading mono muted"><span className="blink">Loading the map…</span></div>;
}

function Message({ text, go }: { text: string; go: (v: View) => void }) {
  return (
    <div className="panel">
      <p>{text}</p>
      <button className="bar bar--ghost" style={{ width: '100%', margin: 0 }} onClick={() => go({ kind: 'archive' })}>Open the archive</button>
    </div>
  );
}

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* only available inside Reddit */
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
