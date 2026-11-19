// Trigger hooks for relics, powers, curses, statuses and enemy traits. Each
// hook checks its own condition (relic owned, power stacks > 0, card in hand)
// and mutates the action's CombatCtx. Hooks for the same trigger run in array
// order, which is part of the rules (e.g. Burn hits before Cinderglass Ward
// checks for zero Block; Watchman's Horn Block lands before Cinder Hourglass).
//
// Adding a relic or power that reacts to an event = adding one entry here.
// Nested triggers are capped (MAX_HOOK_DEPTH) so two effects that trigger each
// other can never loop forever.
import { CARD_DEFS } from './cards';
import type { CombatCtx } from './combat';
import { CardInstance } from './types';

export type HookName =
  | 'combatStart' // combat set up, before the opening draw
  | 'cardPlayed' // a card was played (removed from hand, energy paid), before its effects
  | 'attackPlayed' // an Attack card finished resolving
  | 'turnEnd' // player's turn ends, before the hand is discarded
  | 'turnStart' // player's next turn starts, after Block resets and before the draw
  | 'stoke' // a card was Stoked (payload.card)
  | 'spendEmber' // Ember was spent (payload.amount)
  | 'discard' // a card effect made you discard a card (payload.card)
  | 'exhaust' // a card was exhausted: played Exhaust card, Stoke, Ethereal, choice (payload.card)
  | 'enemyDeath' // an enemy reached 0 HP (payload.enemyUid), once per enemy
  | 'playerDamaged' // the player lost HP (payload.amount)
  | 'combatWon'; // all enemies dead, before rewards

export interface HookPayload {
  amount?: number;
  card?: CardInstance;
  enemyUid?: string;
}

export interface Hook {
  id: string;
  on: HookName;
  run: (ctx: CombatCtx, payload: HookPayload) => void;
}

/** Nesting limit for triggers firing triggers. */
export const MAX_HOOK_DEPTH = 100;

/** Cinder Hourglass: 3 damage to every enemy, ignoring Block (turn 1 and every turn after). */
function cinderHourglassTick(ctx: CombatCtx): void {
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
  ctx.log({ key: 'logCinderHourglass', n: 3 });
  ctx.dmgRelic += ctx.rotburstChain();
  ctx.checkBossStates();
}

const relicAtStart = (id: string, run: (ctx: CombatCtx) => void): Hook => ({
  id: `relic:${id}`,
  on: 'combatStart',
  run: (ctx) => {
    if (ctx.hasRelic(id)) run(ctx);
  },
});

const BUILTIN_HOOKS: Hook[] = [
  // ---- combat start (before the opening draw) ----
  relicAtStart('ashen_fang', (ctx) => {
    ctx.combat.playerStatuses.strength += 1;
  }),
  relicAtStart('featherstep_charm', (ctx) => {
    ctx.combat.playerStatuses.dexterity += 1;
  }),
  relicAtStart('cornerstone', (ctx) => ctx.gainBlock(10)),
  relicAtStart('ember_core', (ctx) => {
    ctx.combat.maxEnergy += 1;
    ctx.combat.energy += 1;
  }),
  relicAtStart('wayfinder_lamp', (ctx) => {
    ctx.combat.energy += 1;
  }),
  relicAtStart('nightweave_ring', (ctx) => {
    ctx.extraDraw += 2;
  }),
  relicAtStart('scout_satchel', (ctx) => {
    ctx.extraDraw += 2;
  }),
  { id: 'relic:cinder_hourglass:start', on: 'combatStart', run: (ctx) => cinderHourglassTick(ctx) },

  // ---- a card is played (before its effects) ----
  {
    id: 'curse:marrow_ache',
    on: 'cardPlayed',
    run: (ctx) => {
      const aches = ctx.combat.hand.filter((x) => CARD_DEFS[x.defId]?.achingCurse).length;
      if (aches > 0) {
        ctx.loseHp(aches);
        ctx.emit('player', { key: 'curseAche', n: aches }, 'damage');
      }
    },
  },
  {
    id: 'enemy:enrage',
    on: 'cardPlayed',
    run: (ctx, p) => {
      if (!p.card || CARD_DEFS[p.card.defId]?.type !== 'skill') return;
      ctx.combat.enemies = ctx.combat.enemies.map((e) => {
        if (e.hp > 0 && e.enraged) {
          ctx.emit(e.uid, { key: 'enrage', n: 2 }, 'buff');
          return { ...e, statuses: { ...e.statuses, strength: e.statuses.strength + 2 } };
        }
        return e;
      });
    },
  },

  // ---- turn end ----
  {
    id: 'status:burn',
    on: 'turnEnd',
    run: (ctx) => {
      const burns = ctx.combat.hand.filter((x) => CARD_DEFS[x.defId]?.endTurnBurn).length;
      if (burns > 0) {
        ctx.damagePlayer(burns * 2);
        ctx.emit('player', { key: 'burn', n: burns * 2 }, 'damage');
      }
    },
  },
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
  { id: 'relic:cinder_hourglass', on: 'turnStart', run: (ctx) => cinderHourglassTick(ctx) },

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

  // ---- victory ----
  {
    id: 'relic:bloodfire_sigil',
    on: 'combatWon',
    run: (ctx) => {
      if (ctx.hasRelic('bloodfire_sigil')) ctx.heal(8);
    },
  },
  {
    id: 'relic:hunters_jerky',
    on: 'combatWon',
    run: (ctx) => {
      if (ctx.hasRelic('hunters_jerky') && ctx.hp <= Math.floor(ctx.maxHp / 2)) ctx.heal(12);
    },
  },
];

let hooks: Hook[] = [...BUILTIN_HOOKS];

/**
 * Add a hook at runtime (tests, experiments). Returns a function that removes it.
 * Shipped content belongs in BUILTIN_HOOKS so trigger order stays reviewable.
 */
export function registerHook(hook: Hook): () => void {
  hooks = [...hooks, hook];
  return () => {
    hooks = hooks.filter((h) => h !== hook);
  };
}

export function runHooks(ctx: CombatCtx, name: HookName, payload: HookPayload = {}): void {
  if (ctx.hookDepth >= MAX_HOOK_DEPTH) {
    if (!ctx.hookLimitHit) {
      ctx.hookLimitHit = true;
      console.warn(`Trigger depth limit (${MAX_HOOK_DEPTH}) reached at "${name}"; stopping nested triggers.`);
    }
    return;
  }
  ctx.hookDepth += 1;
  try {
    for (const hook of hooks) {
      if (hook.on === name) hook.run(ctx, payload);
    }
  } finally {
    ctx.hookDepth -= 1;
  }
}
