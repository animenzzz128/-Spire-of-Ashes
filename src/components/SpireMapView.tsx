import React, { useEffect, useRef } from 'react';
import {
  Crown,
  Flame,
  Gem,
  HelpCircle,
  Skull,
  Store,
  Swords,
} from 'lucide-react';
import { getAvailableNodeIds } from '../game/engine';
import { Locale, UI_COPY } from '../game/i18n';
import { TOTAL_FLOORS } from '../game/map';
import { MapNode, NodeType, RunState } from '../game/types';

interface SpireMapViewProps {
  state: RunState;
  locale?: Locale;
  readOnly?: boolean;
  onSelectNode?: (nodeId: string) => void;
  onCloseOverlay?: () => void;
}

const NODE_STYLE: Record<NodeType, { color: string; bg: string; icon: React.ReactNode }> = {
  monster: {
    color: 'text-slate-200',
    bg: 'bg-[#1a202c] border-slate-500/40',
    icon: <Swords className="h-4 w-4 text-slate-200" />,
  },
  elite: {
    color: 'text-rose-300',
    bg: 'bg-rose-950/70 border-rose-500/50',
    icon: <Skull className="h-4 w-4 text-rose-400" />,
  },
  rest: {
    color: 'text-orange-300',
    bg: 'bg-orange-950/60 border-orange-500/45',
    icon: <Flame className="h-4 w-4 text-orange-400" />,
  },
  event: {
    color: 'text-sky-300',
    bg: 'bg-sky-950/60 border-sky-500/45',
    icon: <HelpCircle className="h-4 w-4 text-sky-400" />,
  },
  shop: {
    color: 'text-amber-300',
    bg: 'bg-amber-950/60 border-amber-500/45',
    icon: <Store className="h-4 w-4 text-amber-400" />,
  },
  treasure: {
    color: 'text-yellow-300',
    bg: 'bg-yellow-950/60 border-yellow-500/50',
    icon: <Gem className="h-4 w-4 text-yellow-400" />,
  },
  boss: {
    color: 'text-amber-200',
    bg: 'bg-gradient-to-br from-rose-950 to-amber-950 border-amber-400/70',
    icon: <Crown className="h-6 w-6 text-amber-400" />,
  },
};

export const SpireMapView: React.FC<SpireMapViewProps> = ({
  state,
  locale = 'zh',
  readOnly = false,
  onSelectNode,
  onCloseOverlay,
}) => {
  const copy = UI_COPY[locale];
  const availableIds = readOnly ? new Set<string>() : getAvailableNodeIds(state);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const floors = Array.from({ length: TOTAL_FLOORS }, (_, idx) => TOTAL_FLOORS - idx);
  const ROW_H = 74;
  const COL_W = 104;
  const MAP_W = 7 * COL_W;
  const MAP_H = TOTAL_FLOORS * ROW_H + 40;

  const nodePos = (node: MapNode) => ({
    x: node.col * COL_W + COL_W / 2,
    y: (TOTAL_FLOORS - node.floor) * ROW_H + 48,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetFloor = Math.min(TOTAL_FLOORS, state.floor + 2);
    const targetY = (TOTAL_FLOORS - targetFloor) * ROW_H;
    el.scrollTo({ top: Math.max(0, targetY - 220), behavior: 'smooth' });
  }, [state.floor]);

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-5 px-4 py-6 sm:px-6">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-100">
            {copy.mapTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {readOnly
              ? copy.mapReadOnly
              : state.floor === 0
              ? copy.mapStart
              : `${copy.floorPrefix} ${state.floor} ${copy.floorSuffix} · ${copy.mapNext}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          {(['monster', 'elite', 'rest', 'event', 'shop', 'treasure'] as NodeType[]).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              {NODE_STYLE[t].icon}
              <span>{copy.nodeLabels[t]}</span>
            </div>
          ))}
          {onCloseOverlay && (
            <button
              type="button"
              onClick={onCloseOverlay}
              className="ml-2 rounded-lg border border-white/15 bg-[#1a202c] px-3 py-1.5 text-xs font-medium text-white hover:border-amber-400/50 cursor-pointer"
            >
              {copy.backToRoom}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Branching Graph */}
      <div
        ref={scrollRef}
        className="relative h-[68vh] min-h-[460px] overflow-auto rounded-xl border border-white/10 bg-[#11151e] shadow-inner"
      >
        <div className="relative mx-auto" style={{ width: MAP_W, height: MAP_H }}>
          {/* Floor labels on left */}
          {floors.map((f) => (
            <div
              key={f}
              style={{ top: (TOTAL_FLOORS - f) * ROW_H + 38 }}
              className="pointer-events-none absolute left-3 font-mono-num text-xs text-slate-500"
            >
              {String(f).padStart(2, '0')}F
            </div>
          ))}

          {/* SVG Connection Lines */}
          <svg
            width={MAP_W}
            height={MAP_H}
            className="pointer-events-none absolute inset-0"
          >
            {state.map.map((node) => {
              const from = nodePos(node);
              return node.nextIds.map((nid) => {
                const target = state.map.find((n) => n.id === nid);
                if (!target) return null;
                const to = nodePos(target);
                const isActiveEdge =
                  node.id === state.currentNodeId && availableIds.has(target.id);
                const isTraversed = node.visited && target.visited;
                return (
                  <line
                    key={`${node.id}-${nid}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={
                      isActiveEdge
                        ? '#f59e0b'
                        : isTraversed
                        ? '#64748b'
                        : 'rgba(148, 163, 184, 0.22)'
                    }
                    strokeWidth={isActiveEdge ? 2.8 : 1.75}
                    strokeDasharray={isActiveEdge || isTraversed ? undefined : '5 5'}
                  />
                );
              });
            })}
          </svg>

          {/* Nodes */}
          {state.map.map((node) => {
            const pos = nodePos(node);
            const meta = NODE_STYLE[node.type];
            const isAvailable = availableIds.has(node.id);
            const isCurrent = node.id === state.currentNodeId;
            const isBoss = node.type === 'boss';
            const size = isBoss ? 54 : 42;

            return (
              <button
                key={node.id}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelectNode && onSelectNode(node.id)}
                title={`${copy.floorPrefix} ${node.floor} ${copy.floorSuffix} · ${copy.nodeLabels[node.type]}`}
                style={{
                  left: pos.x - size / 2,
                  top: pos.y - size / 2,
                  width: size,
                  height: size,
                }}
                className={`absolute flex items-center justify-center rounded-xl border transition-all duration-150 ${
                  meta.bg
                } ${
                  isAvailable
                    ? 'cursor-pointer ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.45)] hover:scale-110'
                    : isCurrent
                    ? 'ring-2 ring-emerald-400 opacity-100 cursor-default'
                    : node.visited
                    ? 'opacity-45 cursor-default'
                    : 'opacity-70 cursor-not-allowed'
                }`}
              >
                {meta.icon}
                {node.visited && !isCurrent && (
                  <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded bg-slate-800 text-[10px] text-emerald-400 border border-emerald-500/40">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
