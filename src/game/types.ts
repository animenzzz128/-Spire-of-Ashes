export type HeroClassId = 'ironwarden' | 'shadowweaver';

export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special';
export type CardTarget = 'enemy' | 'all_enemies' | 'self' | 'none';
export type CardPool = HeroClassId | 'neutral' | 'status';

export interface StatusMap {
  strength: number;
  dexterity: number;
  vulnerable: number;
  weak: number;
  frail: number;
  poison: number;
  thorns: number;
  ironhide: number;
  zeal: number;
  bastion: boolean;
  artifact: number;
  shade: number; // retain block for N turns
  doubleDamageNextTurn: boolean;
  infernalAvatar: number;
  miasma: number;
  venomEdge: number;
  rotburst: boolean;
  noDrawThisTurn: boolean;
}

export interface CardDef {
  id: string;
  name: string;
  pool: CardPool;
  type: CardType;
  rarity: CardRarity;
  target: CardTarget;
  cost: number; // -1 for X cost, -2 for unplayable
  upgradedCost?: number;
  damage?: number;
  upgradedDamage?: number;
  hits?: number;
  upgradedHits?: number;
  block?: number;
  upgradedBlock?: number;
  draw?: number;
  upgradedDraw?: number;
  gainEnergy?: number;
  upgradedGainEnergy?: number;
  loseHp?: number;
  healHp?: number;
  strengthMult?: number;
  upgradedStrengthMult?: number;
  applyVulnerable?: number;
  upgradedApplyVulnerable?: number;
  applyWeak?: number;
  upgradedApplyWeak?: number;
  applyPoison?: number;
  upgradedApplyPoison?: number;
  doublePoison?: number; // 2 = double, 3 = triple
  upgradedDoublePoison?: number;
  gainStrength?: number;
  upgradedGainStrength?: number;
  gainDexterity?: number;
  upgradedGainDexterity?: number;
  gainIronhide?: number;
  upgradedGainIronhide?: number;
  gainArtifact?: number;
  upgradedGainArtifact?: number;
  gainShade?: number;
  addKnives?: number;
  upgradedAddKnives?: number;
  discardCount?: number;
  blockAsDamage?: boolean;
  lifesteal?: boolean;
  upgradeAllInCombat?: boolean;
  doubleNextTurn?: boolean;
  rotburst?: boolean;
  infernalAvatar?: number;
  upgradedInfernalAvatar?: number;
  miasma?: number;
  upgradedMiasma?: number;
  venomEdge?: number;
  bastion?: boolean;
  noMoreDraw?: boolean;
  exhaust?: boolean;
  upgradedExhaust?: boolean;
  ethereal?: boolean;
  innate?: boolean;
  endTurnBurn?: number;
  achingCurse?: boolean;
  description: string;
  upgradedDescription?: string;
  artKey: string;
}

export interface CardInstance {
  uid: string;
  defId: string;
  upgraded: boolean;
}

export type IntentType =
  | 'attack'
  | 'attack_defend'
  | 'attack_debuff'
  | 'defend'
  | 'buff'
  | 'debuff'
  | 'sleep';

export interface EnemyIntent {
  type: IntentType;
  damage?: number;
  hits?: number;
  block?: number;
  applyVulnerable?: number;
  applyWeak?: number;
  applyFrail?: number;
  gainStrength?: number;
  gainZeal?: number;
  gainIronhide?: number;
  gainThorns?: number;
  addStatusCardId?: string;
  addStatusCount?: number;
  statusToDrawPile?: boolean; // shuffle status cards into the draw pile instead of discard
  grantsEnrage?: boolean; // after this intent resolves, the enemy gains Strength whenever the player plays a Skill
  label: string;
}

export type EnemyArtType =
  | 'ember_zealot'
  | 'caustic_ooze'
  | 'cinder_burrower'
  | 'ash_marauder'
  | 'boneknight'
  | 'cinderhorn_brute'
  | 'slumbering_gargoyle'
  | 'glyph_totem'
  | 'boss_warden';

export interface EnemyInstance {
  uid: string;
  defId: string;
  name: string;
  title: string;
  isElite: boolean;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusMap;
  intent: EnemyIntent;
  turnCount: number;
  artType: EnemyArtType;
  asleep?: boolean;
  enraged?: boolean; // Cinderhorn Brute gains strength when player plays skills
  splitTriggered?: boolean;
  bossPhase2Triggered?: boolean;
}

export interface RelicDef {
  id: string;
  name: string;
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'boss';
  description: string;
  iconKey: string;
}

export interface PotionDef {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare';
  target: 'enemy' | 'self';
  description: string;
  color: string;
}

export type NodeType =
  | 'monster'
  | 'elite'
  | 'rest'
  | 'event'
  | 'shop'
  | 'treasure'
  | 'boss';

export interface MapNode {
  id: string;
  floor: number; // 1..15
  col: number; // 0..6
  type: NodeType;
  nextIds: string[];
  visited: boolean;
}

// Locale-neutral combat message. The engine emits these; the UI translates them
// with tCombatMsg() so floating text and the combat log follow the language toggle.
export type CombatMsgKey =
  | 'damage'
  | 'blocked'
  | 'gainBlock'
  | 'gainStrength'
  | 'gainDexterity'
  | 'gainIronhide'
  | 'gainArtifact'
  | 'gainEnergy'
  | 'gainZeal'
  | 'curseAche'
  | 'thorns'
  | 'burn'
  | 'poisonTick'
  | 'heal'
  | 'draw'
  | 'enrage'
  | 'artifactBlocked'
  | 'applyVulnerable'
  | 'applyWeak'
  | 'applyFrail'
  | 'applyPoison'
  | 'rotburstMark'
  | 'notchedBlade'
  | 'fleetRibbon'
  | 'cinderglassWard'
  | 'watchmanHorn'
  | 'nightTerror'
  | 'infernalAvatar'
  | 'upgradeAll'
  | 'bossPhase2'
  | 'statusCards'
  | 'statusCardsDraw'
  | 'logEnterCombat'
  | 'logCinderHourglass'
  | 'logPlayCard'
  | 'logUsePotion'
  | 'logBossPhase2';

export interface CombatMsg {
  key: CombatMsgKey;
  n?: number;
  ref?: string; // card / potion / enemy def id
  name?: string; // Chinese display-name fallback for ref
  upgraded?: boolean;
}

// Saves made before CombatMsg existed hold plain Chinese strings; keep reading them.
export type CombatLogEntry = string | CombatMsg;

export interface FloatingText {
  id: string;
  targetUid: string; // 'player' or enemy uid
  msg: CombatMsg;
  tone: 'damage' | 'block' | 'heal' | 'poison' | 'buff' | 'debuff';
}

export type CombatVfxType =
  | 'slash_heavy'
  | 'slash_crimson'
  | 'slash_shadow'
  | 'enemy_slash'
  | 'shield'
  | 'poison'
  | 'power';

export interface CombatVfx {
  id: string;
  targetUid: string; // 'player' or enemy uid
  type: CombatVfxType;
}

export interface CombatState {
  turn: number;
  energy: number;
  maxEnergy: number;
  playerBlock: number;
  playerStatuses: StatusMap;
  doubleDamageActive: boolean;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  enemies: EnemyInstance[];
  attacksPlayedThisTurn: number;
  cardsPlayedThisTurn: number;
  pendingDiscard?: {
    sourceCardUid: string;
    remaining: number;
  };
  isBossFight: boolean;
  isEliteFight: boolean;
  enemyTurnInProgress: boolean;
  combatDamageDealt?: number;
  combatDamageBlocked?: number;
  combatDamageTaken?: number;
  log: CombatLogEntry[];
}

export interface RewardState {
  gold: number;
  goldClaimed: boolean;
  cardChoices: CardInstance[];
  cardClaimed: boolean;
  relic?: RelicDef;
  relicClaimed: boolean;
  potion?: PotionDef;
  potionClaimed: boolean;
}

export interface ShopCardItem {
  card: CardInstance;
  price: number;
  sold: boolean;
}

export interface ShopRelicItem {
  relic: RelicDef;
  price: number;
  sold: boolean;
}

export interface ShopPotionItem {
  potion: PotionDef;
  price: number;
  sold: boolean;
}

export interface ShopState {
  cards: ShopCardItem[];
  relics: ShopRelicItem[];
  potions: ShopPotionItem[];
  removePrice: number;
  removedThisVisit: boolean;
}

export interface EventOption {
  id: string;
  label: string;
  hint: string;
  disabled?: boolean;
}

export interface EventState {
  id: string;
  title: string;
  body: string;
  options: EventOption[];
  outcomeText?: string;
  outcomeTextEn?: string;
  resolved: boolean;
}

export interface TreasureState {
  relic: RelicDef;
  gold: number;
  opened: boolean;
}

export type GamePhase =
  | 'TITLE'
  | 'MAP'
  | 'COMBAT'
  | 'REWARD'
  | 'REST'
  | 'EVENT'
  | 'SHOP'
  | 'TREASURE'
  | 'VICTORY'
  | 'DEFEAT';

export interface CardDamageStat {
  defId: string;
  name: string;
  damage: number;
  plays: number;
}

export interface CombatHistoryEntry {
  floor: number;
  turns: number;
  damageDealt: number;
  damageBlocked: number;
  damageTaken: number;
}

export interface RunStats {
  floorsCleared: number;
  enemiesDefeated: number;
  elitesDefeated: number;
  cardsPlayed: number;
  totalDamageDealt: number;
  attackDamageDealt: number;
  poisonDamageDealt: number;
  relicDamageDealt: number;
  blockGained: number;
  damageBlocked: number;
  hpLost: number;
  hpHealed: number;
  cardsByType: {
    attack: number;
    skill: number;
    power: number;
  };
  damageByCard: Record<string, CardDamageStat>;
  combatHistory: CombatHistoryEntry[];
  goldEarned: number;
}

export interface HeroClassDef {
  id: HeroClassId;
  name: string;
  englishName: string;
  subtitle: string;
  maxHp: number;
  startingGold: number;
  starterRelicId: string;
  portraitUrl: string;
  standeeUrl: string;
  accentColor: string;
  archetypes: string[];
  description: string;
}

export interface RunState {
  phase: GamePhase;
  heroId: HeroClassId;
  hp: number;
  maxHp: number;
  gold: number;
  ascension: number;
  floor: number; // 0 = before floor 1, 1..15
  deck: CardInstance[];
  relics: RelicDef[];
  potions: (PotionDef | null)[];
  map: MapNode[];
  currentNodeId: string | null;
  combat: CombatState | null;
  reward: RewardState | null;
  shop: ShopState | null;
  event: EventState | null;
  treasure: TreasureState | null;
  stats: RunStats;
  rarePity?: number; // card-reward rare bonus; optional so older saves load
  lastDamageTargetUid?: string;
  lastAttackerUid?: string;
}
