import { geoEqualEarth, geoGraticule, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import world from '../../shared/world.json';
import names from '../../shared/countries.json';
import type { Category } from '../../shared/api';

export const W = 960;

type WorldFile = { topo: Topology<{ countries: GeometryCollection }>; dots: [string, number, number][] };
const wf = world as unknown as WorldFile;
const fc = feature(wf.topo, wf.topo.objects.countries) as FeatureCollection<Geometry, Record<string, never>>;

const projection = geoEqualEarth().fitWidth(W, fc as GeoPermissibleObjects);
const path = geoPath(projection);
const [[, y0], [, y1]] = path.bounds(fc as GeoPermissibleObjects);
projection.translate([projection.translate()[0], projection.translate()[1] - y0 + 6]);
export const H = Math.ceil(y1 - y0 + 12);

export type Shape = { id: string; d: string; cx: number; cy: number; area: number };
export type Dot = { id: string; x: number; y: number };

export const SHAPES: Shape[] = fc.features.map((f: Feature<Geometry>) => {
  const [cx, cy] = path.centroid(f as GeoPermissibleObjects);
  return { id: String(f.id), d: path(f as GeoPermissibleObjects) ?? '', cx, cy, area: path.area(f as GeoPermissibleObjects) };
});

export const DOTS: Dot[] = wf.dots.flatMap(([id, lon, lat]) => {
  const p = projection([lon, lat]);
  return p ? [{ id, x: p[0], y: p[1] }] : [];
});

export const GRATICULE = path(geoGraticule().step([15, 15])()) ?? '';
export const OUTLINE = path({ type: 'Sphere' }) ?? '';

export const CENTER: Record<string, [number, number]> = {};
for (const s of SHAPES) if (!(s.id in CENTER) || s.area > 0) CENTER[s.id] ??= [s.cx, s.cy];
for (const d of DOTS) CENTER[d.id] = [d.x, d.y];

export const NAMES = names as Record<string, string>;
export const nameOf = (id: string) => NAMES[id] ?? id;

// ---------- palettes (DESIGN.md) ----------
export const DISPLAY = ['#eceeed', '#d5d8d6', '#b9bcbb', '#9a9d9c', '#77797a', '#515254', '#2a2a2e'];
export const RAMPS: Record<Category, string[]> = {
  people: ['#fbe1d1', '#f6c2a2', '#ee9b72', '#dc7048', '#bb4f2c', '#8a3620', '#5d2a1a'],
  planet: ['#e3f0e1', '#c2e0bf', '#96c995', '#66ab6c', '#3f8a50', '#256a3d', '#134a2b'],
  money: ['#f7ecc8', '#efd893', '#e2bd5c', '#cc9b34', '#a87822', '#7d5818', '#523a10'],
  health: ['#f6e0e6', '#ecbccb', '#dd93ab', '#c76b8b', '#a5496c', '#7a3150', '#4f1d36'],
  tech: ['#e1ebf5', '#bcd3ea', '#8fb4da', '#6292c5', '#3f71a8', '#2a5383', '#1a385c'],
  diverging: ['#2a5383', '#6292c5', '#bcd3ea', '#f2efe9', '#f6c2a2', '#dc7048', '#8a3620'],
};

/** Map a band (0..count-1) onto a 7-step ramp. */
export function colorFor(ramp: string[], band: number, count: number): string {
  const i = count <= 1 ? ramp.length - 1 : Math.round((band * (ramp.length - 1)) / (count - 1));
  return ramp[Math.max(0, Math.min(ramp.length - 1, i))]!;
}

export function formatValue(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  const d = a >= 100 ? 0 : a >= 1 ? 1 : 2;
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
