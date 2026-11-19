# Devpost submission draft: Graticule

**Fill in before submitting:** app link `developers.reddit.com/apps/graticule` (exists after the first `devvit upload`), test subreddit link, demo post link, YouTube video link, and the repo link (optional).

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

## 60-second demo video plan (must be under 1:00, on YouTube)
| t | shot |
|---|---|
| 0–4s | Reddit feed scroll stops on the Graticule post: grey map, "What does this map measure?" |
| 4–12s | Tap **Read the map**. Probe Qatar, the UAE, Canada (readouts tick). |
| 12–24s | Wrong guess: the row strikes through and **Hint 1** rings the top and bottom country. |
| 24–36s | Correct pick: **the bloom** (hold this shot), serif answer, peach fact card. |
| 36–46s | Result card, then Post to comments; cut to the theories thread and the flair `▲ 5-day streak`. |
| 46–54s | Vote on tomorrow's theme, then the archive grid and the leaderboard. |
| 54–60s | Montage of 4 other blooms (forest, fertility, remittances, CO₂) and the end card "Graticule: a new map every day on Reddit". |
