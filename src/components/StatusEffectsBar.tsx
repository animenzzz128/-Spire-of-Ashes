import React from 'react';
import {
  AlertTriangle,
  Cloud,
  Cog,
  Crosshair,
  Crown,
  Droplet,
  Eye,
  Feather,
  Flame,
  FlaskConical,
  Lock,
  Moon,
  PauseCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Skull,
  Sparkles,
  Swords,
  TrendingDown,
  Wind,
  Zap,
} from 'lucide-react';
import { Locale } from '../game/i18n';
import { StatusMap } from '../game/types';

export interface StatusExtraFlags {
  enraged?: boolean;
  asleep?: boolean;
  phase2?: boolean;
  doubleDamageActive?: boolean;
}

interface StatusEffectsBarProps {
  statuses: StatusMap;
  block?: number;
  locale: Locale;
  extra?: StatusExtraFlags;
  className?: string;
}

interface StatusBadgeItem {
  id: string;
  category: 'buff' | 'debuff' | 'stance';
  label: string;
  value: string | number;
  icon: React.ReactNode;
  badgeTone: string;
  accentText: string;
  description: string;
}

function buildStatusItems(
  statuses: StatusMap,
  block: number,
  locale: Locale,
  extra?: StatusExtraFlags
): StatusBadgeItem[] {
  const zh = locale === 'zh';
  const items: StatusBadgeItem[] = [];

  if (block > 0) {
    const retained = statuses.barricade || statuses.blur > 0;
    items.push({
      id: 'block',
      category: 'buff',
      label: zh ? '格挡' : 'Block',
      value: block,
      icon: <Shield className="h-3.5 w-3.5 text-sky-300" />,
      badgeTone: 'border-sky-400/55 bg-sky-950/75 text-sky-200 hover:border-sky-300',
      accentText: 'text-sky-300',
      description: retained
        ? zh
          ? `抵消最多 ${block} 点来袭攻击伤害（当前受壁垒/残像效果保护，下回合保留）。`
          : `Absorbs up to ${block} incoming attack damage (retained next turn via Barricade/Blur).`
        : zh
        ? `抵消最多 ${block} 点来袭攻击伤害，通常在下回合开始时清零。`
        : `Absorbs up to ${block} incoming attack damage until the start of your next turn.`,
    });
  }

  if (extra?.phase2) {
    items.push({
      id: 'phase2',
      category: 'stance',
      label: zh ? '核心觉醒' : 'Awakened',
      value: 'P2',
      icon: <Crown className="h-3.5 w-3.5 text-amber-300" />,
      badgeTone: 'border-amber-400/60 bg-amber-950/80 text-amber-200 hover:border-amber-300',
      accentText: 'text-amber-300',
      description: zh
        ? '已进入二阶段超频形态（已获得力量 +2 与荆棘 +2，攻势更加猛烈）。'
        : 'Phase 2 Furnace Core Awakened (+2 Strength, +2 Thorns, intensified attack pattern).',
    });
  }

  if (extra?.enraged) {
    items.push({
      id: 'enraged',
      category: 'stance',
      label: zh ? '狂怒' : 'Enrage',
      value: '+2',
      icon: <Zap className="h-3.5 w-3.5 text-rose-300" />,
      badgeTone: 'border-rose-500/55 bg-rose-950/75 text-rose-200 hover:border-rose-400',
      accentText: 'text-rose-300',
      description: zh
        ? '你每打出 1 张技能牌，此敌人立刻获得 2 点力量。建议优先强攻速杀！'
        : 'Whenever you play a Skill card, this enemy gains +2 Strength. Prioritize Attacks!',
    });
  }

  if (extra?.asleep) {
    items.push({
      id: 'asleep',
      category: 'stance',
      label: zh ? '沉睡' : 'Asleep',
      value: 'Zzz',
      icon: <Moon className="h-3.5 w-3.5 text-indigo-300" />,
      badgeTone: 'border-indigo-400/50 bg-indigo-950/75 text-indigo-200 hover:border-indigo-300',
      accentText: 'text-indigo-300',
      description: zh
        ? '沉睡中保留高额护甲且不会主动攻击；受到生命值伤害后会立即苏醒。'
        : 'Retains Block and skips attacks while asleep; wakes immediately if HP damage is dealt.',
    });
  }

  if (extra?.doubleDamageActive || statuses.doubleDamageNextTurn) {
    items.push({
      id: 'double_dmg',
      category: 'buff',
      label: zh ? '幻影绝杀' : 'Double Dmg',
      value: '2×',
      icon: <Eye className="h-3.5 w-3.5 text-emerald-300" />,
      badgeTone: 'border-emerald-400/55 bg-emerald-950/75 text-emerald-200 hover:border-emerald-300',
      accentText: 'text-emerald-300',
      description: extra?.doubleDamageActive
        ? zh
          ? '本回合你的所有攻击牌造成的伤害翻倍（2×）。'
          : 'All your Attack cards deal 2× damage this turn.'
        : zh
        ? '下回合你的所有攻击牌造成的伤害将翻倍（2×）。'
        : 'Next turn, all of your Attack cards will deal 2× damage.',
    });
  }

  if (statuses.strength !== 0) {
    const neg = statuses.strength < 0;
    items.push({
      id: 'strength',
      category: neg ? 'debuff' : 'buff',
      label: zh ? '力量' : 'Strength',
      value: statuses.strength > 0 ? `+${statuses.strength}` : statuses.strength,
      icon: neg ? (
        <TrendingDown className="h-3.5 w-3.5 text-rose-300" />
      ) : (
        <Swords className="h-3.5 w-3.5 text-rose-300" />
      ),
      badgeTone: 'border-rose-500/45 bg-rose-950/65 text-rose-200 hover:border-rose-400',
      accentText: 'text-rose-300',
      description: zh
        ? `每次攻击每段伤害 ${statuses.strength > 0 ? '额外增加' : '减少'} ${Math.abs(statuses.strength)} 点（对多段攻击每段均生效）。`
        : `${statuses.strength > 0 ? 'Increases' : 'Reduces'} damage dealt per hit by ${Math.abs(statuses.strength)} (scales with multi-hit attacks).`,
    });
  }

  if (statuses.dexterity !== 0) {
    const neg = statuses.dexterity < 0;
    items.push({
      id: 'dexterity',
      category: neg ? 'debuff' : 'buff',
      label: zh ? '敏捷' : 'Dexterity',
      value: statuses.dexterity > 0 ? `+${statuses.dexterity}` : statuses.dexterity,
      icon: <Feather className="h-3.5 w-3.5 text-sky-300" />,
      badgeTone: 'border-sky-500/45 bg-sky-950/65 text-sky-200 hover:border-sky-400',
      accentText: 'text-sky-300',
      description: zh
        ? `每打出一张获得格挡的卡牌，额外 ${statuses.dexterity > 0 ? '增加' : '减少'} ${Math.abs(statuses.dexterity)} 点格挡。`
        : `${statuses.dexterity > 0 ? 'Increases' : 'Reduces'} Block gained from cards by ${Math.abs(statuses.dexterity)}.`,
    });
  }

  if (statuses.vulnerable > 0) {
    items.push({
      id: 'vulnerable',
      category: 'debuff',
      label: zh ? '易伤' : 'Vulnerable',
      value: statuses.vulnerable,
      icon: <Crosshair className="h-3.5 w-3.5 text-orange-300" />,
      badgeTone: 'border-orange-500/50 bg-orange-950/70 text-orange-200 hover:border-orange-400',
      accentText: 'text-orange-300',
      description: zh
        ? `受到的攻击伤害提高 50%（向下取整）。剩余 ${statuses.vulnerable} 回合，每回合结束减 1。`
        : `Takes 50% more damage from Attacks (rounded down). ${statuses.vulnerable} turn(s) remaining.`,
    });
  }

  if (statuses.weak > 0) {
    items.push({
      id: 'weak',
      category: 'debuff',
      label: zh ? '虚弱' : 'Weak',
      value: statuses.weak,
      icon: <TrendingDown className="h-3.5 w-3.5 text-amber-300" />,
      badgeTone: 'border-amber-500/45 bg-amber-950/65 text-amber-200 hover:border-amber-400',
      accentText: 'text-amber-300',
      description: zh
        ? `造成的攻击伤害降低 25%（向下取整）。剩余 ${statuses.weak} 回合，每回合结束减 1。`
        : `Deals 25% less damage with Attacks (rounded down). ${statuses.weak} turn(s) remaining.`,
    });
  }

  if (statuses.frail > 0) {
    items.push({
      id: 'frail',
      category: 'debuff',
      label: zh ? '脆弱' : 'Frail',
      value: statuses.frail,
      icon: <ShieldAlert className="h-3.5 w-3.5 text-purple-300" />,
      badgeTone: 'border-purple-500/50 bg-purple-950/70 text-purple-200 hover:border-purple-400',
      accentText: 'text-purple-300',
      description: zh
        ? `从卡牌获得的格挡降低 25%（向下取整）。剩余 ${statuses.frail} 回合，每回合结束减 1。`
        : `Block gained from cards is reduced by 25% (rounded down). ${statuses.frail} turn(s) remaining.`,
    });
  }

  if (statuses.poison > 0) {
    items.push({
      id: 'poison',
      category: 'debuff',
      label: zh ? '中毒' : 'Poison',
      value: statuses.poison,
      icon: <Droplet className="h-3.5 w-3.5 text-emerald-300" />,
      badgeTone: 'border-emerald-500/50 bg-emerald-950/70 text-emerald-200 hover:border-emerald-400',
      accentText: 'text-emerald-300',
      description: zh
        ? `回合开始时直接失去 ${statuses.poison} 点生命（完全无视格挡），随后层数减 1。`
        : `At turn start, loses ${statuses.poison} HP directly (ignores Block), then decreases by 1.`,
    });
  }

  if (statuses.metallicize > 0) {
    items.push({
      id: 'metallicize',
      category: 'buff',
      label: zh ? '金属化' : 'Metallicize',
      value: statuses.metallicize,
      icon: <Cog className="h-3.5 w-3.5 text-slate-200" />,
      badgeTone: 'border-slate-400/45 bg-slate-800/80 text-slate-200 hover:border-slate-300',
      accentText: 'text-slate-200',
      description: zh
        ? `每回合结束时自动获得 ${statuses.metallicize} 点格挡。`
        : `Automatically gains ${statuses.metallicize} Block at the end of every turn.`,
    });
  }

  if (statuses.ritual > 0) {
    items.push({
      id: 'ritual',
      category: 'buff',
      label: zh ? '仪式' : 'Ritual',
      value: statuses.ritual,
      icon: <Sparkles className="h-3.5 w-3.5 text-rose-300" />,
      badgeTone: 'border-rose-400/45 bg-rose-950/65 text-rose-200 hover:border-rose-300',
      accentText: 'text-rose-300',
      description: zh
        ? `每回合结束时永久获得 ${statuses.ritual} 点力量。`
        : `Gains ${statuses.ritual} Strength at the end of each turn.`,
    });
  }

  if (statuses.thorns > 0) {
    items.push({
      id: 'thorns',
      category: 'buff',
      label: zh ? '荆棘' : 'Thorns',
      value: statuses.thorns,
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />,
      badgeTone: 'border-amber-400/45 bg-amber-950/65 text-amber-200 hover:border-amber-300',
      accentText: 'text-amber-300',
      description: zh
        ? `每次受到直接攻击时，对攻击者反弹 ${statuses.thorns} 点伤害。`
        : `Whenever attacked, reflects ${statuses.thorns} damage back to the attacker.`,
    });
  }

  if (statuses.artifact > 0) {
    items.push({
      id: 'artifact',
      category: 'buff',
      label: zh ? '人工制品' : 'Artifact',
      value: statuses.artifact,
      icon: <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />,
      badgeTone: 'border-cyan-400/45 bg-cyan-950/65 text-cyan-200 hover:border-cyan-300',
      accentText: 'text-cyan-300',
      description: zh
        ? `免疫并抵消接下来的 ${statuses.artifact} 次负面状态效果（易伤、虚弱、脆弱或中毒）。`
        : `Negates the next ${statuses.artifact} debuff(s) applied (Vulnerable, Weak, Frail, or Poison).`,
    });
  }

  if (statuses.barricade) {
    items.push({
      id: 'barricade',
      category: 'buff',
      label: zh ? '壁垒' : 'Barricade',
      value: '∞',
      icon: <Lock className="h-3.5 w-3.5 text-sky-300" />,
      badgeTone: 'border-sky-400/55 bg-sky-950/75 text-sky-200 hover:border-sky-300',
      accentText: 'text-sky-300',
      description: zh
        ? '格挡不再在回合开始时清零，整场战斗持续保留护盾。'
        : 'Block is no longer lost at the start of your turn.',
    });
  }

  if (statuses.blur > 0) {
    items.push({
      id: 'blur',
      category: 'buff',
      label: zh ? '残像' : 'Blur',
      value: statuses.blur,
      icon: <Wind className="h-3.5 w-3.5 text-teal-300" />,
      badgeTone: 'border-teal-400/45 bg-teal-950/65 text-teal-200 hover:border-teal-300',
      accentText: 'text-teal-300',
      description: zh
        ? `在接下来的 ${statuses.blur} 个回合开始时保留当前未消耗的格挡。`
        : `Block is retained at the start of your next ${statuses.blur} turn(s).`,
    });
  }

  if (statuses.demonForm > 0) {
    items.push({
      id: 'demonForm',
      category: 'buff',
      label: zh ? '魔化' : 'Demon Form',
      value: `+${statuses.demonForm}`,
      icon: <Flame className="h-3.5 w-3.5 text-red-400" />,
      badgeTone: 'border-red-500/45 bg-red-950/70 text-red-200 hover:border-red-400',
      accentText: 'text-red-300',
      description: zh
        ? `每回合开始时获得 ${statuses.demonForm} 点力量。`
        : `Gain ${statuses.demonForm} Strength at the start of each turn.`,
    });
  }

  if (statuses.noxiousFumes > 0) {
    items.push({
      id: 'noxiousFumes',
      category: 'buff',
      label: zh ? '毒雾' : 'Noxious Fumes',
      value: statuses.noxiousFumes,
      icon: <Cloud className="h-3.5 w-3.5 text-emerald-300" />,
      badgeTone: 'border-emerald-500/45 bg-emerald-950/65 text-emerald-200 hover:border-emerald-400',
      accentText: 'text-emerald-300',
      description: zh
        ? `每回合开始时对所有敌人施加 ${statuses.noxiousFumes} 层中毒。`
        : `Applies ${statuses.noxiousFumes} Poison to ALL enemies at the start of each turn.`,
    });
  }

  if (statuses.envenom > 0) {
    items.push({
      id: 'envenom',
      category: 'buff',
      label: zh ? '涂毒' : 'Envenom',
      value: statuses.envenom,
      icon: <FlaskConical className="h-3.5 w-3.5 text-lime-300" />,
      badgeTone: 'border-lime-500/45 bg-lime-950/65 text-lime-200 hover:border-lime-400',
      accentText: 'text-lime-300',
      description: zh
        ? `每次攻击造成未被格挡的生命值伤害时，附加 ${statuses.envenom} 层中毒。`
        : `Whenever an Attack deals unblocked HP damage, apply ${statuses.envenom} Poison.`,
    });
  }

  if (statuses.corpseExplosion) {
    items.push({
      id: 'corpseExplosion',
      category: 'debuff',
      label: zh ? '尸爆' : 'Corpse Exp.',
      value: '!',
      icon: <Skull className="h-3.5 w-3.5 text-emerald-300" />,
      badgeTone: 'border-emerald-400/55 bg-emerald-950/75 text-emerald-200 hover:border-emerald-300',
      accentText: 'text-emerald-300',
      description: zh
        ? '此敌人阵亡时引发剧毒殉爆，对场上所有其余敌人造成等同其最大生命值的伤害！'
        : 'On death, deals damage equal to this enemy’s Max HP to ALL enemies!',
    });
  }

  if (statuses.noDrawThisTurn) {
    items.push({
      id: 'noDraw',
      category: 'debuff',
      label: zh ? '禁抽' : 'No Draw',
      value: '×',
      icon: <PauseCircle className="h-3.5 w-3.5 text-slate-300" />,
      badgeTone: 'border-slate-500/50 bg-slate-900/80 text-slate-300 hover:border-slate-400',
      accentText: 'text-slate-300',
      description: zh
        ? '本回合内无法再通过卡牌效果抽取新的手牌。'
        : 'You cannot draw any additional cards for the remainder of this turn.',
    });
  }

  return items;
}

export const StatusEffectsBar: React.FC<StatusEffectsBarProps> = ({
  statuses,
  block = 0,
  locale,
  extra,
  className = '',
}) => {
  const items = buildStatusItems(statuses, block, locale, extra);
  if (items.length === 0) return null;

  const zh = locale === 'zh';

  return (
    <div
      className={`mt-2 flex flex-wrap justify-center gap-1.5 ${className}`}
      aria-label={zh ? '当前状态效果' : 'Active Status Effects'}
    >
      {items.map((item) => {
        const categoryText =
          item.category === 'buff'
            ? zh
              ? '增益'
              : 'Buff'
            : item.category === 'debuff'
            ? zh
              ? '负面'
              : 'Debuff'
            : zh
            ? '特殊'
            : 'Trait';

        return (
          <div key={item.id} className="group/status relative">
            <div
              tabIndex={0}
              aria-label={`${item.label} ${item.value}: ${item.description}`}
              className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${item.badgeTone}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
              <span className="font-mono-num font-bold tabular-nums">{item.value}</span>
            </div>

            {/* Instant High-Contrast Floating Tooltip on Hover or Focus */}
            <div
              role="tooltip"
              className="pointer-events-none invisible opacity-0 group-hover/status:visible group-hover/status:opacity-100 group-focus-within/status:visible group-focus-within/status:opacity-100 absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-white/15 bg-[#0d121b]/98 p-2.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-md transition-opacity duration-150"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0">{item.icon}</span>
                  <span className={`text-xs font-bold ${item.accentText}`}>{item.label}</span>
                </div>
                <span className="font-mono-num text-[10px] font-semibold text-slate-400">
                  {categoryText} · {item.value}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
