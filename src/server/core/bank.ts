import bankJson from '../bank.json';
import type { Category } from '../../shared/api';

export type Dataset = {
  n: number;
  id: string;
  answer: string;
  decoys: string[];
  unit: string;
  cat: Category;
  year: number;
  code: string;
  indicatorName: string;
  source: { name: string; org: string; url: string; license: string };
  thresholds: number[];
  values: Record<string, number>;
  fact: string;
  count: number;
  top: [string, number][];
  bottom: [string, number][];
  clueTop: string[];
  clueBottom: string[];
  nudge: string;
};

export const BANK = bankJson as unknown as Dataset[];
const BY_ID = new Map(BANK.map((d) => [d.id, d]));

export function datasetById(id: string): Dataset | undefined {
  return BY_ID.get(id);
}

/** Theme a dataset belongs to for "tomorrow's theme" voting. */
export function themeOf(d: Dataset): Exclude<Category, 'diverging'> {
  return d.cat === 'diverging' ? 'people' : d.cat;
}

export function bandOf(thresholds: number[], v: number): number {
  let b = 0;
  for (const t of thresholds) if (v >= t) b++;
  return b;
}

export function bandsFor(d: Dataset): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(d.values)) out[k] = bandOf(d.thresholds, v);
  return out;
}

/** Deterministic shuffle so everyone sees the same choice order for day n. */
export function choicesFor(d: Dataset, n: number): string[] {
  const items = [d.answer, ...d.decoys];
  let seed = (n * 2654435761 + d.id.length * 97) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = items[i]!;
    items[i] = items[j]!;
    items[j] = a;
  }
  return items;
}
