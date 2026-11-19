import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  Gem,
  BookOpen,
  Coins,
  FlaskConical,
  Globe,
  Heart,
  Layers,
  Map as MapIcon,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HERO_CLASSES } from '../game/heroes';
import { HERO_EN, Locale, UI_COPY, tPotion, tRelic } from '../game/i18n';
import { TOTAL_FLOORS } from '../game/map';
import { PotionDef, RelicDef, RunState } from '../game/types';
import { useIsTouch } from './InfoTip';
import { DialogFrame } from './useDialog';

// One CJK character ("血焰徽记" -> "血") or up to two initials ("Bloodfire Sigil" -> "BS").
function relicGlyph(name: string): string {
  const trimmed = name.trim();
  if (/^[一-鿿]/.test(trimmed)) return trimmed[0];
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

interface TopHudBarProps {
  state: RunState;
  locale: Locale;
  muted: boolean;
  onToggleLocale: () => void;
  onToggleMute: () => void;
  onOpenDeck: () => void;
  onOpenStats: () => void;
  onOpenGlossary: () => void;
  onOpenSettings: () => void;
  onToggleMapOverlay: () => void;
  onUsePotion: (slotIndex: number) => void;
  onDiscardPotion: (slotIndex: number) => void;
  onAbandonRun: () => void;
}

export const TopHudBar: React.FC<TopHudBarProps> = ({
  state,
  locale,
  muted,
  onToggleLocale,
  onToggleMute,
  onOpenDeck,
  onOpenStats,
  onOpenGlossary,
  onOpenSettings,
  onToggleMapOverlay,
  onUsePotion,
  onDiscardPotion,
  onAbandonRun,
}) => {
  const copy = UI_COPY[locale];
  const hero = HERO_CLASSES[state.heroId];
  const heroName = locale === 'zh' ? hero.name : HERO_EN[state.heroId].name;
  const [hoveredRelic, setHoveredRelic] = useState<RelicDef | null>(null);
  const [hoveredPotion, setHoveredPotion] = useState<PotionDef | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  // Touch screens: tapping a potion opens Use / Discard instead of using it at once.
  const isTouch = useIsTouch();
  const [potionMenu, setPotionMenu] = useState<number | null>(null);
  // Relics are hidden from the bar below 1024px; this drawer lists them.
  const [showRelics, setShowRelics] = useState(false);

  useEffect(() => {
    if (potionMenu === null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.('[data-potion-slot]')) setPotionMenu(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [potionMenu]);

  const hoveredRelicText = hoveredRelic ? tRelic(hoveredRelic.id, locale) : null;
  const hoveredPotionText = hoveredPotion ? tPotion(hoveredPotion.id, locale) : null;

  return (
    <header className="relative z-40 border-b border-white/10 bg-[#0d1118]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap xl:flex-nowrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Zone 1: Hero & Vital Stats */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-5 xl:shrink-0">
          <div className="flex items-center gap-2">
            <span className="hidden font-display text-base font-bold tracking-wide text-amber-400 whitespace-nowrap sm:inline">
              {heroName}
            </span>
            {state.ascension > 0 && (
              <span className="text-xs font-medium text-rose-400 whitespace-nowrap">
                · {copy.ascensionLabel} {state.ascension}
              </span>
            )}
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {copy.floorPrefix}{' '}
              <span className="font-mono-num text-slate-100">{state.floor}</span> / {TOTAL_FLOORS}{' '}
              {copy.floorSuffix}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <Heart className="h-4 w-4 text-rose-500" />
            <span className="font-mono-num font-semibold text-rose-200">
              {state.hp} / {state.maxHp}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="font-mono-num font-semibold text-amber-200">{state.gold}</span>
          </div>

          {/* Potions */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            {state.potions.map((pot, idx) => {
              const potTxt = pot ? tPotion(pot.id, locale) : null;
              const usableNow =
                pot &&
                (pot.id === 'heartblood_elixir' ||
                  (state.phase === 'COMBAT' && !state.combat?.enemyTurnInProgress));
              return (
                <div key={idx} className="group relative" data-potion-slot>
                  <button
                    type="button"
                    disabled={!pot || (!usableNow && !isTouch)}
                    aria-haspopup={isTouch ? 'menu' : undefined}
                    onClick={() => {
                      if (!pot) return;
                      if (isTouch) {
                        setPotionMenu(potionMenu === idx ? null : idx);
                        return;
                      }
                      if (usableNow) onUsePotion(idx);
                    }}
                    onMouseEnter={() => pot && setHoveredPotion(pot)}
                    onMouseLeave={() => setHoveredPotion(null)}
                    title={
                      potTxt
                        ? `${potTxt.name}: ${potTxt.desc}`
                        : locale === 'zh'
                        ? '空药水栏'
                        : 'Empty Potion Slot'
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                      pot
                        ? usableNow
                          ? 'border-amber-400/50 bg-[#18202c] hover:border-amber-300 hover:bg-[#1f2937] cursor-pointer'
                          : 'border-white/15 bg-[#151a24] cursor-default'
                        : 'border-white/8 bg-[#10141c] opacity-40 cursor-default'
                    }`}
                  >
                    <FlaskConical
                      className="h-4 w-4"
                      style={{ color: pot ? pot.color : '#64748b' }}
                    />
                  </button>
                  {pot && potTxt && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoveredPotion(null);
                        onDiscardPotion(idx);
                      }}
                      title={`${locale === 'zh' ? '丢弃' : 'Discard'} ${potTxt.name}`}
                      aria-label={`${locale === 'zh' ? '丢弃' : 'Discard'} ${potTxt.name}`}
                      className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 border border-white/25 text-[10px] text-slate-200 hover:bg-rose-600 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                  {isTouch && potionMenu === idx && pot && potTxt && (
                    <>
                      <div
                        role="menu"
                        className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/15 bg-[#12161f] p-3 text-xs shadow-2xl"
                      >
                        <div className="font-semibold text-slate-100">{potTxt.name}</div>
                        <div className="mt-1 leading-snug text-slate-300">{potTxt.desc}</div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            role="menuitem"
                            disabled={!usableNow}
                            onClick={() => {
                              setPotionMenu(null);
                              onUsePotion(idx);
                            }}
                            className="flex-1 rounded-lg bg-amber-500 px-3 py-2 font-bold text-slate-950 disabled:opacity-40 cursor-pointer"
                          >
                            {copy.potionUse}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setPotionMenu(null);
                              onDiscardPotion(idx);
                            }}
                            className="flex-1 rounded-lg border border-rose-400/50 px-3 py-2 font-semibold text-rose-200 cursor-pointer"
                          >
                            {copy.potionDiscard}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Relic drawer button: the relic strip below is hidden under 1024px. */}
          <button
            type="button"
            onClick={() => setShowRelics(true)}
            aria-label={`${copy.relicsLabel} (${state.relics.length})`}
            className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-[#161c26] px-2 py-1.5 text-xs font-semibold text-amber-200 lg:hidden cursor-pointer"
          >
            <Gem className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono-num">{state.relics.length}</span>
          </button>
        </div>

        {/* Zone 2: Relics Strip — compact glyph chips so the HUD stays one row;
            name + description show in the tooltip banner on hover/focus. */}
        <div className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto">
          <span className="mr-1 shrink-0 text-xs text-slate-400">{copy.relicsLabel}</span>
          {state.relics.map((relic) => {
            const rt = tRelic(relic.id, locale);
            return (
              <div
                key={relic.id}
                tabIndex={0}
                aria-label={`${rt.name}: ${rt.desc}`}
                onMouseEnter={() => setHoveredRelic(relic)}
                onMouseLeave={() => setHoveredRelic(null)}
                onFocus={() => setHoveredRelic(relic)}
                onBlur={() => setHoveredRelic(null)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-[#171d28] font-bold text-amber-200 hover:border-amber-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors cursor-help ${
                  relic.rarity === 'starter' ? 'border-amber-400/60' : 'border-amber-500/25'
                } ${/[一-鿿]/.test(rt.name) ? 'text-sm' : 'text-[11px]'}`}
              >
                {relicGlyph(rt.name)}
              </div>
            );
          })}
        </div>

        {/* Zone 3: Actions */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2 xl:shrink-0">
          {state.phase !== 'MAP' && state.phase !== 'VICTORY' && state.phase !== 'DEFEAT' && (
            <button
              type="button"
              onClick={onToggleMapOverlay}
              aria-label={copy.mapBtn}
              className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#161c26] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <MapIcon className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">{copy.mapBtn}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenDeck}
            aria-label={`${copy.deckBtn} (${state.deck.length})`}
            className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#161c26] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">
              {copy.deckBtn} (<span className="font-mono-num">{state.deck.length}</span>)
            </span>
            <span className="font-mono-num sm:hidden">{state.deck.length}</span>
          </button>
          <button
            type="button"
            onClick={onOpenStats}
            aria-label={copy.statsBtn}
            className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#161c26] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{copy.statsBtn}</span>
          </button>
          <button
            type="button"
            onClick={onOpenGlossary}
            aria-label={copy.glossary}
            className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#161c26] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">{copy.glossary}</span>
          </button>
          <button
            type="button"
            onClick={onToggleLocale}
            title="中文 / English"
            className="flex items-center gap-1 rounded-lg border border-white/12 bg-[#161c26] px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400/50 cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 text-amber-400" />
            <span>{locale === 'zh' ? 'EN' : '中文'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={copy.menuSettings}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-[#161c26] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? copy.soundOn : copy.soundOff}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-[#161c26] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {!confirmAbandon ? (
            <button
              type="button"
              onClick={() => setConfirmAbandon(true)}
              aria-label={copy.restartBtn}
              className="flex items-center gap-1 rounded-lg border border-white/12 bg-[#161c26] px-2.5 py-1.5 text-xs text-slate-400 hover:border-rose-500/50 hover:text-rose-300 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{copy.restartBtn}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmAbandon(false);
                  onAbandonRun();
                }}
                className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-500 whitespace-nowrap cursor-pointer"
              >
                {copy.confirmAbandon}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAbandon(false)}
                className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-slate-300 hover:text-white whitespace-nowrap cursor-pointer"
              >
                {copy.cancel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip Banner when hovering Relic or Potion */}
      {(hoveredRelicText || hoveredPotionText) && (
        <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-lg border border-amber-500/40 bg-[#121722] px-4 py-2 text-xs shadow-2xl">
          {hoveredRelicText && (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-bold text-amber-300">{hoveredRelicText.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-200">{hoveredRelicText.desc}</span>
            </div>
          )}
          {hoveredPotionText && (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-bold text-sky-300">{hoveredPotionText.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-200">{hoveredPotionText.desc}</span>
            </div>
          )}
        </div>
      )}
      {showRelics &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setShowRelics(false)}>
          <DialogFrame
            label={copy.relicsLabel}
            onClose={() => setShowRelics(false)}
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-[#12161f] p-4 shadow-2xl outline-none"
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-amber-200">
                  {copy.relicsLabel} ({state.relics.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowRelics(false)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-slate-200 cursor-pointer"
                >
                  {copy.close}
                </button>
              </div>
              <ul className="space-y-2">
                {state.relics.map((relic) => {
                  const rt = tRelic(relic.id, locale);
                  return (
                    <li key={relic.id} className="rounded-lg border border-white/10 bg-[#171d28] p-3">
                      <div className="text-sm font-semibold text-amber-200">{rt.name}</div>
                      <div className="mt-1 text-xs leading-snug text-slate-300">{rt.desc}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </DialogFrame>
        </div>,
          document.body
        )}
    </header>
  );
};
