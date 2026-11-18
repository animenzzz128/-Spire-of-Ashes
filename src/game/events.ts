import { EventState, RunState } from './types';
import { createCardInstance, getRewardPool } from './cards';
import { CARD_EN, RELIC_EN } from './i18n';
import { rollRelic } from './relics';

export function generateSpireEvent(state: RunState): EventState {
  const templates: (() => EventState)[] = [
    () => ({
      id: 'golden_idol',
      title: '余烬神龛',
      body: '走廊尽头的黑曜石壁龛中供奉着一尊熔金雕像，基座下方隐约传来机关齿轮的咔嗒声。你可以伸手摘取金像，或者向神龛献上一缕鲜血祈求祝福。',
      resolved: false,
      options: [
        {
          id: 'take_gold',
          label: '夺取熔金神像',
          hint: '获得 120 金币，但触发机关失去 10 点生命。',
        },
        {
          id: 'pray_blood',
          label: '献祭鲜血祈祷',
          hint: '失去 7 点生命，随机升级 1 张卡牌。',
          disabled: state.hp <= 7,
        },
        {
          id: 'leave',
          label: '静默绕行离开',
          hint: '回复 5 点生命，安然离去。',
        },
      ],
    }),
    () => ({
      id: 'wandering_smith',
      title: '流浪铁匠的残炉',
      body: '一位双目蒙着黑布的矮人铁匠正蹲在尚有余温的熔炉旁敲打铁砧。他听见你的脚步声，沙哑地问道：“旅人，要淬炼锋芒，还是削去累赘？”',
      resolved: false,
      options: [
        {
          id: 'forge_random',
          label: '淬炼牌组',
          hint: '花费 45 金币，随机升级 2 张未升级的卡牌。',
          disabled: state.gold < 45,
        },
        {
          id: 'remove_weak',
          label: '熔毁杂牌',
          hint: '免费从牌组中永久移除一张基础打击或防御牌。',
        },
        {
          id: 'buy_relic',
          label: '重金求购遗物',
          hint: '花费 90 金币，获得 1 件随机遗物。',
          disabled: state.gold < 90,
        },
      ],
    }),
    () => ({
      id: 'whispering_fountain',
      title: '低语泉眼',
      body: '石缝中渗出泛着微弱幽光的银色泉水，水面映照出你过去战败或胜利的幻影。饮下它或许能重塑体魄，但未知的代价潜伏其中。',
      resolved: false,
      options: [
        {
          id: 'drink_deep',
          label: '痛饮泉水',
          hint: '回复 22 点生命，并将 1 张随机稀有卡牌加入牌组。',
        },
        {
          id: 'wash_blades',
          label: '用泉水淬洗武器',
          hint: '永久提升最大生命上限 +6。',
        },
        {
          id: 'toss_coin',
          label: '投入 25 金币许愿',
          hint: '获得一件遗物，或 50% 概率失去 6 点生命并获得 85 金币。',
          disabled: state.gold < 25,
        },
      ],
    }),
    () => ({
      id: 'abyssal_altar',
      title: '深渊契约祭坛',
      body: '刻满古老符文的黑铁祭坛散发着灼人的热浪。石碑上写着：“以凡躯换取神威，以痛楚换取秘宝。”',
      resolved: false,
      options: [
        {
          id: 'claim_relic',
          label: '缔结血之契约',
          hint: '失去 12 点生命，立刻获得 1 件强力遗物。',
          disabled: state.hp <= 12,
        },
        {
          id: 'claim_apotheosis',
          label: '抄录神化卷轴',
          hint: '失去 10 点生命与 30 金币，获得稀有无色牌【神化升华】。',
          disabled: state.hp <= 10 || state.gold < 30,
        },
        {
          id: 'walk_away',
          label: '摧毁符文离开',
          hint: '无事发生，安全返回塔层路径。',
        },
      ],
    }),
  ];

  const picked = templates[Math.floor(Math.random() * templates.length)];
  return picked();
}

export function resolveEventOption(state: RunState, optionId: string): RunState {
  if (!state.event || state.event.resolved) return state;

  let next: RunState = {
    ...state,
    deck: [...state.deck],
    relics: [...state.relics],
    stats: { ...state.stats },
  };
  let outcome = '';
  let outcomeEn = '';

  switch (optionId) {
    case 'take_gold': {
      next.gold += 120;
      next.stats.goldEarned += 120;
      const lost = Math.min(Math.max(0, next.hp - 1), 10);
      next.hp = Math.max(1, next.hp - 10);
      next.stats.hpLost += lost;
      outcome = '你飞快抓起熔金神像！暗箭擦过肩胛造成 10 点伤害，但你收获了 120 枚沉甸甸的金币。';
      outcomeEn = 'You snatch the molten idol! A hidden dart grazes your shoulder for 10 damage, but you pocket 120 Gold.';
      break;
    }
    case 'pray_blood': {
      const lost = Math.min(Math.max(0, next.hp - 1), 7);
      next.hp = Math.max(1, next.hp - 7);
      next.stats.hpLost += lost;
      const unupgraded = next.deck.filter((c) => !c.upgraded);
      if (unupgraded.length > 0) {
        const target = unupgraded[Math.floor(Math.random() * unupgraded.length)];
        next.deck = next.deck.map((c) => (c.uid === target.uid ? { ...c, upgraded: true } : c));
        outcome = '鲜血渗入石缝，神龛微光亮起，你的一张卡牌获得了淬炼升级（+）！';
        outcomeEn = 'Your blood seeps into the stone. The shrine shimmers, upgrading 1 card in your deck (+).';
      } else {
        next.maxHp += 5;
        next.hp = Math.min(next.maxHp, next.hp + 5);
        next.stats.hpHealed += 5;
        outcome = '你的牌组已臻化境，神龛为你提升了 5 点最大生命上限。';
        outcomeEn = 'Your deck is already perfected. The shrine grants you +5 Max HP instead.';
      }
      break;
    }
    case 'leave': {
      const heal = Math.min(5, next.maxHp - next.hp);
      next.hp += heal;
      next.stats.hpHealed += heal;
      outcome = `你克制住贪念，在静谧走廊中喘息片刻，回复了 ${heal} 点生命。`;
      outcomeEn = `You resist temptation and catch your breath in the quiet hall, recovering ${heal} HP.`;
      break;
    }
    case 'forge_random': {
      next.gold -= 45;
      const targets = next.deck.filter((c) => !c.upgraded).slice(0, 2);
      const uids = new Set(targets.map((t) => t.uid));
      next.deck = next.deck.map((c) => (uids.has(c.uid) ? { ...c, upgraded: true } : c));
      outcome = `铁匠挥锤敲击两声，牌组中的 ${targets.length} 张卡牌淬炼升级！`;
      outcomeEn = `The smith strikes his anvil twice, upgrading ${targets.length} card(s) in your deck!`;
      break;
    }
    case 'remove_weak': {
      const starterIdx = next.deck.findIndex(
        (c) =>
          c.defId === 'iron_strike' ||
          c.defId === 'iron_defend' ||
          c.defId === 'shadow_strike' ||
          c.defId === 'shadow_defend'
      );
      if (starterIdx >= 0) {
        next.deck.splice(starterIdx, 1);
        outcome = '一张基础卡牌被投入炽热熔炉化为青烟，你的抽牌循环变得更加精炼！';
        outcomeEn = 'A basic starter card is cast into the furnace, sharpening your draw cycle!';
      } else if (next.deck.length > 5) {
        next.deck.pop();
        outcome = '一张冗余卡牌被熔毁，牌组更加紧凑。';
        outcomeEn = 'A spare card is smelted away, leaving your deck leaner.';
      } else {
        outcome = '铁匠摸了摸你的卡盒：“你的牌组已经足够精锐了。”';
        outcomeEn = 'The smith inspects your deck: "Your hand is already sharp enough."';
      }
      break;
    }
    case 'buy_relic': {
      next.gold -= 90;
      const relic = rollRelic(next.relics.map((r) => r.id));
      next.relics.push(relic);
      const relicEn = RELIC_EN[relic.id];
      outcome = `矮人从披风里掏出【${relic.name}】递给你：${relic.description}`;
      outcomeEn = `The smith hands you [${relicEn?.name || relic.name}]: ${relicEn?.desc || relic.description}`;
      break;
    }
    case 'drink_deep': {
      const healed = Math.min(22, next.maxHp - next.hp);
      next.hp += healed;
      next.stats.hpHealed += healed;
      const rares = getRewardPool(next.heroId).filter((c) => c.rarity === 'rare');
      const picked = rares[Math.floor(Math.random() * rares.length)];
      if (picked) {
        next.deck.push(createCardInstance(picked.id, false));
        const pickedEn = CARD_EN[picked.id]?.name || picked.name;
        outcome = `清冽泉水回复了 ${healed} 点生命，你在泉底发现并习得了稀有卡牌【${picked.name}】！`;
        outcomeEn = `The spring restores ${healed} HP and reveals a Rare card: [${pickedEn}]!`;
      } else {
        outcome = `清冽泉水回复了 ${healed} 点生命。`;
        outcomeEn = `The cool spring restores ${healed} HP.`;
      }
      break;
    }
    case 'wash_blades': {
      next.maxHp += 6;
      next.hp += 6;
      next.stats.hpHealed += 6;
      outcome = '银泉洗去兵刃与甲胄的疲惫，最大生命上限永久提升 +6！';
      outcomeEn = 'Silver water tempers your blade and armor, granting +6 Max HP!';
      break;
    }
    case 'toss_coin': {
      next.gold -= 25;
      if (Math.random() < 0.5) {
        const relic = rollRelic(next.relics.map((r) => r.id));
        next.relics.push(relic);
        const relicEn = RELIC_EN[relic.id];
        outcome = `泉水涌起金色波纹，浮现出遗物【${relic.name}】！`;
        outcomeEn = `Golden ripples surface from the spring, granting [${relicEn?.name || relic.name}]!`;
      } else {
        const lost = Math.min(Math.max(0, next.hp - 1), 6);
        next.hp = Math.max(1, next.hp - 6);
        next.stats.hpLost += lost;
        next.gold += 85;
        next.stats.goldEarned += 85;
        outcome = '泉眼喷出灼热蒸汽造成 6 点伤害，但泉底震出了 85 枚古旧金币！';
        outcomeEn = 'Scalding steam erupts for 6 damage, yet 85 ancient Gold coins wash ashore!';
      }
      break;
    }
    case 'claim_relic': {
      const lost = Math.min(Math.max(0, next.hp - 1), 12);
      next.hp = Math.max(1, next.hp - 12);
      next.stats.hpLost += lost;
      const relic = rollRelic(next.relics.map((r) => r.id), true);
      next.relics.push(relic);
      const relicEn = RELIC_EN[relic.id];
      outcome = `鲜血染红祭坛，你承受 12 点伤害并获得了遗物【${relic.name}】！`;
      outcomeEn = `Crimson stains the altar. You take 12 damage and claim [${relicEn?.name || relic.name}]!`;
      break;
    }
    case 'claim_apotheosis': {
      const lost = Math.min(Math.max(0, next.hp - 1), 10);
      next.hp = Math.max(1, next.hp - 10);
      next.stats.hpLost += lost;
      next.gold -= 30;
      next.deck.push(createCardInstance('apotheosis', false));
      outcome = '你强忍灼痛抄录完毕，稀有无色牌【神化升华】已加入牌组！';
      outcomeEn = 'Through searing heat you transcribe the scroll. [Apotheosis] is added to your deck!';
      break;
    }
    default: {
      outcome = '你震碎了祭坛表面的邪恶符文，转身踏入下一段阶梯。';
      outcomeEn = 'You shatter the cursed runes and step toward the upper stairwell.';
      break;
    }
  }

  return {
    ...next,
    event: {
      ...state.event,
      resolved: true,
      outcomeText: outcome,
      outcomeTextEn: outcomeEn,
    },
  };
}
