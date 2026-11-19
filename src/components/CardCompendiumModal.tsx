import React, { useMemo, useState } from 'react';
import {
  ArrowUpCircle,
  BookMarked,
  CheckCircle2,
  Eye,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { CARD_DEFS, createCardInstance } from '../game/cards';
import { CARD_EN, Locale, UI_COPY, tCard } from '../game/i18n';
import { CardDef, CardPool, CardRarity, CardType } from '../game/types';
import { CardView } from './CardView';

interface CardCompendiumModalProps {
  locale: Locale;
  discoveredCardIds: string[];
  onClose: () => void;
}

export const CardCompendiumModal: React.FC<CardCompendiumModalProps> = ({
  locale,
  discoveredCardIds,
  onClose,
}) => {
  const [poolFilter, setPoolFilter] = useState<'all' | CardPool>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CardType>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | CardRarity>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewUpgraded, setPreviewUpgraded] = useState(false);
  const [discoveredOnly, setDiscoveredOnly] = useState(false);
  const [inspectedCard, setInspectedCard] = useState<CardDef | null>(null);

  const zh = locale === 'zh';
  const copy = UI_COPY[locale];
  const allCards = useMemo(() => Object.values(CARD_DEFS), []);
  const discoveredSet = useMemo(() => new Set(discoveredCardIds), [discoveredCardIds]);
  const discoveredCount = allCards.filter((c) => discoveredSet.has(c.id)).length;

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCards.filter((def) => {
      if (poolFilter !== 'all') {
        if (poolFilter === 'neutral') {
          if (def.pool !== 'neutral' && def.pool !== 'status') return false;
        } else if (def.pool !== poolFilter) {
          return false;
        }
      }
      if (typeFilter !== 'all') {
        if (typeFilter === 'status') {
          if (def.type !== 'status' && def.type !== 'curse') return false;
        } else if (def.type !== typeFilter) {
          return false;
        }
      }
      if (rarityFilter !== 'all' && def.rarity !== rarityFilter) return false;
      if (discoveredOnly && !discoveredSet.has(def.id)) return false;

      if (q) {
        const en = CARD_EN[def.id];
        const haystack = [
          def.name,
          def.description,
          def.upgradedDescription || '',
          en?.name || '',
          en?.desc || '',
          en?.upgDesc || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allCards, poolFilter, typeFilter, rarityFilter, discoveredOnly, discoveredSet, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-950/40">
              <BookMarked className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-slate-100">
                {zh ? '高塔卡牌图鉴' : 'Card Compendium'}
              </h3>
              <p className="text-xs text-slate-400">
                {zh
                  ? `全量收录 ${allCards.length} 张卡牌 · 已在攀登中遇见 ${discoveredCount} / ${allCards.length} 张`
                  : `${allCards.length} Total Cards · Discovered ${discoveredCount} / ${allCards.length}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={zh ? '搜索卡名 / 效果 / 词条...' : 'Search card, keyword...'}
                className="w-52 rounded-lg border border-white/12 bg-[#0b0e14] py-1.5 pr-3 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
              />
            </div>

            {/* Global Upgrade(+) Toggle */}
            <button
              type="button"
              onClick={() => setPreviewUpgraded((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                previewUpgraded
                  ? 'border-emerald-400/60 bg-emerald-950/60 text-emerald-300'
                  : 'border-white/12 bg-[#161c26] text-slate-300 hover:border-emerald-400/40'
              }`}
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
              <span>{zh ? '预览升级版 (+)' : 'Show Upgraded (+)'}</span>
            </button>

            {/* Discovered Filter Toggle */}
            <button
              type="button"
              onClick={() => setDiscoveredOnly((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                discoveredOnly
                  ? 'border-sky-400/60 bg-sky-950/60 text-sky-200'
                  : 'border-white/12 bg-[#161c26] text-slate-300 hover:border-sky-400/40'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{zh ? '仅已收录' : 'Discovered'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#1a202c] text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar: Pool + Type + Rarity */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-[#0e121a] px-6 py-3">
          {/* Pool Filter */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#0b0e14] p-1">
            {[
              { id: 'all', label: zh ? '全部职业' : 'All Classes' },
              { id: 'ironwarden', label: zh ? '赤铁卫士' : 'Ironwarden' },
              { id: 'shadowweaver', label: zh ? '暗影织者' : 'Shadowweaver' },
              { id: 'neutral', label: zh ? '中立与状态' : 'Neutral & Status' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPoolFilter(item.id as typeof poolFilter)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  poolFilter === item.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              aria-label={zh ? '卡牌类型筛选' : 'Filter by card type'}
              className="rounded-lg border border-white/12 bg-[#141923] px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400/60 focus:outline-none cursor-pointer"
            >
              <option value="all">{zh ? '全部类型' : 'All Types'}</option>
              <option value="attack">{copy.typeLabels.attack}</option>
              <option value="skill">{copy.typeLabels.skill}</option>
              <option value="power">{copy.typeLabels.power}</option>
              <option value="status">
                {zh ? '状态 / 诅咒' : 'Status / Curse'}
              </option>
            </select>

            {/* Rarity Filter */}
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as typeof rarityFilter)}
              aria-label={zh ? '稀有度筛选' : 'Filter by rarity'}
              className="rounded-lg border border-white/12 bg-[#141923] px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400/60 focus:outline-none cursor-pointer"
            >
              <option value="all">{zh ? '全部稀有度' : 'All Rarities'}</option>
              <option value="starter">{copy.rarityLabels.starter}</option>
              <option value="common">{copy.rarityLabels.common}</option>
              <option value="uncommon">{copy.rarityLabels.uncommon}</option>
              <option value="rare">{copy.rarityLabels.rare}</option>
              <option value="special">{copy.rarityLabels.special}</option>
            </select>

            <span className="font-mono-num text-xs text-slate-400 pl-1">
              {filteredCards.length} {zh ? '张匹配' : 'shown'}
            </span>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredCards.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              {zh ? '未找到符合筛选条件的卡牌。' : 'No cards match your current filters.'}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {filteredCards.map((def) => {
                const isDiscovered = discoveredSet.has(def.id);
                return (
                  <div key={def.id} className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <CardView
                        card={createCardInstance(def.id, previewUpgraded)}
                        locale={locale}
                        compact
                        onClick={() => setInspectedCard(def)}
                      />
                      {isDiscovered && (
                        <span
                          title={zh ? '已在爬塔中收录' : 'Discovered in runs'}
                          className="pointer-events-none absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-950 text-emerald-300 shadow"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Side-by-Side Card Detail Inspector */}
      {inspectedCard && (
        <div
          onClick={() => setInspectedCard(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-amber-400/40 bg-[#121722] p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{copy.typeLabels[inspectedCard.type]}</span>
                  <span>·</span>
                  <span>{copy.rarityLabels[inspectedCard.rarity]}</span>
                  <span>·</span>
                  <span className={discoveredSet.has(inspectedCard.id) ? 'text-emerald-300' : 'text-slate-500'}>
                    {discoveredSet.has(inspectedCard.id)
                      ? zh
                        ? '已收录'
                        : 'Discovered'
                      : zh
                      ? '未曾在实战中获取'
                      : 'Not yet drafted'}
                  </span>
                </div>
                <h4 className="mt-1 font-display text-xl font-bold text-slate-50">
                  {tCard(inspectedCard.id, locale).name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectedCard(null)}
                aria-label={copy.close}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-[#1a202c] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  {zh ? '基础形态' : 'Base Card'}
                </span>
                <CardView card={createCardInstance(inspectedCard.id, false)} locale={locale} />
              </div>

              {inspectedCard.type !== 'status' && inspectedCard.type !== 'curse' ? (
                <>
                  <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 rotate-90 sm:rotate-0" />
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-300">
                      {zh ? '锻造升级 (+)' : 'Upgraded (+)'}
                    </span>
                    <CardView card={createCardInstance(inspectedCard.id, true)} locale={locale} />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
