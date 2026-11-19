import { HeroClassId, RunState } from './types';

export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface RunScoreBreakdown {
  floorPoints: number;
  enemyPoints: number;
  elitePoints: number;
  bossBonus: number;
  goldBonus: number;
  hpBonus: number;
  dailyBonus: number;
  ascensionMultiplier: number;
  totalScore: number;
  grade: ScoreGrade;
}

export interface RunHistoryEntry {
  id: string;
  endedAt: string;
  heroId: HeroClassId;
  victory: boolean;
  floor: number;
  ascension: number;
  seed: string;
  isDaily: boolean;
  score: number;
  grade: ScoreGrade;
  totalTurns: number;
  totalDamageDealt: number;
  deckSize: number;
  relicIds: string[];
  mvpCardId?: string;
}

export function calculateRunScore(state: RunState): RunScoreBreakdown {
  const isVictory = state.phase === 'VICTORY';
  const floorPoints = state.stats.floorsCleared * 12;
  const enemyPoints = state.stats.enemiesDefeated * 6;
  const elitePoints = state.stats.elitesDefeated * 28;
  const bossBonus = isVictory ? 160 : 0;
  const goldBonus = Math.floor(state.stats.goldEarned * 0.15);
  const hpBonus = isVictory && state.maxHp > 0 ? Math.round((state.hp / state.maxHp) * 60) : 0;
  const dailyBonus =
    isVictory && state.isDaily
      ? state.dailyModifiers?.includes('elite_swarm')
        ? 180
        : 100
      : 0;

  const baseSum = floorPoints + enemyPoints + elitePoints + bossBonus + goldBonus + hpBonus + dailyBonus;
  const ascensionMultiplier = 1 + state.ascension * 0.25;
  const totalScore = Math.round(baseSum * ascensionMultiplier);

  const grade: ScoreGrade =
    totalScore >= 550
      ? 'S'
      : totalScore >= 400
      ? 'A'
      : totalScore >= 260
      ? 'B'
      : totalScore >= 140
      ? 'C'
      : 'D';

  return {
    floorPoints,
    enemyPoints,
    elitePoints,
    bossBonus,
    goldBonus,
    hpBonus,
    dailyBonus,
    ascensionMultiplier,
    totalScore,
    grade,
  };
}

export function buildRunHistoryEntry(state: RunState): RunHistoryEntry {
  const scoreRes = calculateRunScore(state);
  const totalTurns = state.stats.combatHistory.reduce((s, c) => s + c.turns, 0);
  const topCard = Object.values(state.stats.damageByCard).sort((a, b) => b.damage - a.damage)[0];

  return {
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    endedAt: new Date().toISOString(),
    heroId: state.heroId,
    victory: state.phase === 'VICTORY',
    floor: state.floor,
    ascension: state.ascension,
    seed: state.seed,
    isDaily: Boolean(state.isDaily),
    score: scoreRes.totalScore,
    grade: scoreRes.grade,
    totalTurns,
    totalDamageDealt: state.stats.totalDamageDealt,
    deckSize: state.deck.length,
    relicIds: state.relics.map((r) => r.id),
    mvpCardId: topCard && topCard.damage > 0 ? topCard.defId : undefined,
  };
}
