# 烬塔 · Spire of Ashes

> A dark-fantasy Roguelike Deckbuilder with original card, relic, potion and enemy names, in the tradition of *Slay the Spire*（《杀戮尖塔》）. Built with React, TypeScript, and Tailwind CSS. Full **Simplified Chinese / English** bilingual support.

---

## Overview | 游戏简介
Play in the browser: https://animenzzz128.github.io/spire-of-ashes/ (GitHub Pages, deployed from `main`) 

**《烬塔 · Spire of Ashes》** 是一款回合制 Roguelike 卡牌构筑爬塔策略游戏，卡牌、遗物、药水与敌人均为原创命名。你将踏入十五层黑曜烬塔，洞察敌人的真实行动意图，精准规划能量与格挡，在营火、神秘事件与高塔商人之间权衡取舍，构筑成型牌组并击败第 15 层的终极首领——黑曜守望者。

Ascend the 15-floor Obsidian Spire. Read enemy intents with clarity, allocate limited Energy across Attacks, Skills, and Powers, leverage Relics and Potions, refine your deck at Campfires and Merchants, and conquer the Obsidian Warden at the summit.

---

## Core Features | 核心特性

- **Ember · 余烬（P2 core mechanic）**
  - Once per turn, **Stoke** a hand card (statuses and curses too) to burn it for 1 Ember. Spend 2 Ember on your class ability: **Temper** (Ironwarden, next Attack +6) or **Ash Veil** (Shadowweaver, 3 Poison to all enemies).
  - The Obsidian Warden **charges** its laser every 4 turns; deal enough damage while it charges to **interrupt** it.
  - Echo cards trigger a bonus when a card effect discards them.
- **2 Playable Classes · 双职业构筑体系**
  - **赤铁卫士 · Ironwarden (80 HP)** — *Bloodfire Sigil*: Strength scaling, Bastion armor retention, multi-hit synergy (`Crushing Maul`, `Shield Ram`, `Infernal Avatar`, `Soul Harvest`).
  - **暗影织者 · Shadowweaver (70 HP)** — *Nightweave Ring*: Lethal Poison stacking (bypasses Block), 0-cost Throwing Knife flurries, draw/discard manipulation (`Toxic Bloom`, `Rotburst`, `Night Terror`).
- **46+ Upgradable Cards & 14 Synergy Relics | 46+ 可升级卡牌与 14 件协同遗物**
  - Complete Before → After smithing upgrade preview at Campfires.
  - Real-time dynamic combat previews (green for boosted damage/block via Strength/Vulnerable/Dexterity, red for Weak/Frail, and `LETHAL` badges).
- **3-Stage Procedural Spire & Art Direction | 三段式高塔战斗场景与暗黑奇幻立绘**
  - Floors 1–7: Lower Crypt Stone Hall
  - Floors 8–14: Obsidian Forge Sanctum
  - Floor 15: Summit Throne of the Obsidian Warden
  - Dedicated 3:4 character standees (立绘) and custom boss/elite/enemy illustrations.
- **Interactive New-Player Onboarding | 完整新手引导**
  - Step-by-step interactive sandbox tutorial covering Enemy Intents, Block math, Vulnerable combos, Poison penetration, and Deck thinning.
- **Detailed Damage & Combat Telemetry | 局内伤害与战斗统计**
  - Tracks damage by source (Attack / Poison & Rotburst / Relics & Thorns), Block mitigation rate %, top damage cards leaderboard, card type tempo, and per-floor combat history.
- **Instant Chinese / English Switching | 中英双语即时切换**
  - Every card, relic, potion, enemy, event, manual, and statistic adapts instantly between `简体中文` and `English`.
- **Ascension 0–2 & Auto-Save Resume | 进阶挑战与自动断点续传**
  - Run state automatically saves to `localStorage` so you can continue anytime from the Main Menu.
  - Saves are versioned and migrated (`src/game/save.ts`), validated on load, and keep the random sequence, so a resumed run plays out exactly as it would have. An unreadable save is backed up and reported instead of breaking the game.

---

## Controls | 操作说明

| Action | Control |
| --- | --- |
| Play / Select Card | Click card or drag directly onto target / arena |
| Quick Play Card | Number keys `1` – `9` |
| End Turn | Click **End Turn** or press `E` / `Space` |
| Cancel Targeting | Click **Cancel** or press `Esc` |
| Choose a Target with the Keyboard | After selecting a card or potion: arrow keys to move between enemies, `Enter` to confirm |
| Close a Dialog | `Esc` (keys don't reach the combat behind an open dialog) |
| Stoke (burn a card for Ember) | Click **Stoke** then a card, or hover a card and press `B` |
| Class Ability (Temper / Ash Veil) | Click the ability button or press `Q` |
| Inspect Piles / Deck | Click Draw Pile, Discard Pile, Exhaust Pile, or Deck HUD button |
| Discard Potion | Hover potion slot in HUD and click `×` |

---

## Local Development | 本地运行

```bash
npm install
npm run dev
```

Build and verify:

```bash
npm run build
npm run lint
npm test            # engine verification (scripts/verify_game.ts)
```

Balance simulation (a rule-based bot plays full runs on the real engine):

```bash
npm run sim         # win rates, death floors, HP lost per encounter, Ember usage
npm run sim:check   # also assert the balance guardrails (runs in CI)
```

The bot is weaker than a skilled player, so treat its win rates as a lower bound and compare encounters and classes against each other.

Options (environment variables):

| Variable | Effect |
| --- | --- |
| `SIM_N=500` | Runs per class (default 2000) |
| `SIM_SEED=1` | Reproducible batch: same seed, same output |
| `SIM_ASC=2` | Ascension level |
| `SIM_POLICY=aggressive` | Bot blocks less |
| `SIM_EMBER=off\|stoke\|full` | Limit what the bot does with Ember (to measure its impact) |
| `SIM_TUNE='{"bossHp":300}'` | Override knobs from `src/game/balance.ts` for one run, to try a calibration before committing it |

Engine layout: `engine.ts` (public actions), `combat.ts` (combat primitives), `effects.ts` (card effect interpreter; cards are effect lists), `hooks.ts` (relic and power triggers), `rooms.ts` (rewards, campfire, shop, treasure, events), `balance.ts` (tuning knobs), `rng.ts` (seedable RNG).
