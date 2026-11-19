import React, { useState } from 'react';
import { Globe, PlayCircle, Settings, Sliders, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { Locale, UI_COPY } from '../game/i18n';

interface SettingsModalProps {
  locale: Locale;
  muted: boolean;
  volume: number;
  hasSavedRun: boolean;
  onSetLocale: (loc: Locale) => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onReplayIntro: () => void;
  onClearSavedRun: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  locale,
  muted,
  volume,
  hasSavedRun,
  onSetLocale,
  onToggleMute,
  onChangeVolume,
  onReplayIntro,
  onClearSavedRun,
  onClose,
}) => {
  const copy = UI_COPY[locale];
  const [clearedMsg, setClearedMsg] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#12161f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-amber-400" />
            <h3 className="font-display text-xl font-bold text-slate-100">
              {copy.settingsTitle}
            </h3>
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

        <div className="space-y-4 p-6">
          {/* Language */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161c26] p-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
              <Globe className="h-4 w-4 text-amber-400" />
              <span>{copy.languageLabel}</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0d1118] p-1">
              <button
                type="button"
                onClick={() => onSetLocale('zh')}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  locale === 'zh'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                简体中文
              </button>
              <button
                type="button"
                onClick={() => onSetLocale('en')}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  locale === 'en'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Audio Mute & Volume */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-[#161c26] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                {muted ? (
                  <VolumeX className="h-4 w-4 text-rose-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                )}
                <span>{copy.soundLabel}</span>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  muted
                    ? 'border-rose-500/40 bg-rose-950/50 text-rose-300'
                    : 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                }`}
              >
                {muted ? copy.soundOff : copy.soundOn}
              </button>
            </div>

            <div className="flex items-center gap-3 border-t border-white/8 pt-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
                <Sliders className="h-3.5 w-3.5 text-amber-400" />
                <span>{copy.volumeLabel}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(volume * 100)}
                onChange={(e) => onChangeVolume(parseInt(e.target.value, 10) / 100)}
                disabled={muted}
                aria-label={copy.volumeLabel}
                className="flex-1 accent-amber-400 cursor-pointer disabled:opacity-40"
              />
              <span className="w-10 text-right font-mono-num text-xs font-bold text-slate-200">
                {muted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          {/* Replay Intro */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161c26] p-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
              <PlayCircle className="h-4 w-4 text-amber-400" />
              <span>{copy.replayIntro}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onReplayIntro();
              }}
              className="rounded-lg border border-amber-400/40 bg-amber-950/40 px-4 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-900/50 cursor-pointer"
            >
              {locale === 'zh' ? '立即重播' : 'Replay'}
            </button>
          </div>

          {/* Saved Run Management */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161c26] p-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
              <Trash2 className="h-4 w-4 text-slate-400" />
              <span>{copy.clearSaveLabel}</span>
            </div>
            <button
              type="button"
              disabled={!hasSavedRun || clearedMsg}
              onClick={() => {
                onClearSavedRun();
                setClearedMsg(true);
              }}
              className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {clearedMsg
                ? copy.clearSaveDone
                : hasSavedRun
                ? copy.clearSaveBtn
                : copy.noActiveSave}
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
          >
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  );
};
