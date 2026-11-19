import React, { useState } from 'react';
import { EnemyArtType } from '../game/types';
import { assetUrl } from '../game/assets';

interface EnemyArtworkProps {
  artType: EnemyArtType;
  asleep?: boolean;
  bare?: boolean;
  className?: string;
}

const ENEMY_IMAGE_MAP: Partial<Record<EnemyArtType, { src: string; alt: string; border: string }>> = {
  boss_warden: {
    src: assetUrl('src/assets/images/boss_obsidian_warden_1795024246711.jpg'),
    alt: '黑曜守望者',
    border: 'border-amber-500/45',
  },
  ember_zealot: {
    src: assetUrl('src/assets/images/enemy_ember_zealot_art_1795028067223.jpg'),
    alt: '深红狂信徒',
    border: 'border-rose-500/35',
  },
  cinderhorn_brute: {
    src: assetUrl('src/assets/images/enemy_cinderhorn_brute_art_1795028055930.jpg'),
    alt: '烬角蛮兽',
    border: 'border-rose-500/50',
  },
  caustic_ooze: {
    src: assetUrl('src/assets/images/enemy_caustic_ooze_art_1795028136299.jpg'),
    alt: '腐蚀软泥',
    border: 'border-emerald-500/35',
  },
  cinder_burrower: {
    src: assetUrl('src/assets/images/enemy_cinder_burrower_art_1795028136495.jpg'),
    alt: '余烬掘地虫',
    border: 'border-slate-500/45',
  },
  boneknight: {
    src: assetUrl('src/assets/images/enemy_bone_knight_art_1795028151084.jpg'),
    alt: '骸骨护卫',
    border: 'border-slate-400/40',
  },
  slumbering_gargoyle: {
    src: assetUrl('src/assets/images/enemy_slumbering_gargoyle_art_1795028144807.jpg'),
    alt: '沉睡石像鬼',
    border: 'border-violet-500/45',
  },
};

export const EnemyArtwork: React.FC<EnemyArtworkProps> = ({
  artType,
  asleep,
  bare = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const art = ENEMY_IMAGE_MAP[artType];

  if (art && !imgError) {
    if (bare) {
      return (
        <div className={`relative select-none ${className}`}>
          <img
            src={art.src}
            alt={art.alt}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 72% 78% at 50% 48%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
              maskImage:
                'radial-gradient(ellipse 72% 78% at 50% 48%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
            }}
            className={`h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)] transition-all ${
              asleep ? 'brightness-75 saturate-50' : ''
            }`}
          />
          {asleep && (
            <div className="pointer-events-none absolute top-2 right-3 font-mono-num text-xs font-bold text-indigo-300 drop-shadow">
              Zzz
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={`relative overflow-hidden rounded-2xl border bg-[#12161f] shadow-2xl ${art.border} ${className}`}
      >
        <img
          src={art.src}
          alt={art.alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`h-full w-full object-cover object-center transition-all ${
            asleep ? 'brightness-75 saturate-50' : ''
          }`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0e14]/75 via-transparent to-transparent" />
        {asleep && (
          <div className="pointer-events-none absolute top-2 right-2 rounded bg-[#0b0e14]/85 px-2 py-0.5 font-mono-num text-xs font-bold text-indigo-300 border border-indigo-400/40">
            Zzz
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center ${
        bare ? '' : 'rounded-2xl border border-white/10 bg-[#12161f]/90'
      } ${className}`}
    >
      <svg viewBox="0 0 160 160" className="h-full w-full drop-shadow-[0_14px_24px_rgba(0,0,0,0.75)]">
        <defs>
          <radialGradient id={`glow-${artType}`} cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={artType === 'glyph_totem' ? '#38bdf8' : '#94a3b8'}
              stopOpacity="0.25"
            />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="80" cy="84" r="64" fill={`url(#glow-${artType})`} />

        {artType === 'ash_marauder' && (
          <g>
            <path d="M44 142 L56 66 Q80 48 104 66 L116 142 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <circle cx="80" cy="54" r="19" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
            <path d="M62 56 L98 56 L94 70 L66 70 Z" fill="#7f1d1d" />
            <circle cx="72" cy="51" r="2.5" fill="#38bdf8" />
            <circle cx="88" cy="51" r="2.5" fill="#38bdf8" />
            <path d="M42 104 L22 72 L48 94 Z" fill="#cbd5e1" />
            <path d="M118 104 L138 72 L112 94 Z" fill="#cbd5e1" />
          </g>
        )}

        {artType === 'glyph_totem' && (
          <g>
            <polygon
              points="80,24 124,62 108,132 52,132 36,62"
              fill="#1e293b"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            <polygon points="80,42 106,68 96,114 64,114 54,68" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
            <circle cx="80" cy="76" r="14" fill="#0ea5e9" opacity="0.25" />
            <circle cx="80" cy="76" r="7" fill="#38bdf8" />
          </g>
        )}

        {artType !== 'ash_marauder' && artType !== 'glyph_totem' && (
          <g>
            <rect x="40" y="34" width="80" height="104" rx="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="80" cy="86" r="18" fill="#f59e0b" opacity="0.85" />
            <circle cx="68" cy="54" r="4" fill="#fbbf24" />
            <circle cx="92" cy="54" r="4" fill="#fbbf24" />
          </g>
        )}
      </svg>
    </div>
  );
};
