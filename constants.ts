import { StatType, Stat, EpicProject, Quest, QuestType, QuestLevel } from './types';

export const INITIAL_STATS: Stat[] = [
  { id: 'stat_1', name: 'Maestría de Habilidad', type: StatType.SKILL, level: 1, currentXP: 0, maxXP: 100 },
  { id: 'stat_2', name: 'Tesorería de la Forja', type: StatType.GOLD, level: 1, currentXP: 0, maxXP: 100 },
  { id: 'stat_3', name: 'Disciplina y Constancia', type: StatType.FOCUS, level: 1, currentXP: 0, maxXP: 100 },
  { id: 'stat_4', name: 'Carisma y Comunidad', type: StatType.CHAR, level: 1, currentXP: 0, maxXP: 100 },
  { id: 'stat_5', name: 'Resistencia y Enfoque', type: StatType.HP_MP, level: 1, currentXP: 0, maxXP: 100 },
  { id: 'stat_6', name: 'Recreación y Loot', type: StatType.MORAL, level: 1, currentXP: 0, maxXP: 100 },
];

export const INITIAL_PROJECTS: EpicProject[] = [
  {
    id: 'proj_1',
    name: 'Nivel 1: La Forja del Hierro',
    description: 'Construcción del PC Gamer definitivo para streaming.',
    items: [
      { id: 'item_1', name: 'Placa Núcleo (MB B650)', completed: false },
      { id: 'item_2', name: 'CPU Legendaria (Ryzen 7)', completed: false },
      { id: 'item_3', name: 'Memorias Gemelas (RAM DDR5)', completed: false },
      { id: 'item_4', name: 'Disipador Ártico', completed: false },
      { id: 'item_5', name: 'Almacenamiento Veloz (SSD)', completed: false },
    ],
  },
  {
    id: 'proj_2',
    name: 'Nivel 2: El Ascenso Inmortal',
    description: 'Alcanzar rango Diamante+ en Valorant.',
    items: [
      { id: 'item_2_1', name: 'Rutina de Aimlab (30 días)', completed: false },
      { id: 'item_2_2', name: 'Analizar 5 Demos Pro', completed: false },
      { id: 'item_2_3', name: 'Alcanzar Rango Ascendente', completed: false },
    ],
  },
];

export const INITIAL_QUESTS: Quest[] = [
  {
    id: 'q_1',
    name: 'Ritual de Puntería (Aim Trainer)',
    objective: 'Completar 30 minutos en Gridshot Ultimate con >90% de precisión.',
    type: QuestType.DAILY,
    levelAssoc: QuestLevel.L1,
    xpReward: 15,
    coinReward: 5,
    statAssoc: StatType.SKILL,
    completed: false,
  },
  {
    id: 'q_2',
    name: 'Ahorro Semanal para la GPU',
    objective: 'Guardar $20 en la alcancía física sin gastarlos en snacks.',
    type: QuestType.WEEKLY,
    levelAssoc: QuestLevel.L1,
    xpReward: 50,
    coinReward: 20,
    statAssoc: StatType.GOLD,
    completed: false,
  },
];

export const INITIAL_REWARDS = [
  { id: 'rew_1', name: 'Skin de Valorant (Edición Limitada)', cost: 150 },
  { id: 'rew_2', name: 'Pedir Comida Favorita', cost: 80 },
  { id: 'rew_3', name: 'Noche de Películas (Sin Culpa)', cost: 40 },
  { id: 'rew_4', name: 'Día Libre de Stream', cost: 300 },
];