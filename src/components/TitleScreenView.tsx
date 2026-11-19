import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookMarked,
  BookOpen,
  Check,
  Coins,
  Compass,
  Flame,
  Globe,
  Heart,
  Play,
  Settings,
  Shield,
  Skull,
  Swords,
  Trophy,
} from 'lucide-react';
import { HERO_CLASSES } from '../game/heroes';
import { HERO_EN, Locale, UI_COPY, tHeroSubtitle, tRelic } from '../game/i18n';
import { HeroClassId, RunState } from '../game/types';

interface TitleScreenViewProps {
  locale: Locale;
  bestRuns: number;
  savedRun: RunState | null;
  playSplash: boolean;
  showGuideOnNewRun: boolean;
  achievementUnlockedCount: number;
  achievementTotalCount: number;
  discoveredCardsCount: number;
  totalCardsCount: number;
  onToggleGuideOnNewRun: (enabled: boolean) => void;
  onSplashDone: () => void;
  onToggleLocale: () => void;
  onStartRun: (heroId: HeroClassId, ascension: number) => void;
  onResumeRun: () => void;
  onOpenCompendium: () => void;
  onOpenAchievements: () => void;
  onOpenTutorial: () => void;
  onOpenGlossary: () => void;
  onOpenSettings: () => void;
  onUiClick?: () => void;
}

export const TitleScreenView: React.FC<TitleScreenViewProps> = ({
  locale,
  bestRuns,
  savedRun,
  playSplash,
  showGuideOnNewRun,
  achievementUnlockedCount,
  achievementTotalCount,
  discoveredCardsCount,
  totalCardsCount,
  onToggleGuideOnNewRun,
  onSplashDone,
  onToggleLocale,
  onStartRun,
  onResumeRun,
  onOpenCompendium,
  onOpenAchievements,
  onOpenTutorial,
  onOpenGlossary,
  onOpenSettings,
  onUiClick,
}) => {
  const [menuStep, setMenuStep] = useState<'MENU' | 'HERO_SELECT'>('MENU');
  const [selectedHero, setSelectedHero] = useState<HeroClassId>('ironwarden');
  const [ascension, setAscension] = useState<number>(0);
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});
  const [splashFading, setSplashFading] = useState(false);

  const copy = UI_COPY[locale];
  const heroIds: HeroClassId[] = ['ironwarden', 'shadowweaver'];
  const activeHero = HERO_CLASSES[selectedHero];
  const activeHeroName =
    locale === 'zh' ? activeHero.name : HERO_EN[selectedHero].name;

  // Reset to main menu when replaying splash animation
  useEffect(() => {
    if (playSplash) {
      setMenuStep('MENU');
    }
  }, [playSplash]);

  // Splash Intro Sequence
  useEffect(() => {
    if (!playSplash) return;
    const fadeTimer = setTimeout(() => setSplashFading(true), 1450);
    const doneTimer = setTimeout(() => {
      setSplashFading(false);
      onSplashDone();
    }, 1900);

    const handleSkip = () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      setSplashFading(false);
      onSplashDone();
    };
    window.addEventListener('keydown', handleSkip);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      window.removeEventListener('keydown', handleSkip);
    };
  }, [playSplash, onSplashDone]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden overflow-y-auto bg-[#0b0e14]">
      {/* Splash Intro Overlay */}
      {playSplash && (
        <div
          onClick={onSplashDone}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e] cursor-pointer transition-opacity duration-500 ${
            splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="relative flex flex-col items-center text-center px-6">
            <div className="absolute -inset-12 rounded-full bg-amber-500/15 blur-3xl animate-splash-glow pointer-events-none" />
            <div className="animate-splash-up flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-950/50 shadow-[0_0_35px_rgba(245,158,11,0.3)] mb-6">
              <Flame className="h-8 w-8 text-amber-400" />
            </div>
            <h1 className="animate-splash-up font-display text-4xl sm:text-6xl font-extrabold tracking-[0.18em] text-amber-300 drop-shadow-lg">
              {copy.brandShort}
            </h1>
            <div className="animate-splash-line my-4 h-px w-56 sm:w-72 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
            <div className="animate-splash-up font-display text-xs sm:text-sm tracking-[0.35em] text-slate-400">
              {copy.brandSub}
            </div>
            <div className="mt-10 text-xs text-slate-600">{copy.splashPrompt}</div>
          </div>
        </div>
      )}

      {/* Atmospheric Keyart Backdrop */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {!imgFailed.keyart && (
          <img
            src="/src/assets/images/spire_title_keyart_1795024272474.jpg"
            alt={copy.brandTitle}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed((p) => ({ ...p, keyart: true }))}
            className={`h-full w-full object-cover object-center transition-opacity duration-500 ${
              menuStep === 'HERO_SELECT' ? 'opacity-22' : 'opacity-42'
            }`}
          />
        )}
        <div
          className={`absolute inset-0 ${
            menuStep === 'HERO_SELECT'
              ? 'bg-gradient-to-b from-[#0b0e14]/90 via-[#0b0e14]/84 to-[#0b0e14]/96'
              : 'bg-gradient-to-b from-[#0b0e14]/80 via-[#0b0e14]/55 to-[#0b0e14]/95'
          }`}
        />
      </div>

      {/* Minimal Top Bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1280px] shrink-0 items-center justify-between px-6 py-3.5 sm:py-4">
        <div className="font-display text-lg sm:text-xl font-extrabold tracking-[0.14em] text-amber-400 whitespace-nowrap">
          {copy.brandTitle}
        </div>
        <div className="flex items-center gap-4">
          {bestRuns > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-mono-num text-amber-300 whitespace-nowrap">
              <Trophy className="h-4 w-4" />
              <span>
                {copy.winsCount} {bestRuns}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onUiClick?.();
              onToggleLocale();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#141923]/85 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400/60 whitespace-nowrap cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 text-amber-400" />
            <span>{locale === 'zh' ? 'EN' : '中文'}</span>
          </button>
        </div>
      </header>

      {/* STEP 1: PURE TRADITIONAL MAIN MENU */}
      {menuStep === 'MENU' ? (
        <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-16 pt-4">
          {/* Game Title Emblem */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/45 bg-[#151a25]/90 shadow-[0_0_32px_rgba(245,158,11,0.2)]">
              <Flame className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[0.14em] text-slate-50 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
              {copy.brandShort}
            </h1>
            <div className="my-3 h-px w-44 bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
            <p className="text-xs sm:text-sm tracking-wide text-slate-300/90">
              {copy.menuSubtitle}
            </p>
          </div>

          {/* Clean Traditional Menu Stack */}
          <nav
            aria-label="Main Menu"
            className="flex w-full flex-col gap-3 rounded-2xl border border-white/12 bg-[#11151f]/88 p-5 backdrop-blur-md shadow-2xl"
          >
            {savedRun && (
              <button
                type="button"
                onClick={onResumeRun}
                className="flex items-center justify-between rounded-xl border border-emerald-400/55 bg-emerald-950/65 px-5 py-3.5 text-left text-emerald-100 hover:bg-emerald-900/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Play className="h-4 w-4 text-emerald-300" />
                  <span className="font-display text-base font-bold whitespace-nowrap">
                    {copy.menuContinue}
                  </span>
                </div>
                <span className="font-mono-num text-xs text-emerald-300 whitespace-nowrap">
                  {copy.floorPrefix} {savedRun.floor} {copy.floorSuffix} ·{' '}
                  {locale === 'zh'
                    ? HERO_CLASSES[savedRun.heroId].name
                    : HERO_EN[savedRun.heroId].name}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onUiClick?.();
                setMenuStep('HERO_SELECT');
              }}
              className="flex items-center justify-center gap-3 rounded-xl bg-amber-500 px-6 py-4 text-slate-950 shadow-lg hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Swords className="h-5 w-5" />
              <span className="font-display text-lg font-extrabold whitespace-nowrap">
                {copy.menuStartGame}
              </span>
            </button>

            <div className="my-0.5 h-px bg-white/8" />

            <button
              type="button"
              onClick={() => {
                onUiClick?.();
                onOpenCompendium();
              }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161c26]/90 px-5 py-3 text-left text-sm font-semibold text-slate-100 hover:border-sky-400/50 hover:bg-[#1c2330] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <BookMarked className="h-4 w-4 text-sky-400" />
                <span>{copy.menuCompendium}</span>
              </span>
              <span className="font-mono-num text-xs text-slate-400">
                {discoveredCardsCount}/{totalCardsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUiClick?.();
                onOpenAchievements();
              }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161c26]/90 px-5 py-3 text-left text-sm font-semibold text-slate-100 hover:border-amber-400/50 hover:bg-[#1c2330] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Award className="h-4 w-4 text-amber-400" />
                <span>{copy.menuAchievements}</span>
              </span>
              <span className="font-mono-num text-xs text-amber-300/90">
                {achievementUnlockedCount}/{achievementTotalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUiClick?.();
                onOpenTutorial();
              }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#161c26]/90 px-5 py-3 text-left text-sm font-semibold text-slate-100 hover:border-amber-400/50 hover:bg-[#1c2330] transition-colors cursor-pointer"
            >
              <Compass className="h-4 w-4 text-emerald-400" />
              <span>{copy.menuTutorial}</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onUiClick?.();
                  onOpenGlossary();
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#161c26]/90 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:bg-[#1c2330] transition-colors whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                <span>{copy.menuManual}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUiClick?.();
                  onOpenSettings();
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#161c26]/90 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:bg-[#1c2330] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-slate-300" />
                <span>{copy.menuSettings}</span>
              </button>
            </div>
          </nav>
        </main>
      ) : (
        /* STEP 2: LEFT / RIGHT CHARACTER SELECTION & BRIEF CLASS INTROS */
        <main className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-center gap-4 px-5 pb-6 pt-1 sm:px-6">
          {/* Sub-header with Back to Menu */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => {
                onUiClick?.();
                setMenuStep('MENU');
              }}
              className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#141923]/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/60 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-amber-400" />
              <span>{copy.backToMenu}</span>
            </button>

            <div className="text-left sm:text-right">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-50">
                {copy.heroSelectTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">{copy.heroSelectSub}</p>
            </div>
          </div>

          {/* Left & Right Hero Cards Comparison */}
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
            {heroIds.map((hid) => {
              const hero = HERO_CLASSES[hid];
              const isSelected = selectedHero === hid;
              const hName = locale === 'zh' ? hero.name : HERO_EN[hid].name;
              const hSub = tHeroSubtitle(hid, hero.subtitle, locale);
              const hDesc = locale === 'zh' ? hero.description : HERO_EN[hid].description;
              const hArchetypes = locale === 'zh' ? hero.archetypes : HERO_EN[hid].archetypes;
              const hRelic = tRelic(hero.starterRelicId, locale);

              return (
                <button
                  key={hid}
                  type="button"
                  onClick={() => {
                    onUiClick?.();
                    setSelectedHero(hid);
                  }}
                  className={`group relative flex flex-col sm:flex-row items-stretch overflow-hidden rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-[#151c29]/95 ring-1 ring-amber-400/45 shadow-[0_18px_44px_rgba(0,0,0,0.65)]'
                      : 'border-white/10 bg-[#10141d]/85 hover:border-white/25 hover:bg-[#141925]/90 opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Character Full-Body Standee Pane (Zero Crop Framing) */}
                  <div className="relative flex h-64 sm:h-[340px] sm:w-[245px] lg:w-[255px] shrink-0 items-center justify-center overflow-hidden bg-[#13161d] p-2">
                    {!imgFailed[`standee_${hid}`] ? (
                      <img
                        src={hero.standeeUrl}
                        alt={hName}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgFailed((p) => ({ ...p, [`standee_${hid}`]: true }))
                        }
                        style={{
                          WebkitMaskImage:
                            'radial-gradient(ellipse 92% 94% at 50% 50%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)',
                          maskImage:
                            'radial-gradient(ellipse 92% 94% at 50% 50%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)',
                        }}
                        className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : !imgFailed[`portrait_${hid}`] ? (
                      <img
                        src={hero.portraitUrl}
                        alt={hName}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgFailed((p) => ({ ...p, [`portrait_${hid}`]: true }))
                        }
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {hid === 'ironwarden' ? (
                          <Swords className="h-14 w-14 text-rose-400" />
                        ) : (
                          <Skull className="h-14 w-14 text-emerald-400" />
                        )}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent via-transparent to-[#151c29]/45" />
                  </div>

                  {/* Hero Details & Brief Intro */}
                  <div className="flex flex-1 flex-col justify-between gap-3 p-5">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-2xl font-extrabold text-slate-50">
                            {hName}
                          </h3>
                          <div className="mt-0.5 text-xs font-semibold text-amber-300/95">
                            {hSub}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-300 whitespace-nowrap">
                            <Check className="h-3.5 w-3.5" />
                            <span>{copy.selectedLabel}</span>
                          </span>
                        )}
                      </div>

                      {/* Clean Unboxed Stats & Archetype Lines */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2.5 font-mono-num text-slate-300">
                          <span className="flex items-center gap-1 text-rose-300 font-semibold">
                            <Heart className="h-3.5 w-3.5 text-rose-500" />
                            <span>{hero.maxHp} HP</span>
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="flex items-center gap-1 text-amber-300 font-semibold">
                            <Coins className="h-3.5 w-3.5 text-amber-400" />
                            <span>{hero.startingGold} G</span>
                          </span>
                        </div>
                        <div className="text-slate-400">{hArchetypes.join(' · ')}</div>
                      </div>

                      <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                        {hDesc}
                      </p>
                    </div>

                    {/* Starter Relic Summary */}
                    <div className="border-t border-white/10 pt-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                        <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>
                          {copy.starterRelic}
                          {locale === 'zh' ? '：' : ': '}
                          {hRelic.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {hRelic.desc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Launch Controls: Difficulty + Guide Toggle + Start CTA */}
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#11151f]/90 p-4 sm:flex-row sm:items-center sm:justify-between backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-4">
              {/* Ascension Difficulty Picker */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0b0e14] p-1">
                {[
                  { level: 0, label: copy.ascension0 },
                  { level: 1, label: copy.ascension1 },
                  { level: 2, label: copy.ascension2 },
                ].map((opt) => (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => {
                      onUiClick?.();
                      setAscension(opt.level);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      ascension === opt.level
                        ? 'bg-[#1c2433] text-amber-300 font-bold border border-amber-400/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Onboarding Step-by-Step Guide Checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGuideOnNewRun}
                  onChange={(e) => onToggleGuideOnNewRun(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[#0b0e14] accent-amber-500 cursor-pointer"
                />
                <span>{copy.guideOnStart}</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => onStartRun(selectedHero, ascension)}
              className="flex items-center justify-center gap-2.5 rounded-xl bg-amber-500 px-7 py-3.5 text-slate-950 font-display text-base font-extrabold shadow-lg hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Swords className="h-5 w-5" />
              <span>
                {copy.embarkBtn} · {activeHeroName}
              </span>
            </button>
          </div>
        </main>
      )}
    </div>
  );
};
