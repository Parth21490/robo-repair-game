import { ComponentType, Vector2D, Customization } from './types.js';

/**
 * Base interface for all Robo-Pet components
 */
export interface Component {
  readonly type: ComponentType;
  readonly id: string;
  isWorking: boolean;
  needsCleaning: boolean;
  health: number; // 0-100
  cleanliness: number; // 0-100
  position: Vector2D;
  rotation: number;
  scale: number;
  customization?: Customization;
}

/**
 * Abstract base class for all components
 */
export abstract class BaseComponent implements Component {
  public readonly type: ComponentType;
  public readonly id: string;
  public isWorking: boolean = true;
  public needsCleaning: boolean = false;
  public health: number = 100;
  public cleanliness: number = 100;
  public position: Vector2D;
  public rotation: number = 0;
  public scale: number = 1;
  public customization?: Customization;

  constructor(type: ComponentType, id: string, position: Vector2D) {
    this.type = type;
    this.id = id;
    this.position = { ...position };
  }

  /**
   * Updates the component's working state based on health and cleanliness
   */
  public updateWorkingState(): void {
    this.isWorking = this.health > 0 && this.cleanliness > 20;
  }

  /**
   * Applies damage to the component
   */
  public damage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.updateWorkingState();
  }

  /**
   * Repairs the component
   */
  public repair(amount: number): void {
    this.health = Math.min(100, this.health + amount);
    this.updateWorkingState();
  }

  /**
   * Makes the component dirty
   */
  public makeDirty(amount: number): void {
    this.cleanliness = Math.max(0, this.cleanliness - amount);
    this.needsCleaning = this.cleanliness < 50;
    this.updateWorkingState();
  }

  /**
   * Cleans the component
   */
  public clean(amount: number): void {
    this.cleanliness = Math.min(100, this.cleanliness + amount);
    this.needsCleaning = this.cleanliness < 50;
    this.updateWorkingState();
  }

  /**
   * Applies a customization to the component
   */
  public applyCustomization(customization: Customization): void {
    this.customization = customization;
  }

  /**
   * Removes customization from the component
   */
  public removeCustomization(): void {
    this.customization = undefined;
  }
}

/**
 * Power Core component - manages energy and power distribution
 */
export class PowerCore extends BaseComponent {
  public powerLevel: number = 100; // 0-100
  public maxCapacity: number = 100;

  constructor(id: string, position: Vector2D) {
    super(ComponentType.POWER_CORE, id, position);
  }

  public drain(amount: number): void {
    this.powerLevel = Math.max(0, this.powerLevel - amount);
    if (this.powerLevel === 0) {
      this.isWorking = false;
    }
  }

  public charge(amount: number): void {
    this.powerLevel = Math.min(this.maxCapacity, this.powerLevel + amount);
    this.updateWorkingState();
  }
}

/**
 * Motor System component - handles movement and animation
 */
export class MotorSystem extends BaseComponent {
  public motorSpeed: number = 100; // 0-100
  public isCalibrated: boolean = true;

  constructor(id: string, position: Vector2D) {
    super(ComponentType.MOTOR_SYSTEM, id, position);
  }

  public calibrate(): void {
    this.isCalibrated = true;
    this.updateWorkingState();
  }

  public updateWorkingState(): void {
    this.isWorking = this.health > 0 && this.cleanliness > 20 && this.isCalibrated;
  }
}

/**
 * Sensor Array component - manages sensory input
 */
export class SensorArray extends BaseComponent {
  public sensitivity: number = 100; // 0-100
  public connectedSensors: string[] = [];

  constructor(id: string, position: Vector2D) {
    super(ComponentType.SENSOR_ARRAY, id, position);
    this.connectedSensors = ['camera', 'microphone', 'touch'];
  }

  public disconnectSensor(sensorName: string): void {
    this.connectedSensors = this.connectedSensors.filter(s => s !== sensorName);
    this.updateWorkingState();
  }

  public connectSensor(sensorName: string): void {
    if (!this.connectedSensors.includes(sensorName)) {
      this.connectedSensors.push(sensorName);
    }
    this.updateWorkingState();
  }

  public updateWorkingState(): void {
    this.isWorking = this.health > 0 && this.cleanliness > 20 && this.connectedSensors.length > 0;
  }
}

/**
 * Chassis Plating component - external appearance and protection
 */
export class ChassisPlating extends BaseComponent {
  public durability: number = 100; // 0-100
  public paintCondition: number = 100; // 0-100

  constructor(id: string, position: Vector2D) {
    super(ComponentType.CHASSIS_PLATING, id, position);
  }

  public scratch(amount: number): void {
    this.durability = Math.max(0, this.durability - amount);
    this.paintCondition = Math.max(0, this.paintCondition - amount * 0.5);
  }

  public polish(): void {
    this.paintCondition = Math.min(100, this.paintCondition + 20);
  }
}

/**
 * Processing Unit component - AI behavior and decision making
 */
export class ProcessingUnit extends BaseComponent {
  public processingSpeed: number = 100; // 0-100
  public memoryIntegrity: number = 100; // 0-100

  constructor(id: string, position: Vector2D) {
    super(ComponentType.PROCESSING_UNIT, id, position);
  }

  public corruptMemory(amount: number): void {
    this.memoryIntegrity = Math.max(0, this.memoryIntegrity - amount);
    this.updateWorkingState();
  }

  public defragment(): void {
    this.memoryIntegrity = Math.min(100, this.memoryIntegrity + 30);
    this.processingSpeed = Math.min(100, this.processingSpeed + 10);
    this.updateWorkingState();
  }

  public updateWorkingState(): void {
    this.isWorking = this.health > 0 && this.cleanliness > 20 && this.memoryIntegrity > 30;
  }
}