import React, { useState } from 'react';
import { BookOpen, Keyboard, Layers, Shield, Swords, X } from 'lucide-react';
import { CARD_DEFS, createCardInstance } from '../game/cards';
import { Locale, UI_COPY } from '../game/i18n';
import { CardView } from './CardView';

interface GlossaryModalProps {
  locale: Locale;
  onClose: () => void;
}

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
  { term: '金属化 / 荆棘', desc: '金属化每回合自动获得格挡；荆棘在受到攻击时对攻击者反弹伤害。' },
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
  { term: 'Metallicize / Thorns', desc: 'Metallicize grants Block automatically each turn; Thorns deals damage back to attackers.' },
];

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ locale, onClose }) => {
  const [tab, setTab] = useState<'manual' | 'keywords' | 'ironwarden' | 'shadowweaver' | 'neutral'>('manual');
  const zh = locale === 'zh';
  const keywords = zh ? KEYWORDS_ZH : KEYWORDS_EN;

  const cards = Object.values(CARD_DEFS).filter((c) => {
    if (tab === 'ironwarden') return c.pool === 'ironwarden';
    if (tab === 'shadowweaver') return c.pool === 'shadowweaver';
    if (tab === 'neutral') return c.pool === 'neutral' || c.pool === 'status';
    return false;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-400" />
            <h3 className="font-display text-xl font-bold text-slate-100">
              {UI_COPY[locale].glossaryFull}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#0b0e14] p-1 border border-white/10">
            {[
              { id: 'manual', label: zh ? '操作说明' : 'Manual' },
              { id: 'keywords', label: zh ? '战斗词条' : 'Keywords' },
              { id: 'ironwarden', label: zh ? '赤铁卫士' : 'Ironwarden' },
              { id: 'shadowweaver', label: zh ? '暗影织者' : 'Shadowweaver' },
              { id: 'neutral', label: zh ? '中立与状态' : 'Neutral' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#1a202c] text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'manual' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <Keyboard className="h-4 w-4" />
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
                  <Swords className="h-4 w-4" />
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
                  <Shield className="h-4 w-4" />
                  <span>{zh ? '高塔节点与休整' : 'Spire Nodes & Rooms'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>• {zh ? '共 15 层高塔：包含战斗、精英（必掉遗物）、营火、事件、商人、第 8 层宝箱与塔顶首领。' : '15 Floors: Monsters, Elites (guaranteed Relic), Campfires, Events, Merchants, Floor 8 Chest & Summit Boss.'}</li>
                  <li>• {zh ? '顶部药水栏悬停可点击 × 丢弃冗余药水。' : 'Hover any Potion slot in HUD and click × to discard it.'}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#161c26] p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <Layers className="h-4 w-4" />
                  <span>{zh ? '伤害统计与自动存档' : 'Telemetry & Auto-Save'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>• {zh ? '点击顶部栏【伤害统计】可随时查看输出榜、剧毒占比与格挡吸收率。' : 'Open [Stats] in the top bar anytime for full damage & block analytics.'}</li>
                  <li>• {zh ? '每步操作自动保存至本地，下次打开可从主菜单【继续游戏】衔接进度。' : 'Your progress auto-saves locally and can be resumed via Continue on the Main Menu.'}</li>
                </ul>
              </div>
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
