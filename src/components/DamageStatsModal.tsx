import React from 'react';
import { BarChart3, Flame, Heart, Shield, Skull, Swords, X } from 'lucide-react';
import { Locale, UI_COPY, tCard } from '../game/i18n';
import { RunState } from '../game/types';

interface DamageStatsPanelProps {
  state: RunState;
  locale: Locale;
}

export const DamageStatsPanel: React.FC<DamageStatsPanelProps> = ({ state, locale }) => {
  const copy = UI_COPY[locale];
  const { stats } = state;

  const totalDmg = Math.max(0, stats.totalDamageDealt);
  const atkPct = totalDmg > 0 ? Math.round((stats.attackDamageDealt / totalDmg) * 100) : 0;
  const psnPct = totalDmg > 0 ? Math.round((stats.poisonDamageDealt / totalDmg) * 100) : 0;
  const relPct = totalDmg > 0 ? Math.max(0, 100 - atkPct - psnPct) : 0;

  const totalIncoming = stats.damageBlocked + stats.hpLost;
  const blockRate =
    totalIncoming > 0 ? Math.round((stats.damageBlocked / totalIncoming) * 100) : 100;

  const topCards = Object.values(stats.damageByCard)
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 5);
  const topCardMax = topCards[0]?.damage || 1;

  const totalCardsTyped =
    stats.cardsByType.attack + stats.cardsByType.skill + stats.cardsByType.power;

  return (
    <div className="space-y-6 text-left">
      {/* Row 1: Damage Source Breakdown & Defense/Sustainment */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Swords className="h-4 w-4 text-rose-400" />
              <span>{copy.damageBreakdown}</span>
            </div>
            <span className="font-mono-num text-lg font-extrabold text-amber-300">
              {totalDmg}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 flex justify-between text-slate-300">
                <span>{copy.attackDamage}</span>
                <span className="font-mono-num">
                  {stats.attackDamageDealt} ({atkPct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${atkPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-slate-300">
                <span>{copy.poisonDamage}</span>
                <span className="font-mono-num">
                  {stats.poisonDamageDealt} ({psnPct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${psnPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-slate-300">
                <span>{copy.relicDamage}</span>
                <span className="font-mono-num">
                  {stats.relicDamageDealt} ({relPct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${relPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Shield className="h-4 w-4 text-sky-400" />
            <span>{copy.defenseStats}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-white/6 bg-[#10151f] p-3">
              <div className="text-slate-400">{copy.totalBlockGained}</div>
              <div className="mt-1 font-mono-num text-lg font-bold text-sky-300">
                {stats.blockGained}
              </div>
            </div>
            <div className="rounded-lg border border-white/6 bg-[#10151f] p-3">
              <div className="text-slate-400">{copy.damageBlocked}</div>
              <div className="mt-1 font-mono-num text-lg font-bold text-emerald-300">
                {stats.damageBlocked}
              </div>
            </div>
            <div className="rounded-lg border border-white/6 bg-[#10151f] p-3">
              <div className="text-slate-400">{copy.hpLost}</div>
              <div className="mt-1 font-mono-num text-lg font-bold text-rose-400">
                {stats.hpLost}
              </div>
            </div>
            <div className="rounded-lg border border-white/6 bg-[#10151f] p-3">
              <div className="flex items-center gap-1 text-slate-400">
                <Heart className="h-3 w-3 text-rose-400" />
                <span>{copy.hpHealed}</span>
              </div>
              <div className="mt-1 font-mono-num text-lg font-bold text-emerald-400">
                {stats.hpHealed}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/8 pt-2.5 text-xs">
            <span className="text-slate-400">{copy.blockEfficiency}</span>
            <span className="font-mono-num font-bold text-sky-300">{blockRate}%</span>
          </div>
        </div>
      </div>

      {/* Row 2: Top Damage Cards & Card Type Tempo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>{copy.topCards}</span>
          </div>

          {topCards.length === 0 ? (
            <p className="py-4 text-xs text-slate-500">{copy.noCardDamage}</p>
          ) : (
            <div className="space-y-2.5">
              {topCards.map((entry, idx) => {
                const localized = tCard(entry.defId, locale).name;
                const widthPct = Math.max(6, Math.round((entry.damage / topCardMax) * 100));
                return (
                  <div key={entry.defId} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">
                        <span className="mr-1.5 font-mono-num text-slate-500">#{idx + 1}</span>
                        {localized}
                      </span>
                      <span className="font-mono-num text-slate-300">
                        <strong className="text-amber-300">{entry.damage}</strong>{' '}
                        <span className="text-slate-500">
                          ({entry.plays} {copy.plays})
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-4">
          <div className="flex items-center justify-between text-sm font-bold text-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              <span>{copy.tempoDist}</span>
            </div>
            <span className="font-mono-num text-xs text-slate-400">
              {stats.cardsPlayed}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="rounded-lg border border-rose-500/25 bg-rose-950/30 p-3">
              <div className="text-rose-300">{copy.typeLabels.attack}</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-100">
                {stats.cardsByType.attack}
              </div>
              <div className="font-mono-num text-[11px] text-slate-400">
                {totalCardsTyped > 0
                  ? `${Math.round((stats.cardsByType.attack / totalCardsTyped) * 100)}%`
                  : '0%'}
              </div>
            </div>
            <div className="rounded-lg border border-sky-500/25 bg-sky-950/30 p-3">
              <div className="text-sky-300">{copy.typeLabels.skill}</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-100">
                {stats.cardsByType.skill}
              </div>
              <div className="font-mono-num text-[11px] text-slate-400">
                {totalCardsTyped > 0
                  ? `${Math.round((stats.cardsByType.skill / totalCardsTyped) * 100)}%`
                  : '0%'}
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/25 bg-amber-950/30 p-3">
              <div className="text-amber-300">{copy.typeLabels.power}</div>
              <div className="mt-1 font-mono-num text-xl font-bold text-slate-100">
                {stats.cardsByType.power}
              </div>
              <div className="font-mono-num text-[11px] text-slate-400">
                {totalCardsTyped > 0
                  ? `${Math.round((stats.cardsByType.power / totalCardsTyped) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/8 pt-2.5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Skull className="h-3.5 w-3.5 text-rose-400" />
              {locale === 'zh' ? '击败敌人 / 精英' : 'Enemies / Elites Slain'}
            </span>
            <span className="font-mono-num font-bold text-slate-200">
              {stats.enemiesDefeated} / {stats.elitesDefeated}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Floor Combat History */}
      <div className="rounded-xl border border-white/10 bg-[#161c26] p-5">
        <div className="mb-3 text-sm font-bold text-slate-100">{copy.floorLog}</div>
        {stats.combatHistory.length === 0 ? (
          <p className="text-xs text-slate-500">{copy.noCombatYet}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2 pr-4">{locale === 'zh' ? '楼层' : 'Floor'}</th>
                  <th className="py-2 pr-4">{locale === 'zh' ? '回合数' : 'Turns'}</th>
                  <th className="py-2 pr-4">{locale === 'zh' ? '造成伤害' : 'Damage'}</th>
                  <th className="py-2 pr-4">{locale === 'zh' ? '格挡抵消' : 'Blocked'}</th>
                  <th className="py-2">{locale === 'zh' ? '实际损血' : 'HP Lost'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono-num">
                {stats.combatHistory.map((row, idx) => (
                  <tr key={`${row.floor}_${idx}`} className="text-slate-200">
                    <td className="py-2 pr-4 font-bold text-amber-300">
                      {String(row.floor).padStart(2, '0')}F
                    </td>
                    <td className="py-2 pr-4">{row.turns}</td>
                    <td className="py-2 pr-4 text-rose-300">{row.damageDealt}</td>
                    <td className="py-2 pr-4 text-sky-300">{row.damageBlocked}</td>
                    <td className="py-2 text-slate-300">{row.damageTaken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

interface DamageStatsModalProps {
  state: RunState;
  locale: Locale;
  onClose: () => void;
}

export const DamageStatsModal: React.FC<DamageStatsModalProps> = ({
  state,
  locale,
  onClose,
}) => {
  const copy = UI_COPY[locale];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">
                {copy.statsTitle}
              </h3>
              <p className="text-xs text-slate-400">{copy.statsSub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#1a202c] text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <DamageStatsPanel state={state} locale={locale} />
        </div>
      </div>
    </div>
  );
};
