export const MAX_TRIES = 4;
export const CHOICES = 6;

export type Category = 'people' | 'planet' | 'money' | 'health' | 'tech' | 'diverging';
export const THEMES: { id: Exclude<Category, 'diverging'>; label: string }[] = [
  { id: 'people', label: 'People' },
  { id: 'planet', label: 'Planet' },
  { id: 'money', label: 'Money' },
  { id: 'health', label: 'Health' },
  { id: 'tech', label: 'Tech' },
];

/** Hints unlock one per wrong guess, in this order. */
export type Hints = {
  /** band edges (no unit). Unlocked after 1 wrong guess. */
  legend?: number[];
  /** highest and lowest country. After 2 wrong. */
  extremes?: { top: [string, number]; bottom: [string, number] };
  /** unit of measure. After 3 wrong. */
  unit?: string;
};

export type Reveal = {
  answer: string;
  /** the World Bank's official indicator name */
  indicator: string;
  unit: string;
  year: number;
  fact: string;
  category: Category;
  source: { name: string; org: string; url: string; license: string };
  top: [string, number][];
  bottom: [string, number][];
  /** real values, only sent after the game is over */
  values: Record<string, number>;
};

export type Stats = {
  players: number;
  /** solved in 1,2,3,4 tries, then failed */
  dist: [number, number, number, number, number];
};

export type MyGame = {
  /** indexes into choices, in order */
  guesses: number[];
  solved: boolean;
  done: boolean;
};

export type PuzzleState = {
  type: 'state';
  n: number;
  date: string;
  isToday: boolean;
  /** band index (0..k-1) per ISO3. Values are hidden until the reveal. */
  bands: Record<string, number>;
  bandCount: number;
  choices: string[];
  game: MyGame;
  hints: Hints;
  reveal?: Reveal;
  stats: Stats;
  me: Me;
  /** epoch ms when the next daily map drops */
  nextAt: number;
};

export type Me = {
  username: string | null;
  loggedIn: boolean;
  streak: number;
  best: number;
  played: number;
};

export type SplashState = {
  type: 'splash';
  n: number;
  date: string;
  bands: Record<string, number>;
  bandCount: number;
  players: number;
  me: Me;
  game: MyGame | null;
  nextAt: number;
};

export type GuessResponse = PuzzleState;

export type LeaderRow = { rank: number; username: string; value: number; tries?: number; seconds?: number };
export type LeaderboardResponse = { type: 'leaderboard'; n: number; today: LeaderRow[]; streaks: LeaderRow[]; myRank: number | null };

export type ArchiveItem = { n: number; date: string; result: MyGame | null; answer?: string; category?: Category };
export type ArchiveResponse = { type: 'archive'; items: ArchiveItem[] };

export type VoteState = { type: 'vote'; options: { id: string; label: string; votes: number }[]; mine: string | null; forN: number };

export type ErrorResponse = { type: 'error'; message: string };

/** Spoiler-free share text. */
export function resultText(n: number, game: MyGame, streak: number): string {
  const marks = Array.from({ length: MAX_TRIES }, (_, i) => {
    if (i >= game.guesses.length) return '·';
    return game.solved && i === game.guesses.length - 1 ? '●' : '✕';
  }).join(' ');
  const score = game.solved ? `${game.guesses.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
  const tail = streak > 1 ? `   ▲ ${streak}-day streak` : '';
  return `GRATICULE N°${String(n).padStart(3, '0')} — ${score}\n${marks}${tail}`;
}
