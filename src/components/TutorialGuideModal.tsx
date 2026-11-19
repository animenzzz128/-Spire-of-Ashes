import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Droplet,
  Flame,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import { Locale } from '../game/i18n';

interface TutorialGuideModalProps {
  locale: Locale;
  onClose: () => void;
  onComplete?: () => void;
}

export const TutorialGuideModal: React.FC<TutorialGuideModalProps> = ({
  locale,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState(0);

  // Interactive Step 2 state: Block defense drill
  const [drill2Energy, setDrill2Energy] = useState(3);
  const [drill2Block, setDrill2Block] = useState(0);
  const incomingAtk = 11;
  const drill2NetLoss = Math.max(0, incomingAtk - drill2Block);

  // Interactive Step 3 state: Armor Breaker + Strike Vulnerable combo
  const [drill3Energy, setDrill3Energy] = useState(3);
  const [drill3EnemyHp, setDrill3EnemyHp] = useState(17);
  const [drill3Vulnerable, setDrill3Vulnerable] = useState(0);
  const strikePreview = drill3Vulnerable > 0 ? Math.floor(6 * 1.5) : 6;

  const zh = locale === 'zh';

  const resetDrills = () => {
    setDrill2Energy(3);
    setDrill2Block(0);
    setDrill3Energy(3);
    setDrill3EnemyHp(17);
    setDrill3Vulnerable(0);
  };

  const steps = [
    {
      title: zh ? '第一步：洞察敌人意图' : 'Step 1: Read Enemy Intents',
      badge: zh ? '基础机制 1/5' : 'Basics 1/5',
      summary: zh
        ? '在你的回合开始时，每个敌人头顶都会清晰展示它下回合的行动意图。'
        : 'At the start of your turn, every enemy telegraphs what it will do on its next turn.',
      render: () => (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-500/35 bg-rose-950/25 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <Swords className="h-4 w-4" />
                <span className="font-mono-num">11 / 6×2</span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {zh
                  ? '剑图标代表即将发起攻击。数值已实时计入力量与虚弱修正；右下角会汇总敌方总攻伤害。'
                  : 'Sword icons show incoming attack damage (including Strength & Weak). Total incoming damage is summed near End Turn.'}
              </div>
            </div>
            <div className="rounded-xl border border-sky-500/35 bg-sky-950/25 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                <Shield className="h-4 w-4" />
                <span>{zh ? '防御 / 护甲' : 'Defend / Block'}</span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {zh
                  ? '敌人将获得护甲或蓄力；当敌人仅防御时，你可以放心倾泻所有能量输出或强化自身。'
                  : 'Enemy gains Block or buffs. When enemies are not attacking, spend your Energy aggressively.'}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Flame className="h-4 w-4" />
                <span>{zh ? '强化 / 负面状态' : 'Buffs & Debuffs'}</span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {zh
                  ? '敌人可能叠力量或向你的弃牌堆塞入灼伤/伤口等状态牌，需要尽早抢杀核心施法者。'
                  : 'Enemies may stack Strength or shuffle Status cards into your deck. Focus priority casters early.'}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200 leading-relaxed">
            {zh
              ? '实战技巧：点击手牌后再点击目标敌人即可出牌，也可以直接拖拽卡牌到敌人身上，或按键盘数字键 1–9 快速施放。'
              : 'Pro Tip: Play cards by clicking them, dragging directly onto an enemy, or pressing number keys 1–9.'}
          </div>
        </div>
      ),
    },
    {
      title: zh ? '第二步：能量与格挡演练（可交互）' : 'Step 2: Energy & Block Drill (Interactive)',
      badge: zh ? '实战演练 2/5' : 'Hands-On 2/5',
      summary: zh
        ? '敌人本回合将攻击造成 11 点伤害。尝试点击下方“铁壁防御”卡牌抵消伤害！'
        : 'The enemy intends to attack for 11 damage. Click Iron Defend below to stack Block!',
      render: () => (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0d1118] p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-mono-num font-extrabold">
                <Zap className="h-3.5 w-3.5" />
                <span>{drill2Energy}/3</span>
              </div>
              <div>
                <div className="text-xs text-slate-400">
                  {zh ? '当前格挡护盾' : 'Current Block'}
                </div>
                <div className="flex items-center gap-1.5 font-mono-num text-xl font-bold text-sky-300">
                  <Shield className="h-4 w-4" />
                  <span>{drill2Block}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">
                {zh ? '敌方来袭 11 · 预计掉血' : 'Incoming 11 · Net HP Loss'}
              </div>
              <div
                className={`font-mono-num text-xl font-extrabold ${
                  drill2NetLoss === 0 ? 'text-emerald-400' : drill2NetLoss <= 1 ? 'text-amber-300' : 'text-rose-400'
                }`}
              >
                {drill2NetLoss === 0 ? (zh ? '0（完全格挡）' : '0 (Blocked!)') : `-${drill2NetLoss} HP`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {[0, 1].map((idx) => (
              <button
                key={idx}
                type="button"
                disabled={drill2Energy < 1}
                onClick={() => {
                  if (drill2Energy >= 1) {
                    setDrill2Energy((e) => e - 1);
                    setDrill2Block((b) => b + 5);
                  }
                }}
                className="flex w-40 flex-col justify-between rounded-xl border border-sky-500/45 bg-[#161c26] p-3 text-left hover:border-sky-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-100">
                    {zh ? '铁壁防御' : 'Iron Defend'}
                  </span>
                  <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono-num text-xs font-bold text-slate-950">
                    1
                  </span>
                </div>
                <div className="my-3 flex justify-center">
                  <Shield className="h-6 w-6 text-sky-400" />
                </div>
                <div className="text-center text-xs text-slate-300">
                  {zh ? '获得 5 点格挡' : 'Gain 5 Block.'}
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setDrill2Energy(3);
                setDrill2Block(0);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{zh ? '重置演练' : 'Reset'}</span>
            </button>
          </div>

          {drill2Block >= 10 && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                {zh
                  ? '做得好！打出两张防御后只承受 1 点血量损失，保留余下 1 点能量还能用来反击。注意：常规格挡会在下回合开始时清零。'
                  : 'Well played! Two Defends reduce 11 damage down to 1 HP loss, leaving 1 Energy to strike back. Note: Block clears at the start of your next turn.'}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: zh ? '第三步：易伤破防与斩杀连击（可交互）' : 'Step 3: Vulnerable & Lethal Combo (Interactive)',
      badge: zh ? '伤害计算 3/5' : 'Combos 3/5',
      summary: zh
        ? '先用“破甲重击”施加易伤（攻击伤害提高 50%），再打打击即可刚好斩杀 17 血的敌人！'
        : 'Apply Vulnerable (+50% damage taken) with Armor Breaker first, then follow up with Iron Strike to defeat a 17 HP foe!',
      render: () => (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0d1118] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-mono-num font-extrabold">
                <Zap className="h-3.5 w-3.5" />
                <span>{drill3Energy}/3</span>
              </div>
              <div className="text-xs text-slate-300">
                {zh ? '建议出牌顺序：破甲重击 (2费) → 打击 (1费)' : 'Combo order: Armor Breaker (2) → Strike (1)'}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-slate-400">
                  {zh ? '训练木偶 HP' : 'Target Dummy HP'}
                </span>
                {drill3Vulnerable > 0 && (
                  <span className="rounded border border-orange-500/45 bg-orange-950/70 px-1.5 py-0.5 text-[11px] font-bold text-orange-300">
                    {zh ? `易伤 ${drill3Vulnerable}` : `Vulnerable ${drill3Vulnerable}`}
                  </span>
                )}
              </div>
              <div className="font-mono-num text-xl font-extrabold text-rose-400">
                {drill3EnemyHp} / 17
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              disabled={drill3Energy < 2 || drill3EnemyHp <= 0}
              onClick={() => {
                if (drill3Energy >= 2 && drill3EnemyHp > 0) {
                  setDrill3Energy((e) => e - 2);
                  setDrill3EnemyHp((hp) => Math.max(0, hp - 8));
                  setDrill3Vulnerable((v) => v + 2);
                }
              }}
              className="flex w-44 flex-col justify-between rounded-xl border border-rose-500/45 bg-[#161c26] p-3 text-left hover:border-rose-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-100">
                  {zh ? '破甲重击' : 'Armor Breaker'}
                </span>
                <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono-num text-xs font-bold text-slate-950">
                  2
                </span>
              </div>
              <div className="my-3 flex justify-center">
                <Swords className="h-6 w-6 text-rose-400" />
              </div>
              <div className="text-center text-xs text-slate-300">
                {zh ? '造成 8 点伤害，施加 2 层易伤。' : 'Deal 8 damage. Apply 2 Vulnerable.'}
              </div>
            </button>

            <button
              type="button"
              disabled={drill3Energy < 1 || drill3EnemyHp <= 0}
              onClick={() => {
                if (drill3Energy >= 1 && drill3EnemyHp > 0) {
                  setDrill3Energy((e) => e - 1);
                  setDrill3EnemyHp((hp) => Math.max(0, hp - strikePreview));
                }
              }}
              className="flex w-44 flex-col justify-between rounded-xl border border-rose-500/45 bg-[#161c26] p-3 text-left hover:border-rose-400 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-100">
                  {zh ? '铁拳打击' : 'Iron Strike'}
                </span>
                <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono-num text-xs font-bold text-slate-950">
                  1
                </span>
              </div>
              <div className="my-3 flex justify-center">
                <Swords className="h-6 w-6 text-rose-400" />
              </div>
              <div className="text-center text-xs text-slate-300">
                {zh ? '造成 ' : 'Deal '}
                <span className={drill3Vulnerable > 0 ? 'font-bold text-emerald-400' : 'font-bold text-white'}>
                  {strikePreview}
                </span>
                {zh ? ' 点伤害。' : ' damage.'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setDrill3Energy(3);
                setDrill3EnemyHp(17);
                setDrill3Vulnerable(0);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{zh ? '重置演练' : 'Reset'}</span>
            </button>
          </div>

          {drill3EnemyHp === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                {zh
                  ? '完美斩杀！(8 + 9 = 17)。战斗中当你悬停在卡牌上时，牌面数字会自动变绿提示加成并显示“斩杀”徽章！'
                  : 'Exact lethal! (8 + 9 = 17). During real combat, hovering over a card highlights boosted damage in green and marks lethal targets.'}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: zh ? '第四步：剧毒穿透、消耗与遗物协同' : 'Step 4: Poison, Exhaust & Relics',
      badge: zh ? '进阶系统 4/5' : 'Systems 4/5',
      summary: zh
        ? '高塔战局不仅靠直伤：剧毒可无视敌人高额护甲，强大一次性卡牌则会进入“消耗堆”。'
        : 'Master secondary mechanics: Poison bypasses Block, Exhaust removes single-combat cards cleanly, and Relics stack passive power.',
      render: () => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/35 bg-[#151c24] p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <Droplet className="h-4 w-4" />
              <span>{zh ? '剧毒穿透（无视格挡）' : 'Poison Bypasses Block'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {zh
                ? '中毒会在敌人回合开始时直接扣除生命值并随后层数减 1——即使敌人叠了 20 点护甲也无法挡住剧毒伤害！'
                : 'Poison triggers at the start of each enemy turn, bypassing Block completely before ticking down by 1.'}
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/35 bg-[#151c24] p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
              <Sparkles className="h-4 w-4" />
              <span>{zh ? '消耗 (Exhaust) 与 能力 (Power)' : 'Exhaust & Powers'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {zh
                ? '标有“消耗”的牌在本场战斗打出后移出循环（不永久丢失）；能力牌提供整场战斗生效的永久被动效果。'
                : 'Exhaust removes cards for the current fight only (they return next battle). Powers grant permanent combat buffs.'}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: zh ? '第五步：攀塔路线与牌组精简法则' : 'Step 5: Climbing the 15-Floor Spire',
      badge: zh ? '路线策略 5/5' : 'Strategy 5/5',
      summary: zh
        ? '在营火疗伤或锻造（+）升级、商人移除冗牌、第 8 层秘宝宝箱，最终迎战第 15 层黑曜守望者。'
        : 'Balance risky Elites for Relics, Campfire Smithing (+), Merchant card removal, and prepare for Floor 15 Obsidian Warden.',
      render: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-[#161c26] p-4 space-y-1.5">
              <div className="font-bold text-amber-300">{zh ? '1. 保持牌组精简' : '1. Keep Decks Lean'}</div>
              <p className="text-slate-300 leading-relaxed">
                {zh
                  ? '不必每次战斗后都拿牌！在商人处移除基础打击/防御，才能更快摸到核心输出与关键能力。'
                  : 'Skipping weak rewards is often stronger than bloating your deck. Remove starter cards at the Merchant.'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#161c26] p-4 space-y-1.5">
              <div className="font-bold text-orange-300">{zh ? '2. 营火升级预览' : '2. Campfire Smithing'}</div>
              <p className="text-slate-300 leading-relaxed">
                {zh
                  ? '血量健康时优先“锻造升级”。升级能减少高费牌消耗或显著提升关键倍增效果。'
                  : 'When HP is safe, Smith instead of resting. Upgrading lowers costs or boosts scaling dramatically.'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#161c26] p-4 space-y-1.5">
              <div className="font-bold text-rose-300">{zh ? '3. 备战黑曜守望者' : '3. Prepare for Floor 15'}</div>
              <p className="text-slate-300 leading-relaxed">
                {zh
                  ? '第 15 层首领血量降至 50% 后会觉醒强化并获得棘刺反伤，请保留药水与爆发牌收尾。'
                  : 'At 50% HP, the Floor 15 Boss awakens with Thorns & Strength. Save potions for Phase 2!'}
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Compass className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-[11px] font-medium text-amber-400">{current.badge}</div>
              <h3 className="font-display text-lg font-bold text-slate-100">
                {current.title}
              </h3>
            </div>
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

        {/* Step Progress Dots */}
        <div className="flex items-center gap-2 border-b border-white/8 bg-[#0e121a] px-6 py-2.5">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setStep(idx);
                resetDrills();
              }}
              className={`h-1.5 flex-1 rounded-full transition-colors cursor-pointer ${
                idx <= step ? 'bg-amber-400' : 'bg-slate-700 hover:bg-slate-600'
              }`}
              aria-label={`Step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <p className="text-sm leading-relaxed text-slate-300">{current.summary}</p>
          {current.render()}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-xl border border-white/12 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
          >
            {zh ? '上一步' : 'Previous'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                onComplete?.();
                onClose();
              } else {
                setStep((s) => s + 1);
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <span>{isLast ? (zh ? '完成引导' : 'Finish Tutorial') : zh ? '下一步' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
