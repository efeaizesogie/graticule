import './styles.css';

import { StrictMode, useEffect, useState, type MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import { MAX_TRIES, type SplashState } from '../shared/api';
import { MapView } from './map/MapView';
import { api, pad3, prettyDate, useCountdown } from './lib';

function Splash() {
  const [s, setS] = useState<SplashState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<SplashState>('/splash').then(setS, (e: Error) => setErr(e.message));
  }, []);

  const open = (e: MouseEvent) => {
    try {
      requestExpandedMode(e.nativeEvent, 'game');
    } catch {
      window.location.href = 'game.html'; // local preview outside Reddit
    }
  };

  if (err) return <div className="splash"><div className="panel">{err}</div></div>;
  if (!s) return <div className="splash"><div className="loading mono muted"><span className="blink">Calibrating…</span></div></div>;

  const g = s.game;
  return (
    <div className="splash">
      <header className="strip">
        <span className="wordmark">GRATICULE</span>
        <span className="mono muted">N°{pad3(s.n)} · {prettyDate(s.date)}</span>
        <span className="spacer" />
        {s.me.streak > 0 && <span className="mono">▲ {s.me.streak}</span>}
      </header>
      <div className="display" onClick={open}>
        <span className="reg" />
        <span className="display__label mono">Signal unknown</span>
        <MapView bands={s.bands} bandCount={s.bandCount} ramp={null} compact />
      </div>
      {g?.done ? <Done s={s} open={open} /> : (
        <>
          <h1>What does this map measure?</h1>
          <p className="sub mono muted">No title. No legend. {MAX_TRIES} tries · {s.players.toLocaleString()} played</p>
          <button className="bar" onClick={open}>{g ? `Resume · try ${g.guesses.length + 1} of ${MAX_TRIES}` : 'Read the map'}</button>
        </>
      )}
    </div>
  );
}

function Done({ s, open }: { s: SplashState; open: (e: MouseEvent) => void }) {
  const g = s.game!;
  const left = useCountdown(s.nextAt);
  const marks = Array.from({ length: MAX_TRIES }, (_, i) => (i >= g.guesses.length ? '·' : g.solved && i === g.guesses.length - 1 ? '●' : '✕')).join(' ');
  return (
    <>
      <h1>{g.solved ? `Read in ${g.guesses.length}.` : 'This one beat you.'} Next map in {left}</h1>
      <p className="sub marks">{marks}</p>
      <button className="bar bar--ghost" onClick={open}>See the answer & fact</button>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
