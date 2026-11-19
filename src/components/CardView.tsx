import React, { useState } from 'react';
import {
  Ban,
  Crosshair,
  Droplet,
  Flame,
  Layers,
  Shield,
  Skull,
  Sparkles,
  Sword,
} from 'lucide-react';
import { CARD_DEFS, getCardCost } from '../game/cards';
import {
  calculateCardBlockPreview,
  calculateCardDamagePreview,
} from '../game/engine';
import { Locale, UI_COPY, tCard } from '../game/i18n';
import { CardInstance, EnemyInstance, RunState } from '../game/types';
import { assetUrl } from '../game/assets';

interface CardViewProps {
  card: CardInstance;
  locale?: Locale;
  state?: RunState;
  targetEnemy?: EnemyInstance;
  selected?: boolean;
  disabled?: boolean;
  discardMode?: boolean;
  shortcutNumber?: number;
  compact?: boolean;
  draggableCard?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const CARD_ART_MAP: Record<string, string> = {
  crimson_slash: assetUrl('src/assets/images/card_art_crimson_slash_1795034564128.jpg'),
  iron_bulwark: assetUrl('src/assets/images/card_art_iron_bulwark_1795034563806.jpg'),
  blood_fury: assetUrl('src/assets/images/card_art_blood_fury_1795034563391.jpg'),
  venom_strike: assetUrl('src/assets/images/card_art_venom_strike_1795034563360.jpg'),
  shadow_knife: assetUrl('src/assets/images/card_art_shadow_knife_1795034565706.jpg'),
  curse_burn: assetUrl('src/assets/images/card_art_curse_burn_1795034566156.jpg'),
};

function getCardArtSrc(artKey: string, type: string): string {
  if (
    type === 'status' ||
    type === 'curse' ||
    artKey === 'burn' ||
    artKey === 'wound' ||
    artKey === 'residue' ||
    artKey === 'ache'
  ) {
    return CARD_ART_MAP.curse_burn;
  }
  if (
    artKey === 'poison_blade' ||
    artKey === 'vial' ||
    artKey === 'bloom' ||
    artKey === 'miasma' ||
    artKey === 'venom_edge' ||
    artKey === 'rot'
  ) {
    return CARD_ART_MAP.venom_strike;
  }
  if (
    artKey === 'dagger' ||
    artKey === 'sap' ||
    artKey === 'blades' ||
    artKey === 'flip' ||
    artKey === 'sleight' ||
    artKey === 'spray' ||
    artKey === 'cloak_knife' ||
    artKey === 'rush' ||
    artKey === 'knife' ||
    artKey === 'flash' ||
    artKey === 'nightmare' ||
    artKey === 'sweep'
  ) {
    return CARD_ART_MAP.shadow_knife;
  }
  if (
    artKey === 'shield' ||
    artKey === 'shield_draw' ||
    artKey === 'wave' ||
    artKey === 'slam' ||
    artKey === 'armor' ||
    artKey === 'fortress' ||
    artKey === 'bastion' ||
    artKey === 'cloak' ||
    artKey === 'refuge' ||
    artKey === 'shade' ||
    artKey === 'boots' ||
    artKey === 'poise' ||
    artKey === 'ward'
  ) {
    return CARD_ART_MAP.iron_bulwark;
  }
  if (
    artKey === 'flame' ||
    artKey === 'blood' ||
    artKey === 'focus' ||
    artKey === 'covenant' ||
    artKey === 'infernal' ||
    artKey === 'pulse' ||
    artKey === 'epiphany'
  ) {
    return CARD_ART_MAP.blood_fury;
  }
  return CARD_ART_MAP.crimson_slash;
}

function renderFallbackArtIcon(artKey: string, type: string) {
  const cls = 'h-7 w-7';
  if (type === 'status' || type === 'curse') {
    if (artKey === 'burn') return <Flame className={`${cls} text-orange-400`} />;
    return <Ban className={`${cls} text-rose-400`} />;
  }
  if (
    artKey.includes('poison') ||
    artKey === 'vial' ||
    artKey === 'bloom' ||
    artKey === 'miasma' ||
    artKey === 'rot'
  ) {
    return <Droplet className={`${cls} text-emerald-400`} />;
  }
  if (
    artKey.includes('shield') ||
    artKey === 'armor' ||
    artKey === 'fortress' ||
    artKey === 'bastion' ||
    artKey === 'cloak'
  ) {
    return <Shield className={`${cls} text-sky-400`} />;
  }
  if (artKey === 'infernal' || artKey === 'flame' || artKey === 'covenant' || artKey === 'epiphany') {
    return <Flame className={`${cls} text-amber-400`} />;
  }
  if (artKey === 'knife' || artKey === 'blades' || artKey === 'spray') {
    return <Crosshair className={`${cls} text-teal-300`} />;
  }
  if (type === 'power') return <Sparkles className={`${cls} text-amber-300`} />;
  if (type === 'skill') return <Layers className={`${cls} text-sky-300`} />;
  if (artKey === 'scythe') return <Skull className={`${cls} text-rose-300`} />;
  return <Sword className={`${cls} text-rose-400`} />;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  locale = 'zh',
  state,
  targetEnemy,
  selected = false,
  disabled = false,
  discardMode = false,
  shortcutNumber,
  compact = false,
  draggableCard = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
}) => {
  const [artFailed, setArtFailed] = useState(false);
  const def = CARD_DEFS[card.defId];
  if (!def) return null;

  const copy = UI_COPY[locale];
  const localized = tCard(card.defId, locale);
  const artSrc = getCardArtSrc(def.artKey, def.type);

  const cost = getCardCost(card);
  const isUnplayable = cost === -2;
  const costDisplay = cost === -1 ? 'X' : cost === -2 ? '—' : String(cost);

  const canAfford =
    !state?.combat || isUnplayable
      ? !isUnplayable
      : state.combat.energy >= (cost === -1 ? 0 : cost);

  const isDisabled = disabled || (!discardMode && (!canAfford || isUnplayable));
  const rawDescription = card.upgraded ? localized.upgDesc : localized.desc;

  const renderStyledDescription = () => {
    if (!state?.combat) {
      return <span>{rawDescription}</span>;
    }

    let text = rawDescription;
    const highlights: { placeholder: string; value: string; className: string }[] = [];

    if (def.damage !== undefined || def.blockAsDamage) {
      const dmg = calculateCardDamagePreview(card, state, targetEnemy);
      const baseDmg =
        card.upgraded && def.upgradedDamage !== undefined ? def.upgradedDamage : def.damage || 0;
      const cls = dmg.boosted
        ? 'font-bold text-emerald-400'
        : dmg.reduced
        ? 'font-bold text-rose-400'
        : 'font-semibold text-white';

      if (def.blockAsDamage) {
        return locale === 'zh' ? (
          <span>
            造成 <span className={cls}>{dmg.perHit}</span> 点伤害（当前格挡）。
          </span>
        ) : (
          <span>
            Deal <span className={cls}>{dmg.perHit}</span> damage (Current Block).
          </span>
        );
      }

      if (def.cost === -1) {
        const hitsNow = state.combat.energy;
        return locale === 'zh' ? (
          <span>
            消耗全部能量，对所有敌人造成 <span className={cls}>{dmg.perHit}</span> 点伤害{' '}
            <span className="font-bold text-amber-300">{hitsNow}</span> 次。
          </span>
        ) : (
          <span>
            Deal <span className={cls}>{dmg.perHit}</span> damage to ALL enemies{' '}
            <span className="font-bold text-amber-300">{hitsNow}</span> times.
          </span>
        );
      }

      if (locale === 'zh' && text.includes(`造成 ${baseDmg} 点伤害`)) {
        text = text.replace(`造成 ${baseDmg} 点伤害`, '造成 __DMG__ 点伤害');
        highlights.push({ placeholder: '__DMG__', value: String(dmg.perHit), className: cls });
      } else if (locale === 'en' && text.includes(`Deal ${baseDmg} damage`)) {
        text = text.replace(`Deal ${baseDmg} damage`, 'Deal __DMG__ damage');
        highlights.push({ placeholder: '__DMG__', value: String(dmg.perHit), className: cls });
      }
    }

    if (def.block !== undefined) {
      const blk = calculateCardBlockPreview(card, state);
      const baseBlk =
        card.upgraded && def.upgradedBlock !== undefined ? def.upgradedBlock : def.block || 0;
      const cls = blk.boosted
        ? 'font-bold text-emerald-400'
        : blk.reduced
        ? 'font-bold text-rose-400'
        : 'font-semibold text-white';
      if (locale === 'zh' && text.includes(`获得 ${baseBlk} 点格挡`)) {
        text = text.replace(`获得 ${baseBlk} 点格挡`, '获得 __BLK__ 点格挡');
        highlights.push({ placeholder: '__BLK__', value: String(blk.block), className: cls });
      } else if (locale === 'en' && text.includes(`Gain ${baseBlk} Block`)) {
        text = text.replace(`Gain ${baseBlk} Block`, 'Gain __BLK__ Block');
        highlights.push({ placeholder: '__BLK__', value: String(blk.block), className: cls });
      }
    }

    if (highlights.length === 0) return <span>{text}</span>;

    const parts = text.split(/(__DMG__|__BLK__)/g);
    return (
      <span>
        {parts.map((part, i) => {
          const match = highlights.find((h) => h.placeholder === part);
          if (match) {
            return (
              <span key={i} className={match.className}>
                {match.value}
              </span>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </span>
    );
  };

  const borderTone = selected
    ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.35)] -translate-y-3'
    : discardMode
    ? 'border-rose-400/80 ring-2 ring-rose-500/40 hover:-translate-y-2'
    : def.type === 'attack'
    ? 'border-rose-500/35 hover:border-rose-400/80'
    : def.type === 'skill'
    ? 'border-sky-500/35 hover:border-sky-400/80'
    : def.type === 'power'
    ? 'border-amber-500/40 hover:border-amber-400/85'
    : 'border-slate-600/50';

  const headerBg =
    def.type === 'attack'
      ? 'bg-gradient-to-b from-rose-950/90 to-[#161b26]'
      : def.type === 'skill'
      ? 'bg-gradient-to-b from-sky-950/90 to-[#161b26]'
      : def.type === 'power'
      ? 'bg-gradient-to-b from-amber-950/90 to-[#161b26]'
      : 'bg-gradient-to-b from-slate-800/90 to-[#161b26]';

  const rarityTextColor =
    def.rarity === 'rare'
      ? 'text-amber-300'
      : def.rarity === 'uncommon'
      ? 'text-sky-300'
      : 'text-slate-400';

  return (
    <button
      type="button"
      draggable={draggableCard && !isDisabled && !discardMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={isDisabled && !discardMode && onClick === undefined}
      aria-label={`${localized.name}${card.upgraded ? '+' : ''} Cost ${costDisplay}`}
      className={`group relative flex flex-col justify-between text-left rounded-xl border bg-[#161b26] transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
        compact ? 'w-36 h-52 p-2.5' : 'w-40 sm:w-44 h-60 sm:h-64 p-2.5'
      } ${borderTone} ${
        isDisabled && !discardMode
          ? 'opacity-55 cursor-not-allowed'
          : 'cursor-pointer hover:-translate-y-2.5 hover:z-20 shadow-lg hover:shadow-2xl'
      }`}
    >
      {/* Energy Gem */}
      <div
        className={`absolute -top-2.5 -left-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border font-mono-num text-sm font-bold shadow-md ${
          isUnplayable
            ? 'border-slate-600 bg-slate-800 text-slate-400'
            : canAfford
            ? 'border-amber-400/70 bg-amber-500 text-slate-950'
            : 'border-rose-500/70 bg-rose-950 text-rose-300'
        }`}
      >
        {costDisplay}
      </div>

      {/* Keyboard shortcut hint */}
      {shortcutNumber !== undefined && (
        <span className="absolute -top-2 right-2 z-10 bg-[#0b0e14] px-1.5 py-0.5 text-[10px] font-mono-num text-slate-400 border border-white/10 rounded">
          {shortcutNumber}
        </span>
      )}

      {/* Card Header */}
      <div className="pt-0.5 pl-4">
        <div
          className={`truncate text-sm font-bold tracking-tight ${
            card.upgraded ? 'text-emerald-400' : 'text-slate-100'
          }`}
        >
          {localized.name}
          {card.upgraded ? '+' : ''}
        </div>
        <div className={`text-[10.5px] font-medium ${rarityTextColor}`}>
          {copy.typeLabels[def.type]} · {copy.rarityLabels[def.rarity]}
        </div>
      </div>

      {/* Painterly Card Artwork Frame */}
      <div
        className={`relative my-1.5 flex-1 overflow-hidden rounded-lg border ${
          card.upgraded ? 'border-emerald-400/45' : 'border-white/10'
        } ${headerBg}`}
      >
        {!artFailed ? (
          <img
            src={artSrc}
            alt={localized.name}
            referrerPolicy="no-referrer"
            onError={() => setArtFailed(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {renderFallbackArtIcon(def.artKey, def.type)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f131b]/75 via-transparent to-transparent" />
        {def.exhaust && (
          <span className="pointer-events-none absolute bottom-1 right-1.5 rounded bg-[#0b0e14]/85 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-300 border border-amber-400/30">
            {copy.exhaustTag}
          </span>
        )}
      </div>

      {/* Rules Text */}
      <div className="min-h-[3.2rem] flex items-center justify-center rounded-md bg-[#0f131b] px-2 py-1 border border-white/5">
        <p className="text-[11px] leading-snug text-slate-200 text-center">
          {renderStyledDescription()}
        </p>
      </div>
    </button>
  );
};
