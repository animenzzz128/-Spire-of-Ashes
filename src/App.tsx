import { useEffect, useRef, useState } from 'react';
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
import { DialogFrame } from './components/useDialog';
import { CARD_DEFS } from './game/cards';
import {
  createNewRun,
  discardPotionSlot,
  chooseCard,
  enterMapNode,
  playCard,
  resolveEnemyTurn,
  skipChoice,
  stokeCard,
  useClassAbility,
  usePotion,
} from './game/engine';
import { Locale, UI_COPY } from './game/i18n';
import { getUidCounter } from './game/cards';
import { getRngState } from './game/rng';
import {
  clearSave,
  quarantineSave,
  readSave,
  resumeRun,
  SAVE_VERSION,
  SaveEnvelope,
  writeSave,
} from './game/save';
import {
  buyShopCard,
  buyShopPotion,
  buyShopRelic,
  chooseEventOption,
  claimCard,
  claimGold,
  claimPotion,
  claimRelic,
  openTreasure,
  removeShopCard,
  restHeal,
  restUpgrade,
  returnToMap,
  skipCard,
} from './game/rooms';
import { sound } from './game/sound';
import {
  CardInstance,
  CombatVfx,
  CombatVfxType,
  FloatingText,
  HeroClassId,
  RunState,
} from './game/types';

const LOCALE_STORAGE_KEY = 'spire_ashes_locale_v1';

/** localStorage, or null where the browser blocks it (some private modes). */
function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type SaveNotice = 'corrupt' | 'newer' | 'writeFailed';

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
  // The resumable run (see game/save.ts for the format, migrations and checks).
  const [savedGame, setSavedGame] = useState<SaveEnvelope | null>(() => {
    const storage = getStorage();
    if (!storage) return null;
    const res = readSave(storage);
    return res.status === 'ok' ? res.save : null;
  });
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null);
  const savedRun = savedGame?.run ?? null;

  // Report saves that could not be loaded; keep a backup copy of unreadable ones.
  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    const res = readSave(storage);
    if (res.status === 'corrupt') {
      console.warn(`Saved run could not be loaded (${res.reason}); a copy was kept under spire_ashes_run_corrupt.`);
      quarantineSave(storage);
      setSaveNotice('corrupt');
    } else if (res.status === 'newer') {
      setSaveNotice('newer');
    } else if (res.status === 'ok' && res.repairs.length > 0) {
      console.info('Saved run repaired on load:', res.repairs);
    }
  }, []);
  const [bestVictories, setBestVictories] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('spire_ashes_wins') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });

  const [playSplash, setPlaySplash] = useState(true);
  const [muted, setMuted] = useState(false);

  const [showDeckModal, setShowDeckModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMapOverlay, setShowMapOverlay] = useState(false);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [combatVfx, setCombatVfx] = useState<CombatVfx[]>([]);
  const [arenaShake, setArenaShake] = useState(false);
  const [hitPlayer, setHitPlayer] = useState(false);
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
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
    if (events.some((e) => e.msg.key === 'interrupted')) {
      sound.heavyHit();
      setArenaShake(true);
      setTimeout(() => setArenaShake(false), 300);
    }
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

  // Latest state for timers (the enemy turn resolves 420 ms after End Turn).
  const runStateRef = useRef<RunState | null>(runState);
  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  // Auto-save after every change. Finished runs are deleted (permadeath).
  const warnedWriteFail = useRef(false);
  useEffect(() => {
    if (!runState) return;
    const storage = getStorage();
    if (runState.phase === 'VICTORY' || runState.phase === 'DEFEAT' || runState.hp <= 0) {
      if (storage) clearSave(storage);
      setSavedGame(null);
      return;
    }
    const ok = storage ? writeSave(storage, runState) : false;
    if (!ok && !warnedWriteFail.current) {
      warnedWriteFail.current = true;
      setSaveNotice('writeFailed');
    }
    setSavedGame({
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      rngState: getRngState(),
      uidCounter: getUidCounter(),
      run: runState,
    });
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

  const handleToggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      sound.muted = next;
      return next;
    });
  };

  const handleStartRun = (heroId: HeroClassId, ascension = 0) => {
    sound.cardDraw();
    setRunState(createNewRun(heroId, ascension));
    setShowDeckModal(false);
    setShowStatsModal(false);
    setShowMapOverlay(false);
    setPendingPotionSlot(null);
  };

  const handleResumeRun = () => {
    if (!savedGame) return;
    sound.cardDraw();
    setRunState(resumeRun(savedGame));
    setShowDeckModal(false);
    setShowStatsModal(false);
    setShowMapOverlay(false);
    setPendingPotionSlot(null);
  };

  const handleClearSavedRun = () => {
    const storage = getStorage();
    if (storage) clearSave(storage);
    setSavedGame(null);
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
    // The engine rejected the play (unplayable, too expensive, no target): no feedback.
    if (res.state === runState) return;

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

    spawnVfx(vfxList, isHeavyHit);
    pushCombatFeedback(
      res.events,
      res.hitPlayer,
      res.hitEnemyUids,
      def?.type === 'attack'
    );
    setRunState(res.state);
  };

  // Pending choices: discard from hand, take back from the exhaust pile, ...
  const handleChooseCard = (cardUid: string) => {
    if (!runState) return;
    const res = chooseCard(runState, cardUid);
    if (res.state === runState) return;
    sound.cardDraw();
    pushCombatFeedback(res.events);
    setRunState(res.state);
  };

  const handleSkipChoice = () => {
    if (!runState) return;
    const res = skipChoice(runState);
    if (res.state === runState) return;
    pushCombatFeedback(res.events);
    setRunState(res.state);
  };

  // Ember: Stoke burns a hand card for 1 Ember; the class ability spends Ember.
  const handleStokeCard = (cardUid: string) => {
    if (!runState) return;
    const res = stokeCard(runState, cardUid);
    if (res.state === runState) return;
    sound.campfire();
    spawnVfx([{ targetUid: 'player', type: 'power' }]);
    pushCombatFeedback(res.events);
    setRunState(res.state);
  };

  const handleUseAbility = () => {
    if (!runState) return;
    const res = useClassAbility(runState);
    if (res.state === runState) return;
    const veil = runState.heroId === 'shadowweaver';
    if (veil) {
      sound.poison();
      spawnVfx(
        (res.state.combat?.enemies || []).filter((e) => e.hp > 0).map((e) => ({ targetUid: e.uid, type: 'poison' as const }))
      );
    } else {
      sound.buff();
      spawnVfx([{ targetUid: 'player', type: 'power' }]);
    }
    pushCombatFeedback(res.events);
    setRunState(res.state);
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
    spawnVfx([{ targetUid: 'player', type: pot.id === 'stoneskin_tonic' ? 'shield' : 'power' }]);
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
      [{ targetUid: enemyUid, type: pot?.id === 'nightshade_vial' ? 'poison' : 'slash_heavy' }],
      pot?.id !== 'nightshade_vial'
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
    setEnemyAttacking(true);
    setTimeout(() => setEnemyAttacking(false), 320);

    setRunState((prev) =>
      prev && prev.combat
        ? { ...prev, combat: { ...prev.combat, enemyTurnInProgress: true } }
        : prev
    );

    setTimeout(() => {
      const current = runStateRef.current;
      if (!current || !current.combat || !current.combat.enemyTurnInProgress) return;
      const hadIncomingAttack = current.combat.enemies.some(
        (e) => e.hp > 0 && (e.intent.damage || 0) > 0
      );
      const res = resolveEnemyTurn(current);
      if (res.hitPlayer) {
        sound.attack();
        spawnVfx([{ targetUid: 'player', type: 'enemy_slash' }], true);
      } else if (hadIncomingAttack) {
        sound.block();
        spawnVfx([{ targetUid: 'player', type: 'shield' }]);
      } else {
        sound.cardDraw();
      }
      pushCombatFeedback(res.events, res.hitPlayer);
      setRunState(
        res.state.combat
          ? { ...res.state, combat: { ...res.state.combat, enemyTurnInProgress: false } }
          : res.state
      );
    }, 420);
  };

  // Room handlers: the rules live in game/rooms.ts; these only add sound.
  const applyRoomAction = (next: RunState, cue?: () => void) => {
    if (!runState || next === runState) return;
    cue?.();
    setRunState(next);
  };

  const handleClaimGold = () => runState && applyRoomAction(claimGold(runState), () => sound.gold());
  const handleClaimCard = (card: CardInstance) =>
    runState && applyRoomAction(claimCard(runState, card), () => sound.cardDraw());
  const handleSkipCard = () => runState && applyRoomAction(skipCard(runState));
  const handleClaimRelic = () => runState && applyRoomAction(claimRelic(runState), () => sound.buff());
  const handleClaimPotion = () => runState && applyRoomAction(claimPotion(runState), () => sound.potion());
  const handleReturnToMap = () => runState && applyRoomAction(returnToMap(runState));

  const handleRestHeal = () => runState && applyRoomAction(restHeal(runState), () => sound.campfire());
  const handleUpgradeCard = (cardUid: string) =>
    runState && applyRoomAction(restUpgrade(runState, cardUid), () => sound.buff());

  const handleBuyShopCard = (idx: number) => runState && applyRoomAction(buyShopCard(runState, idx), () => sound.gold());
  const handleBuyShopRelic = (idx: number) => runState && applyRoomAction(buyShopRelic(runState, idx), () => sound.gold());
  const handleBuyShopPotion = (idx: number) =>
    runState && applyRoomAction(buyShopPotion(runState, idx), () => sound.potion());
  const handleRemoveShopCard = (cardUid: string) =>
    runState && applyRoomAction(removeShopCard(runState, cardUid), () => sound.gold());

  const handleSelectEventOption = (optionId: string) =>
    runState && applyRoomAction(chooseEventOption(runState, optionId), () => sound.buff());
  const handleOpenTreasure = () => runState && applyRoomAction(openTreasure(runState), () => sound.gold());

  const copy = UI_COPY[locale];

  const noticeText =
    saveNotice === 'corrupt'
      ? copy.saveCorrupt
      : saveNotice === 'newer'
      ? copy.saveNewer
      : saveNotice === 'writeFailed'
      ? copy.saveWriteFailed
      : null;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col">
      {noticeText && (
        <div
          role="status"
          className="fixed left-1/2 top-3 z-[100] flex w-[min(92vw,560px)] -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-400/50 bg-[#1a1510]/95 px-4 py-3 text-sm text-amber-100 shadow-2xl"
        >
          <span className="flex-1 leading-relaxed">{noticeText}</span>
          <button
            type="button"
            onClick={() => setSaveNotice(null)}
            className="shrink-0 rounded-lg border border-amber-300/50 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-400/10 cursor-pointer"
          >
            {copy.dismiss}
          </button>
        </div>
      )}
      {!runState ? (
        <TitleScreenView
          locale={locale}
          bestRuns={bestVictories}
          savedRun={savedRun}
          playSplash={playSplash}
          onSplashDone={() => setPlaySplash(false)}
          onToggleLocale={handleToggleLocale}
          onStartRun={handleStartRun}
          onResumeRun={handleResumeRun}
          onOpenTutorial={() => setShowTutorialModal(true)}
          onOpenGlossary={() => setShowGlossaryModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
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
                enemyAttacking={enemyAttacking}
                hitEnemyUids={hitEnemyUids}
                pendingPotionSlot={pendingPotionSlot}
                onCancelPendingPotion={() => setPendingPotionSlot(null)}
                onPlayCard={handlePlayCard}
                onChooseCard={handleChooseCard}
                onSkipChoice={handleSkipChoice}
                onUsePotionOnEnemy={handleUsePotionOnEnemy}
                onEndTurn={handleEndTurn}
                onCardHoverSound={() => sound.cardHover()}
                onStokeCard={handleStokeCard}
                onUseAbility={handleUseAbility}
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
            <DialogFrame
              label={copy.mapTitle}
              onClose={() => setShowMapOverlay(false)}
              className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm outline-none"
            >
              <SpireMapView
                state={runState}
                locale={locale}
                readOnly
                onCloseOverlay={() => setShowMapOverlay(false)}
              />
            </DialogFrame>
          )}
        </>
      )}

      {/* Interactive Tutorial Modal */}
      {showTutorialModal && (
        <TutorialGuideModal
          locale={locale}
          onClose={() => setShowTutorialModal(false)}
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
          hasSavedRun={Boolean(savedRun)}
          onSetLocale={handleSetLocale}
          onToggleMute={handleToggleMute}
          onReplayIntro={() => {
            setRunState(null);
            setPlaySplash(true);
          }}
          onClearSavedRun={handleClearSavedRun}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}
