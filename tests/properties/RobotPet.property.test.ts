/**
 * Property-based tests for Robo-Pet generation consistency
 * Feature: robo-pet-repair-shop, Property 2: Robo-Pet Generation Consistency
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RobotPet, ProblemGenerator, PetType, AgeGroup, ComponentType, ToolType } from '../../src/pets/index.js';

describe('Property 2: Robo-Pet Generation Consistency', () => {
  const problemGenerator = new ProblemGenerator();

  // Arbitrary generators for test data
  const petTypeArb = fc.constantFrom(...Object.values(PetType));
  const ageGroupArb = fc.constantFrom(...Object.values(AgeGroup));
  const petNameArb = fc.string({ minLength: 1, maxLength: 20 });
  const petIdArb = fc.uuid();

  it('should always generate pets with at least one problem for any new repair session', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        (id, name, petType, ageGroup) => {
          // Create a new pet for a repair session
          const pet = new RobotPet(id, name, petType);
          
          // Generate problems for the pet
          const problems = problemGenerator.generateProblems(pet, ageGroup);
          
          // Property: Every new repair session should have at least one problem
          expect(problems.length).toBeGreaterThanOrEqual(1);
          
          // Property: All problems should be unfixed initially
          expect(problems.every(p => !p.isFixed)).toBe(true);
          
          // Property: Each problem should have a valid component that exists on the pet
          problems.forEach(problem => {
            expect(pet.hasComponent(problem.component)).toBe(true);
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should distribute problems fairly across different pet types', () => {
    fc.assert(
      fc.property(
        fc.array(petTypeArb, { minLength: 10, maxLength: 20 }),
        ageGroupArb,
        (petTypes, ageGroup) => {
          const problemsByPetType = new Map<PetType, number[]>();
          
          // Generate problems for multiple pets of different types
          petTypes.forEach((petType, index) => {
            const pet = new RobotPet(`pet_${index}`, `Pet ${index}`, petType);
            const problems = problemGenerator.generateProblems(pet, ageGroup);
            
            if (!problemsByPetType.has(petType)) {
              problemsByPetType.set(petType, []);
            }
            problemsByPetType.get(petType)!.push(problems.length);
          });
          
          // Property: Each pet type should be able to generate problems
          problemsByPetType.forEach((problemCounts, petType) => {
            expect(problemCounts.length).toBeGreaterThan(0);
            expect(problemCounts.every(count => count >= 1)).toBe(true);
          });
          
          // Property: Problem counts should be within reasonable bounds for the age group
          const config = problemGenerator.getDifficultyConfig(ageGroup);
          if (config) {
            problemsByPetType.forEach((problemCounts) => {
              problemCounts.forEach(count => {
                expect(count).toBeLessThanOrEqual(config.maxProblems);
                expect(count).toBeGreaterThanOrEqual(1);
              });
            });
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  it('should distribute problems fairly across different components', () => {
    fc.assert(
      fc.property(
        petTypeArb,
        ageGroupArb,
        fc.integer({ min: 20, max: 50 }),
        (petType, ageGroup, numPets) => {
          const componentUsage = new Map<ComponentType, number>();
          
          // Generate problems for multiple pets
          for (let i = 0; i < numPets; i++) {
            const pet = new RobotPet(`pet_${i}`, `Pet ${i}`, petType);
            const problems = problemGenerator.generateProblems(pet, ageGroup);
            
            problems.forEach(problem => {
              const currentCount = componentUsage.get(problem.component) || 0;
              componentUsage.set(problem.component, currentCount + 1);
            });
          }
          
          // Property: Multiple components should be used across all generated problems
          expect(componentUsage.size).toBeGreaterThan(0);
          
          // Property: No single component should dominate all problems (unless it's the only allowed one)
          const config = problemGenerator.getDifficultyConfig(ageGroup);
          if (config && config.allowedComponents.length > 1) {
            const totalProblems = Array.from(componentUsage.values()).reduce((sum, count) => sum + count, 0);
            const maxUsage = Math.max(...componentUsage.values());
            
            // No component should be used in more than 80% of all problems when multiple components are available
            expect(maxUsage / totalProblems).toBeLessThanOrEqual(0.8);
          }
        }
      ),
      { numRuns: 2 }
    );
  });

  it('should generate consistent pet structure regardless of problem generation', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        (id, name, petType, ageGroup) => {
          // Create pet and generate problems
          const pet = new RobotPet(id, name, petType);
          const initialComponentCount = pet.components.size;
          const initialComponentTypes = new Set(
            Array.from(pet.components.values()).map(c => c.type)
          );
          
          // Generate problems
          const problems = problemGenerator.generateProblems(pet, ageGroup);
          
          // Property: Pet structure should remain consistent after problem generation
          expect(pet.components.size).toBe(initialComponentCount);
          
          const finalComponentTypes = new Set(
            Array.from(pet.components.values()).map(c => c.type)
          );
          expect(finalComponentTypes).toEqual(initialComponentTypes);
          
          // Property: Pet should have all required core components
          const requiredComponents = [
            ComponentType.POWER_CORE,
            ComponentType.MOTOR_SYSTEM,
            ComponentType.SENSOR_ARRAY,
            ComponentType.CHASSIS_PLATING,
            ComponentType.PROCESSING_UNIT
          ];
          
          requiredComponents.forEach(componentType => {
            expect(pet.hasComponent(componentType)).toBe(true);
          });
          
          // Property: Pet metadata should be properly set
          expect(pet.id).toBe(id);
          expect(pet.name).toBe(name);
          expect(pet.type).toBe(petType);
          expect(pet.createdAt).toBeInstanceOf(Date);
          expect(pet.lastModified).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should generate problems with valid visual cues and tool requirements', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        (id, name, petType, ageGroup) => {
          const pet = new RobotPet(id, name, petType);
          const problems = problemGenerator.generateProblems(pet, ageGroup);
          
          problems.forEach(problem => {
            // Property: Each problem should have a valid required tool
            expect(Object.values(ToolType)).toContain(problem.requiredTool);
            
            // Property: Each problem should have a non-empty description
            expect(problem.description).toBeTruthy();
            expect(typeof problem.description).toBe('string');
            expect(problem.description.length).toBeGreaterThan(0);
            
            // Property: Severity should be within valid range (1-3)
            expect(problem.severity).toBeGreaterThanOrEqual(1);
            expect(problem.severity).toBeLessThanOrEqual(3);
            
            // Property: Visual cues should be properly formatted
            problem.visualCues.forEach(cue => {
              expect(cue.intensity).toBeGreaterThanOrEqual(0);
              expect(cue.intensity).toBeLessThanOrEqual(1);
              expect(typeof cue.position.x).toBe('number');
              expect(typeof cue.position.y).toBe('number');
              expect(['spark', 'smoke', 'dirt', 'warning_light']).toContain(cue.type);
            });
            
            // Property: Problem should not be fixed initially
            expect(problem.isFixed).toBe(false);
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should maintain problem generation determinism with same inputs', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        fc.integer({ min: 1, max: 1000 }),
        (id, name, petType, ageGroup, seed) => {
          // Create identical pets
          const pet1 = new RobotPet(id, name, petType);
          const pet2 = new RobotPet(id, name, petType);
          
          // Set up deterministic random seed (simplified approach)
          const originalRandom = Math.random;
          let seedValue = seed;
          const deterministicRandom = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280;
            return seedValue / 233280;
          };
          
          try {
            // Generate problems with same seed
            Math.random = deterministicRandom;
            seedValue = seed; // Reset seed
            const problems1 = problemGenerator.generateProblems(pet1, ageGroup);
            
            seedValue = seed; // Reset seed again
            const problems2 = problemGenerator.generateProblems(pet2, ageGroup);
            
            // Property: Same inputs should produce same number of problems
            expect(problems1.length).toBe(problems2.length);
            
            // Property: Problems should target same components (order may vary due to Map iteration)
            const components1 = problems1.map(p => p.component).sort();
            const components2 = problems2.map(p => p.component).sort();
            expect(components1).toEqual(components2);
            
          } finally {
            // Restore original Math.random
            Math.random = originalRandom;
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  it('should respect age group constraints in problem generation', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        (id, name, petType, ageGroup) => {
          const pet = new RobotPet(id, name, petType);
          const problems = problemGenerator.generateProblems(pet, ageGroup);
          const config = problemGenerator.getDifficultyConfig(ageGroup);
          
          if (config) {
            // Property: Number of problems should not exceed age group maximum
            expect(problems.length).toBeLessThanOrEqual(config.maxProblems);
            
            // Property: Problem severity should not exceed age group maximum
            problems.forEach(problem => {
              expect(problem.severity).toBeLessThanOrEqual(config.maxSeverity);
            });
            
            // Property: Problem types should be allowed for age group
            problems.forEach(problem => {
              expect(config.allowedProblemTypes).toContain(problem.type);
            });
            
            // Property: Components should be allowed for age group
            problems.forEach(problem => {
              expect(config.allowedComponents).toContain(problem.component);
            });
            
            // Property: Visual cue intensity should be appropriate for age group
            problems.forEach(problem => {
              problem.visualCues.forEach(cue => {
                expect(cue.intensity).toBeLessThanOrEqual(config.visualCueIntensity);
              });
            });
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
