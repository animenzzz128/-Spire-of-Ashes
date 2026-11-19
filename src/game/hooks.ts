// Trigger hooks for relics and powers. Each hook checks its own condition
// (relic owned, power stacks > 0) and mutates the action's CombatCtx.
// Hooks for the same trigger run in array order, which is part of the rules
// (e.g. Watchman's Horn Block lands before Cinder Hourglass damage).
//
// Adding a relic or power that reacts to an event = adding one entry here.
import type { CombatCtx } from './combat';
import { CardInstance } from './types';

export type HookName =
  | 'turnEnd' // player's turn ends, before the hand is discarded
  | 'turnStart' // player's next turn starts, after Block resets and before the draw
  | 'attackPlayed' // an Attack card finished resolving
  | 'stoke' // a card was Stoked
  | 'spendEmber' // Ember was spent (payload.amount)
  | 'discard'; // a card effect made you discard a card (payload.card)

export interface HookPayload {
  amount?: number;
  card?: CardInstance;
}

interface Hook {
  id: string;
  on: HookName;
  run: (ctx: CombatCtx, payload: HookPayload) => void;
}

const HOOKS: Hook[] = [
  // ---- turn end ----
  {
    id: 'relic:cinderglass_ward',
    on: 'turnEnd',
    run: (ctx) => {
      if (ctx.hasRelic('cinderglass_ward') && ctx.combat.playerBlock === 0) {
        ctx.gainBlock(6, { key: 'cinderglassWard', n: 6 });
      }
    },
  },
  {
    id: 'power:ironhide',
    on: 'turnEnd',
    run: (ctx) => ctx.gainBlock(ctx.combat.playerStatuses.ironhide),
  },

  // ---- turn start ----
  {
    id: 'relic:watchman_horn',
    on: 'turnStart',
    run: (ctx) => {
      if (ctx.combat.turn === 2 && ctx.hasRelic('watchman_horn')) {
        ctx.gainBlock(14, { key: 'watchmanHorn', n: 14 });
      }
    },
  },
  {
    id: 'power:night_terror',
    on: 'turnStart',
    run: (ctx) => {
      const c = ctx.combat;
      if (c.playerStatuses.doubleDamageNextTurn) {
        c.doubleDamageActive = true;
        c.playerStatuses.doubleDamageNextTurn = false;
        ctx.emit('player', { key: 'nightTerror' }, 'buff');
      } else {
        c.doubleDamageActive = false;
      }
    },
  },
  {
    id: 'power:infernal_avatar',
    on: 'turnStart',
    run: (ctx) => {
      const n = ctx.combat.playerStatuses.infernalAvatar;
      if (n > 0) {
        ctx.combat.playerStatuses.strength += n;
        ctx.emit('player', { key: 'infernalAvatar', n }, 'buff');
      }
    },
  },
  {
    id: 'power:creeping_miasma',
    on: 'turnStart',
    run: (ctx) => {
      const n = ctx.combat.playerStatuses.miasma;
      if (n > 0) {
        for (const idx of ctx.livingIndices()) ctx.debuffEnemy(idx, 'poison', n);
      }
    },
  },
  {
    id: 'relic:cinder_hourglass',
    on: 'turnStart',
    run: (ctx) => {
      if (!ctx.hasRelic('cinder_hourglass')) return;
      ctx.combat.enemies = ctx.combat.enemies.map((e) => {
        if (e.hp <= 0) return e;
        const d = Math.min(e.hp, 3);
        ctx.dmgRelic += d;
        const hit = { ...e, hp: Math.max(0, e.hp - 3) };
        return hit.charge && !hit.charge.interrupted
          ? { ...hit, charge: { ...hit.charge, progress: hit.charge.progress + 3 } }
          : hit;
      });
      ctx.dmgRelic += ctx.rotburstChain();
      ctx.checkBossStates();
    },
  },

  // ---- attacks ----
  {
    id: 'relic:notched_blade',
    on: 'attackPlayed',
    run: (ctx) => {
      if (ctx.combat.attacksPlayedThisTurn % 3 === 0 && ctx.hasRelic('notched_blade')) {
        ctx.combat.playerStatuses.strength += 1;
        ctx.emit('player', { key: 'notchedBlade', n: 1 }, 'buff');
      }
    },
  },
  {
    id: 'relic:fleet_ribbon',
    on: 'attackPlayed',
    run: (ctx) => {
      if (ctx.combat.attacksPlayedThisTurn % 3 === 0 && ctx.hasRelic('fleet_ribbon')) {
        ctx.combat.playerStatuses.dexterity += 1;
        ctx.emit('player', { key: 'fleetRibbon', n: 1 }, 'buff');
      }
    },
  },

  // ---- Ember ----
  {
    id: 'power:forge_heart',
    on: 'stoke',
    run: (ctx) => ctx.gainBlock(ctx.combat.playerStatuses.forgeHeart || 0),
  },
  {
    id: 'power:smoldering_haze',
    on: 'spendEmber',
    run: (ctx, p) => {
      const stacks = ctx.combat.playerStatuses.smolderingHaze || 0;
      const n = stacks * (p.amount || 0);
      if (n > 0) {
        for (const idx of ctx.livingIndices()) ctx.debuffEnemy(idx, 'poison', n);
      }
    },
  },
];

export function runHooks(ctx: CombatCtx, name: HookName, payload: HookPayload = {}): void {
  for (const hook of HOOKS) {
    if (hook.on === name) hook.run(ctx, payload);
  }
}
