import { ComponentType, ProblemType, ToolType, VisualCue, Vector2D } from './types.js';

/**
 * Represents a problem that can occur with a Robo-Pet component
 */
export interface Problem {
  readonly id: string;
  readonly component: ComponentType;
  readonly type: ProblemType;
  readonly severity: number; // 1-3 scale
  readonly visualCues: VisualCue[];
  readonly requiredTool: ToolType;
  readonly description: string;
  isFixed: boolean;
}

/**
 * Implementation of a Robo-Pet problem
 */
export class RobotPetProblem implements Problem {
  public readonly id: string;
  public readonly component: ComponentType;
  public readonly type: ProblemType;
  public readonly severity: number;
  public readonly visualCues: VisualCue[];
  public readonly requiredTool: ToolType;
  public readonly description: string;
  public isFixed: boolean = false;

  constructor(
    id: string,
    component: ComponentType,
    type: ProblemType,
    severity: number,
    requiredTool: ToolType,
    description: string,
    visualCues: VisualCue[] = []
  ) {
    this.id = id;
    this.component = component;
    this.type = type;
    this.severity = Math.max(1, Math.min(3, severity));
    this.requiredTool = requiredTool;
    this.description = description;
    this.visualCues = [...visualCues];
  }

  /**
   * Marks the problem as fixed
   */
  public fix(): void {
    this.isFixed = true;
  }

  /**
   * Creates visual cues based on the problem type and severity
   */
  public static createVisualCues(
    type: ProblemType,
    severity: number,
    position: Vector2D
  ): VisualCue[] {
    const cues: VisualCue[] = [];
    const intensity = severity / 3; // Normalize to 0-1

    switch (type) {
      case ProblemType.BROKEN:
        cues.push({
          type: 'spark',
          position: { ...position },
          intensity
        });
        if (severity >= 2) {
          cues.push({
            type: 'smoke',
            position: { x: position.x + 5, y: position.y - 10 },
            intensity: intensity * 0.8
          });
        }
        break;

      case ProblemType.DIRTY:
        cues.push({
          type: 'dirt',
          position: { ...position },
          intensity
        });
        break;

      case ProblemType.DISCONNECTED:
        cues.push({
          type: 'warning_light',
          position: { ...position },
          intensity
        });
        break;

      case ProblemType.LOW_POWER:
        cues.push({
          type: 'warning_light',
          position: { ...position },
          intensity: Math.max(0.3, intensity)
        });
        break;
    }

    return cues;
  }

  /**
   * Determines the required tool based on problem type and component
   */
  public static getRequiredTool(type: ProblemType, component: ComponentType): ToolType {
    switch (type) {
      case ProblemType.BROKEN:
        switch (component) {
          case ComponentType.POWER_CORE:
            return ToolType.CIRCUIT_BOARD;
          case ComponentType.MOTOR_SYSTEM:
            return ToolType.WRENCH;
          case ComponentType.SENSOR_ARRAY:
            return ToolType.SCREWDRIVER;
          case ComponentType.CHASSIS_PLATING:
            return ToolType.WRENCH;
          case ComponentType.PROCESSING_UNIT:
            return ToolType.CIRCUIT_BOARD;
          default:
            return ToolType.SCREWDRIVER;
        }

      case ProblemType.DIRTY:
        return ToolType.OIL_CAN;

      case ProblemType.DISCONNECTED:
        return ToolType.SCREWDRIVER;

      case ProblemType.LOW_POWER:
        return ToolType.BATTERY;

      default:
        return ToolType.SCREWDRIVER;
    }
  }

  /**
   * Creates a problem description based on type and component
   */
  public static createDescription(type: ProblemType, component: ComponentType): string {
    const componentNames = {
      [ComponentType.POWER_CORE]: 'Power Core',
      [ComponentType.MOTOR_SYSTEM]: 'Motor System',
      [ComponentType.SENSOR_ARRAY]: 'Sensor Array',
      [ComponentType.CHASSIS_PLATING]: 'Chassis Plating',
      [ComponentType.PROCESSING_UNIT]: 'Processing Unit'
    };

    const componentName = componentNames[component];

    switch (type) {
      case ProblemType.BROKEN:
        return `The ${componentName} is broken and needs repair`;
      case ProblemType.DIRTY:
        return `The ${componentName} is dirty and needs cleaning`;
      case ProblemType.DISCONNECTED:
        return `The ${componentName} is disconnected and needs reconnection`;
      case ProblemType.LOW_POWER:
        return `The ${componentName} has low power and needs recharging`;
      default:
        return `The ${componentName} has an unknown problem`;
    }
  }
}