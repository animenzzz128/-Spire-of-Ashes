# 烬塔 · Spire of Ashes

> A dark-fantasy Roguelike Deckbuilder inspired by *Slay the Spire*, built with React, TypeScript, and Tailwind CSS. Full **Simplified Chinese / English** bilingual support.

---

## Overview | 游戏简介

**《烬塔 · Spire of Ashes》** 是一款受《杀戮尖塔》启发的回合制 Roguelike 卡牌构筑爬塔策略游戏。你将踏入十五层黑曜烬塔，洞察敌人的真实行动意图，精准规划能量与格挡，在营火、神秘事件与高塔商人之间权衡取舍，构筑成型牌组并击败第 15 层的终极首领——黑曜守望者。

Ascend the 15-floor Obsidian Spire. Read enemy intents with clarity, allocate limited Energy across Attacks, Skills, and Powers, leverage Relics and Potions, refine your deck at Campfires and Merchants, and conquer the Obsidian Warden at the summit.

---

## Core Features | 核心特性

- **2 Playable Classes · 双职业构筑体系**
  - **赤铁卫士 · Ironwarden (80 HP)** — *Burning Blood*: Strength scaling, Barricade armor retention, multi-hit synergy (`Heavy Blade`, `Body Slam`, `Demon Form`, `Reaper`).
  - **暗影织者 · Shadowweaver (70 HP)** — *Ring of the Snake*: Lethal Poison stacking (bypasses Block), 0-cost Shiv flurries, draw/discard manipulation (`Catalyst`, `Corpse Explosion`, `Phantasmal Killer`).
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
  - Tracks damage by source (Attack / Poison & Corpse Explosion / Relics & Thorns), Block mitigation rate %, top damage cards leaderboard, card type tempo, and per-floor combat history.
- **Instant Chinese / English Switching | 中英双语即时切换**
  - Every card, relic, potion, enemy, event, manual, and statistic adapts instantly between `简体中文` and `English`.
- **Ascension 0–2 & Auto-Save Resume | 进阶挑战与自动断点续传**
  - Run state automatically saves to `localStorage` so you can continue anytime from the Main Menu.

---

## Controls | 操作说明

| Action | Control |
| --- | --- |
| Play / Select Card | Click card or drag directly onto target / arena |
| Quick Play Card | Number keys `1` – `9` |
| End Turn | Click **End Turn** or press `E` / `Space` |
| Cancel Targeting | Click **Cancel** or press `Esc` |
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
npx tsx scripts/verify_game.ts
```
