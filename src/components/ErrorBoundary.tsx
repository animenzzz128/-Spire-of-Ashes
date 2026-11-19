import React from 'react';
import { UI_COPY } from '../game/i18n';
import { quarantineSave } from '../game/save';

interface State {
  error: Error | null;
}

function currentLocale(): 'zh' | 'en' {
  try {
    return localStorage.getItem('spire_ashes_locale_v1') === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

/**
 * Last line of defence: a render error shows a recovery screen instead of a
 * blank page. "Clear save" backs the save up first (save.ts quarantineSave),
 * because a bad save that crashes on load would otherwise brick every launch.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unrecoverable UI error:', error, info.componentStack);
  }

  private reload = () => window.location.reload();

  private clearAndReload = () => {
    try {
      quarantineSave(window.localStorage);
    } catch {
      // storage unavailable
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const copy = UI_COPY[currentLocale()];
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-6 text-slate-100">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-rose-500/40 bg-[#151a24] p-6 shadow-2xl">
          <h1 className="text-lg font-bold text-rose-200">{copy.errorTitle}</h1>
          <p className="text-sm leading-relaxed text-slate-300">{copy.errorBody}</p>
          <pre className="max-h-32 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-400">
            {String(this.state.error.message || this.state.error)}
          </pre>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              {copy.errorReload}
            </button>
            <button
              type="button"
              onClick={this.clearAndReload}
              className="rounded-lg border border-rose-400/60 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10 cursor-pointer"
            >
              {copy.errorClearSave}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
