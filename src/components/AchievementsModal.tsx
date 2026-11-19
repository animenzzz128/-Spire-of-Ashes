import React, { useState } from 'react';
import {
  CheckCircle2,
  Crown,
  Droplet,
  Flame,
  FlaskConical,
  Gem,
  Layers,
  Lock,
  Shield,
  Skull,
  Star,
  Swords,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  AchievementDef,
  AchievementTier,
  MetaProgress,
  tAchievement,
} from '../game/achievements';
import { Locale } from '../game/i18n';

interface AchievementsModalProps {
  locale: Locale;
  meta: MetaProgress;
  onClose: () => void;
}

function renderAchievementIcon(key: AchievementDef['iconKey'], unlocked: boolean) {
  const cls = `h-5 w-5 ${unlocked ? '' : 'opacity-45'}`;
  switch (key) {
    case 'swords':
      return <Swords className={`${cls} text-rose-400`} />;
    case 'skull':
      return <Skull className={`${cls} text-slate-300`} />;
    case 'crown':
      return <Crown className={`${cls} text-amber-300`} />;
    case 'shield':
      return <Shield className={`${cls} text-sky-400`} />;
    case 'flame':
      return <Flame className={`${cls} text-orange-400`} />;
    case 'droplet':
      return <Droplet className={`${cls} text-emerald-400`} />;
    case 'zap':
      return <Zap className={`${cls} text-amber-400`} />;
    case 'gem':
      return <Gem className={`${cls} text-cyan-300`} />;
    case 'layers':
      return <Layers className={`${cls} text-indigo-300`} />;
    case 'flask':
      return <FlaskConical className={`${cls} text-teal-300`} />;
    case 'star':
      return <Star className={`${cls} text-yellow-300`} />;
    case 'trophy':
    default:
      return <Trophy className={`${cls} text-amber-300`} />;
  }
}

function getTierBadge(tier: AchievementTier, locale: Locale) {
  const zh = locale === 'zh';
  switch (tier) {
    case 'mythic':
      return {
        label: zh ? '传说' : 'Mythic',
        cls: 'text-rose-300 border-rose-400/50 bg-rose-950/60',
      };
    case 'gold':
      return {
        label: zh ? '史诗' : 'Gold',
        cls: 'text-amber-300 border-amber-400/50 bg-amber-950/60',
      };
    case 'silver':
      return {
        label: zh ? '稀有' : 'Silver',
        cls: 'text-sky-300 border-sky-400/45 bg-sky-950/60',
      };
    case 'bronze':
    default:
      return {
        label: zh ? '标准' : 'Bronze',
        cls: 'text-slate-300 border-slate-500/40 bg-slate-800/70',
      };
  }
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  locale,
  meta,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const zh = locale === 'zh';

  const unlockedCount = ACHIEVEMENTS.filter((a) => Boolean(meta.unlocked[a.id])).length;
  const pct = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);

  const visible = ACHIEVEMENTS.filter((a) => {
    const isUnlocked = Boolean(meta.unlocked[a.id]);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/84 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-950/40">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">
                {zh ? '高塔成就殿堂' : 'Spire Achievements'}
              </h3>
              <p className="text-xs text-slate-400">
                {zh
                  ? `已解锁 ${unlockedCount} / ${ACHIEVEMENTS.length} 项成就（${pct}%）`
                  : `Unlocked ${unlockedCount} of ${ACHIEVEMENTS.length} achievements (${pct}%)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0b0e14] p-1">
              {[
                { id: 'all', label: zh ? `全部 (${ACHIEVEMENTS.length})` : `All (${ACHIEVEMENTS.length})` },
                { id: 'unlocked', label: zh ? `已解锁 (${unlockedCount})` : `Unlocked (${unlockedCount})` },
                {
                  id: 'locked',
                  label: zh
                    ? `未解锁 (${ACHIEVEMENTS.length - unlockedCount})`
                    : `Locked (${ACHIEVEMENTS.length - unlockedCount})`,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id as typeof filter)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    filter === t.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={zh ? '关闭' : 'Close'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#1a202c] text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Career Summary & Progress Bar */}
        <div className="border-b border-white/8 bg-[#0e121a] px-6 py-3.5 space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-lg border border-white/8 bg-[#141923] px-3 py-2">
              <div className="text-slate-400">{zh ? '累计通关次数' : 'Total Victories'}</div>
              <div className="mt-0.5 font-mono-num text-base font-bold text-amber-300">
                {meta.totalVictories}
              </div>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#141923] px-3 py-2">
              <div className="text-slate-400">{zh ? '累计击杀敌人' : 'Enemies Defeated'}</div>
              <div className="mt-0.5 font-mono-num text-base font-bold text-rose-300">
                {meta.totalEnemiesDefeated}
              </div>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#141923] px-3 py-2">
              <div className="text-slate-400">{zh ? '最高单次爆发伤害' : 'Peak Single-Hit'}</div>
              <div className="mt-0.5 font-mono-num text-base font-bold text-orange-300">
                {meta.maxSingleHit}
              </div>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#141923] px-3 py-2">
              <div className="text-slate-400">{zh ? '最高单场格挡 / 毒层' : 'Peak Block / Poison'}</div>
              <div className="mt-0.5 font-mono-num text-base font-bold text-sky-300">
                {meta.maxBlockReached} / <span className="text-emerald-300">{meta.maxPoisonStacked}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {visible.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              {zh ? '当前筛选下暂无成就记录。' : 'No achievements match this filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {visible.map((ach) => {
                const unlockedAt = meta.unlocked[ach.id];
                const isUnlocked = Boolean(unlockedAt);
                const txt = tAchievement(ach, locale);
                const tierInfo = getTierBadge(ach.tier, locale);
                const dateStr = unlockedAt
                  ? new Date(unlockedAt).toLocaleDateString(zh ? 'zh-CN' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : null;

                return (
                  <div
                    key={ach.id}
                    className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                      isUnlocked
                        ? 'border-amber-400/40 bg-[#171d2a]'
                        : 'border-white/8 bg-[#11151e]/75 opacity-75'
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                        isUnlocked
                          ? 'border-amber-400/50 bg-[#1e2636]'
                          : 'border-white/10 bg-[#0d1118]'
                      }`}
                    >
                      {renderAchievementIcon(ach.iconKey, isUnlocked)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-display text-sm font-bold ${
                              isUnlocked ? 'text-slate-100' : 'text-slate-400'
                            }`}
                          >
                            {txt.name}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${tierInfo.cls}`}
                          >
                            {tierInfo.label}
                          </span>
                        </div>

                        {isUnlocked ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{dateStr}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Lock className="h-3 w-3" />
                            <span>{zh ? '未解锁' : 'Locked'}</span>
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {txt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
