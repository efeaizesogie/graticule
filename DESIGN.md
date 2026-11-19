# Graticule — design

> One mystery map a day. No title, no legend. What does it measure?

Two moods, one product:

| Phase | Mood | Reference |
|---|---|---|
| **Play** (splash, guessing) | a measuring instrument: flat machined panel, hairlines, mono readouts, a monochrome map on a "display" | teenage engineering, via Refero ("industrial catalogue under studio light") |
| **Reveal** (answer, fact, result card) | an editorial chart on warm paper: a serif headline, one peach accent card, the map blooming into colour | Steep, via Refero ("serif analytics on warm paper") |

The switch from greyscale instrument to warm colour **is** the reward. Everything before the reveal is achromatic apart from one amber signal colour.

## Distinct from neighbours (checked 2026-11-19)
- *World of Maps* (web) also asks "guess the dataset" but on a **rotating 3D globe** in a dark-space look. Graticule is **flat only** (Equal Earth projection), light, paper/instrument, and is built around a narrowing multiple choice plus a hint ladder plus the bloom.
- Devvit map games (MapTap, GeoTap, Sub Scan, GeoGuessr for Reddit, Flag It) ask **where**. Graticule never asks you to place a pin. It asks **what the colour means**, so it plays as a data-literacy game rather than geo-trivia.
- No emoji-square grids copied from Wordle: the result card uses our own glyph language (see below).

## Tokens

```css
--mist:     #f6f8f7;  /* panel / page (play) */
--carbon:   #0f0e12;  /* ink, hairlines, filled buttons, display bezel */
--graphite: #b2b2b2;  /* muted labels, no-data hatch */
--steel:    #e5e5e5;  /* light rules */
--signal:   #f0a800;  /* the ONLY chromatic colour during play: selection, probe, streak */
--paper:    #fbf8f3;  /* reveal canvas (warm) */
--peach:    #fbe1d1;  /* the one accent card per reveal */
--sienna:   #5d2a1a;  /* ink on peach */
--slate:    #777b86;  /* reveal helper text */
```

Map ramps (7 quantile bands, light to dark). During play every map uses `--display` greys; on reveal it blooms into its category's ramp:

| Category | Ramp (band 1 → 7) |
|---|---|
| Display (play) | `#eceeed #d5d8d6 #b9bcbb #9a9d9c #77797a #515254 #2a2a2e` |
| People | peach → sienna `#fbe1d1 #f6c2a2 #ee9b72 #dc7048 #bb4f2c #8a3620 #5d2a1a` |
| Planet | `#e3f0e1 #c2e0bf #96c995 #66ab6c #3f8a50 #256a3d #134a2b` |
| Money | `#f7ecc8 #efd893 #e2bd5c #cc9b34 #a87822 #7d5818 #523a10` |
| Health | `#f6e0e6 #ecbccb #dd93ab #c76b8b #a5496c #7a3150 #4f1d36` |
| Tech | `#e1ebf5 #bcd3ea #8fb4da #6292c5 #3f71a8 #2a5383 #1a385c` |
| Diverging (growth) | `#2a5383 #6292c5 #bcd3ea #f2efe9 #f6c2a2 #dc7048 #8a3620` |

No-data countries: `--steel` fill with a 45° graphite hatch, on both phases.

## Type
- **Inter** 300/400/500 for UI. TE's weight 100 is unreadable at phone sizes, so we use 300, never above 500.
- **JetBrains Mono** 400/500 for every number and label in caps: `N°031`, `TRY 2/4`, `BAND 5/7`, the countdown.
- **Instrument Serif** 400 for reveal headlines only (stands in for Signifier). Never bold.
- All fonts are bundled through `@fontsource`, so nothing loads from a font CDN.

Scale (mobile first): 11 mono caps (letter-spacing .08em) · 13 body · 15 choice · 19 subhead · 28/40 serif headline.

## Shape & space
- Play: **0px radius everywhere**, 1px `--carbon` or `--steel` hairlines, no shadows, no gradients. Spacing 4 / 8 / 15 / 22 / 33.
- Reveal: cards 20px radius, pill buttons 9999px. One soft "artifact" shadow, used only on the result card.
- Corner **registration marks** (little L-brackets) frame the map display. The **graticule** (15° lat/long hairlines) sits under every map, because the name is the brand.

## Screens
1. **Splash (inline, feed):** the mystery map in display greys under the graticule, `N°031 · FRI 20 NOV`, "What does this map measure?", a black `PLAY` bar, small mono stats (`1,204 PLAYED · YOUR STREAK ▲5`). If you have already played: your result plus a countdown to the next map.
2. **Play (expanded):** a top strip (wordmark, N°, 4 try LEDs); the map display; a probe readout ("tap a country": `BRAZIL — BAND 6 OF 7 · RANK 34/201`); a hint rail with 3 slots, LEGEND / EXTREMES / UNIT, locked until earned; 6 choices (mono letters A–F, hairline rows) with a `LOCK IN` bar. A wrong pick strikes through, greys out and unlocks the next hint.
3. **Reveal:** the background warms from mist to paper (400ms), the map blooms band by band, rippling out from the top-ranked country. Serif answer headline, unit and year, then a source line ("World Bank WDI · originally from …"). A peach **fact card**, top-3 and bottom-3 with real values, the community distribution (bars for 1/2/3/4/✕), and the **result card** with Share-to-comments and Copy buttons. Then *Tomorrow's theme* vote, the countdown and the archive link.
4. **Archive:** a grid of past numbered tiles (thumbnail in its revealed ramp if you've played it, display grey if not). Archive plays don't touch your streak.
5. **Leaderboard:** today (fewest tries, then fastest) and longest active streaks.

## Motion
- Load: the graticule draws on (180ms), countries fade in with a west-to-east sweep (≤600ms total).
- Probe: the tapped country gets a 2px `--signal` outline and the readout ticks in mono.
- Wrong: the row shakes 4px, strikes through, and a hint slot flips open (rotateX).
- Bloom: each country moves from display grey to ramp colour with a delay of `distance from the top country × 0.9ms` (cap 900ms) and a 280ms ease-out.
- Respect `prefers-reduced-motion`: no sweep or shake, and the bloom becomes a single crossfade.

## Result card (shared text)
```
GRATICULE N°031 — 2/4
▣ ✕ ● · ·        ▲ streak 5
"I read the map. Can you?"
```
`✕` = wrong, `●` = solved, `·` = unused try. No answer text, so nothing is spoiled.
