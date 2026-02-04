// Main exports for the Robo-Pet system

export * from './types.js';
export * from './Component.js';
export * from './Problem.js';
export * from './RobotPet.js';
export * from './ProblemGenerator.js';

// Re-export commonly used classes for convenience
export { RobotPet } from './RobotPet.js';
export { ProblemGenerator } from './ProblemGenerator.js';
export { RobotPetProblem } from './Problem.js';
export { 
  BaseComponent, 
  PowerCore, 
  MotorSystem, 
  SensorArray, 
  ChassisPlating, 
  ProcessingUnit 
} from './Component.js';