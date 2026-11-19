import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  Flame,
  Hammer,
  Heart,
  Layers,
  Moon,
  Wind,
  ZapOff,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import { CARD_DEFS, getCardCost } from '../game/cards';
import { choiceOptions } from '../game/effects';
import {
  abilityCost,
  calculateCardTotalDamage,
  calculateEnemyAttackPreview,
  canStoke,
  canUseAbility,
  CLASS_ABILITY,
  stokesPerTurn,
} from '../game/engine';
import { HERO_CLASSES } from '../game/heroes';
import {
  HERO_EN,
  Locale,
  UI_COPY,
  tCard,
  tCombatLogEntry,
  tCombatMsg,
  tEnemyName,
  tIntentLabel,
} from '../game/i18n';
import {
  CardInstance,
  CombatVfx,
  EnemyInstance,
  FloatingText,
  RunState,
  StatusMap,
} from '../game/types';
import { CardView } from './CardView';
import { EnemyArtwork } from './EnemyArtwork';
import { PileModal } from './PileModal';
import { InfoTip, useIsTouch, useMediaQuery } from './InfoTip';
import { isDialogOpen } from './useDialog';
import { assetUrl } from '../game/assets';

interface CombatArenaViewProps {
  state: RunState;
  locale: Locale;
  floatingTexts: FloatingText[];
  combatVfx: CombatVfx[];
  arenaShake: boolean;
  hitPlayer: boolean;
  heroAttacking: boolean;
  enemyAttacking: boolean;
  hitEnemyUids: string[];
  pendingPotionSlot: number | null;
  onCancelPendingPotion: () => void;
  onPlayCard: (cardUid: string, targetEnemyUid?: string) => void;
  onChooseCard: (cardUid: string) => void;
  onSkipChoice: () => void;
  onUsePotionOnEnemy: (slotIndex: number, enemyUid: string) => void;
  onEndTurn: () => void;
  onCardHoverSound: () => void;
  onStokeCard: (cardUid: string) => void;
  onUseAbility: () => void;
}

function getCombatSceneTheme(state: RunState, isElite: boolean, isBoss: boolean, locale: Locale) {
  if (isBoss || state.floor >= 12) {
    return {
      src: assetUrl('src/assets/images/arena_abyss_bg_1795032741817.jpg'),
      biome: locale === 'zh' ? '烈焰深渊' : 'Infernal Abyss',
      scrim: 'from-[#0b0e14]/78 via-[#180a10]/38 to-[#0b0e14]/95',
      mistGradient:
        'radial-gradient(ellipse 65% 45% at 62% 38%, rgba(225, 29, 72, 0.22), transparent 70%), radial-gradient(ellipse 55% 40% at 32% 64%, rgba(245, 158, 11, 0.16), transparent 70%)',
    };
  }
  if (isElite || state.floor >= 6) {
    return {
      src: assetUrl('src/assets/images/arena_dungeon_bg_1795032737599.jpg'),
      biome: locale === 'zh' ? '黑曜地牢' : 'Obsidian Dungeon',
      scrim: 'from-[#0b0e14]/78 via-[#0d1220]/40 to-[#0b0e14]/95',
      mistGradient:
        'radial-gradient(ellipse 65% 45% at 58% 36%, rgba(56, 189, 248, 0.16), transparent 70%), radial-gradient(ellipse 55% 40% at 34% 66%, rgba(99, 102, 241, 0.14), transparent 70%)',
    };
  }
  return {
    src: assetUrl('src/assets/images/arena_forest_bg_1795032741250.jpg'),
    biome: locale === 'zh' ? '幽暗密林' : 'Whispering Forest',
    scrim: 'from-[#0b0e14]/78 via-[#0a1612]/38 to-[#0b0e14]/95',
    mistGradient:
      'radial-gradient(ellipse 65% 45% at 56% 36%, rgba(16, 185, 129, 0.18), transparent 70%), radial-gradient(ellipse 55% 40% at 32% 66%, rgba(45, 212, 191, 0.12), transparent 70%)',
  };
}

function renderStatusTags(statuses: StatusMap, locale: Locale) {
  const zh = locale === 'zh';
  const items: { label: string; value: string | number; tone: string; title: string }[] = [];
  if (statuses.strength !== 0) {
    items.push({
      label: zh ? '力量' : 'Strength',
      value: statuses.strength > 0 ? `+${statuses.strength}` : statuses.strength,
      tone: 'text-rose-300 border-rose-500/35 bg-rose-950/60',
      title: zh
        ? `所有攻击牌额外造成 ${statuses.strength} 点伤害`
        : `Attacks deal ${statuses.strength} additional damage per hit`,
    });
  }
  if (statuses.dexterity !== 0) {
    items.push({
      label: zh ? '敏捷' : 'Dexterity',
      value: statuses.dexterity > 0 ? `+${statuses.dexterity}` : statuses.dexterity,
      tone: 'text-sky-300 border-sky-500/35 bg-sky-950/60',
      title: zh
        ? `所有格挡牌额外获得 ${statuses.dexterity} 点格挡`
        : `Gain ${statuses.dexterity} additional Block from cards`,
    });
  }
  if (statuses.vulnerable > 0) {
    items.push({
      label: zh ? '易伤' : 'Vulnerable',
      value: statuses.vulnerable,
      tone: 'text-orange-300 border-orange-500/40 bg-orange-950/60',
      title: zh ? '受到的攻击伤害提高 50%' : 'Takes 50% more damage from Attacks',
    });
  }
  if (statuses.weak > 0) {
    items.push({
      label: zh ? '虚弱' : 'Weak',
      value: statuses.weak,
      tone: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
      title: zh ? '造成的攻击伤害降低 25%' : 'Deals 25% less damage with Attacks',
    });
  }
  if (statuses.frail > 0) {
    items.push({
      label: zh ? '脆弱' : 'Frail',
      value: statuses.frail,
      tone: 'text-purple-300 border-purple-500/40 bg-purple-950/60',
      title: zh ? '从卡牌获得的格挡降低 25%' : 'Block gained from cards reduced by 25%',
    });
  }
  if (statuses.poison > 0) {
    items.push({
      label: zh ? '中毒' : 'Poison',
      value: statuses.poison,
      tone: 'text-emerald-300 border-emerald-500/45 bg-emerald-950/60',
      title: zh
        ? `回合开始失去 ${statuses.poison} 点生命并减少 1 层`
        : `Loses ${statuses.poison} HP at turn start (ignores Block)`,
    });
  }
  if (statuses.ironhide > 0) {
    items.push({
      label: zh ? '铁肤' : 'Ironhide',
      value: statuses.ironhide,
      tone: 'text-slate-200 border-slate-400/40 bg-slate-800/70',
      title: zh
        ? `每回合获得 ${statuses.ironhide} 点格挡`
        : `Gains ${statuses.ironhide} Block every turn`,
    });
  }
  if (statuses.zeal > 0) {
    items.push({
      label: zh ? '狂热' : 'Zeal',
      value: statuses.zeal,
      tone: 'text-rose-300 border-rose-400/40 bg-rose-950/60',
      title: zh
        ? `每回合结束获得 ${statuses.zeal} 点力量`
        : `Gains ${statuses.zeal} Strength each turn`,
    });
  }
  if (statuses.thorns > 0) {
    items.push({
      label: zh ? '荆棘' : 'Thorns',
      value: statuses.thorns,
      tone: 'text-amber-200 border-amber-400/40 bg-amber-950/60',
      title: zh
        ? `受到攻击时反弹 ${statuses.thorns} 点伤害`
        : `Reflects ${statuses.thorns} damage when attacked`,
    });
  }
  if (statuses.artifact > 0) {
    items.push({
      label: zh ? '人工制品' : 'Artifact',
      value: statuses.artifact,
      tone: 'text-cyan-200 border-cyan-400/40 bg-cyan-950/60',
      title: zh
        ? `抵消下 ${statuses.artifact} 次负面状态`
        : `Negates next ${statuses.artifact} debuff(s)`,
    });
  }
  if (statuses.bastion) {
    items.push({
      label: zh ? '堡垒' : 'Bastion',
      value: '∞',
      tone: 'text-sky-200 border-sky-400/50 bg-sky-950/70',
      title: zh ? '格挡不再在回合开始时消失' : 'Block is no longer lost between turns',
    });
  }
  if (statuses.shade > 0) {
    items.push({
      label: zh ? '幽影' : 'Shade',
      value: statuses.shade,
      tone: 'text-teal-200 border-teal-400/40 bg-teal-950/60',
      title: zh ? '下回合开始时保留当前格挡' : 'Block is retained next turn',
    });
  }
  if (statuses.infernalAvatar > 0) {
    items.push({
      label: zh ? '炼狱' : 'Infernal',
      value: `+${statuses.infernalAvatar}`,
      tone: 'text-red-300 border-red-500/40 bg-red-950/60',
      title: zh
        ? `每回合开始获得 ${statuses.infernalAvatar} 点力量`
        : `Gain ${statuses.infernalAvatar} Strength each turn`,
    });
  }
  if (statuses.miasma > 0) {
    items.push({
      label: zh ? '瘴气' : 'Miasma',
      value: statuses.miasma,
      tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60',
      title: zh
        ? `每回合开始给予所有敌人 ${statuses.miasma} 层中毒`
        : `Apply ${statuses.miasma} Poison to all enemies each turn`,
    });
  }
  if (statuses.venomEdge > 0) {
    items.push({
      label: zh ? '蛇毒' : 'Venom Edge',
      value: statuses.venomEdge,
      tone: 'text-lime-300 border-lime-500/40 bg-lime-950/60',
      title: zh ? '未格挡的攻击伤害附加中毒' : 'Unblocked attack hits apply Poison',
    });
  }
  if ((statuses.forgeHeart || 0) > 0) {
    items.push({
      label: zh ? '锻炉' : 'Forge Heart',
      value: statuses.forgeHeart!,
      tone: 'text-orange-200 border-orange-400/50 bg-orange-950/60',
      title: zh ? `每次添薪获得 ${statuses.forgeHeart} 点格挡` : `Gain ${statuses.forgeHeart} Block whenever you Stoke`,
    });
  }
  if ((statuses.smolderingHaze || 0) > 0) {
    items.push({
      label: zh ? '烟霭' : 'Haze',
      value: statuses.smolderingHaze!,
      tone: 'text-orange-200 border-emerald-500/40 bg-emerald-950/60',
      title: zh
        ? `每花 1 点余烬，给予所有敌人 ${statuses.smolderingHaze} 层中毒`
        : `Each Ember spent applies ${statuses.smolderingHaze} Poison to ALL enemies`,
    });
  }
  if (statuses.rotburst) {
    items.push({
      label: zh ? '腐爆' : 'Rotburst',
      value: '!',
      tone: 'text-emerald-200 border-emerald-400/50 bg-emerald-950/70',
      title: zh
        ? '死亡时对所有敌人造成等同其最大生命值的伤害'
        : 'On death, deals Max HP damage to ALL enemies',
    });
  }
  return items;
}

const VfxOverlay: React.FC<{ effects: CombatVfx[] }> = ({ effects }) => {
  if (effects.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-visible">
      {effects.map((fx) => {
        if (fx.type === 'shield') {
          return (
            <div key={fx.id} className="animate-shield-pulse absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="h-48 w-48 drop-shadow-[0_0_22px_rgba(56,189,248,0.8)]">
                <polygon
                  points="80,14 134,44 134,108 80,144 26,108 26,44"
                  fill="rgba(56, 189, 248, 0.14)"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                />
                <circle cx="80" cy="80" r="56" fill="none" stroke="#bae6fd" strokeWidth="1.5" strokeDasharray="8 6" />
              </svg>
            </div>
          );
        }

        if (fx.type === 'poison') {
          return (
            <div key={fx.id} className="animate-poison-burst absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="h-44 w-44 drop-shadow-[0_0_18px_rgba(52,211,153,0.85)]">
                <circle cx="80" cy="80" r="46" fill="rgba(16, 185, 129, 0.22)" stroke="#34d399" strokeWidth="2.5" />
                <circle cx="54" cy="60" r="7" fill="#6ee7b7" />
                <circle cx="106" cy="54" r="5" fill="#34d399" />
                <circle cx="94" cy="108" r="8" fill="#10b981" />
                <circle cx="62" cy="102" r="4" fill="#a7f3d0" />
              </svg>
            </div>
          );
        }

        if (fx.type === 'power') {
          return (
            <div key={fx.id} className="animate-power-aura absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 160 180" className="h-52 w-44 drop-shadow-[0_0_22px_rgba(245,158,11,0.8)]">
                <path
                  d="M42 168 L52 34 L80 12 L108 34 L118 168 Z"
                  fill="rgba(245, 158, 11, 0.18)"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                />
                <circle cx="80" cy="70" r="18" fill="rgba(251, 191, 36, 0.35)" />
              </svg>
            </div>
          );
        }

        const isHeavy = fx.type === 'slash_heavy';
        const isShadow = fx.type === 'slash_shadow';
        const isEnemy = fx.type === 'enemy_slash';
        const strokeColor = isShadow
          ? '#2dd4bf'
          : isEnemy
          ? '#f43f5e'
          : isHeavy
          ? '#fbbf24'
          : '#fb7185';

        return (
          <div key={fx.id} className="absolute inset-0 flex items-center justify-center">
            <div className="animate-impact-ring absolute h-32 w-32 rounded-full border-2 border-amber-300/75" />
            <svg
              viewBox="0 0 160 160"
              className={`animate-slash-sweep ${isHeavy ? 'h-48 w-48' : 'h-36 w-36'} drop-shadow-[0_0_18px_rgba(244,63,94,0.9)]`}
            >
              <path
                d={
                  isEnemy
                    ? 'M 134 26 Q 76 74 24 132'
                    : 'M 24 130 Q 82 76 136 22'
                }
                fill="none"
                stroke={strokeColor}
                strokeWidth={isHeavy ? '10' : '6'}
                strokeLinecap="round"
              />
              {isHeavy && (
                <path
                  d="M 28 32 Q 84 80 132 130"
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              )}
              <path
                d={
                  isEnemy
                    ? 'M 122 34 Q 76 76 34 122'
                    : 'M 36 122 Q 82 78 124 34'
                }
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export const CombatArenaView: React.FC<CombatArenaViewProps> = ({
  state,
  locale,
  floatingTexts,
  combatVfx,
  arenaShake,
  hitPlayer,
  heroAttacking,
  enemyAttacking,
  hitEnemyUids,
  pendingPotionSlot,
  onCancelPendingPotion,
  onPlayCard,
  onChooseCard,
  onSkipChoice,
  onUsePotionOnEnemy,
  onEndTurn,
  onCardHoverSound,
  onStokeCard,
  onUseAbility,
}) => {
  const combat = state.combat;
  const copy = UI_COPY[locale];
  const hero = HERO_CLASSES[state.heroId];
  const heroName = locale === 'zh' ? hero.name : HERO_EN[state.heroId].name;

  const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
  const [hoveredCardUid, setHoveredCardUid] = useState<string | null>(null);
  const [draggingCardUid, setDraggingCardUid] = useState<string | null>(null);
  const [hoveredEnemyUid, setHoveredEnemyUid] = useState<string | null>(null);
  const [inspectPile, setInspectPile] = useState<'draw' | 'discard' | 'exhaust' | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [standeeFailed, setStandeeFailed] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });
  // Stoke mode: the next hand card clicked is burned for Ember instead of played.
  const [stokeMode, setStokeMode] = useState(false);
  // Phones (< 768px) get the portrait layout; touch screens preview a card on
  // the first tap and play it on the second (there is no hover to read it).
  const isTouch = useIsTouch();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const [previewCardUid, setPreviewCardUid] = useState<string | null>(null);
  // Enemy elements, for keyboard targeting (arrow keys move between them).
  const enemyRefs = useRef(new Map<string, HTMLDivElement>());

  // Hand row width, used to overlap cards so the whole hand fits on one row.
  // A callback ref attaches the observer whenever the row element mounts.
  const [handWidth, setHandWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  const handObserver = useRef<ResizeObserver | null>(null);
  const handEl = useRef<HTMLDivElement | null>(null);
  const handRef = useCallback((el: HTMLDivElement | null) => {
    handObserver.current?.disconnect();
    handObserver.current = null;
    handEl.current = el;
    if (!el) return;
    // Measure immediately; the observer then tracks later size changes.
    setHandWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(([entry]) => setHandWidth(entry.contentRect.width));
      ro.observe(el);
      handObserver.current = ro;
    }
  }, []);
  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth);
      if (handEl.current) setHandWidth(handEl.current.getBoundingClientRect().width);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      handObserver.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    setSelectedCardUid(null);
    setStokeMode(false);
    setPreviewCardUid(null);
  }, [combat?.turn, combat?.hand.length]);

  // Entering targeting mode (a targeted card or potion with 2+ living enemies)
  // moves focus to the first enemy, so keyboard players can pick a target.
  useEffect(() => {
    if (!combat || (!selectedCardUid && pendingPotionSlot === null)) return;
    const first = combat.enemies.find((en) => en.hp > 0);
    if (first && combat.enemies.filter((en) => en.hp > 0).length > 1) {
      enemyRefs.current.get(first.uid)?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardUid, pendingPotionSlot]);

  useEffect(() => {
    setBgFailed(false);
  }, [state.floor, combat?.isEliteFight, combat?.isBossFight]);

  // Keyboard shortcuts: 1-9 select/play card, E/Space end turn, Escape cancel selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Keys belong to an open dialog (glossary, settings, piles...), not the combat behind it.
      if (!combat || combat.enemyTurnInProgress || inspectPile || isDialogOpen()) return;
      if (e.key === 'Escape') {
        setSelectedCardUid(null);
        setStokeMode(false);
        onCancelPendingPotion();
        return;
      }
      // B: Stoke the hovered card, or toggle Stoke mode. Q: class ability.
      if (e.key === 'b' || e.key === 'B') {
        if (!canStoke(state)) return;
        const hovered = combat.hand.find((c) => c.uid === hoveredCardUid);
        if (hovered) {
          onStokeCard(hovered.uid);
          setStokeMode(false);
        } else {
          setStokeMode((m) => !m);
        }
        return;
      }
      if (e.key === 'q' || e.key === 'Q') {
        if (canUseAbility(state)) onUseAbility();
        return;
      }
      if (e.key.startsWith('Arrow') && (selectedCardUid || pendingPotionSlot !== null)) {
        const order = combat.enemies.filter((en) => en.hp > 0).map((en) => en.uid);
        if (order.length === 0) return;
        e.preventDefault();
        const current = order.findIndex((uid) => enemyRefs.current.get(uid) === document.activeElement);
        const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
        const next = order[(current + step + order.length) % order.length];
        enemyRefs.current.get(next)?.focus();
        return;
      }
      if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !combat.pendingChoice) {
        const active = document.activeElement;
        if (active?.tagName !== 'BUTTON' && active?.getAttribute('role') !== 'button') {
          e.preventDefault();
          onEndTurn();
        }
        return;
      }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 0 && num <= 9) {
        // 1-9 pick cards 1-9; 0 picks the 10th (the hand holds up to 10).
        const card = combat.hand[num === 0 ? 9 : num - 1];
        if (!card) return;
        if (combat.pendingChoice) {
          if (combat.pendingChoice.from === 'hand') onChooseCard(card.uid);
          return;
        }
        handleCardClick(card);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!combat) return null;

  const sceneTheme = getCombatSceneTheme(
    state,
    combat.isEliteFight,
    combat.isBossFight,
    locale
  );

  const livingEnemies = combat.enemies.filter((e) => e.hp > 0);
  const selectedCard = combat.hand.find((c) => c.uid === selectedCardUid) || null;
  const activePreviewCard =
    selectedCard ||
    combat.hand.find((c) => c.uid === draggingCardUid) ||
    combat.hand.find((c) => c.uid === hoveredCardUid) ||
    null;
  const previewEnemy =
    livingEnemies.find((e) => e.uid === hoveredEnemyUid) ||
    (livingEnemies.length === 1 ? livingEnemies[0] : undefined);

  const totalIncomingDamage = livingEnemies.reduce((sum, e) => {
    if (e.intent.damage === undefined || e.intent.damage <= 0) return sum;
    const atk = calculateEnemyAttackPreview(e, state);
    return sum + atk.perHit * atk.hits;
  }, 0);
  const netIncomingDamage = Math.max(0, totalIncomingDamage - combat.playerBlock);

  // Single-row hand: cards overlap just enough to fit the measured row width.
  // CardView is w-40 (160px) below the sm breakpoint and w-44 (176px) from sm up.
  const handCardWidth = isPhone ? 112 : viewportWidth >= 640 ? 176 : 160;
  const handGap = 12;
  const handCount = combat.hand.length;
  const handStep =
    handCount > 1 && handWidth > 0
      ? Math.max(24, Math.min(handCardWidth + handGap, (handWidth - handCardWidth) / (handCount - 1)))
      : handCardWidth + handGap;

  const handleCardClick = (card: CardInstance) => {
    if (combat.enemyTurnInProgress) return;
    if (stokeMode) {
      onStokeCard(card.uid);
      setStokeMode(false);
      return;
    }
    if (combat.pendingChoice) {
      if (combat.pendingChoice.from === 'hand') onChooseCard(card.uid);
      return;
    }
    if (isTouch && previewCardUid !== card.uid) {
      setPreviewCardUid(card.uid);
      return;
    }
    setPreviewCardUid(null);
    const def = CARD_DEFS[card.defId];
    if (!def) return;
    const cost = getCardCost(card);
    if (cost === -2) return;
    const reqCost = cost === -1 ? 0 : cost;
    if (combat.energy < reqCost) return;

    if (def.target === 'enemy') {
      if (livingEnemies.length === 1) {
        onPlayCard(card.uid, livingEnemies[0].uid);
        setSelectedCardUid(null);
      } else if (selectedCardUid === card.uid) {
        setSelectedCardUid(null);
      } else {
        setSelectedCardUid(card.uid);
      }
    } else {
      onPlayCard(card.uid);
      setSelectedCardUid(null);
    }
  };

  // A dropped card follows the same rules as a click: Stoke mode burns it, a
  // pending discard discards it, and a targeted card with no clear target is
  // selected so the player can pick one (it used to do nothing silently).
  const handleDropCard = (enemyUid?: string) => {
    const uid = draggingCardUid;
    setDraggingCardUid(null);
    const card = uid ? combat.hand.find((c) => c.uid === uid) : undefined;
    if (!card || combat.enemyTurnInProgress) return;
    if (stokeMode || combat.pendingChoice) {
      handleCardClick(card);
      return;
    }
    const def = CARD_DEFS[card.defId];
    if (!def) return;
    if (def.target !== 'enemy') {
      onPlayCard(card.uid);
      setSelectedCardUid(null);
      return;
    }
    const target = livingEnemies.find((e) => e.uid === enemyUid) || (livingEnemies.length === 1 ? livingEnemies[0] : undefined);
    if (target) {
      onPlayCard(card.uid, target.uid);
      setSelectedCardUid(null);
    } else {
      setSelectedCardUid(card.uid);
    }
  };

  const handleEnemyClick = (enemy: EnemyInstance) => {
    if (enemy.hp <= 0 || combat.enemyTurnInProgress) return;
    if (pendingPotionSlot !== null) {
      onUsePotionOnEnemy(pendingPotionSlot, enemy.uid);
      return;
    }
    if (selectedCard) {
      onPlayCard(selectedCard.uid, enemy.uid);
      setSelectedCardUid(null);
    }
  };

  const renderIntent = (enemy: EnemyInstance) => {
    const intent = enemy.intent;
    const atk = calculateEnemyAttackPreview(enemy, state);
    const intentText = tIntentLabel(intent, locale);

    if (intent.type === 'sleep') {
      return (
        <div
          title={intentText}
          className="flex items-center gap-1.5 rounded-lg border border-indigo-400/35 bg-[#121622]/90 px-3 py-1 text-xs text-indigo-200"
        >
          <Moon className="h-3.5 w-3.5 text-indigo-300" />
          <span>{locale === 'zh' ? '沉睡中' : 'Asleep'}</span>
        </div>
      );
    }
    if (intent.type === 'attack') {
      return (
        <div
          title={intentText}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/45 bg-rose-950/85 px-3 py-1 text-sm font-bold text-rose-100 shadow"
        >
          <Swords className="h-4 w-4 text-rose-400" />
          <span className="font-mono-num">
            {atk.perHit}
            {atk.hits > 1 ? ` × ${atk.hits}` : ''}
          </span>
        </div>
      );
    }
    if (intent.type === 'attack_defend') {
      return (
        <div
          title={intentText}
          className="flex items-center gap-2 rounded-lg border border-amber-500/45 bg-[#1c1a24]/90 px-3 py-1 text-sm font-bold text-amber-100 shadow"
        >
          <span className="flex items-center gap-1 text-rose-300">
            <Swords className="h-4 w-4" />
            <span className="font-mono-num">
              {atk.perHit}
              {atk.hits > 1 ? `×${atk.hits}` : ''}
            </span>
          </span>
          <span className="text-slate-500">/</span>
          <span className="flex items-center gap-1 text-sky-300">
            <Shield className="h-3.5 w-3.5" />
            <span className="font-mono-num">{intent.block}</span>
          </span>
        </div>
      );
    }
    if (intent.type === 'attack_debuff') {
      return (
        <div
          title={intentText}
          className="flex items-center gap-2 rounded-lg border border-rose-500/50 bg-[#231420]/90 px-3 py-1 text-sm font-bold text-rose-100 shadow"
        >
          <Swords className="h-4 w-4 text-rose-400" />
          <span className="font-mono-num">
            {atk.perHit}
            {atk.hits > 1 ? `×${atk.hits}` : ''}
          </span>
          <Skull className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      );
    }
    if (intent.type === 'defend') {
      return (
        <div
          title={intentText}
          className="flex items-center gap-1.5 rounded-lg border border-sky-500/45 bg-sky-950/85 px-3 py-1 text-xs font-semibold text-sky-100"
        >
          <Shield className="h-3.5 w-3.5 text-sky-400" />
          <span>{locale === 'zh' ? '防御强化' : 'Defend'}</span>
        </div>
      );
    }
    if (intent.type === 'stunned') {
      return (
        <div
          title={intentText}
          className="flex items-center gap-1.5 rounded-lg border border-violet-400/50 bg-violet-950/85 px-3 py-1 text-xs font-semibold text-violet-100"
        >
          <ZapOff className="h-3.5 w-3.5 text-violet-300" />
          <span>{locale === 'zh' ? '过载失衡' : 'Overloaded'}</span>
        </div>
      );
    }
    if (intent.type === 'buff') {
      return (
        <div
          title={intentText}
          className="flex items-center gap-1.5 rounded-lg border border-amber-400/45 bg-amber-950/85 px-3 py-1 text-xs font-semibold text-amber-200"
        >
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span>{locale === 'zh' ? '蓄力强化' : 'Buffing'}</span>
        </div>
      );
    }
    return (
      <div
        title={intentText}
        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/45 bg-emerald-950/85 px-3 py-1 text-xs font-semibold text-emerald-200"
      >
        <Skull className="h-3.5 w-3.5 text-emerald-400" />
        <span>{locale === 'zh' ? '施加负面' : 'Debuff'}</span>
      </div>
    );
  };

  const isTargetingEnemy = Boolean(selectedCard || pendingPotionSlot !== null);
  const playerVfx = combatVfx.filter((v) => v.targetUid === 'player');

  // Spatial parallax offsets driven by player attack, enemy hit/strike, screen shake & cursor
  const heroImpulse = heroAttacking || hitEnemyUids.length > 0;
  const enemyImpulse = enemyAttacking || hitPlayer;
  const impactShiftX = heroImpulse && !enemyImpulse ? -16 : enemyImpulse && !heroImpulse ? 16 : 0;
  const impactShiftY = arenaShake ? -4 : heroImpulse || enemyImpulse ? -2 : 0;
  const impactScale = arenaShake ? 1.03 : heroImpulse || enemyImpulse ? 1.015 : 1;

  const farBgTransform = `translate3d(${(pointerOffset.x * -10 + impactShiftX).toFixed(1)}px, ${(
    pointerOffset.y * -5 +
    impactShiftY
  ).toFixed(1)}px, 0) scale(${impactScale})`;
  const midMistTransform = `translate3d(${(pointerOffset.x * -18 + impactShiftX * 1.65).toFixed(
    1
  )}px, ${(pointerOffset.y * -9 + impactShiftY * 1.4).toFixed(1)}px, 0) scale(${
    impactScale + 0.02
  })`;
  const stageParallaxTransform = `translate3d(${(pointerOffset.x * 5).toFixed(1)}px, ${(
    pointerOffset.y * 2.5
  ).toFixed(1)}px, 0)`;

  const handleArenaPointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setPointerOffset({
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    });
  };

  return (
    <div
      onMouseMove={handleArenaPointerMove}
      onMouseLeave={() => setPointerOffset({ x: 0, y: 0 })}
      className="relative flex min-h-[calc(100dvh-58px)] flex-col justify-between overflow-clip"
    >
      {/* Dynamic Multi-Biome Arena Backdrop with Parallax Depth & Impact Displacement */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Far Backdrop Layer: Overscanned + Ambient Drift + Counter-Shake + Impact Parallax */}
        <div
          className={`absolute -inset-10 will-change-transform ${
            arenaShake ? 'animate-bg-parallax-shake' : ''
          }`}
        >
          <div
            className="h-full w-full will-change-transform transition-transform duration-200 ease-out"
            style={{ transform: farBgTransform }}
          >
            {!bgFailed && (
              <img
                key={sceneTheme.src}
                src={sceneTheme.src}
                alt={sceneTheme.biome}
                referrerPolicy="no-referrer"
                onError={() => setBgFailed(true)}
                className="animate-arena-bg-drift h-full w-full object-cover object-center opacity-58 transition-opacity duration-500"
              />
            )}
          </div>
        </div>

        {/* Midground Atmospheric Mist / Ember Layer: Moves faster for 2.5D depth separation */}
        <div
          className="absolute -inset-10 will-change-transform transition-transform duration-200 ease-out"
          style={{ transform: midMistTransform }}
        >
          <div
            className="animate-arena-mist-scroll h-full w-full"
            style={{ backgroundImage: sceneTheme.mistGradient }}
          />
        </div>

        <div className={`absolute inset-0 bg-gradient-to-b ${sceneTheme.scrim}`} />
      </div>

      {/* Top Combat Status Strip */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2 px-3 pt-3 sm:px-8 sm:pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
          <span className="font-mono-num font-semibold text-amber-300">
            {locale === 'zh' ? `第 ${combat.turn} 回合` : `Turn ${combat.turn}`}
          </span>
          <span className="hidden text-slate-500 sm:inline">·</span>
          <span className="hidden sm:inline">
            {combat.isBossFight
              ? copy.bossFight
              : combat.isEliteFight
              ? copy.eliteFight
              : copy.normalFight}
          </span>
          <span className="hidden text-slate-500 sm:inline">·</span>
          <span className="hidden text-slate-400 sm:inline">{sceneTheme.biome}</span>
          {combat.doubleDamageActive && (
            <>
              <span className="text-slate-500">·</span>
              <span className="font-semibold text-emerald-400">
                {copy.doubleDmgActive}
              </span>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Phones: piles live here so the bottom bar fits one row. */}
          <button
            type="button"
            onClick={() => setInspectPile('draw')}
            aria-label={`${copy.drawPile} ${combat.drawPile.length}`}
            className="flex items-center gap-1 rounded-lg border border-white/12 bg-[#141923]/90 px-2 py-1.5 text-xs text-slate-200 md:hidden cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-mono-num font-bold">{combat.drawPile.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setInspectPile('discard')}
            aria-label={`${copy.discardPile} ${combat.discardPile.length}`}
            className="flex items-center gap-1 rounded-lg border border-white/12 bg-[#141923]/90 px-2 py-1.5 text-xs text-slate-200 md:hidden cursor-pointer"
          >
            <Archive className="h-3.5 w-3.5 text-amber-300" />
            <span className="font-mono-num font-bold">{combat.discardPile.length}</span>
          </button>
          {combat.exhaustPile.length > 0 && (
            <button
              type="button"
              onClick={() => setInspectPile('exhaust')}
              aria-label={`${copy.exhaustPile} ${combat.exhaustPile.length}`}
              className="flex items-center gap-1 rounded-lg border border-white/12 bg-[#141923]/90 px-2 py-1.5 text-xs text-slate-200 md:hidden cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-mono-num font-bold">{combat.exhaustPile.length}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            aria-label={copy.combatLog}
            className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#141923]/90 px-2 py-1.5 text-xs text-slate-300 hover:text-white sm:px-3 cursor-pointer"
          >
            <ScrollText className="h-3.5 w-3.5 text-slate-400" />
            <span className="sr-only sm:not-sr-only">{copy.combatLog}</span>
          </button>
        </div>
      </div>

      {/* Prompt Banners for Targeting / Discarding */}
      {(isTargetingEnemy || combat.pendingChoice || stokeMode) && (
        <div className="relative z-20 mx-3 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-400/50 bg-[#171d29]/95 px-4 py-2 text-xs text-amber-200 shadow-lg sm:mx-auto sm:text-sm">
          {stokeMode ? (
            <>
              <Flame className="h-4 w-4 text-orange-400" />
              <span>{copy.stokePrompt}</span>
              <button
                type="button"
                onClick={() => setStokeMode(false)}
                className="rounded border border-white/20 px-2 py-0.5 text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                {copy.cancel} (Esc)
              </button>
            </>
          ) : combat.pendingChoice ? (
            <>
              {combat.pendingChoice.from === 'hand' && combat.pendingChoice.action === 'discard' ? (
                <span>
                  {copy.chooseDiscardPrefix}{' '}
                  <strong className="text-white">{combat.pendingChoice.remaining}</strong>{' '}
                  {copy.discardPrompt}
                </span>
              ) : (
                <span>
                  {copy.choosePrompt(combat.pendingChoice.remaining)} · {copy.chooseFrom[combat.pendingChoice.from]} →{' '}
                  {copy.choiceActions[combat.pendingChoice.action]}
                </span>
              )}
              {combat.pendingChoice.optional && (
                <button
                  type="button"
                  onClick={onSkipChoice}
                  className="rounded border border-white/20 px-2 py-0.5 text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
                >
                  {copy.skipChoice}
                </button>
              )}
            </>
          ) : pendingPotionSlot !== null ? (
            <>
              <span>{copy.selectPotionTarget}</span>
              <button
                type="button"
                onClick={onCancelPendingPotion}
                className="rounded border border-white/20 px-2 py-0.5 text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                {copy.cancel}
              </button>
            </>
          ) : (
            <>
              <span>
                [{tCard(selectedCard!.defId, locale).name}] · {copy.selectTargetPrompt}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCardUid(null)}
                className="rounded border border-white/20 px-2 py-0.5 text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
              >
                {copy.cancel} (Esc)
              </button>
            </>
          )}
        </div>
      )}

      {/* Main Standoff Battlefield: Hero Standee Foreground Left vs Diagonal Staggered Enemies Right (NO card frames on combatants!) */}
      <div
        onDragOver={(e) => {
          if (draggingCardUid) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDropCard();
        }}
        onClick={() => setPreviewCardUid(null)}
        className={`relative z-10 mx-auto flex w-full max-w-[1320px] flex-1 flex-col md:flex-row items-center md:items-end justify-start md:justify-between gap-3 px-3 pb-4 pt-3 md:gap-10 md:px-6 md:pb-8 md:pt-6 ${
          arenaShake ? 'animate-arena-shake' : ''
        }`}
        style={!arenaShake ? { transform: stageParallaxTransform, transition: 'transform 220ms ease-out' } : undefined}
      >
        {/* Left Side: Hero Standee Standoff Position */}
        <div className="relative order-2 flex flex-row items-center gap-3 md:order-none md:ml-8 md:translate-y-2 md:flex-col md:gap-0">
          <div className="relative flex items-center justify-center">
            {/* Floating Combat Numbers for Player */}
            <div className="pointer-events-none absolute -top-10 left-1/2 z-40 -translate-x-1/2 flex flex-col items-center gap-1">
              {floatingTexts
                .filter((f) => f.targetUid === 'player')
                .map((ft) => (
                  <span
                    key={ft.id}
                    className={`animate-float-dmg font-mono-num text-lg font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                      ft.tone === 'damage'
                        ? 'text-rose-400'
                        : ft.tone === 'block'
                        ? 'text-sky-300'
                        : ft.tone === 'heal'
                        ? 'text-emerald-300'
                        : ft.tone === 'ember'
                        ? 'text-orange-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {tCombatMsg(ft.msg, locale)}
                  </span>
                ))}
            </div>

            {/* Grounded Shadow & Stance Disc */}
            <div className="pointer-events-none absolute -bottom-2 left-1/2 h-6 w-20 -translate-x-1/2 rounded-full bg-black/75 blur-md md:h-8 md:w-44" />
            <div
              className="pointer-events-none absolute -bottom-1 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full opacity-55 md:h-4 md:w-36"
              style={{
                border: `1.5px solid ${hero.accentColor}`,
                boxShadow: `0 0 18px ${hero.accentColor}55`,
              }}
            />

            {/* Borderless Feathered Hero Standee Figure */}
            <div
              className={`relative h-28 w-20 md:h-80 md:w-56 transition-transform ${
                hitPlayer
                  ? 'animate-hit-shake brightness-125'
                  : heroAttacking
                  ? 'animate-lunge-right'
                  : 'animate-gentle-bob'
              }`}
            >
              {!standeeFailed ? (
                <img
                  src={hero.standeeUrl}
                  alt={heroName}
                  referrerPolicy="no-referrer"
                  onError={() => setStandeeFailed(true)}
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(ellipse 70% 82% at 50% 45%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
                    maskImage:
                      'radial-gradient(ellipse 70% 82% at 50% 45%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
                  }}
                  className="h-full w-full object-cover object-top drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)]"
                />
              ) : !portraitFailed ? (
                <img
                  src={hero.portraitUrl}
                  alt={heroName}
                  referrerPolicy="no-referrer"
                  onError={() => setPortraitFailed(true)}
                  style={{
                    WebkitMaskImage:
                      'radial-gradient(ellipse 70% 82% at 50% 48%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
                    maskImage:
                      'radial-gradient(ellipse 70% 82% at 50% 48%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
                  }}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Swords className="h-16 w-16 text-amber-400" />
                </div>
              )}

              {/* Shield / Power / Enemy Slash VFX over Hero */}
              <VfxOverlay effects={playerVfx} />
            </div>

            {/* Active Block Shield Badge */}
            {combat.playerBlock > 0 && (
              <div className="absolute -right-2 bottom-0 z-20 flex items-center gap-1 rounded-lg border border-sky-400/75 bg-sky-950/95 px-1.5 py-0.5 text-xs font-bold text-sky-200 shadow-lg md:right-0 md:bottom-3 md:px-2.5 md:py-1 md:text-sm">
                <Shield className="h-4 w-4 text-sky-400" />
                <span className="font-mono-num">{combat.playerBlock}</span>
              </div>
            )}
          </div>

          {/* Player HP Bar & Statuses */}
          <div className="w-52 rounded-xl bg-[#0b0e14]/70 px-3 py-2 backdrop-blur-sm border border-white/8 md:mt-3 md:w-64">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-100">{heroName}</span>
              <span className="flex items-center gap-1 font-mono-num text-rose-200">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                {state.hp} / {state.maxHp}
              </span>
            </div>
            {totalIncomingDamage > 0 && (
              <div
                className={`mb-1 font-mono-num text-[11px] md:hidden ${
                  netIncomingDamage >= state.hp
                    ? 'font-bold text-rose-300'
                    : netIncomingDamage > 0
                    ? 'text-rose-300'
                    : 'text-emerald-300'
                }`}
              >
                {netIncomingDamage >= state.hp ? '☠ ' : ''}
                {netIncomingDamage > 0
                  ? `${copy.incomingTotal} ${totalIncomingDamage} · ${copy.netHpLoss} ${netIncomingDamage}`
                  : `${copy.incomingTotal} ${totalIncomingDamage} · ${copy.fullyBlocked}`}
              </div>
            )}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100))}%` }}
              />
            </div>

            {renderStatusTags(combat.playerStatuses, locale).length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {renderStatusTags(combat.playerStatuses, locale).map((st) => (
                  <InfoTip
                    key={st.label}
                    tip={st.title}
                    label={st.label}
                    className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${st.tone}`}
                  >
                    {st.label} <span className="font-mono-num">{st.value}</span>
                  </InfoTip>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Diagonal Staggered Enemy Formation (前后交叉斜站位) */}
        <div className="flex w-full flex-nowrap items-start justify-center gap-2 md:mr-6 md:w-auto md:flex-wrap md:items-end md:gap-10">
          {combat.enemies.map((enemy, idx) => {
            const dead = enemy.hp <= 0;
            const isHit = hitEnemyUids.includes(enemy.uid);
            const statuses = renderStatusTags(enemy.statuses, locale);
            if (enemy.enraged) {
              statuses.unshift({
                label: locale === 'zh' ? '狂怒' : 'Enrage',
                value: '+2',
                tone: 'text-red-200 border-red-500/50 bg-red-950/70',
                title:
                  locale === 'zh'
                    ? '你每打出一张技能牌，它获得 2 点力量'
                    : 'Gains 2 Strength whenever you play a Skill',
              });
            }
            const enemyDisplayName = tEnemyName(enemy.defId, enemy.name, locale);
            const intentSubtitle = tIntentLabel(enemy.intent, locale);
            const enemyVfx = combatVfx.filter((v) => v.targetUid === enemy.uid);

            // Phones: enemies share one row.
            const phoneWidthCls =
              combat.enemies.length >= 3 ? 'w-[32%]' : combat.enemies.length === 2 ? 'w-[48%]' : 'w-[70%]';
            // Stagger multi-enemy positions diagonally (front-left vs back-right depth)
            const staggerCls =
              combat.enemies.length > 1
                ? idx % 2 === 0
                  ? 'md:translate-y-3 md:scale-100 z-20'
                  : 'md:-translate-y-12 md:scale-90 z-10'
                : 'md:translate-y-0 z-20';

            let targetDamagePreview: { total: number; lethal: boolean } | null = null;
            if (!dead && activePreviewCard && !stokeMode) {
              const selDef = CARD_DEFS[activePreviewCard.defId];
              const cost = getCardCost(activePreviewCard);
              const affordable = cost === -1 || (cost >= 0 && combat.energy >= cost);
              const total =
                affordable && selDef && (selDef.target === 'enemy' || selDef.target === 'all_enemies')
                  ? calculateCardTotalDamage(activePreviewCard, state, enemy)
                  : null;
              if (total !== null) {
                targetDamagePreview = { total, lethal: total >= enemy.hp + enemy.block };
              }
            }

            return (
              <div
                key={enemy.uid}
                ref={(el) => {
                  if (el) enemyRefs.current.set(enemy.uid, el);
                  else enemyRefs.current.delete(enemy.uid);
                }}
                role="button"
                tabIndex={dead ? -1 : 0}
                aria-disabled={dead || undefined}
                aria-label={`${enemyDisplayName} ${enemy.hp}/${enemy.maxHp} · ${intentSubtitle}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEnemyClick(enemy);
                  }
                }}
                onFocus={() => !dead && setHoveredEnemyUid(enemy.uid)}
                onBlur={() => setHoveredEnemyUid(null)}
                onMouseEnter={() => !dead && setHoveredEnemyUid(enemy.uid)}
                onMouseLeave={() => setHoveredEnemyUid(null)}
                onDragOver={(e) => {
                  if (!dead && draggingCardUid) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!dead) handleDropCard(enemy.uid);
                }}
                onClick={() => handleEnemyClick(enemy)}
                className={`relative flex min-w-0 flex-col items-center ${phoneWidthCls} md:w-auto rounded-2xl outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent ${staggerCls} ${
                  dead
                    ? 'opacity-15 grayscale pointer-events-none scale-90'
                    : isTargetingEnemy
                    ? 'cursor-crosshair hover:scale-105'
                    : ''
                }`}
              >
                {/* Floating Numbers */}
                <div className="pointer-events-none absolute -top-12 left-1/2 z-40 -translate-x-1/2 flex flex-col items-center gap-1">
                  {floatingTexts
                    .filter((f) => f.targetUid === enemy.uid)
                    .map((ft) => (
                      <span
                        key={ft.id}
                        className={`animate-float-dmg font-mono-num text-lg font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                          ft.tone === 'damage'
                            ? 'text-amber-300'
                            : ft.tone === 'poison'
                            ? 'text-emerald-300'
                            : ft.tone === 'block'
                            ? 'text-sky-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {tCombatMsg(ft.msg, locale)}
                      </span>
                    ))}
                </div>

                {/* Enemy Intent */}
                {!dead && (
                  <div className="mb-2 flex w-full flex-col items-center gap-1">
                    <InfoTip tip={intentSubtitle} label={enemyDisplayName} placement="bottom">
                      {renderIntent(enemy)}
                    </InfoTip>
                    {enemy.charge && <ChargeBar charge={enemy.charge} locale={locale} />}
                    <span className="max-w-full truncate text-[11px] text-slate-300 drop-shadow md:max-w-[190px]">
                      {intentSubtitle}
                    </span>
                  </div>
                )}

                {/* Target Damage / Lethal Preview Badge */}
                {targetDamagePreview && (
                  <div
                    className={`mb-1.5 rounded-md border px-2 py-0.5 font-mono-num text-xs font-bold shadow ${
                      targetDamagePreview.lethal
                        ? 'border-rose-400 bg-rose-600 text-white'
                        : 'border-amber-400/70 bg-amber-950/90 text-amber-200'
                    }`}
                  >
                    {targetDamagePreview.lethal
                      ? `${copy.killBadge} (${targetDamagePreview.total})`
                      : `${copy.previewDmg} -${targetDamagePreview.total}`}
                  </div>
                )}

                {/* Borderless Enemy Figure Standing on Arena Shadow */}
                <div className="relative flex items-center justify-center">
                  <div className="pointer-events-none absolute -bottom-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black/80 blur-md md:h-7 md:w-40" />
                  {(isTargetingEnemy || draggingCardUid) && !dead && (
                    <div className="pointer-events-none absolute -bottom-1 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full border-2 border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.55)] md:h-5 md:w-40" />
                  )}

                  <div
                    className={`relative ${
                      enemy.isBoss ? 'h-36 w-36 md:h-68 md:w-68' : 'h-24 w-24 md:h-52 md:w-52'
                    } transition-transform ${
                      isHit
                        ? 'animate-hit-shake brightness-150'
                        : enemyAttacking && enemy.intent.damage && !dead
                        ? 'animate-lunge-left'
                        : 'animate-gentle-bob'
                    }`}
                  >
                    <EnemyArtwork
                      artType={enemy.artType}
                      asleep={enemy.asleep}
                      bare
                      className="h-full w-full"
                    />
                    <VfxOverlay effects={enemyVfx} />
                    {enemy.block > 0 && !dead && (
                      <div className="absolute right-2 bottom-2 z-20 flex items-center gap-1 rounded-lg border border-sky-400/75 bg-sky-950/95 px-2 py-0.5 text-xs font-bold text-sky-200 shadow">
                        <Shield className="h-3.5 w-3.5 text-sky-400" />
                        <span className="font-mono-num">{enemy.block}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enemy Name & HP Bar */}
                <div className="mt-1.5 w-full rounded-xl bg-[#0b0e14]/70 px-2 py-1.5 backdrop-blur-sm border border-white/8 md:mt-2.5 md:w-56 md:px-3 md:py-2">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-x-1 text-[11px] md:text-xs">
                    <span className="font-semibold text-slate-100 truncate">
                      {enemyDisplayName}
                    </span>
                    <span className="font-mono-num text-rose-200 whitespace-nowrap">
                      {enemy.hp} / {enemy.maxHp}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90 border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-rose-700 to-rose-500 transition-all duration-300"
                      style={{
                        width: `${Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100))}%`,
                      }}
                    />
                  </div>
                  {statuses.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      {statuses.map((st) => (
                        <InfoTip
                          key={st.label}
                          tip={st.title}
                          label={st.label}
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${st.tone}`}
                        >
                          {st.label} <span className="font-mono-num">{st.value}</span>
                        </InfoTip>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Hand & Controls Bar. From 1024px: one row [energy+Ember | hand |
          piles+End Turn], with both side groups stacked vertically so the hand
          keeps most of the width. Below 1024px the controls share the first row
          and the hand takes the full second row. */}
      <div className="sticky bottom-0 z-30 border-t border-white/10 bg-[#0d1118]/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:relative md:z-20 md:px-6 md:py-4">
        {(() => {
          const card = previewCardUid ? combat.hand.find((c) => c.uid === previewCardUid) : undefined;
          if (!card) return null;
          const def = CARD_DEFS[card.defId];
          const cost = getCardCost(card);
          const hint =
            cost === -2
              ? copy.cannotPlay
              : cost > combat.energy
              ? copy.notEnoughEnergy
              : def?.target === 'enemy' && livingEnemies.length > 1
              ? copy.tapAgainToTarget
              : copy.tapAgainToPlay;
          return (
            <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-3 flex -translate-x-1/2 flex-col items-center gap-2" data-testid="card-preview">
              <div className="pointer-events-auto">
                <CardView card={card} locale={locale} state={state} targetEnemy={previewEnemy} onClick={() => handleCardClick(card)} />
              </div>
              <div className="rounded-lg border border-amber-400/40 bg-[#0b0e14]/90 px-3 py-1 text-xs font-semibold text-amber-200 shadow">
                {hint}
              </div>
            </div>
          );
        })()}
        <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 md:gap-x-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          {/* Left: Energy & Ember */}
          <div className="col-start-1 row-start-1 flex min-w-0 flex-nowrap items-center gap-x-2 gap-y-2 md:flex-wrap md:gap-x-4 lg:flex-col lg:flex-nowrap lg:items-start">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-amber-400/60 md:h-14 md:w-14 bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Zap className="h-4 w-4" />
                <span className="font-mono-num text-base font-extrabold leading-none">
                  {combat.energy}/{combat.maxEnergy}
                </span>
              </div>
              <div className="hidden text-xs text-slate-400 md:block">
                <div className="font-semibold text-slate-200">{copy.energy}</div>
                {!isTouch && <div>{copy.keyHint}</div>}
              </div>
            </div>

            <EmberPanel
              state={state}
              locale={locale}
              stokeMode={stokeMode}
              onToggleStoke={() => setStokeMode((m) => !m)}
              onUseAbility={onUseAbility}
              isTouch={isTouch}
            />

          </div>

          {/* Center: Hand of Cards + Drop zone */}
          <div
            ref={handRef}
            onDragOver={(e) => {
              if (draggingCardUid) e.preventDefault();
            }}
            onDrop={(e) => {
              // Dropping a card back on the hand cancels the drag.
              e.preventDefault();
              e.stopPropagation();
              setDraggingCardUid(null);
            }}
            className="col-span-2 row-start-2 flex min-w-0 flex-nowrap items-center justify-center py-1 lg:col-span-1 lg:col-start-2 lg:row-start-1"
          >
            {combat.hand.map((card, idx) => (
              <div
                key={card.uid}
                className="relative shrink-0"
                style={{
                  marginLeft: idx === 0 ? 0 : handStep - handCardWidth,
                  zIndex:
                    hoveredCardUid === card.uid || selectedCardUid === card.uid ? 50 : idx + 1,
                }}
              >
                <CardView
                  card={card}
                  mini={isPhone}
                  locale={locale}
                  state={state}
                  targetEnemy={previewEnemy}
                  selected={selectedCardUid === card.uid || previewCardUid === card.uid}
                  discardMode={combat.pendingChoice?.from === 'hand'}
                  stokeMode={stokeMode}
                  shortcutNumber={idx < 9 ? idx + 1 : idx === 9 ? 0 : undefined}
                  draggableCard={!combat.enemyTurnInProgress}
                  onMouseEnter={() => {
                    setHoveredCardUid(card.uid);
                    onCardHoverSound();
                  }}
                  onMouseLeave={() => setHoveredCardUid(null)}
                  onDragStart={() => setDraggingCardUid(card.uid)}
                  onDragEnd={() => setDraggingCardUid(null)}
                  onClick={() => handleCardClick(card)}
                />
              </div>
            ))}
            {combat.hand.length === 0 && (
              <div className="py-8 text-sm text-slate-500">{copy.emptyHand}</div>
            )}
          </div>

          {/* Right: Discard/Exhaust, Threat Warning & End Turn CTA */}
          <div className="col-start-2 row-start-1 flex flex-col items-end gap-2 lg:col-start-3">
            {totalIncomingDamage > 0 && (
              <div
                className={`hidden text-[11px] font-mono-num md:block ${
                  netIncomingDamage > 0 ? 'text-rose-300' : 'text-emerald-300'
                }`}
              >
                {netIncomingDamage > 0
                  ? `${copy.incomingTotal} ${totalIncomingDamage} · ${copy.netHpLoss} ${netIncomingDamage}`
                  : `${copy.incomingTotal} ${totalIncomingDamage} · ${copy.fullyBlocked}`}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 lg:flex-col lg:items-end">
              <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => setInspectPile('draw')}
                  className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#161c26] px-3 py-2 text-xs text-slate-200 hover:border-sky-400/50 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-sky-400" />
                  <span className="sr-only sm:not-sr-only">{copy.drawPile}</span>
                  <span className="font-mono-num font-bold text-white">
                    {combat.drawPile.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectPile('discard')}
                  className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#161c26] px-3 py-2 text-xs text-slate-200 hover:border-amber-400/50 cursor-pointer"
                >
                  <Archive className="h-3.5 w-3.5 text-amber-300" />
                  <span className="sr-only sm:not-sr-only">{copy.discardPile}</span>
                  <span className="font-mono-num font-bold text-white">
                    {combat.discardPile.length}
                  </span>
                </button>
                {combat.exhaustPile.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInspectPile('exhaust')}
                    className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#161c26] px-3 py-2 text-xs text-slate-300 hover:border-rose-400/50 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span className="sr-only sm:not-sr-only">{copy.exhaustPile}</span>
                    <span className="font-mono-num font-bold text-white">
                      {combat.exhaustPile.length}
                    </span>
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={combat.enemyTurnInProgress || Boolean(combat.pendingChoice)}
                onClick={onEndTurn}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg md:px-6 md:py-3 hover:bg-amber-400 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
              >
                {combat.enemyTurnInProgress ? copy.enemyTurn : isTouch ? copy.endTurn.replace(/\s*\(E\)/, '') : copy.endTurn}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Log Drawer */}
      {showLog && (
        <div className="absolute top-14 right-6 z-40 max-h-64 w-72 overflow-y-auto rounded-xl border border-white/15 bg-[#12161f]/95 p-4 text-xs shadow-2xl">
          <div className="mb-2 font-semibold text-slate-200">{copy.combatLog}</div>
          <ul className="space-y-1 text-slate-400">
            {[...combat.log].reverse().slice(0, 20).map((entry, idx) => (
              <li key={idx} className="border-b border-white/5 pb-1">
                {tCombatLogEntry(entry, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Choice from a pile (exhaust, discard, draw): pick here */}
      {combat.pendingChoice && combat.pendingChoice.from !== 'hand' && (
        <PileModal
          locale={locale}
          title={`${copy.chooseFrom[combat.pendingChoice.from]} → ${copy.choiceActions[combat.pendingChoice.action]}`}
          subtitle={copy.choosePrompt(combat.pendingChoice.remaining)}
          cards={choiceOptions(combat, combat.pendingChoice)}
          onSelectCard={(card) => onChooseCard(card.uid)}
          closable={Boolean(combat.pendingChoice.optional)}
          onClose={onSkipChoice}
        />
      )}

      {/* Pile Inspector Modal */}
      {inspectPile && (
        <PileModal
          locale={locale}
          title={
            inspectPile === 'draw'
              ? copy.drawPile
              : inspectPile === 'discard'
              ? copy.discardPile
              : copy.exhaustPile
          }
          subtitle={
            inspectPile === 'draw'
              ? locale === 'zh'
                ? '抽牌堆顺序经过洗牌，此处仅展示包含的卡牌。'
                : 'Cards shown are sorted alphabetically so exact draw order stays hidden.'
              : undefined
          }
          cards={
            inspectPile === 'draw'
              ? [...combat.drawPile].sort((a, b) => a.defId.localeCompare(b.defId))
              : inspectPile === 'discard'
              ? combat.discardPile
              : combat.exhaustPile
          }
          onClose={() => setInspectPile(null)}
        />
      )}
    </div>
  );
};

/** Interrupt progress for a charged enemy attack. */
const ChargeBar: React.FC<{ charge: NonNullable<EnemyInstance['charge']>; locale: Locale }> = ({ charge, locale }) => {
  const copy = UI_COPY[locale];
  const pct = Math.min(100, (charge.progress / charge.threshold) * 100);
  const need = Math.max(0, charge.threshold - charge.progress);
  return (
    <div
      className="w-full max-w-44 rounded-md border border-orange-400/40 bg-[#1a1210]/90 px-2 py-1 text-[10.5px] text-orange-100 shadow"
      data-testid="charge-bar"
    >
      <div className="mb-0.5 flex items-center justify-between font-semibold">
        <span>{copy.chargeTitle}</span>
        <span className="font-mono-num">
          {Math.min(charge.progress, charge.threshold)}/{charge.threshold}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full transition-all duration-300 ${
            charge.interrupted ? 'bg-violet-400' : 'bg-gradient-to-r from-orange-600 to-amber-300'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`mt-0.5 text-center ${charge.interrupted ? 'text-violet-200 font-bold' : 'text-orange-200'}`}>
        {charge.interrupted ? copy.chargeInterrupted : copy.chargeNeed(need)}
      </div>
    </div>
  );
};

/** Ember gauge, Stoke toggle and the class ability button. */
const EmberPanel: React.FC<{
  state: RunState;
  locale: Locale;
  stokeMode: boolean;
  onToggleStoke: () => void;
  onUseAbility: () => void;
  isTouch?: boolean;
}> = ({ state, locale, stokeMode, onToggleStoke, onUseAbility, isTouch = false }) => {
  const copy = UI_COPY[locale];
  const combat = state.combat!;
  const ember = combat.ember || 0;
  const cap = combat.emberCap || 10;
  const ability = CLASS_ABILITY[state.heroId];
  const stokeAvailable = canStoke(state);
  const abilityAvailable = canUseAbility(state);
  const stokedOut = (combat.stokesThisTurn || 0) >= stokesPerTurn();
  const abilityUsed = (combat.abilityUsesThisTurn || 0) > 0;
  const AbilityIcon = ability.id === 'temper' ? Hammer : Wind;
  return (
    <div className="flex flex-col gap-1.5" data-testid="ember-panel">
      <div className="flex items-center gap-2">
        <InfoTip
          tip={copy.emberTip}
          label={copy.ember}
          className="whitespace-nowrap text-xs font-semibold text-orange-200 underline decoration-dotted underline-offset-2"
        >
          {copy.ember}
        </InfoTip>
        <div className="flex gap-0.5" aria-label={`${copy.ember} ${ember}/${cap}`}>
          {Array.from({ length: cap }, (_, i) => (
            <Flame
              key={i}
              className={`h-2.5 w-2.5 transition-colors md:h-3.5 md:w-3.5 ${
                i < ember
                  ? ember >= cap
                    ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]'
                    : 'text-orange-400'
                  : 'text-slate-700'
              }`}
            />
          ))}
        </div>
        <span className="font-mono-num text-xs font-bold text-orange-100" data-testid="ember-count">
          {ember}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleStoke}
          disabled={!stokeAvailable && !stokeMode}
          title={copy.stokeTip}
          data-testid="stoke-btn"
          className={`flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 md:px-2.5 ${
            stokeMode
              ? 'border-orange-300 bg-orange-500 text-slate-950'
              : 'border-orange-500/50 bg-orange-950/60 text-orange-200 hover:border-orange-300'
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          {stokedOut ? copy.stokeUsed : copy.stokeBtn}
        </button>
        <button
          type="button"
          onClick={onUseAbility}
          disabled={!abilityAvailable}
          title={copy.abilityDescs[ability.id]}
          data-testid="ability-btn"
          className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-amber-400/50 bg-amber-950/60 px-2 py-1 text-xs font-semibold text-amber-100 md:px-2.5 hover:border-amber-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <AbilityIcon className="h-3.5 w-3.5" />
          <span>{copy.abilityNames[ability.id]}</span>
          <span className="flex items-center font-mono-num text-orange-300">
            {abilityCost()}
            <Flame className="h-3 w-3" />
          </span>
        </button>
        {(combat.temperPending || 0) > 0 && (
          <span className="rounded border border-amber-300/60 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
            {copy.temperReady}
          </span>
        )}
      </div>
      <div className="text-[10px] text-slate-500">
        {abilityUsed ? `${copy.abilityNames[ability.id]} · ${copy.abilityUsed}` : isTouch ? '' : copy.emberKeyHint}
      </div>
    </div>
  );
};
