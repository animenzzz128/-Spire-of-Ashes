// Out-of-combat room actions: rewards, campfire, shop, treasure, events.
// Pure RunState -> RunState so the UI, tests and simulator share one rule set.
// Each returns the state unchanged when the action is not allowed.
import { addPotionToSlot } from './engine';
import { resolveEventOption } from './events';
import { CardInstance, RunState } from './types';

export const REST_HEAL_FRACTION = 0.3;

// ---- Rewards ----

export function claimGold(state: RunState): RunState {
  const r = state.reward;
  if (!r || r.goldClaimed) return state;
  return {
    ...state,
    gold: state.gold + r.gold,
    stats: { ...state.stats, goldEarned: state.stats.goldEarned + r.gold },
    reward: { ...r, goldClaimed: true },
  };
}

export function claimCard(state: RunState, card: CardInstance): RunState {
  const r = state.reward;
  if (!r || r.cardClaimed || !r.cardChoices.some((c) => c.uid === card.uid)) return state;
  return { ...state, deck: [...state.deck, card], reward: { ...r, cardClaimed: true } };
}

export function skipCard(state: RunState): RunState {
  const r = state.reward;
  if (!r || r.cardClaimed) return state;
  return { ...state, reward: { ...r, cardClaimed: true } };
}

export function claimRelic(state: RunState): RunState {
  const r = state.reward;
  if (!r?.relic || r.relicClaimed) return state;
  return { ...state, relics: [...state.relics, r.relic], reward: { ...r, relicClaimed: true } };
}

/** Takes the reward potion if a slot is free (otherwise unchanged). */
export function claimPotion(state: RunState): RunState {
  const r = state.reward;
  if (!r?.potion || r.potionClaimed) return state;
  const res = addPotionToSlot(state.potions, r.potion);
  if (!res.added) return state;
  return { ...state, potions: res.potions, reward: { ...r, potionClaimed: true } };
}

/** Leave a reward, shop, event or treasure room. */
export function returnToMap(state: RunState): RunState {
  return { ...state, phase: 'MAP', reward: null, shop: null, event: null, treasure: null };
}

// ---- Campfire ----

export function restHealAmount(state: RunState): number {
  const raw = Math.floor(state.maxHp * REST_HEAL_FRACTION);
  return Math.max(0, Math.min(state.maxHp, state.hp + raw) - state.hp);
}

export function restHeal(state: RunState): RunState {
  if (state.phase !== 'REST') return state;
  const healed = restHealAmount(state);
  return {
    ...state,
    hp: state.hp + healed,
    stats: { ...state.stats, hpHealed: state.stats.hpHealed + healed },
    phase: 'MAP',
  };
}

export function restUpgrade(state: RunState, cardUid: string): RunState {
  if (state.phase !== 'REST' || !state.deck.some((c) => c.uid === cardUid && !c.upgraded)) return state;
  return {
    ...state,
    deck: state.deck.map((c) => (c.uid === cardUid ? { ...c, upgraded: true } : c)),
    phase: 'MAP',
  };
}

// ---- Shop ----

export function buyShopCard(state: RunState, idx: number): RunState {
  const item = state.shop?.cards[idx];
  if (!state.shop || !item || item.sold || state.gold < item.price) return state;
  return {
    ...state,
    gold: state.gold - item.price,
    deck: [...state.deck, item.card],
    shop: { ...state.shop, cards: state.shop.cards.map((c, i) => (i === idx ? { ...c, sold: true } : c)) },
  };
}

export function buyShopRelic(state: RunState, idx: number): RunState {
  const item = state.shop?.relics[idx];
  if (!state.shop || !item || item.sold || state.gold < item.price) return state;
  return {
    ...state,
    gold: state.gold - item.price,
    relics: [...state.relics, item.relic],
    shop: { ...state.shop, relics: state.shop.relics.map((r, i) => (i === idx ? { ...r, sold: true } : r)) },
  };
}

export function buyShopPotion(state: RunState, idx: number): RunState {
  const item = state.shop?.potions[idx];
  if (!state.shop || !item || item.sold || state.gold < item.price) return state;
  const res = addPotionToSlot(state.potions, item.potion);
  if (!res.added) return state;
  return {
    ...state,
    gold: state.gold - item.price,
    potions: res.potions,
    shop: { ...state.shop, potions: state.shop.potions.map((p, i) => (i === idx ? { ...p, sold: true } : p)) },
  };
}

export function removeShopCard(state: RunState, cardUid: string): RunState {
  const shop = state.shop;
  if (!shop || shop.removedThisVisit || state.gold < shop.removePrice) return state;
  if (!state.deck.some((c) => c.uid === cardUid)) return state;
  return {
    ...state,
    gold: state.gold - shop.removePrice,
    deck: state.deck.filter((c) => c.uid !== cardUid),
    shop: { ...shop, removedThisVisit: true },
  };
}

// ---- Treasure & events ----

export function openTreasure(state: RunState): RunState {
  const t = state.treasure;
  if (!t || t.opened) return state;
  return {
    ...state,
    gold: state.gold + t.gold,
    relics: [...state.relics, t.relic],
    stats: { ...state.stats, goldEarned: state.stats.goldEarned + t.gold },
    treasure: { ...t, opened: true },
  };
}

export function chooseEventOption(state: RunState, optionId: string): RunState {
  if (!state.event || state.event.resolved) return state;
  return resolveEventOption(state, optionId);
}
