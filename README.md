# Poker Strategy Trainer

Want to get better at poker? **Poker Train** is a fast, user-friendly **poker puzzle trainer** that helps you improve decision-making and poker math.

Try it out here: https://poker-strats.vercel.app/

- 🧠 **AI Coach Feedback**: tells you if your move (fold, call, or raise) was good or bad, and **why**
- 📈 **Elo + Rank Progression**: climb from **Bronze to Champion**
- 🧮 **Outs Trainer**: learn how to **calculate outs** and quick equity (Rule of 2 and 4)
- 💾 **Saves locally**: progress is stored in your browser

## Screenshots

<img width="966" height="605" alt="Screenshot 2026-01-20 at 1 33 24 PM" src="https://github.com/user-attachments/assets/c25e423f-4c53-49a4-84d0-6397334aa16a" />
<img width="1033" height="787" alt="Screenshot 2026-01-20 at 1 33 49 PM" src="https://github.com/user-attachments/assets/769291a5-10de-43f7-8aab-399687ccda3f" />

## How it plays

Every spot deals you a hand, a board, and three opponents. You fold, call, or raise, and the coach grades the decision from 0 to 100 with the line it would have taken and the reasons. Your Elo moves with the score and your rank moves with your Elo.

There are three modes:

- **Hands**: one decision per spot. The Stats dialog lets you pick which streets Hands mode deals (mixed, preflop only, flop and turn for outs practice, or river only).
- **Playthrough**: the hand continues street by street. Opponents act one at a time, the runout goes to showdown, and you can open a full breakdown of who had what.
- **Full Game**: like Playthrough, but every hand starts preflop with a smaller pot.

On the flop and turn the Outs Trainer asks how many outs you have. Two attempts, Elo for a close answer, and the count with an explanation after the second try.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm test           # unit tests
npm run lint
npm run typecheck
npm run validate:data   # checks the JSON data files only
```

Requires Node 20 or newer. There are no environment variables and no backend beyond the one API route; the coach is a deterministic scoring engine, not a model call.

## Architecture

Next.js 16 (App Router, React 19, TypeScript) with plain CSS. The code is split into layers that only depend downward:

```
src/
  app/          routes only: the page, the layout, and /api/coach
  features/     React hooks and screen components with state
    profile/    localStorage profile and Elo update helpers
    trainer/    the session hook, the screen, table seats, dialogs
  components/   presentational components (cards, panels, modals)
  domain/       pure logic with no React: cards, hand evaluation, outs,
                Elo, ranks, spot generation, opponents, showdown, coach/
  data/         JSON data files plus a small typed loader for each
  styles/       one CSS module per screen area; tokens.css holds every colour
tests/          Vitest suites mirroring domain/, data/ and features/
```

`src/domain` is where the poker logic lives. Nothing in it touches the DOM, and every random draw takes an injectable `rng`, so the generators can be replayed under a seed in tests. `src/domain/coach` is the scoring engine, split into the preflop hand table, the equity estimate, the best-line decision, the score components, and the reason text.

`useTrainerSession` in `src/features/trainer` is the state machine behind the screen: dealing, the coach round trip, the outs quiz, the animated opponent reveal, and the showdown.

## Data files

Every list, table, tuning number, and user-facing string sits in `src/data/*.json`. Each JSON file has a sibling `.ts` loader that types it. Code reads the loaders; nothing reads the JSON directly.

| File | What it holds |
| --- | --- |
| `ranks.json` | The rank ladder: Elo range, percentile caption, penalty factor, badge image per tier |
| `game-modes.json` | Mode labels, next-hand button text, starting streets, starting pot range |
| `hand-preferences.json` | The Hands-mode preference options and the streets each one deals |
| `positions.json` | Hero and villain positions, act-order captions, seat order, the coach's position bonus |
| `elo.json` | Score-to-Elo tiers, gain jitter, playthrough runout rewards, outs quiz bonuses |
| `scenario.json` | Bet sizing, the facing-bet rate, playthrough opponent thresholds, animation timing |
| `outs.json` | Outs per draw type, the combo overlap, draw labels and explanations, the pot-odds chart |
| `coach.json` | Every scoring constant, the preflop starting-hand table, and the reason and summary templates |
| `copy.json` | All UI text, grouped by screen area |
| `ui.json` | Raise slider bounds, flash timing, the storage key, the API path |

Templates use `{name}` placeholders that `fmt` in `src/domain/text.ts` fills in. Strings that begin or end with a space are deliberate; they are joined to a value in the component.

### Adding an entry without writing code

- **A rank tier**: add an object to `ladder` in `ranks.json` with a contiguous Elo range (`maxElo` is `null` only on the top tier) and drop the badge PNG in `public/ranks/`. The ladder, the progress bar, the rank list, and the congratulations dialog pick it up.
- **A hand preference**: add an object to `options` in `hand-preferences.json` with a `value`, `label`, `desc`, and the `streets` it deals. The Stats dialog and the generator read the list.
- **A pot-odds chart row**: add a `{ "bet", "need" }` pair to `potOddsChart` in `outs.json`.
- **A draw explanation**: add a `{ "match", "text" }` pair to `explanations` in `outs.json`. Matching is by substring on the lowercased label, first hit wins, so put specific entries before general ones.
- **A tuning change**: edit the number in `elo.json`, `scenario.json`, or `coach.json`.
- **A colour change**: edit `src/styles/tokens.css`. No other stylesheet contains a colour value.

`npm run validate:data` checks the files after an edit: the ladder must stay contiguous, streets must be real streets, images must exist, and no copy string may be empty or have unbalanced braces.
