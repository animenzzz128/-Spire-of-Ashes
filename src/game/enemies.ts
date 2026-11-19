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
    metallicize: 0,
    ritual: 0,
    barricade: false,
    artifact: 0,
    blur: 0,
    doubleDamageNextTurn: false,
    demonForm: 0,
    noxiousFumes: 0,
    envenom: 0,
    corpseExplosion: false,
    noDrawThisTurn: false,
  };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function computeEnemyNextIntent(enemy: EnemyInstance, nextTurn: number): EnemyIntent {
  const id = enemy.defId;

  if (id === 'cultist') {
    if (nextTurn === 1) {
      return {
        type: 'buff',
        gainRitual: 3,
        label: '黑暗仪式 · 每回合获得 3 力量',
      };
    }
    return {
      type: 'attack',
      damage: 6,
      hits: 1,
      label: '暗影爪击',
    };
  }

  if (id === 'jaw_worm') {
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

  if (id === 'acid_slime') {
    const cycle = nextTurn % 3;
    if (cycle === 1) {
      return {
        type: 'attack_debuff',
        damage: 7,
        hits: 1,
        addStatusCardId: 'slimed',
        addStatusCount: 1,
        label: '粘液喷吐 · 塞入 1 张粘膜',
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

  if (id === 'acid_slime_small') {
    if (nextTurn % 2 === 1) {
      return { type: 'attack', damage: 6, hits: 1, label: '酸液弹射' };
    }
    return { type: 'debuff', applyWeak: 1, label: '腐蚀舔舐 · 虚弱 1' };
  }

  if (id === 'looter') {
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
  if (id === 'gremlin_nob') {
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

  if (id === 'lagavulin') {
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

  if (id === 'sentry') {
    // 甲 and 丙 share a phase, 乙 alternates. (The old check also looked at the
    // random uid suffix, which could put both twins in the same phase.)
    const offset = enemy.name.includes('乙') ? 1 : 0;
    if ((nextTurn + offset) % 2 === 1) {
      return {
        type: 'debuff',
        addStatusCardId: 'wound',
        addStatusCount: 1,
        statusToDrawPile: true,
        label: '脉冲干扰 · 抽牌堆塞入 1 张伤口',
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
      // Metallicize grows +2 per cycle and caps at 8, so attack decks are not
      // locked out by ever-stacking armor (it used to grow +4 with no cap).
      const metallicizeGain = enemy.statuses.metallicize < 8 ? 2 : 0;
      return {
        type: 'buff',
        gainStrength: 2,
        gainMetallicize: metallicizeGain || undefined,
        block: 8,
        label: metallicizeGain ? '熔芯超载 · 力量+2 & 护甲' : '熔芯超载 · 力量+2 & 格挡',
      };
    }
    return {
      type: 'attack',
      damage: 28,
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
  opts?: { isElite?: boolean; isBoss?: boolean; metallicize?: number; artifact?: number; thorns?: number; asleep?: boolean; enraged?: boolean }
): EnemyInstance {
  const statuses = emptyStatusMap();
  if (opts?.metallicize) statuses.metallicize = opts.metallicize;
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
      makeEnemy('obsidian_warden', '黑曜守望者', '塔顶终焉巨像', 220, 'boss_warden', {
        isBoss: true,
        artifact: 2,
      }),
    ];
  }

  if (type === 'elite') {
    const roll = Math.random();
    if (roll < 0.34) {
      return [
        makeEnemy('gremlin_nob', '狂怒地精贵族', '精英守卫 · 厌恶法术', 80, 'nob', {
          isElite: true,
        }),
      ];
    }
    if (roll < 0.67) {
      return [
        makeEnemy('lagavulin', '沉睡石像鬼', '精英守卫 · 金属甲壳', 100, 'lagavulin', {
          isElite: true,
          asleep: true,
          metallicize: 6,
        }),
      ];
    }
    return [
      makeEnemy('sentry', '古代哨兵·甲', '精英三联 · 干扰脉冲', 40, 'sentry', {
        isElite: true,
        artifact: 1,
      }),
      makeEnemy('sentry', '古代哨兵·乙', '精英三联 · 奥术光束', 42, 'sentry', {
        isElite: true,
        artifact: 1,
      }),
      makeEnemy('sentry', '古代哨兵·丙', '精英三联 · 干扰脉冲', 40, 'sentry', {
        isElite: true,
        artifact: 1,
      }),
    ];
  }

  // Normal encounters ramp in four tiers so difficulty climbs gradually
  // instead of jumping from single enemies (floors 1-4) to full pairs (floor 5).
  const weakSingle = (): EnemyInstance[] => {
    const roll = Math.random();
    if (roll < 0.34) return [makeEnemy('cultist', '深红狂信徒', '献祭学徒', randInt(44, 50), 'cultist')];
    if (roll < 0.67) return [makeEnemy('jaw_worm', '深渊颚虫', '甲壳掠食者', randInt(40, 46), 'jawworm')];
    return [makeEnemy('acid_slime', '大型酸液史莱姆', '腐蚀魔物', randInt(48, 54), 'slime')];
  };
  const smallSlime = (name: string) =>
    makeEnemy('acid_slime_small', name, '腐蚀随从', randInt(24, 28), 'slime');

  // Tier 1 (floors 1-2): weak singles
  if (floor <= 2) return weakSingle();

  // Tier 2 (floors 3-4): weak or strong singles
  if (floor <= 4) {
    const roll = Math.random();
    if (roll < 0.5) return weakSingle();
    if (roll < 0.75) {
      return [makeEnemy('looter', '尖塔掠夺者', '蒙面刺客', randInt(44, 48), 'looter')];
    }
    return [
      makeEnemy('bone_knight', '骸骨护卫', '不死盾兵', randInt(52, 56), 'boneknight', { thorns: 1 }),
    ];
  }

  // Tier 3 (floors 5-7): light pairs or a strong single
  if (floor <= 7) {
    const roll = Math.random();
    if (roll < 0.35) {
      return [smallSlime('小型酸液史莱姆·甲'), smallSlime('小型酸液史莱姆·乙')];
    }
    if (roll < 0.7) {
      return [
        makeEnemy('looter', '尖塔掠夺者', '蒙面刺客', randInt(44, 48), 'looter'),
        smallSlime('小型酸液史莱姆'),
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
  const roll = Math.random();
  if (roll < 0.2) {
    return scaled([
      makeEnemy('looter', '尖塔掠夺者', '蒙面刺客', randInt(46, 52), 'looter'),
      makeEnemy('acid_slime', '小型酸液史莱姆', '腐蚀随从', randInt(28, 34), 'slime'),
    ]);
  }
  if (roll < 0.4) {
    return scaled([
      makeEnemy('bone_knight', '骸骨护卫', '不死盾兵', randInt(58, 66), 'boneknight', { thorns: 2 }),
    ]);
  }
  if (roll < 0.7) {
    return scaled([
      makeEnemy('cultist', '狂热信徒', '仪式施法者', randInt(48, 54), 'cultist'),
      makeEnemy('jaw_worm', '巨型颚虫', '护卫兽', randInt(42, 48), 'jawworm'),
    ]);
  }
  return scaled([
    makeEnemy('bone_knight', '骸骨重骑', '沉铁卫士', randInt(52, 58), 'boneknight'),
    makeEnemy('looter', '影刃劫匪', '暗巷匪徒', randInt(40, 46), 'looter'),
  ]);
}
