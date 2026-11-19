import { useEffect, useRef, useState } from 'react';
import { Award } from 'lucide-react';
import { AchievementsModal } from './components/AchievementsModal';
import { CardCompendiumModal } from './components/CardCompendiumModal';
import { CombatArenaView } from './components/CombatArenaView';
import { DamageStatsModal } from './components/DamageStatsModal';
import { GlossaryModal } from './components/GlossaryModal';
import { PileModal } from './components/PileModal';
import {
  EndRunView,
  EventView,
  RestSiteView,
  RewardView,
  ShopView,
  TreasureView,
} from './components/RoomViews';
import { SettingsModal } from './components/SettingsModal';
import { SpireMapView } from './components/SpireMapView';
import { TitleScreenView } from './components/TitleScreenView';
import { TopHudBar } from './components/TopHudBar';
import { TutorialGuideModal } from './components/TutorialGuideModal';
import {
  ACHIEVEMENTS,
  AchievementDef,
  AchievementEvalContext,
  MetaProgress,
  evaluateAchievements,
  loadMetaProgress,
  saveMetaProgress,
  tAchievement,
} from './game/achievements';
import { CARD_DEFS } from './game/cards';
import {
  addPotionToSlot,
  createNewRun,
  discardPotionSlot,
  discardSelectedCard,
  enterMapNode,
  playCard,
  resolveEnemyTurn,
  usePotion,
} from './game/engine';
import { resolveEventOption } from './game/events';
import { Locale, UI_COPY } from './game/i18n';
import { sound } from './game/sound';
import {
  CardInstance,
  CombatVfx,
  CombatVfxType,
  FloatingText,
  HeroClassId,
  RunState,
} from './game/types';

const ACTIVE_RUN_STORAGE_KEY = 'spire_ashes_active_run_v1';
const LOCALE_STORAGE_KEY = 'spire_ashes_locale_v1';

export default function App() {
  const [runState, setRunState] = useState<RunState | null>(null);
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      return saved === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  });
  const [savedRun, setSavedRun] = useState<RunState | null>(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as RunState;
      if (parsed && parsed.phase !== 'VICTORY' && parsed.phase !== 'DEFEAT' && parsed.hp > 0) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [bestVictories, setBestVictories] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('spire_ashes_wins') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });

  const [playSplash, setPlaySplash] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(() => sound.volume);

  const [showDeckModal, setShowDeckModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showCompendiumModal, setShowCompendiumModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [onboardingTutorialActive, setOnboardingTutorialActive] = useState(false);
  const [showGuideOnNewRun, setShowGuideOnNewRun] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('spire_ashes_guide_on_start');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMapOverlay, setShowMapOverlay] = useState(false);

  const [metaProgress, setMetaProgress] = useState<MetaProgress>(() => loadMetaProgress());
  const metaProgressRef = useRef<MetaProgress>(metaProgress);
  const [achievementToasts, setAchievementToasts] = useState<AchievementDef[]>([]);
  const lastTrackedRunRef = useRef<{
    enemies: number;
    elites: number;
    damage: number;
    victoryCounted: boolean;
  }>({ enemies: 0, elites: 0, damage: 0, victoryCounted: false });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [combatVfx, setCombatVfx] = useState<CombatVfx[]>([]);
  const [arenaShake, setArenaShake] = useState(false);
  const [hitPlayer, setHitPlayer] = useState(false);
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [attackingEnemyUids, setAttackingEnemyUids] = useState<string[]>([]);
  const [hitEnemyUids, setHitEnemyUids] = useState<string[]>([]);
  const [pendingPotionSlot, setPendingPotionSlot] = useState<number | null>(null);

  const spawnVfx = (items: { targetUid: string; type: CombatVfxType }[], heavyShake = false) => {
    if (items.length > 0) {
      const created: CombatVfx[] = items.map((it, i) => ({
        id: `${Date.now()}_${i}_${Math.random()}`,
        targetUid: it.targetUid,
        type: it.type,
      }));
      setCombatVfx((prev) => [...prev, ...created]);
      setTimeout(() => {
        const ids = new Set(created.map((c) => c.id));
        setCombatVfx((prev) => prev.filter((c) => !ids.has(c.id)));
      }, 560);
    }
    if (heavyShake) {
      setArenaShake(true);
      setTimeout(() => setArenaShake(false), 300);
    }
  };

  const handleSetLocale = (next: Locale) => {
    setLocale(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const handleToggleLocale = () => {
    handleSetLocale(locale === 'zh' ? 'en' : 'zh');
  };

  const pushCombatFeedback = (
    events: FloatingText[],
    didHitPlayer?: boolean,
    enemyHits?: string[],
    triggerHeroLunge?: boolean
  ) => {
    if (events.length > 0) {
      setFloatingTexts((prev) => [...prev, ...events]);
      setTimeout(() => {
        const ids = new Set(events.map((e) => e.id));
        setFloatingTexts((prev) => prev.filter((item) => !ids.has(item.id)));
      }, 950);
    }
    if (didHitPlayer) {
      setHitPlayer(true);
      setTimeout(() => setHitPlayer(false), 360);
    }
    if (triggerHeroLunge) {
      setHeroAttacking(true);
      setTimeout(() => setHeroAttacking(false), 280);
    }
    if (enemyHits && enemyHits.length > 0) {
      setHitEnemyUids(enemyHits);
      setTimeout(() => setHitEnemyUids([]), 360);
    }
  };

  // Auto-save active run to localStorage
  useEffect(() => {
    try {
      if (runState && runState.phase !== 'VICTORY' && runState.phase !== 'DEFEAT' && runState.hp > 0) {
        localStorage.setItem(ACTIVE_RUN_STORAGE_KEY, JSON.stringify(runState));
        setSavedRun(runState);
      } else if (runState && (runState.phase === 'VICTORY' || runState.phase === 'DEFEAT')) {
        localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
        setSavedRun(null);
      }
    } catch {
      // ignore storage errors
    }
  }, [runState]);

  useEffect(() => {
    if (runState?.phase === 'VICTORY') {
      sound.victory();
      setBestVictories((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem('spire_ashes_wins', String(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    } else if (runState?.phase === 'DEFEAT') {
      sound.defeat();
    }
  }, [runState?.phase]);

  const applyMetaEvaluation = (run: RunState | null, ctx: AchievementEvalContext = {}) => {
    const { nextMeta, newlyUnlocked } = evaluateAchievements(metaProgressRef.current, run, ctx);
    metaProgressRef.current = nextMeta;
    setMetaProgress(nextMeta);
    saveMetaProgress(nextMeta);
    if (newlyUnlocked.length > 0) {
      sound.buff();
      setAchievementToasts((tPrev) => [...tPrev, ...newlyUnlocked]);
      setTimeout(() => {
        const ids = new Set(newlyUnlocked.map((u) => u.id));
        setAchievementToasts((tPrev) => tPrev.filter((item) => !ids.has(item.id)));
      }, 4000);
    }
  };

  // Sync run progress (enemies defeated, elites, damage, block, poison, discovered cards, victory)
  useEffect(() => {
    if (!runState) return;
    const prev = lastTrackedRunRef.current;
    const enemiesDelta = Math.max(0, runState.stats.enemiesDefeated - prev.enemies);
    const elitesDelta = Math.max(0, runState.stats.elitesDefeated - prev.elites);
    const damageDelta = Math.max(0, runState.stats.totalDamageDealt - prev.damage);
    const isNewVictory = runState.phase === 'VICTORY' && !prev.victoryCounted;

    lastTrackedRunRef.current = {
      enemies: runState.stats.enemiesDefeated,
      elites: runState.stats.elitesDefeated,
      damage: runState.stats.totalDamageDealt,
      victoryCounted: prev.victoryCounted || runState.phase === 'VICTORY',
    };

    applyMetaEvaluation(runState, {
      enemiesDefeatedDelta: enemiesDelta,
      elitesDefeatedDelta: elitesDelta,
      damageDelta,
      isNewVictory,
    });
  }, [runState]);

  // Global Escape key to close top-most open modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showSettingsModal) setShowSettingsModal(false);
      else if (showTutorialModal) {
        setShowTutorialModal(false);
        setOnboardingTutorialActive(false);
      } else if (showAchievementsModal) setShowAchievementsModal(false);
      else if (showCompendiumModal) setShowCompendiumModal(false);
      else if (showGlossaryModal) setShowGlossaryModal(false);
      else if (showStatsModal) setShowStatsModal(false);
      else if (showDeckModal) setShowDeckModal(false);
      else if (showMapOverlay) setShowMapOverlay(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    showSettingsModal,
    showTutorialModal,
    showAchievementsModal,
    showCompendiumModal,
    showGlossaryModal,
    showStatsModal,
    showDeckModal,
    showMapOverlay,
  ]);

  const handleToggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      sound.muted = next;
      return next;
    });
  };

  const handleChangeVolume = (nextVol: number) => {
    sound.setVolume(nextVol);
    setVolume(nextVol);
    sound.uiClick();
  };

  const handleToggleGuideOnNewRun = (enabled: boolean) => {
    setShowGuideOnNewRun(enabled);
    try {
      localStorage.setItem('spire_ashes_guide_on_start', String(enabled));
    } catch {
      // ignore storage errors
    }
  };

  const handleStartRun = (heroId: HeroClassId, ascension = 0) => {
    sound.cardDraw();
    const fresh = createNewRun(heroId, ascension);
    lastTrackedRunRef.current = {
      enemies: 0,
      elites: 0,
      damage: 0,
      victoryCounted: false,
    };
    setRunState(fresh);
    applyMetaEvaluation(fresh, { isNewRunStart: true });
    setShowDeckModal(false);
    setShowStatsModal(false);
    setShowMapOverlay(false);
    setPendingPotionSlot(null);
    if (showGuideOnNewRun) {
      setOnboardingTutorialActive(true);
      setShowTutorialModal(true);
    } else {
      setOnboardingTutorialActive(false);
    }
  };

  const handleResumeRun = () => {
    if (!savedRun) return;
    sound.cardDraw();
    lastTrackedRunRef.current = {
      enemies: savedRun.stats.enemiesDefeated,
      elites: savedRun.stats.elitesDefeated,
      damage: savedRun.stats.totalDamageDealt,
      victoryCounted: savedRun.phase === 'VICTORY',
    };
    setRunState(savedRun);
    setShowDeckModal(false);
    setShowStatsModal(false);
    setShowMapOverlay(false);
    setPendingPotionSlot(null);
  };

  const handleClearSavedRun = () => {
    try {
      localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setSavedRun(null);
  };

  const handleSelectNode = (nodeId: string) => {
    if (!runState) return;
    sound.cardDraw();
    setPendingPotionSlot(null);
    setRunState(enterMapNode(runState, nodeId));
  };

  const handlePlayCard = (cardUid: string, targetEnemyUid?: string) => {
    if (!runState) return;
    const card = runState.combat?.hand.find((c) => c.uid === cardUid);
    const def = card ? CARD_DEFS[card.defId] : undefined;
    const res = playCard(runState, cardUid, targetEnemyUid);

    const vfxList: { targetUid: string; type: CombatVfxType }[] = [];
    let isHeavyHit = false;

    if (def?.type === 'attack') {
      isHeavyHit = (def.damage || 0) >= 12 || def.cost === -1 || Boolean(def.blockAsDamage);
      const slashType: CombatVfxType = isHeavyHit
        ? 'slash_heavy'
        : def.pool === 'shadowweaver'
        ? 'slash_shadow'
        : 'slash_crimson';
      (res.hitEnemyUids || []).forEach((uid) => vfxList.push({ targetUid: uid, type: slashType }));
      if (res.playerBlocked) {
        vfxList.push({ targetUid: 'player', type: 'shield' });
      }
      if (isHeavyHit) {
        sound.heavyHit();
      } else {
        sound.attack();
      }
    } else if (def?.applyPoison || def?.doublePoison) {
      const targets =
        res.hitEnemyUids && res.hitEnemyUids.length > 0
          ? res.hitEnemyUids
          : targetEnemyUid
          ? [targetEnemyUid]
          : (runState.combat?.enemies.filter((e) => e.hp > 0).map((e) => e.uid) || []);
      targets.forEach((uid) => vfxList.push({ targetUid: uid, type: 'poison' }));
      if (res.playerBlocked) {
        vfxList.push({ targetUid: 'player', type: 'shield' });
      }
      sound.poison();
    } else if (res.playerBlocked) {
      vfxList.push({ targetUid: 'player', type: 'shield' });
      sound.block();
    } else {
      vfxList.push({ targetUid: 'player', type: 'power' });
      sound.buff();
    }

    if (res.bossAwakened) {
      isHeavyHit = true;
      sound.bossAwaken();
      runState.combat?.enemies
        .filter((e) => e.isBoss)
        .forEach((b) => vfxList.push({ targetUid: b.uid, type: 'power' }));
    }

    spawnVfx(vfxList, isHeavyHit);
    pushCombatFeedback(
      res.events,
      res.hitPlayer,
      res.hitEnemyUids,
      def?.type === 'attack'
    );
    const actionDmg = Math.max(0, res.state.stats.totalDamageDealt - runState.stats.totalDamageDealt);
    if (actionDmg >= 35) {
      applyMetaEvaluation(res.state, { actionDamage: actionDmg });
    }
    setRunState(res.state);
  };

  const handleDiscardCard = (cardUid: string) => {
    if (!runState) return;
    sound.cardDraw();
    setRunState(discardSelectedCard(runState, cardUid));
  };

  const handleUsePotionClick = (slotIndex: number) => {
    if (!runState) return;
    const pot = runState.potions[slotIndex];
    if (!pot) return;
    if (pot.target === 'enemy') {
      if (runState.phase !== 'COMBAT' || !runState.combat) return;
      const living = runState.combat.enemies.filter((e) => e.hp > 0);
      if (living.length === 1) {
        handleUsePotionOnEnemy(slotIndex, living[0].uid);
      } else {
        setPendingPotionSlot(slotIndex);
      }
      return;
    }
    const res = usePotion(runState, slotIndex);
    sound.potion();
    spawnVfx([{ targetUid: 'player', type: pot.id === 'block_potion' ? 'shield' : 'power' }]);
    pushCombatFeedback(res.events);
    setRunState(res.state);
  };

  const handleUsePotionOnEnemy = (slotIndex: number, enemyUid: string) => {
    if (!runState) return;
    const pot = runState.potions[slotIndex];
    const res = usePotion(runState, slotIndex, enemyUid);
    sound.potion();
    setPendingPotionSlot(null);
    spawnVfx(
      [{ targetUid: enemyUid, type: pot?.id === 'poison_potion' ? 'poison' : 'slash_heavy' }],
      pot?.id !== 'poison_potion'
    );
    pushCombatFeedback(res.events, res.hitPlayer, [enemyUid]);
    setRunState(res.state);
  };

  const handleDiscardPotion = (slotIndex: number) => {
    if (!runState) return;
    if (pendingPotionSlot === slotIndex) setPendingPotionSlot(null);
    setRunState({
      ...runState,
      potions: discardPotionSlot(runState.potions, slotIndex),
    });
  };

  const handleEndTurn = () => {
    if (!runState || !runState.combat || runState.combat.enemyTurnInProgress) return;
    setPendingPotionSlot(null);

    const attackers = runState.combat.enemies
      .filter((e) => e.hp > 0 && !e.asleep && (e.intent.damage || 0) > 0)
      .map((e) => e.uid);
    if (attackers.length > 0) {
      setAttackingEnemyUids(attackers);
      setTimeout(() => setAttackingEnemyUids([]), 320);
    }

    setRunState((prev) =>
      prev && prev.combat
        ? { ...prev, combat: { ...prev.combat, enemyTurnInProgress: true } }
        : prev
    );

    setTimeout(() => {
      setRunState((current) => {
        if (!current || !current.combat) return current;
        const hadIncomingAttack = current.combat.enemies.some(
          (e) => e.hp > 0 && !e.asleep && (e.intent.damage || 0) > 0
        );
        const res = resolveEnemyTurn(current);
        const enemySideVfx: { targetUid: string; type: CombatVfxType }[] = [];
        (res.enemyDefendedUids || []).forEach((uid) =>
          enemySideVfx.push({ targetUid: uid, type: 'shield' })
        );
        (res.enemyBuffedUids || []).forEach((uid) =>
          enemySideVfx.push({ targetUid: uid, type: 'power' })
        );

        if (res.hitPlayer) {
          sound.attack();
          spawnVfx([{ targetUid: 'player', type: 'enemy_slash' }, ...enemySideVfx], true);
        } else if (hadIncomingAttack) {
          sound.shieldBlock();
          spawnVfx([{ targetUid: 'player', type: 'shield' }, ...enemySideVfx]);
        } else {
          if (enemySideVfx.length > 0) {
            sound.buff();
            spawnVfx(enemySideVfx);
          } else {
            sound.turnStart();
          }
        }
        pushCombatFeedback(res.events, res.hitPlayer);
        if (res.state.combat) {
          return {
            ...res.state,
            combat: { ...res.state.combat, enemyTurnInProgress: false },
          };
        }
        return res.state;
      });
    }, 400);
  };

  // Reward Handlers
  const handleClaimGold = () => {
    if (!runState?.reward || runState.reward.goldClaimed) return;
    sound.gold();
    setRunState({
      ...runState,
      gold: runState.gold + runState.reward.gold,
      stats: { ...runState.stats, goldEarned: runState.stats.goldEarned + runState.reward.gold },
      reward: { ...runState.reward, goldClaimed: true },
    });
  };

  const handleClaimCard = (card: CardInstance) => {
    if (!runState?.reward || runState.reward.cardClaimed) return;
    sound.cardDraw();
    setRunState({
      ...runState,
      deck: [...runState.deck, card],
      reward: { ...runState.reward, cardClaimed: true },
    });
  };

  const handleSkipCard = () => {
    if (!runState?.reward || runState.reward.cardClaimed) return;
    setRunState({
      ...runState,
      reward: { ...runState.reward, cardClaimed: true },
    });
  };

  const handleClaimRelic = () => {
    if (!runState?.reward?.relic || runState.reward.relicClaimed) return;
    sound.buff();
    setRunState({
      ...runState,
      relics: [...runState.relics, runState.reward.relic],
      reward: { ...runState.reward, relicClaimed: true },
    });
  };

  const handleClaimPotion = () => {
    if (!runState?.reward?.potion || runState.reward.potionClaimed) return;
    const res = addPotionToSlot(runState.potions, runState.reward.potion);
    if (!res.added) return;
    sound.potion();
    setRunState({
      ...runState,
      potions: res.potions,
      reward: { ...runState.reward, potionClaimed: true },
    });
  };

  const handleReturnToMap = () => {
    if (!runState) return;
    setRunState({
      ...runState,
      phase: 'MAP',
      reward: null,
      shop: null,
      event: null,
      treasure: null,
    });
  };

  // Rest Handlers
  const handleRestHeal = () => {
    if (!runState) return;
    sound.campfire();
    const rawHeal = Math.floor(runState.maxHp * 0.3);
    const nextHp = Math.min(runState.maxHp, runState.hp + rawHeal);
    const actualHeal = Math.max(0, nextHp - runState.hp);
    setRunState({
      ...runState,
      hp: nextHp,
      stats: { ...runState.stats, hpHealed: runState.stats.hpHealed + actualHeal },
      phase: 'MAP',
    });
  };

  const handleUpgradeCard = (cardUid: string) => {
    if (!runState) return;
    sound.buff();
    setRunState({
      ...runState,
      deck: runState.deck.map((c) => (c.uid === cardUid ? { ...c, upgraded: true } : c)),
      phase: 'MAP',
    });
  };

  // Shop Handlers
  const handleBuyShopCard = (idx: number) => {
    if (!runState?.shop) return;
    const item = runState.shop.cards[idx];
    if (!item || item.sold || runState.gold < item.price) return;
    sound.gold();
    const nextCards = runState.shop.cards.map((c, i) => (i === idx ? { ...c, sold: true } : c));
    setRunState({
      ...runState,
      gold: runState.gold - item.price,
      deck: [...runState.deck, item.card],
      shop: { ...runState.shop, cards: nextCards },
    });
  };

  const handleBuyShopRelic = (idx: number) => {
    if (!runState?.shop) return;
    const item = runState.shop.relics[idx];
    if (!item || item.sold || runState.gold < item.price) return;
    sound.gold();
    const nextRelics = runState.shop.relics.map((r, i) => (i === idx ? { ...r, sold: true } : r));
    setRunState({
      ...runState,
      gold: runState.gold - item.price,
      relics: [...runState.relics, item.relic],
      shop: { ...runState.shop, relics: nextRelics },
    });
  };

  const handleBuyShopPotion = (idx: number) => {
    if (!runState?.shop) return;
    const item = runState.shop.potions[idx];
    if (!item || item.sold || runState.gold < item.price) return;
    const res = addPotionToSlot(runState.potions, item.potion);
    if (!res.added) return;
    sound.potion();
    const nextPots = runState.shop.potions.map((p, i) => (i === idx ? { ...p, sold: true } : p));
    setRunState({
      ...runState,
      gold: runState.gold - item.price,
      potions: res.potions,
      shop: { ...runState.shop, potions: nextPots },
    });
  };

  const handleRemoveShopCard = (cardUid: string) => {
    if (!runState?.shop || runState.shop.removedThisVisit) return;
    if (runState.gold < runState.shop.removePrice) return;
    sound.gold();
    setRunState({
      ...runState,
      gold: runState.gold - runState.shop.removePrice,
      deck: runState.deck.filter((c) => c.uid !== cardUid),
      shop: { ...runState.shop, removedThisVisit: true },
    });
  };

  // Event & Treasure Handlers
  const handleSelectEventOption = (optionId: string) => {
    if (!runState) return;
    sound.buff();
    setRunState(resolveEventOption(runState, optionId));
  };

  const handleOpenTreasure = () => {
    if (!runState?.treasure || runState.treasure.opened) return;
    sound.gold();
    setRunState({
      ...runState,
      gold: runState.gold + runState.treasure.gold,
      relics: [...runState.relics, runState.treasure.relic],
      stats: {
        ...runState.stats,
        goldEarned: runState.stats.goldEarned + runState.treasure.gold,
      },
      treasure: { ...runState.treasure, opened: true },
    });
  };

  const copy = UI_COPY[locale];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col">
      {!runState ? (
        <TitleScreenView
          locale={locale}
          bestRuns={Math.max(bestVictories, metaProgress.totalVictories)}
          savedRun={savedRun}
          playSplash={playSplash}
          showGuideOnNewRun={showGuideOnNewRun}
          achievementUnlockedCount={Object.keys(metaProgress.unlocked).length}
          achievementTotalCount={ACHIEVEMENTS.length}
          discoveredCardsCount={metaProgress.discoveredCardIds.length}
          totalCardsCount={Object.keys(CARD_DEFS).length}
          onToggleGuideOnNewRun={handleToggleGuideOnNewRun}
          onSplashDone={() => setPlaySplash(false)}
          onToggleLocale={handleToggleLocale}
          onStartRun={handleStartRun}
          onResumeRun={handleResumeRun}
          onOpenCompendium={() => setShowCompendiumModal(true)}
          onOpenAchievements={() => setShowAchievementsModal(true)}
          onOpenTutorial={() => {
            setOnboardingTutorialActive(false);
            setShowTutorialModal(true);
          }}
          onOpenGlossary={() => setShowGlossaryModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onUiClick={() => sound.uiClick()}
        />
      ) : (
        <>
          <TopHudBar
            state={runState}
            locale={locale}
            muted={muted}
            onToggleLocale={handleToggleLocale}
            onToggleMute={handleToggleMute}
            onOpenDeck={() => setShowDeckModal(true)}
            onOpenStats={() => setShowStatsModal(true)}
            onOpenCompendium={() => setShowCompendiumModal(true)}
            onOpenAchievements={() => setShowAchievementsModal(true)}
            onOpenGlossary={() => setShowGlossaryModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onToggleMapOverlay={() => setShowMapOverlay((v) => !v)}
            onUsePotion={handleUsePotionClick}
            onDiscardPotion={handleDiscardPotion}
            onAbandonRun={() => setRunState(null)}
          />

          <main className="flex-1">
            {runState.phase === 'MAP' && (
              <SpireMapView state={runState} locale={locale} onSelectNode={handleSelectNode} />
            )}
            {runState.phase === 'COMBAT' && (
              <CombatArenaView
                state={runState}
                locale={locale}
                floatingTexts={floatingTexts}
                combatVfx={combatVfx}
                arenaShake={arenaShake}
                hitPlayer={hitPlayer}
                heroAttacking={heroAttacking}
                attackingEnemyUids={attackingEnemyUids}
                hitEnemyUids={hitEnemyUids}
                pendingPotionSlot={pendingPotionSlot}
                hotkeysDisabled={
                  showDeckModal ||
                  showStatsModal ||
                  showCompendiumModal ||
                  showAchievementsModal ||
                  showGlossaryModal ||
                  showSettingsModal ||
                  showTutorialModal ||
                  showMapOverlay
                }
                onCancelPendingPotion={() => setPendingPotionSlot(null)}
                onPlayCard={handlePlayCard}
                onDiscardCard={handleDiscardCard}
                onUsePotionOnEnemy={handleUsePotionOnEnemy}
                onEndTurn={handleEndTurn}
                onCardHoverSound={() => sound.cardHover()}
              />
            )}
            {runState.phase === 'REWARD' && (
              <RewardView
                state={runState}
                locale={locale}
                onClaimGold={handleClaimGold}
                onClaimCard={handleClaimCard}
                onSkipCard={handleSkipCard}
                onClaimRelic={handleClaimRelic}
                onClaimPotion={handleClaimPotion}
                onContinue={handleReturnToMap}
              />
            )}
            {runState.phase === 'REST' && (
              <RestSiteView
                state={runState}
                locale={locale}
                onRestHeal={handleRestHeal}
                onUpgradeCard={handleUpgradeCard}
              />
            )}
            {runState.phase === 'SHOP' && (
              <ShopView
                state={runState}
                locale={locale}
                onBuyCard={handleBuyShopCard}
                onBuyRelic={handleBuyShopRelic}
                onBuyPotion={handleBuyShopPotion}
                onRemoveCard={handleRemoveShopCard}
                onLeave={handleReturnToMap}
              />
            )}
            {runState.phase === 'EVENT' && (
              <EventView
                state={runState}
                locale={locale}
                onSelectOption={handleSelectEventOption}
                onContinue={handleReturnToMap}
              />
            )}
            {runState.phase === 'TREASURE' && (
              <TreasureView
                state={runState}
                locale={locale}
                onOpenChest={handleOpenTreasure}
                onContinue={handleReturnToMap}
              />
            )}
            {(runState.phase === 'VICTORY' || runState.phase === 'DEFEAT') && (
              <EndRunView
                state={runState}
                locale={locale}
                onPlayAgain={() => setRunState(null)}
              />
            )}
          </main>

          {/* Deck Inspector Modal */}
          {showDeckModal && (
            <PileModal
              locale={locale}
              title={`${copy.deckBtn} (${runState.deck.length})`}
              subtitle={
                locale === 'zh'
                  ? '包含当前局内你拥有的全部卡牌。'
                  : 'All cards currently in your run deck.'
              }
              cards={runState.deck}
              onClose={() => setShowDeckModal(false)}
            />
          )}

          {/* Damage Stats Modal */}
          {showStatsModal && (
            <DamageStatsModal
              state={runState}
              locale={locale}
              onClose={() => setShowStatsModal(false)}
            />
          )}

          {/* Read-Only Map Overlay while inside a room */}
          {showMapOverlay && runState.phase !== 'MAP' && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm">
              <SpireMapView
                state={runState}
                locale={locale}
                readOnly
                onCloseOverlay={() => setShowMapOverlay(false)}
              />
            </div>
          )}
        </>
      )}

      {/* Card Compendium Modal */}
      {showCompendiumModal && (
        <CardCompendiumModal
          locale={locale}
          discoveredCardIds={metaProgress.discoveredCardIds}
          onClose={() => setShowCompendiumModal(false)}
        />
      )}

      {/* Achievements Hall Modal */}
      {showAchievementsModal && (
        <AchievementsModal
          locale={locale}
          meta={metaProgress}
          onClose={() => setShowAchievementsModal(false)}
        />
      )}

      {/* Interactive Tutorial Modal */}
      {showTutorialModal && (
        <TutorialGuideModal
          locale={locale}
          isOnboarding={onboardingTutorialActive}
          onClose={() => {
            setShowTutorialModal(false);
            setOnboardingTutorialActive(false);
          }}
        />
      )}

      {/* Manual & Compendium Modal */}
      {showGlossaryModal && (
        <GlossaryModal
          locale={locale}
          onClose={() => setShowGlossaryModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          locale={locale}
          muted={muted}
          volume={volume}
          hasSavedRun={Boolean(savedRun)}
          onSetLocale={handleSetLocale}
          onToggleMute={handleToggleMute}
          onChangeVolume={handleChangeVolume}
          onReplayIntro={() => {
            setRunState(null);
            setPlaySplash(true);
          }}
          onClearSavedRun={handleClearSavedRun}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Achievement Unlock Toasts */}
      {achievementToasts.length > 0 && (
        <div className="pointer-events-none fixed top-16 right-4 z-[60] flex flex-col gap-2">
          {achievementToasts.map((ach) => {
            const txt = tAchievement(ach, locale);
            return (
              <div
                key={ach.id}
                className="flex items-center gap-3 rounded-xl border border-amber-400/65 bg-[#141a26]/96 px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.8)] backdrop-blur-md"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/45 bg-amber-950/60">
                  <Award className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-300">
                    {copy.achievementUnlocked}
                  </div>
                  <div className="text-sm font-bold text-slate-100">{txt.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
