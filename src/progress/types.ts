/**
 * Progress System Types
 * Defines interfaces for tracking player progress, achievements, and Robo-Gems economy
 */

export interface PlayerProgress {
  playerId: string; // generated UUID, no PII
  ageGroup: AgeGroup;
  totalRepairs: number;
  roboGemsEarned: number;
  roboGemsSpent: number;
  unlockedTools: ToolType[];
  unlockedCustomizations: CustomizationType[];
  achievements: Achievement[];
  stemMetrics: STEMAnalytics;
  sessionHistory: GameSession[];
  createdAt: Date;
  lastModified: Date;
}

export interface STEMAnalytics {
  problemSolvingScore: number; // 0-100
  mechanicalConceptsLearned: string[];
  creativityMetrics: {
    uniqueCustomizations: number;
    colorVariationsUsed: number;
    accessoryCombinations: number;
  };
  timeToCompletion: {
    averageDiagnostic: number; // milliseconds
    averageRepair: number;
    averageCustomization: number;
  };
  totalPlayTime: number; // milliseconds
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  unlockedAt: Date;
  gemsRewarded: number;
  milestone?: number;
}

export interface GameSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  repairsCompleted: number;
  gemsEarned: number;
  activitiesCompleted: ActivityType[];
  averageRepairTime: number;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  requiredRepairs: number;
  gemsReward: number;
  unlocks: UnlockReward[];
  celebrationLevel: CelebrationLevel;
}

export interface UnlockReward {
  type: UnlockType;
  itemId: string;
  name: string;
  description: string;
}

export enum AgeGroup {
  YOUNG = '3-5',
  MIDDLE = '6-8',
  OLDER = '9-12'
}

export enum ToolType {
  SCREWDRIVER = 'screwdriver',
  WRENCH = 'wrench',
  OIL_CAN = 'oil_can',
  BATTERY = 'battery',
  CIRCUIT_BOARD = 'circuit_board',
  CLEANING_BRUSH = 'cleaning_brush',
  DIAGNOSTIC_SCANNER = 'diagnostic_scanner',
  PREMIUM_WRENCH = 'premium_wrench',
  SUPER_BATTERY = 'super_battery'
}

export enum CustomizationType {
  COLOR_PALETTE = 'color_palette',
  HAT = 'hat',
  BOW_TIE = 'bow_tie',
  STICKER = 'sticker',
  PREMIUM_COLOR = 'premium_color',
  SPECIAL_HAT = 'special_hat',
  ANIMATED_STICKER = 'animated_sticker'
}

export enum AchievementType {
  REPAIR_MILESTONE = 'repair_milestone',
  SPEED_REPAIR = 'speed_repair',
  PERFECT_DIAGNOSTIC = 'perfect_diagnostic',
  CREATIVE_CUSTOMIZATION = 'creative_customization',
  DAILY_STREAK = 'daily_streak',
  SPECIAL_EVENT = 'special_event'
}

export enum ActivityType {
  DIAGNOSTIC = 'diagnostic',
  REPAIR = 'repair',
  CUSTOMIZATION = 'customization',
  PHOTO_BOOTH = 'photo_booth'
}

export enum CelebrationLevel {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EPIC = 'epic'
}

export enum UnlockType {
  TOOL = 'tool',
  CUSTOMIZATION = 'customization',
  BACKGROUND = 'background',
  FEATURE = 'feature'
}

export interface ProgressEventData {
  type: ProgressEventType;
  data: any;
  timestamp: Date;
}

export enum ProgressEventType {
  REPAIR_COMPLETED = 'repair_completed',
  DIAGNOSTIC_COMPLETED = 'diagnostic_completed',
  CUSTOMIZATION_COMPLETED = 'customization_completed',
  PHOTO_TAKEN = 'photo_taken',
  GEMS_EARNED = 'gems_earned',
  GEMS_SPENT = 'gems_spent',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  MILESTONE_REACHED = 'milestone_reached',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended'
}