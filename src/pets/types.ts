// Core types and interfaces for the Robo-Pet system

export interface Vector2D {
  x: number;
  y: number;
}

export enum ComponentType {
  POWER_CORE = 'power_core',
  MOTOR_SYSTEM = 'motor_system',
  SENSOR_ARRAY = 'sensor_array',
  CHASSIS_PLATING = 'chassis_plating',
  PROCESSING_UNIT = 'processing_unit'
}

export enum ProblemType {
  BROKEN = 'broken',
  DIRTY = 'dirty',
  DISCONNECTED = 'disconnected',
  LOW_POWER = 'low_power'
}

export enum ToolType {
  SCREWDRIVER = 'screwdriver',
  WRENCH = 'wrench',
  OIL_CAN = 'oil_can',
  BATTERY = 'battery',
  CIRCUIT_BOARD = 'circuit_board'
}

export enum PetType {
  DOG = 'dog',
  CAT = 'cat',
  BIRD = 'bird',
  DRAGON = 'dragon'
}

export enum AgeGroup {
  YOUNG = '3-5',
  MIDDLE = '6-8',
  OLDER = '9-12'
}

export interface VisualCue {
  type: 'spark' | 'smoke' | 'dirt' | 'warning_light';
  position: Vector2D;
  intensity: number; // 0-1
}

export interface Customization {
  id: string;
  type: 'color' | 'accessory' | 'pattern';
  value: string;
  appliedAt: Date;
}