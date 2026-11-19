# Graticule

**One mystery map a day. No title, no legend. What does it measure?**

Graticule is a daily game for Reddit, built on Devvit Web. Each day a new post shows a flat world map shaded by one real statistic, drawn in shades of grey on an instrument-style display. Players read the map, tap countries to probe them, and pick what it measures. When the game ends the map *blooms* into colour, and the answer arrives with its real numbers, its source and one surprising fact.

## How to play

Built so any random redditor can get it: everyday topics (internet use, how long people live, how rich, how crowded, forests, air pollution…), answers in plain English, and only four choices.

1. Open today's post and tap **Play today's map**. A three-line *How to play* card appears the first time (reopen it any time with **?**).
2. Every country is shaded by one real fact. **Darker = more.**
3. Tap any country to check it: *Very low* … *Middle* … *Very high*.
4. Pick 1 of **4 answers** and **Lock in**. You have **3 tries**.
5. A wrong guess unlocks a hint:
   - **Hint 1, top & bottom**: the country with the most and the least, ringed on the map
   - **Hint 2, unit**: what the numbers are measured in
6. Solve it or run out of tries and the map blooms into colour. You get:
   - the answer, the year and the unit
   - one **surprising fact** taken from the data
   - the top 3 and bottom 3 countries with real values
   - the source (World Bank indicator name, with a link)
   - how everyone else did (1 / 2 / 3 / ✕)
7. **Share** a spoiler-free result card, or post it to the comments with **Post to comments** (it posts from your own account, only when you tap it):
   ```
   GRATICULE N°031 — 2/3
   ✕ ● ·   ▲ 5-day streak
   ```
8. **Vote on tomorrow's theme** (People, Planet, Money, Health, Tech). The winning theme picks the next map from the bank.
9. A new map drops every day at **00:00 UTC**.

### Streaks, leaderboard, archive
- **Streak**: solve today's map on consecutive days. Streaks of 2 or more show as user flair (`▲ 5-day streak`) in the subreddit.
- **Leaderboard**: today's fewest tries, then fastest time; plus the longest active streaks.
- **Archive**: play any past map. Archive plays don't count toward your streak.
- **Suggest a map**: players can propose a dataset with a source. Moderators review suggestions from the subreddit menu before anything goes live.

### Community thread
Every daily post opens with a stickied **theories thread**. Players argue about what the colours mean (answers go in `>!spoiler tags!<`).

## The data
23 curated, everyday-topic maps, all from the **World Bank World Development Indicators** API (CC BY 4.0), using the latest year each indicator has. Each map's reveal names the official indicator and links to its data page. Country shapes come from **Natural Earth** 1:110m (public domain) via `world-atlas`. Countries too small to see at that scale are drawn as dots.

Facts are written by hand, but every number in them is filled in from the fetched data at build time (`{QAT}` becomes Qatar's value). The build fails if a fact cites a country with no data.

```
node tools/data/fetch.mjs   # World Bank API -> data/raw/*.json
node tools/data/build.mjs   # -> src/server/bank.json, src/shared/world.json, src/shared/countries.json
```

## Moderator tools (subreddit ··· menu)
- **Graticule: post the next map now**: opens the next day's map immediately (the scheduler does this daily at 00:00 UTC).
- **Graticule: view map suggestions**: the latest player suggestions.

Installing the app posts map N°001 straight away.

## Development
```
npm install
npm run login        # devvit login
npm run dev          # devvit playtest in your test subreddit
npm run build && node tools/mock-server.mjs   # local UI preview with a fake API at http://localhost:5178
npm run deploy       # type-check, lint, devvit upload
```

Stack: Devvit Web (Hono server, Redis, scheduler, Reddit API), React 19, d3-geo (Equal Earth projection), topojson. Fonts are bundled: Inter, JetBrains Mono, Instrument Serif. Design notes are in [DESIGN.md](DESIGN.md).

### Layout
```
src/server/core/game.ts   daily rotation, guesses, hints, streaks, leaderboard, votes
src/server/core/bank.ts   dataset bank, bands, deterministic choice order
src/server/routes/*       /api/* for the client; /internal/* for menu, triggers, scheduler
src/client/splash.tsx     inline feed view (the mystery map + Read the map)
src/client/game.tsx       expanded game: play, reveal, archive, leaderboard
src/client/map/*          projection, palettes, SVG map
tools/data/*              fetch + build the dataset bank
```

### Redis keys
`meta:day` current day · `day:{n}` dataset/post/date · `g:{n}:{userId}` a player's game · `st:{n}` result counts · `lb:{n}` daily board · `lb:streak` · `u:{userId}` streak record · `vote:{n}` theme votes · `suggest` suggestions.
