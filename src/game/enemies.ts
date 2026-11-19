import { rng } from './rng';
import { BALANCE } from './balance';
import { nextUid } from './cards';
import { EnemyInstance, EnemyIntent, StatusMap } from './types';

export function emptyStatusMap(): StatusMap {
  return {
    strength: 0,
    dexterity: 0,
    vulnerable: 0,
    weak: 0,
    frail: 0,
    poison: 0,
    thorns: 0,
    ironhide: 0,
    zeal: 0,
    bastion: false,
    artifact: 0,
    shade: 0,
    doubleDamageNextTurn: false,
    infernalAvatar: 0,
    miasma: 0,
    venomEdge: 0,
    rotburst: false,
    noDrawThisTurn: false,
  };
}

// Damage needed to interrupt a charged attack (the Obsidian Warden's laser).
// Tuned in balance.ts; see docs/design/p2-embers-design.md section 3.4.
export function bossChargeThreshold(ascension: number): number {
  return ascension >= 9 ? BALANCE.chargeThresholdA9 : BALANCE.chargeThreshold;
}

function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function computeEnemyNextIntent(enemy: EnemyInstance, nextTurn: number): EnemyIntent {
  const id = enemy.defId;

  if (id === 'ember_zealot') {
    if (nextTurn === 1) {
      return {
        type: 'buff',
        gainZeal: 3,
        label: '狂热祷言 · 每回合获得 3 力量',
      };
    }
    return {
      type: 'attack',
      damage: 6,
      hits: 1,
      label: '暗影爪击',
    };
  }

  if (id === 'cinder_burrower') {
    if (nextTurn === 1) {
      return { type: 'attack', damage: 11, hits: 1, label: '凶猛撕咬' };
    }
    const cycle = (nextTurn - 1) % 3;
    if (cycle === 1) {
      return {
        type: 'defend',
        block: 6,
        gainStrength: 3,
        label: '咆哮硬化 · 力量+3 & 格挡',
      };
    }
    if (cycle === 2) {
      return {
        type: 'attack_defend',
        damage: 7,
        hits: 1,
        block: 5,
        label: '铁甲冲撞',
      };
    }
    return { type: 'attack', damage: 11, hits: 1, label: '凶猛撕咬' };
  }

  if (id === 'caustic_ooze') {
    const cycle = nextTurn % 3;
    if (cycle === 1) {
      return {
        type: 'attack_debuff',
        damage: 7,
        hits: 1,
        addStatusCardId: 'caustic_residue',
        addStatusCount: 1,
        label: '腐液喷吐 · 塞入 1 张残渣',
      };
    }
    if (cycle === 2) {
      return {
        type: 'debuff',
        applyWeak: 2,
        label: '腐蚀舔舐 · 虚弱 2',
      };
    }
    return { type: 'attack', damage: 10, hits: 1, label: '酸液重压' };
  }

  if (id === 'lesser_ooze') {
    if (nextTurn % 2 === 1) {
      return { type: 'attack', damage: 6, hits: 1, label: '酸液弹射' };
    }
    return { type: 'debuff', applyWeak: 1, label: '腐蚀舔舐 · 虚弱 1' };
  }

  if (id === 'ash_marauder') {
    if (nextTurn <= 2) {
      return { type: 'attack', damage: 10, hits: 1, label: '劫掠突刺' };
    }
    if (nextTurn === 3) {
      return { type: 'attack_defend', damage: 12, hits: 1, block: 6, label: '烟幕掩护' };
    }
    return { type: 'attack', damage: 14, hits: 1, label: '绝命背刺' };
  }

  if (id === 'bone_knight') {
    const cycle = nextTurn % 3;
    if (cycle === 1) {
      return {
        type: 'attack_defend',
        damage: 9,
        hits: 1,
        block: 8,
        label: '盾击突进',
      };
    }
    if (cycle === 2) {
      return {
        type: 'attack',
        damage: 6,
        hits: 2,
        label: '双连骨斩',
      };
    }
    return {
      type: 'debuff',
      applyFrail: 2,
      applyVulnerable: 1,
      label: '破甲诅咒 · 脆弱 & 易伤',
    };
  }

  // === ELITES ===
  if (id === 'cinderhorn_brute') {
    if (nextTurn === 1) {
      return {
        type: 'buff',
        grantsEnrage: true,
        label: '狂暴怒吼 · 之后你每打出技能牌，我力量+2',
      };
    }
    if (nextTurn % 3 === 2) {
      return {
        type: 'attack_debuff',
        damage: 8,
        hits: 1,
        applyVulnerable: 2,
        label: '碎颅重锤 · 易伤 2',
      };
    }
    return { type: 'attack', damage: 16, hits: 1, label: '狂暴冲撞' };
  }

  if (id === 'slumbering_gargoyle') {
    if (enemy.asleep && nextTurn <= 2) {
      return { type: 'sleep', label: '沉睡防御中 · 受到伤害将苏醒' };
    }
    const cycle = (nextTurn - 1) % 3;
    if (cycle === 2) {
      return {
        type: 'debuff',
        applyWeak: 1,
        applyFrail: 1,
        label: '灵魂虹吸 · 虚弱 & 脆弱',
      };
    }
    return { type: 'attack', damage: 18, hits: 1, label: '巨爪横扫' };
  }

  if (id === 'glyph_totem') {
    // 甲 and 丙 share a phase, 乙 alternates. (The old check also looked at the
    // random uid suffix, which could put both twins in the same phase.)
    const offset = enemy.name.includes('乙') ? 1 : 0;
    if ((nextTurn + offset) % 2 === 1) {
      return {
        type: 'debuff',
        addStatusCardId: 'wound',
        // 2 Wounds: one Stoke a turn can burn one, so the pulse still clogs.
        addStatusCount: 2,
        statusToDrawPile: true,
        label: '脉冲干扰 · 抽牌堆塞入 2 张伤口',
      };
    }
    return { type: 'attack', damage: 10, hits: 1, label: '奥术激光' };
  }

  // === FLOOR 15 BOSS: OBSIDIAN WARDEN ===
  if (id === 'obsidian_warden') {
    const cycle = ((nextTurn - 1) % 4) + 1;
    if (cycle === 1) {
      return {
        type: 'attack_defend',
        damage: 14,
        hits: 1,
        block: 10,
        label: '黑曜镇压 · 攻击并筑墙',
      };
    }
    if (cycle === 2) {
      return {
        type: 'attack_debuff',
        damage: 7,
        hits: 2,
        addStatusCardId: 'burn',
        addStatusCount: 2,
        label: '熔炉双锤 · 塞入 2 张灼伤',
      };
    }
    if (cycle === 3) {
      // P2: the Warden charges its laser instead of stacking Ironhide. Dealing
      // bossChargeThreshold() damage before it fires interrupts it (combat.ts).
      const ironhide = enemy.statuses.ironhide < 8 ? BALANCE.bossCycleIronhide : 0;
      return {
        type: 'buff',
        gainStrength: BALANCE.bossCycleStrength,
        gainIronhide: ironhide || undefined,
        block: 8,
        startsCharge: true,
        label: `熔芯蓄能 · 力量+${BALANCE.bossCycleStrength}${ironhide ? ' & 护甲' : ''}，开始蓄能`,
      };
    }
    return {
      type: 'attack',
      damage: BALANCE.bossLaser,
      hits: 1,
      label: '灭世炼狱射线',
    };
  }

  return { type: 'attack', damage: 6, hits: 1, label: '攻击' };
}

function makeEnemy(
  defId: string,
  name: string,
  title: string,
  hp: number,
  artType: EnemyInstance['artType'],
  opts?: { isElite?: boolean; isBoss?: boolean; ironhide?: number; artifact?: number; thorns?: number; asleep?: boolean; enraged?: boolean }
): EnemyInstance {
  const statuses = emptyStatusMap();
  if (opts?.ironhide) statuses.ironhide = opts.ironhide;
  if (opts?.artifact) statuses.artifact = opts.artifact;
  if (opts?.thorns) statuses.thorns = opts.thorns;

  const enemy: EnemyInstance = {
    uid: nextUid('enemy'),
    defId,
    name,
    title,
    isElite: Boolean(opts?.isElite),
    isBoss: Boolean(opts?.isBoss),
    hp,
    maxHp: hp,
    block: opts?.asleep ? 8 : 0,
    statuses,
    intent: { type: 'attack', damage: 6, hits: 1, label: '准备中' },
    turnCount: 1,
    artType,
    asleep: opts?.asleep,
    enraged: opts?.enraged,
  };
  enemy.intent = computeEnemyNextIntent(enemy, 1);
  return enemy;
}

export function spawnEncounter(floor: number, type: 'monster' | 'elite' | 'boss'): EnemyInstance[] {
  if (type === 'boss') {
    return [
      makeEnemy('obsidian_warden', '黑曜守望者', '塔顶终焉巨像', BALANCE.bossHp, 'boss_warden', {
        isBoss: true,
        artifact: 2,
      }),
    ];
  }

  const scale = BALANCE.enemyHpScale;
  const withScale = (enemies: EnemyInstance[]): EnemyInstance[] =>
    scale === 1
      ? enemies
      : enemies.map((e) => {
          const hp = Math.round(e.maxHp * scale);
          return { ...e, hp, maxHp: hp };
        });
  return withScale(spawnNonBoss(floor, type));
}

function spawnNonBoss(floor: number, type: 'monster' | 'elite'): EnemyInstance[] {
  if (type === 'elite') {
    const roll = rng();
    if (roll < 0.34) {
      return [
        makeEnemy('cinderhorn_brute', '烬角蛮兽', '精英守卫 · 厌恶法术', 80, 'cinderhorn_brute', {
          isElite: true,
        }),
      ];
    }
    if (roll < 0.67) {
      return [
        makeEnemy('slumbering_gargoyle', '沉睡石像鬼', '精英守卫 · 铁肤石壳', 100, 'slumbering_gargoyle', {
          isElite: true,
          asleep: true,
          ironhide: 6,
        }),
      ];
    }
    return [
      makeEnemy('glyph_totem', '古符图腾·甲', '精英三联 · 干扰脉冲', 40, 'glyph_totem', {
        isElite: true,
        artifact: 1,
      }),
      makeEnemy('glyph_totem', '古符图腾·乙', '精英三联 · 奥术光束', 42, 'glyph_totem', {
        isElite: true,
        artifact: 1,
      }),
      makeEnemy('glyph_totem', '古符图腾·丙', '精英三联 · 干扰脉冲', 40, 'glyph_totem', {
        isElite: true,
        artifact: 1,
      }),
    ];
  }

  // Normal encounters ramp in four tiers so difficulty climbs gradually
  // instead of jumping from single enemies (floors 1-4) to full pairs (floor 5).
  const weakSingle = (): EnemyInstance[] => {
    const roll = rng();
    if (roll < 0.34) return [makeEnemy('ember_zealot', '深红狂信徒', '献祭学徒', randInt(44, 50), 'ember_zealot')];
    if (roll < 0.67) return [makeEnemy('cinder_burrower', '余烬掘地虫', '甲壳掠食者', randInt(40, 46), 'cinder_burrower')];
    return [makeEnemy('caustic_ooze', '大型腐蚀软泥', '腐蚀魔物', randInt(48, 54), 'caustic_ooze')];
  };
  const lesserOoze = (name: string) =>
    makeEnemy('lesser_ooze', name, '腐蚀随从', randInt(24, 28), 'caustic_ooze');

  // Tier 1 (floors 1-2): weak singles
  if (floor <= 2) return weakSingle();

  // Tier 2 (floors 3-4): weak or strong singles
  if (floor <= 4) {
    const roll = rng();
    if (roll < 0.5) return weakSingle();
    if (roll < 0.75) {
      return [makeEnemy('ash_marauder', '灰烬劫掠者', '蒙面刺客', randInt(44, 48), 'ash_marauder')];
    }
    return [
      makeEnemy('bone_knight', '骸骨护卫', '不死盾兵', randInt(52, 56), 'boneknight', { thorns: 1 }),
    ];
  }

  // Tier 3 (floors 5-7): light pairs or a strong single
  if (floor <= 7) {
    const roll = rng();
    if (roll < 0.35) {
      return [lesserOoze('小型腐蚀软泥·甲'), lesserOoze('小型腐蚀软泥·乙')];
    }
    if (roll < 0.7) {
      return [
        makeEnemy('ash_marauder', '灰烬劫掠者', '蒙面刺客', randInt(44, 48), 'ash_marauder'),
        lesserOoze('小型腐蚀软泥'),
      ];
    }
    return [
      makeEnemy('bone_knight', '骸骨护卫', '不死盾兵', randInt(58, 66), 'boneknight', { thorns: 2 }),
    ];
  }

  // Tier 4 (floors 8-14): full pairs, HP +3% per floor above 8
  const hpScale = 1 + 0.03 * (floor - 8);
  const scaled = (enemies: EnemyInstance[]) =>
    enemies.map((e) => {
      const hp = Math.round(e.maxHp * hpScale);
      return { ...e, hp, maxHp: hp };
    });
  const roll = rng();
  if (roll < 0.2) {
    return scaled([
      makeEnemy('ash_marauder', '灰烬劫掠者', '蒙面刺客', randInt(46, 52), 'ash_marauder'),
      makeEnemy('caustic_ooze', '小型腐蚀软泥', '腐蚀随从', randInt(28, 34), 'caustic_ooze'),
    ]);
  }
  if (roll < 0.4) {
    return scaled([
      makeEnemy('bone_knight', '骸骨护卫', '不死盾兵', randInt(58, 66), 'boneknight', { thorns: 2 }),
    ]);
  }
  if (roll < 0.7) {
    return scaled([
      makeEnemy('ember_zealot', '狂热信徒', '献火祭司', randInt(48, 54), 'ember_zealot'),
      makeEnemy('cinder_burrower', '巨型掘地虫', '护卫兽', randInt(42, 48), 'cinder_burrower'),
    ]);
  }
  return scaled([
    makeEnemy('bone_knight', '骸骨重骑', '沉铁卫士', randInt(52, 58), 'boneknight'),
    makeEnemy('ash_marauder', '影刃劫匪', '暗巷匪徒', randInt(40, 46), 'ash_marauder'),
  ]);
}
