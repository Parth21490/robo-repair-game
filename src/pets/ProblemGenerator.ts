import { RobotPet } from './RobotPet.js';
import { Problem, RobotPetProblem } from './Problem.js';
import { Component } from './Component.js';
import { 
  ComponentType, 
  ProblemType, 
  ToolType, 
  AgeGroup, 
  PetType,
  Vector2D 
} from './types.js';

/**
 * Configuration for difficulty levels based on age groups
 */
interface DifficultyConfig {
  maxProblems: number;
  maxSeverity: number;
  allowedProblemTypes: ProblemType[];
  allowedComponents: ComponentType[];
  hintDelay: number; // milliseconds
  visualCueIntensity: number; // 0-1
}

/**
 * Validation result for a problem set
 */
interface ProblemSetValidation {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * Generates problems for Robo-Pets with age-appropriate difficulty scaling
 */
export class ProblemGenerator {
  private readonly difficultyConfigs: Map<AgeGroup, DifficultyConfig>;
  private readonly problemTypeWeights: Map<ProblemType, number>;
  private readonly componentTypeWeights: Map<ComponentType, number>;

  constructor() {
    this.difficultyConfigs = new Map();
    this.problemTypeWeights = new Map();
    this.componentTypeWeights = new Map();
    
    this.initializeDifficultyConfigs();
    this.initializeWeights();
  }

  /**
   * Initializes difficulty configurations for each age group
   */
  private initializeDifficultyConfigs(): void {
    // Age 3-5: Simple, obvious problems with clear visual cues
    this.difficultyConfigs.set(AgeGroup.YOUNG, {
      maxProblems: 2,
      maxSeverity: 2,
      allowedProblemTypes: [ProblemType.DIRTY, ProblemType.LOW_POWER],
      allowedComponents: [ComponentType.CHASSIS_PLATING, ComponentType.POWER_CORE],
      hintDelay: 15000, // 15 seconds
      visualCueIntensity: 1.0
    });

    // Age 6-8: Moderate complexity with some diagnostic thinking required
    this.difficultyConfigs.set(AgeGroup.MIDDLE, {
      maxProblems: 3,
      maxSeverity: 2,
      allowedProblemTypes: [
        ProblemType.DIRTY, 
        ProblemType.LOW_POWER, 
        ProblemType.DISCONNECTED
      ],
      allowedComponents: [
        ComponentType.CHASSIS_PLATING, 
        ComponentType.POWER_CORE, 
        ComponentType.SENSOR_ARRAY
      ],
      hintDelay: 25000, // 25 seconds
      visualCueIntensity: 0.8
    });

    // Age 9-12: Complex problems requiring analytical thinking
    this.difficultyConfigs.set(AgeGroup.OLDER, {
      maxProblems: 4,
      maxSeverity: 3,
      allowedProblemTypes: Object.values(ProblemType),
      allowedComponents: Object.values(ComponentType),
      hintDelay: 30000, // 30 seconds
      visualCueIntensity: 0.6
    });
  }

  /**
   * Initializes weights for problem and component type selection
   */
  private initializeWeights(): void {
    // Problem type weights (higher = more likely to be selected)
    this.problemTypeWeights.set(ProblemType.DIRTY, 0.3);
    this.problemTypeWeights.set(ProblemType.LOW_POWER, 0.25);
    this.problemTypeWeights.set(ProblemType.DISCONNECTED, 0.25);
    this.problemTypeWeights.set(ProblemType.BROKEN, 0.2);

    // Component type weights
    this.componentTypeWeights.set(ComponentType.CHASSIS_PLATING, 0.25);
    this.componentTypeWeights.set(ComponentType.POWER_CORE, 0.25);
    this.componentTypeWeights.set(ComponentType.SENSOR_ARRAY, 0.2);
    this.componentTypeWeights.set(ComponentType.MOTOR_SYSTEM, 0.15);
    this.componentTypeWeights.set(ComponentType.PROCESSING_UNIT, 0.15);
  }

  /**
   * Generates problems for a Robo-Pet based on difficulty level
   */
  public generateProblems(pet: RobotPet, ageGroup: AgeGroup): Problem[] {
    const config = this.difficultyConfigs.get(ageGroup);
    if (!config) {
      throw new Error(`No difficulty configuration found for age group: ${ageGroup}`);
    }

    const problems: Problem[] = [];
    const usedComponents = new Set<ComponentType>();
    
    // Determine number of problems (1 to maxProblems)
    const numProblems = Math.max(1, Math.floor(Math.random() * config.maxProblems) + 1);

    for (let i = 0; i < numProblems; i++) {
      const problem = this.generateSingleProblem(pet, config, usedComponents);
      if (problem) {
        problems.push(problem);
        usedComponents.add(problem.component);
      }
    }

    // Ensure we have at least one problem
    if (problems.length === 0) {
      const fallbackProblem = this.generateFallbackProblem(pet, config);
      if (fallbackProblem) {
        problems.push(fallbackProblem);
      }
    }

    return problems;
  }

  /**
   * Generates a single problem for the pet
   */
  private generateSingleProblem(
    pet: RobotPet, 
    config: DifficultyConfig, 
    usedComponents: Set<ComponentType>
  ): Problem | null {
    // Select available components that haven't been used yet
    const availableComponents = config.allowedComponents.filter(
      componentType => !usedComponents.has(componentType) && pet.hasComponent(componentType)
    );

    if (availableComponents.length === 0) {
      return null;
    }

    // Select component using weighted random selection
    const selectedComponent = this.selectWeightedRandom(
      availableComponents,
      componentType => this.componentTypeWeights.get(componentType) || 0.1
    );

    // Select problem type using weighted random selection
    const selectedProblemType = this.selectWeightedRandom(
      config.allowedProblemTypes,
      problemType => this.problemTypeWeights.get(problemType) || 0.1
    );

    // Generate severity (1 to maxSeverity)
    const severity = Math.max(1, Math.floor(Math.random() * config.maxSeverity) + 1);

    // Get component position for visual cues
    const component = pet.getComponentByType(selectedComponent);
    const position = component?.position || { x: 100, y: 100 };

    // Create visual cues with appropriate intensity
    const visualCues = RobotPetProblem.createVisualCues(
      selectedProblemType, 
      severity, 
      position
    ).map(cue => ({
      ...cue,
      intensity: cue.intensity * config.visualCueIntensity
    }));

    // Determine required tool
    const requiredTool = RobotPetProblem.getRequiredTool(selectedProblemType, selectedComponent);

    // Create description
    const description = RobotPetProblem.createDescription(selectedProblemType, selectedComponent);

    // Generate unique ID
    const problemId = `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new RobotPetProblem(
      problemId,
      selectedComponent,
      selectedProblemType,
      severity,
      requiredTool,
      description,
      visualCues
    );
  }

  /**
   * Generates a fallback problem when normal generation fails
   */
  private generateFallbackProblem(pet: RobotPet, config: DifficultyConfig): Problem | null {
    // Try to create a simple dirty chassis problem as fallback
    if (pet.hasComponent(ComponentType.CHASSIS_PLATING)) {
      const component = pet.getComponentByType(ComponentType.CHASSIS_PLATING);
      const position = component?.position || { x: 100, y: 100 };
      
      const visualCues = [{
        type: 'dirt' as const,
        position,
        intensity: config.visualCueIntensity
      }];

      const problemId = `fallback_problem_${Date.now()}`;

      return new RobotPetProblem(
        problemId,
        ComponentType.CHASSIS_PLATING,
        ProblemType.DIRTY,
        1,
        ToolType.OIL_CAN,
        'The Chassis Plating is dirty and needs cleaning',
        visualCues
      );
    }

    return null;
  }

  /**
   * Selects a random item from an array using weighted selection
   */
  private selectWeightedRandom<T>(
    items: T[], 
    weightFunction: (item: T) => number
  ): T {
    if (items.length === 0) {
      throw new Error('Cannot select from empty array');
    }

    if (items.length === 1) {
      return items[0];
    }

    // Calculate total weight
    const totalWeight = items.reduce((sum, item) => sum + weightFunction(item), 0);
    
    if (totalWeight === 0) {
      // If all weights are 0, select randomly
      return items[Math.floor(Math.random() * items.length)];
    }

    // Select random point in weight range
    let randomWeight = Math.random() * totalWeight;
    
    // Find the item that corresponds to this weight
    for (const item of items) {
      randomWeight -= weightFunction(item);
      if (randomWeight <= 0) {
        return item;
      }
    }

    // Fallback to last item (shouldn't happen with proper weights)
    return items[items.length - 1];
  }

  /**
   * Validates a problem set for balance and appropriateness
   */
  public validateProblemSet(problems: Problem[], ageGroup: AgeGroup): ProblemSetValidation {
    const config = this.difficultyConfigs.get(ageGroup);
    if (!config) {
      return {
        isValid: false,
        issues: [`No configuration found for age group: ${ageGroup}`],
        suggestions: []
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check problem count
    if (problems.length === 0) {
      issues.push('No problems generated');
    } else if (problems.length > config.maxProblems) {
      issues.push(`Too many problems: ${problems.length} > ${config.maxProblems}`);
    }

    // Check severity levels
    const highSeverityProblems = problems.filter(p => p.severity > config.maxSeverity);
    if (highSeverityProblems.length > 0) {
      issues.push(`Problems with severity too high for age group: ${highSeverityProblems.map(p => p.id).join(', ')}`);
    }

    // Check problem types
    const invalidProblemTypes = problems.filter(p => !config.allowedProblemTypes.includes(p.type));
    if (invalidProblemTypes.length > 0) {
      issues.push(`Invalid problem types for age group: ${invalidProblemTypes.map(p => p.type).join(', ')}`);
    }

    // Check component types
    const invalidComponents = problems.filter(p => !config.allowedComponents.includes(p.component));
    if (invalidComponents.length > 0) {
      issues.push(`Invalid components for age group: ${invalidComponents.map(p => p.component).join(', ')}`);
    }

    // Check for duplicate components (should be avoided for clarity)
    const componentCounts = new Map<ComponentType, number>();
    problems.forEach(p => {
      componentCounts.set(p.component, (componentCounts.get(p.component) || 0) + 1);
    });

    const duplicateComponents = Array.from(componentCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([component, _]) => component);

    if (duplicateComponents.length > 0) {
      suggestions.push(`Consider avoiding duplicate components: ${duplicateComponents.join(', ')}`);
    }

    // Check visual cue intensity
    const weakVisualCues = problems.filter(p => 
      p.visualCues.some(cue => cue.intensity < config.visualCueIntensity * 0.5)
    );

    if (weakVisualCues.length > 0) {
      suggestions.push('Some visual cues may be too weak for the target age group');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Gets the difficulty configuration for an age group
   */
  public getDifficultyConfig(ageGroup: AgeGroup): DifficultyConfig | undefined {
    return this.difficultyConfigs.get(ageGroup);
  }

  /**
   * Updates the weights for problem type selection
   */
  public updateProblemTypeWeights(weights: Map<ProblemType, number>): void {
    weights.forEach((weight, problemType) => {
      this.problemTypeWeights.set(problemType, weight);
    });
  }

  /**
   * Updates the weights for component type selection
   */
  public updateComponentTypeWeights(weights: Map<ComponentType, number>): void {
    weights.forEach((weight, componentType) => {
      this.componentTypeWeights.set(componentType, weight);
    });
  }

  /**
   * Generates problems with specific constraints for testing
   */
  public generateProblemsWithConstraints(
    pet: RobotPet,
    ageGroup: AgeGroup,
    constraints: {
      exactProblemCount?: number;
      requiredProblemTypes?: ProblemType[];
      requiredComponents?: ComponentType[];
      maxSeverity?: number;
    }
  ): Problem[] {
    const config = this.difficultyConfigs.get(ageGroup);
    if (!config) {
      throw new Error(`No difficulty configuration found for age group: ${ageGroup}`);
    }

    const problems: Problem[] = [];
    const usedComponents = new Set<ComponentType>();

    // Use constraints or defaults
    const problemCount = constraints.exactProblemCount || 
      Math.max(1, Math.floor(Math.random() * config.maxProblems) + 1);
    
    const allowedProblemTypes = constraints.requiredProblemTypes || config.allowedProblemTypes;
    const allowedComponents = constraints.requiredComponents || config.allowedComponents;
    const maxSeverity = constraints.maxSeverity || config.maxSeverity;

    for (let i = 0; i < problemCount; i++) {
      const availableComponents = allowedComponents.filter(
        componentType => !usedComponents.has(componentType) && pet.hasComponent(componentType)
      );

      if (availableComponents.length === 0) {
        break; // Can't generate more problems
      }

      const selectedComponent = this.selectWeightedRandom(
        availableComponents,
        componentType => this.componentTypeWeights.get(componentType) || 0.1
      );

      const selectedProblemType = this.selectWeightedRandom(
        allowedProblemTypes,
        problemType => this.problemTypeWeights.get(problemType) || 0.1
      );

      const severity = Math.max(1, Math.min(maxSeverity, Math.floor(Math.random() * maxSeverity) + 1));

      const component = pet.getComponentByType(selectedComponent);
      const position = component?.position || { x: 100, y: 100 };

      const visualCues = RobotPetProblem.createVisualCues(
        selectedProblemType, 
        severity, 
        position
      ).map(cue => ({
        ...cue,
        intensity: cue.intensity * config.visualCueIntensity
      }));

      const requiredTool = RobotPetProblem.getRequiredTool(selectedProblemType, selectedComponent);
      const description = RobotPetProblem.createDescription(selectedProblemType, selectedComponent);
      const problemId = `constrained_problem_${Date.now()}_${i}`;

      const problem = new RobotPetProblem(
        problemId,
        selectedComponent,
        selectedProblemType,
        severity,
        requiredTool,
        description,
        visualCues
      );

      problems.push(problem);
      usedComponents.add(selectedComponent);
    }

    return problems;
  }
}