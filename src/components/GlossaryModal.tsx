import React, { useState } from 'react';
import {
  BookOpen,
  Bomb,
  Cloud,
  Droplets,
  Feather,
  Flame,
  Ghost,
  Keyboard,
  Layers,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Skull,
  Sparkles,
  Swords,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react';
import { CARD_DEFS, createCardInstance } from '../game/cards';
import { Locale, UI_COPY } from '../game/i18n';
import { CardView } from './CardView';

interface GlossaryModalProps {
  locale: Locale;
  onClose: () => void;
}

interface StatusEffectEntry {
  id: string;
  category: 'buff' | 'debuff';
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  iconTone: string;
  tagTone: string;
  sampleValue: string;
  zh: {
    name: string;
    tagLabel: string;
    behavior: string;
    desc: string;
  };
  en: {
    name: string;
    tagLabel: string;
    behavior: string;
    desc: string;
  };
}

const STATUS_EFFECTS: StatusEffectEntry[] = [
  // Buffs
  {
    id: 'strength',
    category: 'buff',
    icon: Swords,
    iconTone: 'text-rose-300 border-rose-500/35 bg-rose-950/50',
    tagTone: 'text-rose-300 border-rose-500/35 bg-rose-950/60',
    sampleValue: '+2',
    zh: {
      name: '力量 (Strength)',
      tagLabel: '力量',
      behavior: '可叠加 · 持续整场战斗',
      desc: '每层使你的攻击牌每段伤害额外提高 1 点（受多倍力量加成的卡牌按倍率计算）；负值会等量降低攻击伤害。',
    },
    en: {
      name: 'Strength',
      tagLabel: 'Strength',
      behavior: 'Stackable · Permanent',
      desc: 'Increases every Attack hit by +1 damage per stack (scaled further by multiplier attacks). Negative stacks reduce Attack damage.',
    },
  },
  {
    id: 'dexterity',
    category: 'buff',
    icon: Feather,
    iconTone: 'text-sky-300 border-sky-500/35 bg-sky-950/50',
    tagTone: 'text-sky-300 border-sky-500/35 bg-sky-950/60',
    sampleValue: '+2',
    zh: {
      name: '敏捷 (Dexterity)',
      tagLabel: '敏捷',
      behavior: '可叠加 · 持续整场战斗',
      desc: '每层使你从卡牌获得的格挡额外增加 1 点。不加成遗物、铁肤等非卡牌来源的格挡。',
    },
    en: {
      name: 'Dexterity',
      tagLabel: 'Dexterity',
      behavior: 'Stackable · Permanent',
      desc: 'Increases Block gained from cards by +1 per stack. Does not affect Block gained from relics or passive effects like Ironhide.',
    },
  },
  {
    id: 'ironhide',
    category: 'buff',
    icon: Shield,
    iconTone: 'text-slate-200 border-slate-400/40 bg-slate-800/60',
    tagTone: 'text-slate-200 border-slate-400/40 bg-slate-800/70',
    sampleValue: '3',
    zh: {
      name: '铁肤 (Ironhide)',
      tagLabel: '铁肤',
      behavior: '可叠加 · 每回合触发',
      desc: '你的回合结束时自动获得等同层数的格挡（敌人拥有铁肤时在敌方回合开始时获得格挡）。',
    },
    en: {
      name: 'Ironhide',
      tagLabel: 'Ironhide',
      behavior: 'Stackable · Every turn',
      desc: 'Automatically grants Block equal to its stacks at the end of your turn (enemies gain it at the start of their turn).',
    },
  },
  {
    id: 'artifact',
    category: 'buff',
    icon: ShieldCheck,
    iconTone: 'text-cyan-200 border-cyan-400/40 bg-cyan-950/50',
    tagTone: 'text-cyan-200 border-cyan-400/40 bg-cyan-950/60',
    sampleValue: '1',
    zh: {
      name: '人工制品 (Artifact)',
      tagLabel: '人工制品',
      behavior: '可叠加 · 抵消后消耗 1 层',
      desc: '完全抵消下一次被施加的负面状态（易伤、虚弱、脆弱或中毒），并消耗 1 层人工制品。',
    },
    en: {
      name: 'Artifact',
      tagLabel: 'Artifact',
      behavior: 'Stackable · Consumed on block',
      desc: 'Negates the next debuff applied (Vulnerable, Weak, Frail, or Poison) and consumes 1 stack of Artifact.',
    },
  },
  {
    id: 'thorns',
    category: 'buff',
    icon: Zap,
    iconTone: 'text-amber-200 border-amber-400/40 bg-amber-950/50',
    tagTone: 'text-amber-200 border-amber-400/40 bg-amber-950/60',
    sampleValue: '3',
    zh: {
      name: '荆棘 (Thorns)',
      tagLabel: '荆棘',
      behavior: '可叠加 · 受击反伤',
      desc: '每次受到攻击伤害（即使被格挡）时，对攻击者反弹等同层数的伤害。多段攻击每段均会触发。',
    },
    en: {
      name: 'Thorns',
      tagLabel: 'Thorns',
      behavior: 'Stackable · On hit',
      desc: 'Whenever hit by an Attack (even if fully blocked), reflects damage equal to its stacks back to the attacker on each hit.',
    },
  },
  {
    id: 'bastion',
    category: 'buff',
    icon: Lock,
    iconTone: 'text-sky-200 border-sky-400/50 bg-sky-950/60',
    tagTone: 'text-sky-200 border-sky-400/50 bg-sky-950/70',
    sampleValue: '∞',
    zh: {
      name: '堡垒 (Bastion)',
      tagLabel: '堡垒',
      behavior: '永久生效 · 持续整场战斗',
      desc: '格挡不再在回合开始时清零，可跨回合持续累积护盾以配合盾击或抵御高额爆发。',
    },
    en: {
      name: 'Bastion',
      tagLabel: 'Bastion',
      behavior: 'Permanent · Entire combat',
      desc: 'Block is no longer removed at the start of your turn, allowing you to carry and stack armor across turns.',
    },
  },
  {
    id: 'shade',
    category: 'buff',
    icon: Ghost,
    iconTone: 'text-teal-200 border-teal-400/40 bg-teal-950/50',
    tagTone: 'text-teal-200 border-teal-400/40 bg-teal-950/60',
    sampleValue: '1',
    zh: {
      name: '幽影 (Shade)',
      tagLabel: '幽影',
      behavior: '可叠加 · 每回合递减 1 层',
      desc: '在下回合开始时保留当前剩余格挡，随后幽影层数减少 1 层。',
    },
    en: {
      name: 'Shade',
      tagLabel: 'Shade',
      behavior: 'Stackable · Decays 1/turn',
      desc: 'Retains your current Block into the start of your next turn, then decreases by 1 stack.',
    },
  },
  {
    id: 'infernal',
    category: 'buff',
    icon: Flame,
    iconTone: 'text-red-300 border-red-500/40 bg-red-950/50',
    tagTone: 'text-red-300 border-red-500/40 bg-red-950/60',
    sampleValue: '+2',
    zh: {
      name: '炼狱 (Infernal)',
      tagLabel: '炼狱',
      behavior: '可叠加 · 每回合开始触发',
      desc: '每个己方回合开始时获得等同层数的力量，适合长线战斗持续滚雪球提升爆发。',
    },
    en: {
      name: 'Infernal',
      tagLabel: 'Infernal',
      behavior: 'Stackable · Start of turn',
      desc: 'Grants Strength equal to its stacks at the start of each of your turns, steadily scaling your Attack output.',
    },
  },
  {
    id: 'miasma',
    category: 'buff',
    icon: Cloud,
    iconTone: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/50',
    tagTone: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60',
    sampleValue: '2',
    zh: {
      name: '瘴气 (Miasma)',
      tagLabel: '瘴气',
      behavior: '可叠加 · 每回合开始触发',
      desc: '每个己方回合开始时对所有敌人施加等同层数的中毒（也可逐层剥除敌人的人工制品）。',
    },
    en: {
      name: 'Miasma',
      tagLabel: 'Miasma',
      behavior: 'Stackable · Start of turn',
      desc: 'Applies Poison equal to its stacks to ALL enemies at the start of your turn (also strips enemy Artifact charges).',
    },
  },
  {
    id: 'venom_edge',
    category: 'buff',
    icon: Droplets,
    iconTone: 'text-lime-300 border-lime-500/40 bg-lime-950/50',
    tagTone: 'text-lime-300 border-lime-500/40 bg-lime-950/60',
    sampleValue: '1',
    zh: {
      name: '蛇毒 (Venom Edge)',
      tagLabel: '蛇毒',
      behavior: '可叠加 · 未格挡命中触发',
      desc: '每当你的攻击牌造成未被格挡的生命伤害时，向目标额外施加等同层数的中毒。',
    },
    en: {
      name: 'Venom Edge',
      tagLabel: 'Venom Edge',
      behavior: 'Stackable · Unblocked hits',
      desc: 'Whenever an Attack deals unblocked HP damage, applies Poison equal to its stacks to that target.',
    },
  },
  {
    id: 'zeal',
    category: 'buff',
    icon: Sparkles,
    iconTone: 'text-rose-300 border-rose-400/40 bg-rose-950/50',
    tagTone: 'text-rose-300 border-rose-400/40 bg-rose-950/60',
    sampleValue: '3',
    zh: {
      name: '狂热 (Zeal)',
      tagLabel: '狂热',
      behavior: '敌方增益 · 每回合结束触发',
      desc: '敌人每个回合结束时获得等同层数的力量。拖得越久威胁越高，建议优先击杀。',
    },
    en: {
      name: 'Zeal',
      tagLabel: 'Zeal',
      behavior: 'Enemy buff · End of turn',
      desc: 'Enemy gains Strength equal to its stacks at the end of every turn. Prioritize eliminating Zeal enemies quickly.',
    },
  },
  // Debuffs
  {
    id: 'vulnerable',
    category: 'debuff',
    icon: ShieldAlert,
    iconTone: 'text-orange-300 border-orange-500/40 bg-orange-950/50',
    tagTone: 'text-orange-300 border-orange-500/40 bg-orange-950/60',
    sampleValue: '2',
    zh: {
      name: '易伤 (Vulnerable)',
      tagLabel: '易伤',
      behavior: '负面状态 · 每回合递减 1 层',
      desc: '目标受到的攻击伤害提高 50%（向下取整）。每回合结束时层数减 1；不加成中毒或荆棘伤害。',
    },
    en: {
      name: 'Vulnerable',
      tagLabel: 'Vulnerable',
      behavior: 'Debuff · Decays 1/turn',
      desc: 'Target takes 50% more damage from Attacks (rounded down). Decreases by 1 stack each turn; does not affect Poison or Thorns.',
    },
  },
  {
    id: 'weak',
    category: 'debuff',
    icon: TrendingDown,
    iconTone: 'text-amber-300 border-amber-500/40 bg-amber-950/50',
    tagTone: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
    sampleValue: '2',
    zh: {
      name: '虚弱 (Weak)',
      tagLabel: '虚弱',
      behavior: '负面状态 · 每回合递减 1 层',
      desc: '目标造成的攻击伤害降低 25%（向下取整）。每回合结束时层数减 1，是削减敌方重击的关键手段。',
    },
    en: {
      name: 'Weak',
      tagLabel: 'Weak',
      behavior: 'Debuff · Decays 1/turn',
      desc: 'Target deals 25% less damage with Attacks (rounded down). Decreases by 1 stack each turn—vital for mitigating heavy enemy hits.',
    },
  },
  {
    id: 'frail',
    category: 'debuff',
    icon: ShieldOff,
    iconTone: 'text-purple-300 border-purple-500/40 bg-purple-950/50',
    tagTone: 'text-purple-300 border-purple-500/40 bg-purple-950/60',
    sampleValue: '2',
    zh: {
      name: '脆弱 (Frail)',
      tagLabel: '脆弱',
      behavior: '负面状态 · 每回合递减 1 层',
      desc: '从卡牌获得的格挡降低 25%（向下取整）。每回合结束时层数减 1；不影响遗物或铁肤提供的格挡。',
    },
    en: {
      name: 'Frail',
      tagLabel: 'Frail',
      behavior: 'Debuff · Decays 1/turn',
      desc: 'Block gained from cards is reduced by 25% (rounded down). Decreases by 1 stack each turn; passive Block is unaffected.',
    },
  },
  {
    id: 'poison',
    category: 'debuff',
    icon: Skull,
    iconTone: 'text-emerald-300 border-emerald-500/45 bg-emerald-950/50',
    tagTone: 'text-emerald-300 border-emerald-500/45 bg-emerald-950/60',
    sampleValue: '5',
    zh: {
      name: '中毒 (Poison)',
      tagLabel: '中毒',
      behavior: '负面状态 · 无视格挡 · 每回合递减 1 层',
      desc: '敌人回合开始时失去等同中毒层数的生命值（无视格挡），随后层数减 1。可通过催化类卡牌成倍放大。',
    },
    en: {
      name: 'Poison',
      tagLabel: 'Poison',
      behavior: 'Debuff · Ignores Block · Decays 1/turn',
      desc: 'At the start of the enemy turn, loses HP equal to Poison stacks (bypassing Block), then decreases by 1 stack.',
    },
  },
  {
    id: 'rotburst',
    category: 'debuff',
    icon: Bomb,
    iconTone: 'text-emerald-200 border-emerald-400/50 bg-emerald-950/60',
    tagTone: 'text-emerald-200 border-emerald-400/50 bg-emerald-950/70',
    sampleValue: '!',
    zh: {
      name: '腐爆 (Rotburst)',
      tagLabel: '腐爆',
      behavior: '死亡触发 · 持续至目标死亡',
      desc: '被标记的敌人死亡时引发连锁剧爆，对场上所有剩余敌人造成等同于其最大生命值的伤害。',
    },
    en: {
      name: 'Rotburst',
      tagLabel: 'Rotburst',
      behavior: 'On death · Lasts until slain',
      desc: 'When the marked enemy dies, deals damage equal to its Max HP to ALL remaining enemies on the field.',
    },
  },
];

const KEYWORDS_ZH = [
  { term: '格挡 (Block)', desc: '抵消即将受到的攻击伤害。通常在你的下回合开始时清零。' },
  { term: '力量 (Strength)', desc: '每层使你的所有攻击牌每段额外造成 1 点伤害。' },
  { term: '敏捷 (Dexterity)', desc: '每层使你的所有格挡卡牌额外获得 1 点格挡。' },
  { term: '易伤 (Vulnerable)', desc: '目标受到的攻击伤害提高 50%（向下取整），每回合减少 1 层。' },
  { term: '虚弱 (Weak)', desc: '目标造成的攻击伤害降低 25%（向下取整），每回合减少 1 层。' },
  { term: '脆弱 (Frail)', desc: '从卡牌获得的格挡降低 25%（向下取整），每回合减少 1 层。' },
  { term: '中毒 (Poison)', desc: '敌人回合开始时失去等同中毒层数的生命（无视格挡），随后中毒层数减 1。' },
  { term: '人工制品 (Artifact)', desc: '抵消下一次被施加的负面状态（易伤、虚弱、脆弱或中毒）。' },
  { term: '消耗 (Exhaust)', desc: '打出后进入消耗堆，本场战斗内不再回到抽牌堆或弃牌堆。' },
  { term: '铁肤 / 荆棘', desc: '铁肤每回合自动获得格挡；荆棘在受到攻击时对攻击者反弹伤害。' },
];

const KEYWORDS_EN = [
  { term: 'Block', desc: 'Absorbs incoming attack damage until the start of your next turn.' },
  { term: 'Strength', desc: 'Increases each hit of your Attack cards by +1 damage per stack.' },
  { term: 'Dexterity', desc: 'Increases Block gained from Skill cards by +1 per stack.' },
  { term: 'Vulnerable', desc: 'Target takes 50% more damage from Attacks (rounded down). Decays by 1 each turn.' },
  { term: 'Weak', desc: 'Target deals 25% less damage with Attacks (rounded down). Decays by 1 each turn.' },
  { term: 'Frail', desc: 'Block gained from cards is reduced by 25% (rounded down). Decays by 1 each turn.' },
  { term: 'Poison', desc: 'At the start of enemy turn, loses HP equal to Poison (ignores Block), then decrements by 1.' },
  { term: 'Artifact', desc: 'Negates the next debuff applied (Vulnerable, Weak, Frail, or Poison).' },
  { term: 'Exhaust', desc: 'Removed from rotation until the end of the current combat (not permanently lost).' },
  { term: 'Ironhide / Thorns', desc: 'Ironhide grants Block automatically each turn; Thorns deals damage back to attackers.' },
];

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ locale, onClose }) => {
  const [tab, setTab] = useState<'manual' | 'status' | 'keywords' | 'ironwarden' | 'shadowweaver' | 'neutral'>('manual');
  const zh = locale === 'zh';
  const keywords = zh ? KEYWORDS_ZH : KEYWORDS_EN;
  const buffs = STATUS_EFFECTS.filter((s) => s.category === 'buff');
  const debuffs = STATUS_EFFECTS.filter((s) => s.category === 'debuff');

  const cards = Object.values(CARD_DEFS).filter((c) => {
    if (tab === 'ironwarden') return c.pool === 'ironwarden';
    if (tab === 'shadowweaver') return c.pool === 'shadowweaver';
    if (tab === 'neutral') return c.pool === 'neutral' || c.pool === 'status';
    return false;
  });

  const renderStatusCard = (entry: StatusEffectEntry) => {
    const Icon = entry.icon;
    const copy = zh ? entry.zh : entry.en;
    return (
      <div
        key={entry.id}
        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#161c26] p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${entry.iconTone}`}
            >
              <Icon className="h-4 w-4" aria-hidden={true} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-100 leading-snug">{copy.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{copy.behavior}</div>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${entry.tagTone}`}
            title={zh ? '战斗中显示的状态标识' : 'In-combat status badge preview'}
          >
            <span>{copy.tagLabel}</span>
            <span className="font-mono-num font-bold">{entry.sampleValue}</span>
          </span>
        </div>

        <p className="text-xs leading-relaxed text-slate-300">{copy.desc}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-400" aria-hidden={true} />
            <h3 className="font-display text-xl font-bold text-slate-100">
              {UI_COPY[locale].glossaryFull}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#0b0e14] p-1 border border-white/10">
            {[
              { id: 'manual', label: zh ? '操作说明' : 'Manual' },
              { id: 'status', label: zh ? '状态效果' : 'Status Effects' },
              { id: 'keywords', label: zh ? '战斗词条' : 'Keywords' },
              { id: 'ironwarden', label: zh ? '赤铁卫士' : 'Ironwarden' },
              { id: 'shadowweaver', label: zh ? '暗影织者' : 'Shadowweaver' },
              { id: 'neutral', label: zh ? '中立与状态' : 'Neutral' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
                  tab === item.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={UI_COPY[locale].close}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#1a202c] text-slate-300 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
          >
            <X className="h-4 w-4" aria-hidden={true} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'manual' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <Keyboard className="h-4 w-4" aria-hidden={true} />
                  <span>{zh ? '快捷键与拖拽操作' : 'Controls & Shortcuts'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>• {zh ? '数字键 1–9：快速打出或选中对应手牌。' : 'Keys 1–9: Quick-play or select cards in hand.'}</li>
                  <li>• {zh ? '拖拽出牌：直接把卡牌拖向敌人或战场上空释放。' : 'Drag & Drop: Drag any card onto a target enemy or arena.'}</li>
                  <li>• {zh ? 'E / 空格键：立即结束当前回合。' : 'E / Space: End your current turn.'}</li>
                  <li>• {zh ? 'Esc：取消已选中的单目标卡牌或药水。' : 'Esc: Cancel card or potion targeting.'}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-rose-300">
                  <Swords className="h-4 w-4" aria-hidden={true} />
                  <span>{zh ? '回合流程与伤害预览' : 'Turn Flow & Previews'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>• {zh ? '敌人头顶实时展示下一回合动作与真实伤害。' : 'Enemy overhead intents show next-turn damage & buffs.'}</li>
                  <li>• {zh ? '悬停卡牌时，受力量/易伤增强的数值呈绿色，虚弱/脆弱呈红色。' : 'Card numbers turn green when boosted and red when weakened.'}</li>
                  <li>• {zh ? '能击杀目标时，敌人头顶会标注【斩杀】提示。' : 'Targets within lethal range display a [LETHAL] badge.'}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-sky-300">
                  <Shield className="h-4 w-4" aria-hidden={true} />
                  <span>{zh ? '高塔节点与休整' : 'Spire Nodes & Rooms'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>• {zh ? '共 15 层高塔：包含战斗、精英（必掉遗物）、营火、事件、商人、第 8 层宝箱与塔顶首领。' : '15 Floors: Monsters, Elites (guaranteed Relic), Campfires, Events, Merchants, Floor 8 Chest & Summit Boss.'}</li>
                  <li>• {zh ? '顶部药水栏悬停可点击 × 丢弃冗余药水。' : 'Hover any Potion slot in HUD and click × to discard it.'}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <Layers className="h-4 w-4" aria-hidden={true} />
                  <span>{zh ? '伤害统计与自动存档' : 'Telemetry & Auto-Save'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>• {zh ? '点击顶部栏【伤害统计】可随时查看输出榜、剧毒占比与格挡吸收率。' : 'Open [Stats] in the top bar anytime for full damage & block analytics.'}</li>
                  <li>• {zh ? '每步操作自动保存至本地，下次打开可从主菜单【继续游戏】衔接进度。' : 'Your progress auto-saves locally and can be resumed via Continue on the Main Menu.'}</li>
                </ul>
              </div>
            </div>
          ) : tab === 'status' ? (
            <div className="space-y-7">
              <p className="text-xs leading-relaxed text-slate-400">
                {zh
                  ? '战斗中所有生效的状态会以彩色标签显示在角色与敌人生命条下方。增益效果提供伤害、格挡或回合触发加成；负面效果会削弱目标或造成持续流失，且可被【人工制品】抵消。'
                  : 'Active combat effects appear as color-coded tags beneath hero and enemy health bars. Buffs strengthen attacks, Block, or per-turn triggers; Debuffs hinder targets or drain HP and can be negated by Artifact.'}
              </p>

              <section className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" aria-hidden={true} />
                    <h4 className="font-display text-sm font-bold tracking-wide text-slate-100">
                      {zh ? '增益效果 (Buffs)' : 'Buffs'}
                    </h4>
                  </div>
                  <span className="font-mono-num text-xs text-slate-400">
                    {zh ? `${buffs.length} 项` : `${buffs.length} effects`}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {buffs.map(renderStatusCard)}
                </div>
              </section>

              <section className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Skull className="h-4 w-4 text-rose-400" aria-hidden={true} />
                    <h4 className="font-display text-sm font-bold tracking-wide text-slate-100">
                      {zh ? '负面效果 (Debuffs)' : 'Debuffs'}
                    </h4>
                  </div>
                  <span className="font-mono-num text-xs text-slate-400">
                    {zh ? `${debuffs.length} 项` : `${debuffs.length} effects`}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {debuffs.map(renderStatusCard)}
                </div>
              </section>
            </div>
          ) : tab === 'keywords' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {keywords.map((kw) => (
                <div
                  key={kw.term}
                  className="rounded-xl border border-white/10 bg-[#161c26] p-4"
                >
                  <div className="text-sm font-bold text-amber-300">{kw.term}</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{kw.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {cards.map((def) => (
                <CardView
                  key={def.id}
                  card={createCardInstance(def.id, false)}
                  locale={locale}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

