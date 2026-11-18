import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Compass,
  Flame,
  Globe,
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
  onSplashDone: () => void;
  onToggleLocale: () => void;
  onStartRun: (heroId: HeroClassId, ascension: number) => void;
  onResumeRun: () => void;
  onOpenTutorial: () => void;
  onOpenGlossary: () => void;
  onOpenSettings: () => void;
}

export const TitleScreenView: React.FC<TitleScreenViewProps> = ({
  locale,
  bestRuns,
  savedRun,
  playSplash,
  onSplashDone,
  onToggleLocale,
  onStartRun,
  onResumeRun,
  onOpenTutorial,
  onOpenGlossary,
  onOpenSettings,
}) => {
  const [selectedHero, setSelectedHero] = useState<HeroClassId>('ironwarden');
  const [ascension, setAscension] = useState<number>(0);
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});
  const [splashFading, setSplashFading] = useState(false);

  const copy = UI_COPY[locale];
  const heroIds: HeroClassId[] = ['ironwarden', 'shadowweaver'];
  const activeHero = HERO_CLASSES[selectedHero];
  const activeHeroName =
    locale === 'zh' ? activeHero.name : HERO_EN[selectedHero].name;
  const activeHeroSubtitle = tHeroSubtitle(selectedHero, activeHero.subtitle, locale);
  const activeRelic = tRelic(activeHero.starterRelicId, locale);

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
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#0b0e14]">
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
            className="h-full w-full object-cover object-center opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e14]/92 via-[#0b0e14]/72 to-[#0b0e14]/95" />
      </div>

      {/* Minimal Top Bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-5">
        <div className="font-display text-xl sm:text-2xl font-extrabold tracking-[0.14em] text-amber-400">
          {copy.brandTitle}
        </div>
        <div className="flex items-center gap-4">
          {bestRuns > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-mono-num text-amber-300">
              <Trophy className="h-4 w-4" />
              <span>
                {copy.winsCount} {bestRuns}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={onToggleLocale}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#141923]/85 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400/60 cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 text-amber-400" />
            <span>{locale === 'zh' ? 'EN' : '中文'}</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Hero Standee Showcase + Traditional Game Menu */}
      <main className="relative z-10 mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 items-center gap-10 px-6 pb-10 pt-2 lg:grid-cols-12">
        {/* Left: Hero Class Selector + 3:4 Full-Body Standee Showcase (Concise Only) */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row items-center gap-7">
          {/* 3:4 Full-Body Standee Frame */}
          <div className="relative h-80 w-60 sm:h-[420px] sm:w-[300px] shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[#10141d] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
            {!imgFailed[`standee_${selectedHero}`] ? (
              <img
                key={activeHero.standeeUrl}
                src={activeHero.standeeUrl}
                alt={activeHeroName}
                referrerPolicy="no-referrer"
                onError={() =>
                  setImgFailed((p) => ({ ...p, [`standee_${selectedHero}`]: true }))
                }
                className="h-full w-full object-cover object-top transition-transform duration-500"
              />
            ) : !imgFailed[`portrait_${selectedHero}`] ? (
              <img
                src={activeHero.portraitUrl}
                alt={activeHeroName}
                referrerPolicy="no-referrer"
                onError={() =>
                  setImgFailed((p) => ({ ...p, [`portrait_${selectedHero}`]: true }))
                }
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {selectedHero === 'ironwarden' ? (
                  <Swords className="h-16 w-16 text-rose-400" />
                ) : (
                  <Skull className="h-16 w-16 text-emerald-400" />
                )}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-extrabold text-slate-50">
                  {activeHeroName}
                </span>
                <span className="font-mono-num text-sm font-bold text-rose-300">
                  HP {activeHero.maxHp}
                </span>
              </div>
              <div className="mt-1 text-xs font-medium text-amber-300/90">
                {activeHeroSubtitle}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-300">
                <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {copy.starterRelic}: {activeRelic.name}
                </span>
              </div>
            </div>
          </div>

          {/* Class Toggle Stack */}
          <div className="flex w-full max-w-xs flex-col gap-3">
            {heroIds.map((hid) => {
              const h = HERO_CLASSES[hid];
              const hName = locale === 'zh' ? h.name : HERO_EN[hid].name;
              const hSub = tHeroSubtitle(hid, h.subtitle, locale);
              const isSelected = selectedHero === hid;
              return (
                <button
                  key={hid}
                  type="button"
                  onClick={() => setSelectedHero(hid)}
                  className={`flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-[#1a2130]/95 ring-1 ring-amber-400/50 shadow-lg'
                      : 'border-white/10 bg-[#121722]/80 hover:border-white/25'
                  }`}
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0d1118]">
                    {!imgFailed[`thumb_${hid}`] ? (
                      <img
                        src={h.portraitUrl}
                        alt={hName}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgFailed((p) => ({ ...p, [`thumb_${hid}`]: true }))
                        }
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {hid === 'ironwarden' ? (
                          <Swords className="h-6 w-6 text-rose-400" />
                        ) : (
                          <Skull className="h-6 w-6 text-emerald-400" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold text-slate-100 truncate">
                        {hName}
                      </span>
                      <span className="font-mono-num text-xs font-semibold text-rose-300 shrink-0">
                        {h.maxHp}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400 truncate">{hSub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Classic Game Vertical Menu */}
        <nav
          aria-label="Main Menu"
          className="lg:col-span-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#11151f]/88 p-6 backdrop-blur-md shadow-2xl"
        >
          {/* Continue Game (only if savedRun exists) */}
          {savedRun && (
            <button
              type="button"
              onClick={onResumeRun}
              className="flex items-center justify-between rounded-xl border border-emerald-400/55 bg-emerald-950/65 px-5 py-3.5 text-left text-emerald-100 hover:bg-emerald-900/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Play className="h-4 w-4 text-emerald-300" />
                <span className="font-display text-base font-bold">{copy.menuContinue}</span>
              </div>
              <span className="font-mono-num text-xs text-emerald-300">
                {copy.floorPrefix} {savedRun.floor} {copy.floorSuffix} ·{' '}
                {locale === 'zh'
                  ? HERO_CLASSES[savedRun.heroId].name
                  : HERO_EN[savedRun.heroId].name}
              </span>
            </button>
          )}

          {/* Start New Game Primary CTA */}
          <button
            type="button"
            onClick={() => onStartRun(selectedHero, ascension)}
            className="flex items-center justify-between rounded-xl bg-amber-500 px-5 py-4 text-slate-950 shadow-lg hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Swords className="h-5 w-5" />
              <span className="font-display text-lg font-extrabold">{copy.menuStartGame}</span>
            </div>
            <span className="text-xs font-bold opacity-80">{activeHeroName}</span>
          </button>

          {/* Compact Ascension Picker */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/8 bg-[#0b0e14] p-1">
            {[
              { level: 0, label: copy.ascension0 },
              { level: 1, label: copy.ascension1 },
              { level: 2, label: copy.ascension2 },
            ].map((opt) => (
              <button
                key={opt.level}
                type="button"
                onClick={() => setAscension(opt.level)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors truncate cursor-pointer ${
                  ascension === opt.level
                    ? 'bg-[#1c2433] text-amber-300 font-bold border border-amber-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="my-1 h-px bg-white/8" />

          {/* Tutorial */}
          <button
            type="button"
            onClick={onOpenTutorial}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#161c26]/90 px-5 py-3 text-left text-sm font-semibold text-slate-100 hover:border-amber-400/50 hover:bg-[#1c2330] transition-colors cursor-pointer"
          >
            <Compass className="h-4 w-4 text-amber-400" />
            <span>{copy.menuTutorial}</span>
          </button>

          {/* Manual & Compendium */}
          <button
            type="button"
            onClick={onOpenGlossary}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#161c26]/90 px-5 py-3 text-left text-sm font-semibold text-slate-100 hover:border-amber-400/50 hover:bg-[#1c2330] transition-colors cursor-pointer"
          >
            <BookOpen className="h-4 w-4 text-sky-400" />
            <span>{copy.menuManual}</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#161c26]/90 px-5 py-3 text-left text-sm font-semibold text-slate-100 hover:border-amber-400/50 hover:bg-[#1c2330] transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4 text-slate-300" />
            <span>{copy.menuSettings}</span>
          </button>
        </nav>
      </main>
    </div>
  );
};
