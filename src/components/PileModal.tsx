import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useDialog } from './useDialog';
import { Locale, UI_COPY } from '../game/i18n';
import { CardInstance } from '../game/types';
import { CardView } from './CardView';

interface PileModalProps {
  title: string;
  subtitle?: string;
  locale?: Locale;
  cards: CardInstance[];
  selectableFilter?: (card: CardInstance) => boolean;
  upgradePreviewMode?: boolean;
  onSelectCard?: (card: CardInstance) => void;
  onClose: () => void;
}

export const PileModal: React.FC<PileModalProps> = ({
  title,
  subtitle,
  locale = 'zh',
  cards,
  selectableFilter,
  upgradePreviewMode = false,
  onSelectCard,
  onClose,
}) => {
  const dialogRef = useDialog<HTMLDivElement>(onClose);
  const [previewCard, setPreviewCard] = useState<CardInstance | null>(null);
  const zh = locale === 'zh';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label={title} className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl outline-none">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-100">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
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
          {previewCard && upgradePreviewMode && onSelectCard ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="text-sm text-slate-300">
                {zh ? (
                  <>
                    确认将此卡牌锻造升级为{' '}
                    <span className="font-bold text-emerald-400">（+）</span> 版本？
                  </>
                ) : (
                  <>
                    Confirm Smithing this card to its{' '}
                    <span className="font-bold text-emerald-400">(+)</span> upgraded form?
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6">
                <CardView card={previewCard} locale={locale} />
                <ArrowRight className="h-7 w-7 text-amber-400" />
                <CardView card={{ ...previewCard, upgraded: true }} locale={locale} />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewCard(null)}
                  className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-slate-300 hover:text-white cursor-pointer"
                >
                  {zh ? '重选其他卡牌' : 'Choose Another'}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCard(previewCard)}
                  className="rounded-xl bg-amber-500 px-7 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  {zh ? '确认锻造升级' : 'Confirm Upgrade'}
                </button>
              </div>
            </div>
          ) : cards.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              {zh ? '当前牌堆为空。' : 'This pile is currently empty.'}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {cards.map((card) => {
                const canSelect = onSelectCard
                  ? selectableFilter
                    ? selectableFilter(card)
                    : true
                  : false;
                return (
                  <div
                    key={card.uid}
                    className={onSelectCard && !canSelect ? 'opacity-35 pointer-events-none' : ''}
                  >
                    <CardView
                      card={card}
                      locale={locale}
                      compact
                      disabled={onSelectCard ? !canSelect : false}
                      onClick={
                        onSelectCard && canSelect
                          ? () => {
                              if (upgradePreviewMode) {
                                setPreviewCard(card);
                              } else {
                                onSelectCard(card);
                              }
                            }
                          : undefined
                      }
                    />
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
