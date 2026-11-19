# AGENTS.md: Spire of Ashes

Short on purpose. Read this before changing anything; details are in the linked files.

## Run and verify

| What | Command | Notes |
|---|---|---|
| Install | `npm ci` | Node 22 |
| Play locally | `npm run dev` | http://localhost:3000, also on the LAN, so a phone on the same Wi-Fi can open `http://<this-pc-ip>:3000` |
| Typecheck | `npm run lint` | |
| Engine checks | `npm test` | `scripts/verify_game.ts`, including card data validation |
| Balance guardrails | `npm run sim:check` | `SIM_N=500` for a quick run; `npm run sim` for the full report |
| Build | `npm run build` | |

CI (`.github/workflows/ci.yml`, job `check`) runs lint, test, sim:check and build on every PR. Pages deploys `main` (`pages.yml`).

## How changes land

- `main` is protected: no direct pushes (AI Studio included). Everything goes through a PR, and `check` and `playtest-gate` must pass.
- One writer per branch. Another tool or Claude/Codex session working on the game uses its own branch or `git worktree`, never a shared working tree.
- Commit each finished step on the branch. One PR per phase or batch.
- Evaluations, audits and design drafts are committed to `docs/review/` or `docs/design/`, not left in a session folder. Index: [docs/review/README.md](docs/review/README.md).

## Playtesting a PR

- The PR description needs a `Playtest:` line (see the PR template). Rules: `.github/scripts/playtest-gate.mjs`.
  - Any change under `src/`, `public/`, `index.html` or `vite.config.ts` needs `Playtest: done — <device, how long, what you saw>`.
  - `Playtest: n/a — <why>` is only accepted when no game file changed.
- **Agents write `needs-playtest` (or `n/a`). Never `done`.** Only the person who played writes it.
  - Why this is a written rule and not a check: agents and Jacky push with the same GitHub account, so the gate can't tell who edited the line.
- An agent's own browser checks are not a playtest. The Claude preview pane throttles frames and can't judge feel; say what was checked, on what, in "How it was checked".
- To play a branch: `gh pr checkout <n> && npm ci && npm run dev`.
- A 10-minute route:
  1. New run as each class.
  2. Two fights, one using the keyboard only.
  3. Campfire and shop.
  4. Reload the page mid-fight and continue.
  5. Open and close every dialog during combat.
  6. Repeat on a phone-width window.

## Feature map

| Feature | How to reach | Code |
|---|---|---|
| Title, class pick, continue a run | start page | `components/TitleScreenView.tsx` |
| Map | after class pick | `components/SpireMapView.tsx`, `game/map.ts` |
| Combat | any fight node | `components/CombatArenaView.tsx`, `game/engine.ts`, `game/combat.ts`, `game/effects.ts` |
| Combat keys | `1`–`9` play, `E`/`Space` end turn, `Esc` cancel or close, arrows + `Enter` pick a target, `B` Stoke, `Q` class ability | `CombatArenaView.tsx` key handler |
| Rooms: campfire, shop, event, treasure | map nodes | `components/RoomViews.tsx`, `game/rooms.ts`, `game/events.ts` |
| Dialogs: glossary, settings, deck, stats, tutorial | top bar | one stack in `components/useDialog.tsx`; combat keys stop while a dialog is open |
| Phone layout | width under 768 px | `isPhone` in `CombatArenaView.tsx` |
| Save | localStorage `spire_ashes_active_run_v2`; unreadable saves are copied to `spire_ashes_run_corrupt` | `game/save.ts` (versioned, with migrations) |
| Tuning | numbers only, no logic | `game/balance.ts`; try values with `SIM_TUNE='{"bossHp":300}' npm run sim` |

## Known traps

- `metadata.json` and the `GEMINI_API_KEY` in `.env.example` are AI Studio leftovers; the game makes no Gemini calls.
- Images in `src/assets/images` are large AI-generated JPEGs with C2PA credentials. Re-encoding strips the credentials, so keep the originals and record provenance before converting (see the asset audit in `docs/review/skill-audit-2026-11-19.md`).
- The Pages build sets `BASE_PATH`; asset URLs must work under `/spire-of-ashes/`, not only at `/`.
