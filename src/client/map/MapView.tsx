import { memo, useMemo } from 'react';
import { CENTER, DISPLAY, DOTS, GRATICULE, H, SHAPES, W, colorFor } from './geo';

type Props = {
  bands: Record<string, number>;
  bandCount: number;
  /** null = display greys (play); a ramp = bloomed colour (reveal) */
  ramp: string[] | null;
  /** country the bloom ripples out from */
  origin?: string | undefined;
  selected?: string | null | undefined;
  marked?: string[] | undefined;
  onPick?: ((id: string) => void) | undefined;
  compact?: boolean;
};

function MapViewImpl({ bands, bandCount, ramp, origin, selected, marked, onPick, compact }: Props) {
  const o = (origin && CENTER[origin]) || null;
  const delays = useMemo(() => {
    const m: Record<string, number> = {};
    if (!o) return m;
    for (const [id, [x, y]] of Object.entries(CENTER)) m[id] = Math.min(900, Math.hypot(x - o[0], y - o[1]) * 0.9);
    return m;
  }, [o]);
  const fill = (id: string) => {
    const b = bands[id];
    if (b === undefined) return 'url(#nodata)';
    return colorFor(ramp ?? DISPLAY, b, bandCount);
  };
  const style = (id: string, i: number) =>
    ramp
      ? { transitionDelay: `${delays[id] ?? 0}ms` }
      : { animationDelay: `${Math.round((CENTER[id]?.[0] ?? (i % 40) * 24) * 0.55)}ms` };
  const mark = new Set(marked ?? []);
  return (
    <svg
      className={`map ${ramp ? 'map--bloom' : 'map--display'} ${compact ? 'map--compact' : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="World map shaded by a mystery statistic"
    >
      <defs>
        <pattern id="nodata" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--nodata-bg)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--nodata-line)" strokeWidth="1.2" />
        </pattern>
        <clipPath id="frame">
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      <path className="map__graticule" d={GRATICULE} clipPath="url(#frame)" />
      <g className="map__countries">
        {SHAPES.map((s, i) => (
          <path
            key={`${s.id}-${i}`}
            d={s.d}
            style={{ fill: fill(s.id), ...style(s.id, i) }}
            className={`${selected === s.id ? 'is-selected' : ''} ${mark.has(s.id) ? 'is-marked' : ''}`}
            onClick={onPick ? () => onPick(s.id) : undefined}
          />
        ))}
      </g>
      <g className="map__dots">
        {DOTS.filter((d) => bands[d.id] !== undefined).map((d) => (
          <g key={d.id} onClick={onPick ? () => onPick(d.id) : undefined}>
            <circle cx={d.x} cy={d.y} r={9} fill="transparent" />
            <circle
              cx={d.x}
              cy={d.y}
              r={selected === d.id || mark.has(d.id) ? 4.6 : 3.2}
              style={{ fill: fill(d.id), ...style(d.id, 0) }}
              className={`${selected === d.id ? 'is-selected' : ''} ${mark.has(d.id) ? 'is-marked' : ''}`}
            />
          </g>
        ))}
      </g>
      {marked?.map((id) => {
        const c = CENTER[id];
        return c ? <circle key={`ring-${id}`} className="map__ring" cx={c[0]} cy={c[1]} r={14} /> : null;
      })}
    </svg>
  );
}

export const MapView = memo(MapViewImpl);
