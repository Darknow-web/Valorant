export enum StatType {
  SKILL = 'HABILIDAD (Maestría)',
  GOLD = 'ORO (Tesorería)',
  FOCUS = 'FOCUS (Disciplina)',
  CHAR = 'CHAR (Carisma)',
  HP_MP = 'HP/MP (Resistencia)',
  MORAL = 'MORAL (Recreación)',
}

export enum QuestType {
  DAILY = 'Diaria',
  WEEKLY = 'Semanal',
  MONTHLY = 'Mensual',
}

export enum QuestLevel {
  L1 = 'Nivel 1 (PC)',
  L2 = 'Nivel 2 (Rango)',
  L3 = 'Nivel 3 (Stream)',
}

export interface Stat {
  id: string;
  name: string;
  type: StatType;
  level: number;
  currentXP: number;
  maxXP: number;
}

export interface Quest {
  id: string;
  name: string;
  objective: string; // New field
  type: QuestType;
  levelAssoc: QuestLevel;
  xpReward: number;
  coinReward: number;
  statAssoc: StatType;
  completed: boolean;
  isAiGenerated?: boolean;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export interface EpicProjectItem {
  id: string;
  name: string;
  completed: boolean;
}

export interface EpicProject {
  id: string;
  name: string;
  description: string;
  items: EpicProjectItem[];
}

export interface UserProfile {
  name: string;
  totalCoins: number;
  totalXP: number;
}