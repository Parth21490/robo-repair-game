import { Component, BaseComponent, PowerCore, MotorSystem, SensorArray, ChassisPlating, ProcessingUnit } from './Component.js';
import { Problem, RobotPetProblem } from './Problem.js';
import { ComponentType, PetType, Customization, Vector2D } from './types.js';

/**
 * Represents a repair record for tracking pet history
 */
export interface RepairRecord {
  timestamp: Date;
  problemId: string;
  toolUsed: string;
  repairTime: number; // milliseconds
}

/**
 * Main RobotPet class implementing component-based architecture
 */
export class RobotPet {
  public readonly id: string;
  public readonly name: string;
  public readonly type: PetType;
  public readonly components: Map<string, Component>;
  public readonly problems: Problem[];
  public readonly customizations: Customization[];
  public readonly repairHistory: RepairRecord[];
  public readonly createdAt: Date;
  public lastModified: Date;

  constructor(id: string, name: string, type: PetType) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.components = new Map();
    this.problems = [];
    this.customizations = [];
    this.repairHistory = [];
    this.createdAt = new Date();
    this.lastModified = new Date();

    // Initialize with default components
    this.initializeDefaultComponents();
  }

  /**
   * Initializes the pet with default components based on pet type
   */
  private initializeDefaultComponents(): void {
    const basePositions = this.getBaseComponentPositions();

    // Add core components that all pets have
    this.addComponent(new PowerCore('power_core_1', basePositions.powerCore));
    this.addComponent(new MotorSystem('motor_system_1', basePositions.motorSystem));
    this.addComponent(new SensorArray('sensor_array_1', basePositions.sensorArray));
    this.addComponent(new ChassisPlating('chassis_plating_1', basePositions.chassisPlating));
    this.addComponent(new ProcessingUnit('processing_unit_1', basePositions.processingUnit));
  }

  /**
   * Gets base component positions based on pet type
   */
  private getBaseComponentPositions(): Record<string, Vector2D> {
    // Base positions that can be adjusted per pet type
    const basePositions = {
      powerCore: { x: 100, y: 150 },
      motorSystem: { x: 80, y: 120 },
      sensorArray: { x: 120, y: 80 },
      chassisPlating: { x: 100, y: 100 },
      processingUnit: { x: 110, y: 90 }
    };

    // Adjust positions based on pet type
    switch (this.type) {
      case PetType.DOG:
        basePositions.sensorArray.y = 70; // Lower head position
        break;
      case PetType.CAT:
        basePositions.sensorArray.x = 115; // Slightly different head position
        break;
      case PetType.BIRD:
        basePositions.motorSystem.y = 110; // Different wing motor position
        break;
      case PetType.DRAGON:
        basePositions.powerCore.x = 105; // Centered power core
        break;
    }

    return basePositions;
  }

  /**
   * Adds a component to the pet
   */
  public addComponent(component: Component): void {
    this.components.set(component.id, component);
    this.lastModified = new Date();
  }

  /**
   * Gets a component by its ID
   */
  public getComponent(id: string): Component | undefined {
    return this.components.get(id);
  }

  /**
   * Gets a component by its type (returns first match)
   */
  public getComponentByType<T extends Component>(type: ComponentType): T | undefined {
    for (const component of this.components.values()) {
      if (component.type === type) {
        return component as T;
      }
    }
    return undefined;
  }

  /**
   * Gets all components of a specific type
   */
  public getComponentsByType<T extends Component>(type: ComponentType): T[] {
    const result: T[] = [];
    for (const component of this.components.values()) {
      if (component.type === type) {
        result.push(component as T);
      }
    }
    return result;
  }

  /**
   * Checks if the pet has a component of the specified type
   */
  public hasComponent(type: ComponentType): boolean {
    return this.getComponentByType(type) !== undefined;
  }

  /**
   * Removes a component by its ID
   */
  public removeComponent(id: string): boolean {
    const removed = this.components.delete(id);
    if (removed) {
      this.lastModified = new Date();
    }
    return removed;
  }

  /**
   * Adds a problem to the pet
   */
  public addProblem(problem: Problem): void {
    this.problems.push(problem);
    this.lastModified = new Date();
  }

  /**
   * Removes a problem by its ID
   */
  public removeProblem(problemId: string): boolean {
    const index = this.problems.findIndex(p => p.id === problemId);
    if (index !== -1) {
      this.problems.splice(index, 1);
      this.lastModified = new Date();
      return true;
    }
    return false;
  }

  /**
   * Gets all unfixed problems
   */
  public getUnfixedProblems(): Problem[] {
    return this.problems.filter(p => !p.isFixed);
  }

  /**
   * Gets all fixed problems
   */
  public getFixedProblems(): Problem[] {
    return this.problems.filter(p => p.isFixed);
  }

  /**
   * Checks if the pet has any unfixed problems
   */
  public hasUnfixedProblems(): boolean {
    return this.getUnfixedProblems().length > 0;
  }

  /**
   * Adds a customization to the pet
   */
  public addCustomization(customization: Customization): void {
    this.customizations.push(customization);
    this.lastModified = new Date();
  }

  /**
   * Removes a customization by its ID
   */
  public removeCustomization(customizationId: string): boolean {
    const index = this.customizations.findIndex(c => c.id === customizationId);
    if (index !== -1) {
      this.customizations.splice(index, 1);
      this.lastModified = new Date();
      return true;
    }
    return false;
  }

  /**
   * Adds a repair record to the pet's history
   */
  public addRepairRecord(record: RepairRecord): void {
    this.repairHistory.push(record);
    this.lastModified = new Date();
  }

  /**
   * Gets the pet's overall health percentage (0-100)
   */
  public getOverallHealth(): number {
    if (this.components.size === 0) return 0;

    let totalHealth = 0;
    for (const component of this.components.values()) {
      totalHealth += component.health;
    }
    return Math.round(totalHealth / this.components.size);
  }

  /**
   * Gets the pet's overall cleanliness percentage (0-100)
   */
  public getOverallCleanliness(): number {
    if (this.components.size === 0) return 0;

    let totalCleanliness = 0;
    for (const component of this.components.values()) {
      totalCleanliness += component.cleanliness;
    }
    return Math.round(totalCleanliness / this.components.size);
  }

  /**
   * Checks if the pet is fully functional (all components working)
   */
  public isFullyFunctional(): boolean {
    for (const component of this.components.values()) {
      if (!component.isWorking) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets a list of all broken components
   */
  public getBrokenComponents(): Component[] {
    return Array.from(this.components.values()).filter(c => !c.isWorking);
  }

  /**
   * Gets a list of all dirty components
   */
  public getDirtyComponents(): Component[] {
    return Array.from(this.components.values()).filter(c => c.needsCleaning);
  }

  /**
   * Updates all components' working states
   */
  public updateAllComponents(): void {
    for (const component of this.components.values()) {
      if (component instanceof BaseComponent) {
        component.updateWorkingState();
      }
    }
    this.lastModified = new Date();
  }

  /**
   * Creates a summary of the pet's current state
   */
  public getStatusSummary(): {
    overallHealth: number;
    overallCleanliness: number;
    isFullyFunctional: boolean;
    unfixedProblems: number;
    brokenComponents: number;
    dirtyComponents: number;
  } {
    return {
      overallHealth: this.getOverallHealth(),
      overallCleanliness: this.getOverallCleanliness(),
      isFullyFunctional: this.isFullyFunctional(),
      unfixedProblems: this.getUnfixedProblems().length,
      brokenComponents: this.getBrokenComponents().length,
      dirtyComponents: this.getDirtyComponents().length
    };
  }

  /**
   * Serializes the pet to a plain object for storage
   */
  public toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      components: Array.from(this.components.entries()),
      problems: this.problems,
      customizations: this.customizations,
      repairHistory: this.repairHistory,
      createdAt: this.createdAt.toISOString(),
      lastModified: this.lastModified.toISOString()
    };
  }

  /**
   * Creates a RobotPet from a serialized object
   */
  public static fromJSON(data: any): RobotPet {
    const pet = new RobotPet(data.id, data.name, data.type);
    
    // Clear default components and load from data
    pet.components.clear();
    
    // Reconstruct components (this is simplified - in a real implementation,
    // you'd need proper deserialization logic for each component type)
    for (const [id, componentData] of data.components) {
      // This would need proper component factory logic
      pet.components.set(id, componentData as Component);
    }
    
    // Load other data
    pet.problems.splice(0, pet.problems.length, ...data.problems);
    pet.customizations.splice(0, pet.customizations.length, ...data.customizations);
    pet.repairHistory.splice(0, pet.repairHistory.length, ...data.repairHistory);
    
    return pet;
  }
}