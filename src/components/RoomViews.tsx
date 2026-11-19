import React, { useState } from 'react';
import {
  Check,
  Coins,
  Crown,
  Flame,
  FlaskConical,
  Gem,
  Hammer,
  Heart,
  Shield,
  Skull,
  Store,
  Trash2,
} from 'lucide-react';
import { EVENT_EN, Locale, UI_COPY, tCard, tPotion, tRelic } from '../game/i18n';
import { CardInstance, RunState } from '../game/types';
import { CardView } from './CardView';
import { DamageStatsPanel } from './DamageStatsModal';
import { PileModal } from './PileModal';

// === 1. COMBAT REWARD VIEW ===
export const RewardView: React.FC<{
  state: RunState;
  locale: Locale;
  onClaimGold: () => void;
  onClaimCard: (card: CardInstance) => void;
  onSkipCard: () => void;
  onClaimRelic: () => void;
  onClaimPotion: () => void;
  onContinue: () => void;
}> = ({
  state,
  locale,
  onClaimGold,
  onClaimCard,
  onSkipCard,
  onClaimRelic,
  onClaimPotion,
  onContinue,
}) => {
  const reward = state.reward;
  if (!reward) return null;

  const copy = UI_COPY[locale];
  const potionsFull = state.potions.every((p) => p !== null);
  const relicTxt = reward.relic ? tRelic(reward.relic.id, locale) : null;
  const potionTxt = reward.potion ? tPotion(reward.potion.id, locale) : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="border-b border-white/10 pb-4">
        <h2 className="font-display text-2xl font-bold text-amber-300">{copy.rewardsTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{copy.rewardsSub}</p>
      </div>

      {/* Loot Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={reward.goldClaimed}
          onClick={onClaimGold}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            reward.goldClaimed
              ? 'border-white/5 bg-[#11151e] opacity-45 cursor-default'
              : 'border-amber-500/40 bg-[#171d29] hover:border-amber-400 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-sm font-semibold text-slate-100">
                <span className="font-mono-num">{reward.gold}</span> {copy.goldLabel}
              </div>
              <div className="text-xs text-slate-400">
                {reward.goldClaimed ? copy.claimed : copy.clickClaim}
              </div>
            </div>
          </div>
          {reward.goldClaimed && <Check className="h-4 w-4 text-emerald-400" />}
        </button>

        {reward.relic && relicTxt && (
          <button
            type="button"
            disabled={reward.relicClaimed}
            onClick={onClaimRelic}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
              reward.relicClaimed
                ? 'border-white/5 bg-[#11151e] opacity-45 cursor-default'
                : 'border-amber-400/50 bg-[#1a1f2d] hover:border-amber-300 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-300" />
              <div>
                <div className="text-sm font-semibold text-amber-200">{relicTxt.name}</div>
                <div className="text-xs text-slate-400">
                  {reward.relicClaimed ? copy.inBag : relicTxt.desc}
                </div>
              </div>
            </div>
            {reward.relicClaimed && <Check className="h-4 w-4 text-emerald-400" />}
          </button>
        )}

        {reward.potion && potionTxt && (
          <button
            type="button"
            disabled={reward.potionClaimed || potionsFull}
            onClick={onClaimPotion}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
              reward.potionClaimed || potionsFull
                ? 'border-white/5 bg-[#11151e] opacity-45 cursor-default'
                : 'border-sky-500/40 bg-[#171d29] hover:border-sky-400 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5" style={{ color: reward.potion.color }} />
              <div>
                <div className="text-sm font-semibold text-slate-100">{potionTxt.name}</div>
                <div className="text-xs text-slate-400">
                  {reward.potionClaimed
                    ? copy.inBelt
                    : potionsFull
                    ? copy.beltFull
                    : potionTxt.desc}
                </div>
              </div>
            </div>
            {reward.potionClaimed && <Check className="h-4 w-4 text-emerald-400" />}
          </button>
        )}
      </div>

      {/* Card Draft */}
      <div className="rounded-2xl border border-white/10 bg-[#12161f] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {reward.cardClaimed ? copy.cardAdded : copy.chooseCard}
            </h3>
            <p className="text-xs text-slate-400">{copy.thinDeckTip}</p>
          </div>
          {!reward.cardClaimed && (
            <button
              type="button"
              onClick={onSkipCard}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              {copy.skipCard}
            </button>
          )}
        </div>

        {!reward.cardClaimed && (
          <div className="flex flex-wrap justify-center gap-5 py-2">
            {reward.cardChoices.map((card) => (
              <CardView
                key={card.uid}
                card={card}
                locale={locale}
                onClick={() => onClaimCard(card)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
        >
          {copy.continueClimb}
        </button>
      </div>
    </div>
  );
};

// === 2. REST SITE VIEW ===
export const RestSiteView: React.FC<{
  state: RunState;
  locale: Locale;
  onRestHeal: () => void;
  onUpgradeCard: (cardUid: string) => void;
}> = ({ state, locale, onRestHeal, onUpgradeCard }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const copy = UI_COPY[locale];
  // Show the HP actually restored, not the raw 30% (which ignores the max-HP cap).
  const healAmount = Math.min(Math.floor(state.maxHp * 0.3), state.maxHp - state.hp);
  const hasUpgradeable = state.deck.some((c) => !c.upgraded);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
      <div className="text-center space-y-2">
        <Flame className="mx-auto h-10 w-10 text-orange-400" />
        <h2 className="font-display text-3xl font-bold text-slate-100">{copy.campfireTitle}</h2>
        <p className="text-sm text-slate-400">{copy.campfireSub}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRestHeal}
          className="flex flex-col items-start gap-3 rounded-2xl border border-rose-500/35 bg-[#151a24] p-6 text-left hover:border-rose-400 hover:bg-[#1a202c] transition-all cursor-pointer"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-950/80 border border-rose-500/40">
            <Heart className="h-6 w-6 text-rose-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100">{copy.restHeal}</div>
            <p className="mt-1 text-sm text-slate-400">
              {copy.restHealDesc} (+<span className="font-mono-num text-rose-300">{healAmount}</span> HP).
            </p>
          </div>
        </button>

        <button
          type="button"
          disabled={!hasUpgradeable}
          onClick={() => setShowUpgradeModal(true)}
          className="flex flex-col items-start gap-3 rounded-2xl border border-amber-500/35 bg-[#151a24] p-6 text-left hover:border-amber-400 hover:bg-[#1a202c] disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-500/40">
            <Hammer className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100">{copy.forgeUpgrade}</div>
            <p className="mt-1 text-sm text-slate-400">
              {hasUpgradeable ? copy.forgeDesc : copy.allUpgraded}
            </p>
          </div>
        </button>
      </div>

      {showUpgradeModal && (
        <PileModal
          locale={locale}
          title={locale === 'zh' ? '选择要锻造升级的卡牌' : 'Select a Card to Smith'}
          subtitle={
            locale === 'zh'
              ? '点击卡牌可预览升级前后的数值对比。'
              : 'Click any card to preview its upgraded stats.'
          }
          cards={state.deck}
          selectableFilter={(c) => !c.upgraded}
          upgradePreviewMode
          onSelectCard={(card) => {
            setShowUpgradeModal(false);
            onUpgradeCard(card.uid);
          }}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

// === 3. MERCHANT SHOP VIEW ===
export const ShopView: React.FC<{
  state: RunState;
  locale: Locale;
  onBuyCard: (index: number) => void;
  onBuyRelic: (index: number) => void;
  onBuyPotion: (index: number) => void;
  onRemoveCard: (cardUid: string) => void;
  onLeave: () => void;
}> = ({
  state,
  locale,
  onBuyCard,
  onBuyRelic,
  onBuyPotion,
  onRemoveCard,
  onLeave,
}) => {
  const shop = state.shop;
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  if (!shop) return null;

  const copy = UI_COPY[locale];
  const potionsFull = state.potions.every((p) => p !== null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-amber-400" />
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-100">{copy.shopTitle}</h2>
            <p className="text-sm text-slate-400">{copy.shopSub}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-base font-bold text-amber-300 font-mono-num">
            <Coins className="h-5 w-5 text-amber-400" />
            <span>{state.gold}</span>
          </div>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
          >
            {copy.leaveShop}
          </button>
        </div>
      </div>

      {/* Cards for Sale */}
      <div className="rounded-2xl border border-white/10 bg-[#12161f] p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-300">{copy.cardsForSale}</h3>
        <div className="flex flex-wrap justify-center gap-5">
          {shop.cards.map((item, idx) => {
            const canBuy = !item.sold && state.gold >= item.price;
            return (
              <div key={item.card.uid} className="flex flex-col items-center gap-2">
                <div className={item.sold ? 'opacity-25 pointer-events-none' : ''}>
                  <CardView
                    card={item.card}
                    locale={locale}
                    compact
                    disabled={!canBuy}
                    onClick={() => canBuy && onBuyCard(idx)}
                  />
                </div>
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => canBuy && onBuyCard(idx)}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1 font-mono-num text-xs font-bold ${
                    item.sold
                      ? 'border-white/5 text-slate-500'
                      : canBuy
                      ? 'border-amber-500/40 bg-amber-950/60 text-amber-300 hover:bg-amber-900/70 cursor-pointer'
                      : 'border-rose-500/30 text-rose-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>{item.sold ? copy.soldOut : item.price}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relics, Potions, and Card Removal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#12161f] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">{copy.relicsForSale}</h3>
          {shop.relics.map((item, idx) => {
            const canBuy = !item.sold && state.gold >= item.price;
            const rt = tRelic(item.relic.id, locale);
            return (
              <button
                key={item.relic.id}
                type="button"
                disabled={!canBuy}
                onClick={() => canBuy && onBuyRelic(idx)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#161c26] p-3 text-left hover:border-amber-400/50 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
              >
                <div className="pr-2">
                  <div className="text-sm font-semibold text-amber-200">{rt.name}</div>
                  <div className="text-xs text-slate-400">{rt.desc}</div>
                </div>
                <span className="font-mono-num text-xs font-bold text-amber-300 whitespace-nowrap">
                  {item.sold ? copy.sold : `${item.price} G`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#12161f] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">{copy.potionsForSale}</h3>
          {shop.potions.map((item, idx) => {
            const canBuy = !item.sold && !potionsFull && state.gold >= item.price;
            const pt = tPotion(item.potion.id, locale);
            return (
              <button
                key={`${item.potion.id}_${idx}`}
                type="button"
                disabled={!canBuy}
                onClick={() => canBuy && onBuyPotion(idx)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#161c26] p-3 text-left hover:border-sky-400/50 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
              >
                <div className="pr-2">
                  <div className="text-sm font-semibold text-sky-200">{pt.name}</div>
                  <div className="text-xs text-slate-400">{pt.desc}</div>
                </div>
                <span className="font-mono-num text-xs font-bold text-amber-300 whitespace-nowrap">
                  {item.sold ? copy.sold : potionsFull ? copy.beltFull : `${item.price} G`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12161f] p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">{copy.cardRemoval}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{copy.cardRemovalDesc}</p>
          </div>
          <button
            type="button"
            disabled={
              shop.removedThisVisit ||
              state.gold < shop.removePrice ||
              state.deck.length <= 5
            }
            onClick={() => setShowRemoveModal(true)}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm font-bold text-rose-200 hover:bg-rose-900/50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>
              {shop.removedThisVisit
                ? copy.removedUsed
                : `${copy.removeBtn} (${shop.removePrice} ${copy.goldLabel})`}
            </span>
          </button>
        </div>
      </div>

      {showRemoveModal && (
        <PileModal
          locale={locale}
          title={locale === 'zh' ? '选择要永久移除的卡牌' : 'Select a Card to Purge'}
          subtitle={
            locale === 'zh'
              ? '移除后该卡牌将彻底离开本局牌组。'
              : 'Selected card will be permanently removed from your deck.'
          }
          cards={state.deck}
          onSelectCard={(card) => {
            setShowRemoveModal(false);
            onRemoveCard(card.uid);
          }}
          onClose={() => setShowRemoveModal(false)}
        />
      )}
    </div>
  );
};

// === 4. MYSTERY EVENT VIEW ===
export const EventView: React.FC<{
  state: RunState;
  locale: Locale;
  onSelectOption: (optionId: string) => void;
  onContinue: () => void;
}> = ({ state, locale, onSelectOption, onContinue }) => {
  const ev = state.event;
  if (!ev) return null;

  const copy = UI_COPY[locale];
  const en = locale === 'en' ? EVENT_EN[ev.id] : undefined;
  const title = en?.title || ev.title;
  const body = ev.resolved
    ? locale === 'en'
      ? ev.outcomeTextEn || ev.outcomeText
      : ev.outcomeText
    : en?.body || ev.body;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="rounded-2xl border border-white/12 bg-[#12161f] p-8 shadow-2xl space-y-6">
        <div className="border-b border-white/10 pb-4">
          <div className="text-xs text-sky-400 font-medium">{copy.eventTag}</div>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-100">{title}</h2>
        </div>

        <p className="text-base leading-relaxed text-slate-300">{body}</p>

        {!ev.resolved ? (
          <div className="space-y-3 pt-2">
            {ev.options.map((opt) => {
              const optEn = en?.options[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => onSelectOption(opt.id)}
                  className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-white/12 bg-[#171d29] p-4 text-left hover:border-amber-400/60 hover:bg-[#1c2433] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-100">
                    {optEn?.label || opt.label}
                  </span>
                  <span className="text-xs text-slate-400">{optEn?.hint || opt.hint}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              {copy.continueClimb}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// === 5. TREASURE CHEST VIEW ===
export const TreasureView: React.FC<{
  state: RunState;
  locale: Locale;
  onOpenChest: () => void;
  onContinue: () => void;
}> = ({ state, locale, onOpenChest, onContinue }) => {
  const t = state.treasure;
  if (!t) return null;

  const copy = UI_COPY[locale];
  const relicTxt = tRelic(t.relic.id, locale);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-14 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/50 bg-amber-950/50 shadow-xl">
        <Gem className="h-10 w-10 text-amber-400" />
      </div>
      <h2 className="font-display text-3xl font-bold text-slate-100">{copy.treasureTitle}</h2>

      {!t.opened ? (
        <>
          <p className="text-sm text-slate-400">{copy.treasureDesc}</p>
          <button
            type="button"
            onClick={onOpenChest}
            className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
          >
            {copy.openChest}
          </button>
        </>
      ) : (
        <div className="w-full rounded-2xl border border-amber-500/35 bg-[#12161f] p-6 space-y-4">
          <div className="text-lg font-bold text-amber-300">
            {copy.relicsLabel}: [{relicTxt.name}]
          </div>
          <p className="text-sm text-slate-300">{relicTxt.desc}</p>
          <div className="text-sm font-mono-num text-amber-200">
            + {t.gold} {copy.goldLabel}
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              {copy.continueClimb}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// === 6. END RUN SUMMARY (VICTORY / DEFEAT + FULL DAMAGE STATS) ===
export const EndRunView: React.FC<{
  state: RunState;
  locale: Locale;
  onPlayAgain: () => void;
}> = ({ state, locale, onPlayAgain }) => {
  const copy = UI_COPY[locale];
  const isVictory = state.phase === 'VICTORY';

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 py-10 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-2xl border ${
          isVictory
            ? 'border-amber-400/60 bg-amber-950/60'
            : 'border-rose-500/50 bg-rose-950/60'
        }`}
      >
        {isVictory ? (
          <Crown className="h-10 w-10 text-amber-400" />
        ) : (
          <Skull className="h-10 w-10 text-rose-400" />
        )}
      </div>

      <div>
        <h2
          className={`font-display text-4xl font-extrabold ${
            isVictory ? 'text-amber-300' : 'text-rose-400'
          }`}
        >
          {isVictory ? copy.victoryTitle : copy.defeatTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {isVictory
            ? copy.victoryDesc
            : `${copy.defeatDesc} (${copy.floorPrefix} ${state.floor} ${copy.floorSuffix})`}
        </p>
      </div>

      {/* Embedded Complete Damage Statistics Panel */}
      <div className="w-full rounded-2xl border border-white/12 bg-[#12161f] p-6">
        <DamageStatsPanel state={state} locale={locale} />
      </div>

      {/* Final Deck Strip */}
      <div className="w-full rounded-2xl border border-white/10 bg-[#11151e] p-4 text-left">
        <div className="mb-2 text-xs font-semibold text-slate-400">
          {locale === 'zh'
            ? `最终牌组 (${state.deck.length} 张)`
            : `Final Deck (${state.deck.length} Cards)`}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {state.deck.map((c) => {
            const cardName = tCard(c.defId, locale).name;
            return (
              <span
                key={c.uid}
                className={`rounded border px-2 py-1 ${
                  c.upgraded
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                    : 'border-white/10 bg-[#171d29] text-slate-200'
                }`}
              >
                {cardName}
                {c.upgraded ? '+' : ''}
              </span>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onPlayAgain}
        className="rounded-xl bg-amber-500 px-8 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
      >
        {copy.playAgain}
      </button>
    </div>
  );
};
