# Devpost submission draft: Graticule

**Fill in before submitting:** app link `developers.reddit.com/apps/graticuledaily` (exists after the first `devvit upload`), test subreddit link, demo post link, YouTube video link. Repo: https://github.com/efeaizesogie/graticule

## Tagline
One mystery map a day. No title, no legend. What does it measure?

## Inspiration
I make code-drawn map videos, and the moment people love most is the second they work out what a map is showing. Graticule turns that moment into a daily ritual for Reddit. It's a data-literacy puzzle, not geo-trivia: you never place a pin, you read the colours.

## What it does
- **A new map every day at 00:00 UTC.** Each is a flat Equal Earth world map shaded by one real statistic from the World Bank. During play it is drawn in greys on an instrument-style display with no title and no legend.
- **Made for everyone.** Everyday topics (internet use, how long people live, how rich, how crowded, forests, air pollution), plain-English answers, and a 3-line how-to card on first open. Darker = more.
- **Read and probe.** Tap any country to see if it is *very low* through *very high*.
- **Four choices, three tries.** A miss unlocks a hint: first the **top & bottom** country (ringed on the map), then the **unit**.
- **The bloom.** Finish and the page warms to paper while the map blooms into colour, rippling out from the top country. You get the answer, one surprising fact taken from the data, the real top and bottom countries, and the source with a link.
- **Reddit-native.** Each daily post opens with a stickied *theories thread*. You can share a spoiler-free result card or post it to the comments from your own account. Streaks show as subreddit **user flair** (`▲ 12-day streak`). There's a daily leaderboard and a streak board.
- **The community steers it.** After playing, vote on *tomorrow's theme* (People / Planet / Money / Health / Tech), and the winner picks the next map from the bank. Players can **suggest datasets**, which mods review from the subreddit menu before anything goes live.
- **Archive** of every past map for casual players (it doesn't count toward streaks).

## How I built it
Devvit Web: a Hono server with Redis (games, stats, leaderboards, streaks, votes), the scheduler (daily post), the Reddit API (custom posts with text fallback, a stickied seed comment, user flair, comments posted as the user), and an inline splash plus an expanded game entrypoint. The client is React 19 with d3-geo and topojson rendering Natural Earth 1:110m as SVG; microstates are drawn as dots. A data pipeline pulls 23 everyday indicators from the World Bank API. Facts are hand-written, but their numbers are filled in from the data at build time, and the build fails if a fact cites missing data, so a reveal can never contradict its own map.

## Challenges
- Making 23 very different distributions all read well. 7-band quantile scales plus per-category colour ramps (and a diverging ramp for population growth) do it.
- Keeping answers secret: the client only ever gets band numbers until the game is over.
- Keeping it easy for anyone: decoys are everyday topics that would draw a clearly different map, so common sense ("rich countries are dark here…") gets you there.

## What's next
A UGC pipeline from approved suggestions straight into the bank; regional maps (US states, African countries); a weekly "hard mode" with dot-density maps.

## Built with
devvit, devvit-web, typescript, react, hono, redis, d3-geo, topojson, natural-earth, world-bank-api

---

## Demo video (58.5 s, rendered from the real game code)
File: `video/out/graticule-demo.mp4` (1920x1080, 30 fps, -14 LUFS). Thumbnail: `video/out/thumbnail.jpg`.
Rebuild: `npm run build`, `npx vite build --config video/vite.config.mjs`, start `node tools/mock-server.mjs`, then `node video/capture.mjs`, `node video/audio.mjs`, `node video/mux.mjs`.

| t | picture |
|---|---|
| 0–7.6 | Full-frame grey mystery map. "No title. No legend." / "Every country is shaded by one real fact." |
| 7.6–12 | The map shrinks into the phone (the Reddit post's feed card); tap Play; the How to play card |
| 12–18.7 | Push-in: tap Canada, India, Saudi Arabia, and the readout names each level |
| 18.9–24.7 | A wrong guess strikes through; Hint 1 rings Qatar and Hong Kong |
| 24.9–31 | The right answer, and the map **blooms** from grey to colour (camera push-in, music stops for a beat) |
| 31–37.4 | Surprising fact, highest and lowest countries, World Bank source |
| 37.6–43.8 | Result card, then Post to comments; vote on tomorrow's theme |
| 44–49.3 | Archive and leaderboard tabs |
| 49.6–55.5 | Four full-frame blooms: forest, internet, life expectancy, crowding |
| 55.5–58.5 | End card: "One mystery map a day." r/GraticuleDaily |

**YouTube title:** Graticule: one mystery world map a day (Reddit Game of the Day Hackathon)

**YouTube description:**
Every country is shaded by one real fact. No title, no legend. What does the map show?
Graticule is a daily guessing game for Reddit, built on Devvit (Reddit's Developer Platform). 4 answers, 3 tries; a miss unlocks a hint. Get it and the map blooms into colour with a surprising fact and its source.
Play: https://www.reddit.com/r/GraticuleDaily
Code: https://github.com/efeaizesogie/graticule
Data: World Bank World Development Indicators (CC BY 4.0). Map shapes: Natural Earth.
