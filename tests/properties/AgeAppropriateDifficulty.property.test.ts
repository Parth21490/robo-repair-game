/**
 * Property-based tests for age-appropriate difficulty scaling
 * Feature: robo-pet-repair-shop, Property 12: Age-Appropriate Difficulty Scaling
 * **Validates: Requirements 9.5**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  RobotPet, 
  ProblemGenerator, 
  PetType, 
  AgeGroup, 
  ComponentType, 
  ProblemType 
} from '../../src/pets/index.js';

describe('Property 12: Age-Appropriate Difficulty Scaling', () => {
  const problemGenerator = new ProblemGenerator();

  // Arbitrary generators for test data
  const petTypeArb = fc.constantFrom(...Object.values(PetType));
  const petNameArb = fc.string({ minLength: 1, maxLength: 20 });
  const petIdArb = fc.uuid();

  it('should generate easier problems for younger age groups (3-5)', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        (id, name, petType) => {
          const pet = new RobotPet(id, name, petType);
          const problems = problemGenerator.generateProblems(pet, AgeGroup.YOUNG);
          const config = problemGenerator.getDifficultyConfig(AgeGroup.YOUNG);
          
          expect(config).toBeDefined();
          if (config) {
            // Property: Young children should have fewer problems
            expect(problems.length).toBeLessThanOrEqual(config.maxProblems);
            expect(config.maxProblems).toBeLessThanOrEqual(2); // Should be 2 or less for young children
            
            // Property: Problems should be low severity
            problems.forEach(problem => {
              expect(problem.severity).toBeLessThanOrEqual(config.maxSeverity);
              expect(problem.severity).toBeLessThanOrEqual(2); // Max severity 2 for young children
            });
            
            // Property: Should only have simple problem types
            const allowedSimpleTypes = [ProblemType.DIRTY, ProblemType.LOW_POWER];
            problems.forEach(problem => {
              expect(allowedSimpleTypes).toContain(problem.type);
            });
            
            // Property: Should only use simple components
            const allowedSimpleComponents = [ComponentType.CHASSIS_PLATING, ComponentType.POWER_CORE];
            problems.forEach(problem => {
              expect(allowedSimpleComponents).toContain(problem.component);
            });
            
            // Property: Visual cues should be very clear (high intensity)
            problems.forEach(problem => {
              problem.visualCues.forEach(cue => {
                // Visual cues are scaled by config.visualCueIntensity (1.0 for young children)
                expect(cue.intensity).toBeGreaterThanOrEqual(0.3); // Adjusted for scaling
                expect(cue.intensity).toBeLessThanOrEqual(config.visualCueIntensity);
              });
            });
            
            // Property: Hint delay should be short for young children
            expect(config.hintDelay).toBeLessThanOrEqual(20000); // 20 seconds or less
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should generate moderate difficulty for middle age group (6-8)', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        (id, name, petType) => {
          const pet = new RobotPet(id, name, petType);
          const problems = problemGenerator.generateProblems(pet, AgeGroup.MIDDLE);
          const config = problemGenerator.getDifficultyConfig(AgeGroup.MIDDLE);
          
          expect(config).toBeDefined();
          if (config) {
            // Property: Middle age should have moderate number of problems
            expect(problems.length).toBeLessThanOrEqual(config.maxProblems);
            expect(config.maxProblems).toBeGreaterThan(2); // More than young children
            expect(config.maxProblems).toBeLessThanOrEqual(3); // But not too many
            
            // Property: Problems should be moderate severity
            problems.forEach(problem => {
              expect(problem.severity).toBeLessThanOrEqual(config.maxSeverity);
              expect(problem.severity).toBeLessThanOrEqual(2); // Still moderate severity
            });
            
            // Property: Should include more problem types than young children
            const allowedTypes = [ProblemType.DIRTY, ProblemType.LOW_POWER, ProblemType.DISCONNECTED];
            problems.forEach(problem => {
              expect(allowedTypes).toContain(problem.type);
            });
            
            // Property: Should use more components than young children
            const allowedComponents = [
              ComponentType.CHASSIS_PLATING, 
              ComponentType.POWER_CORE, 
              ComponentType.SENSOR_ARRAY
            ];
            problems.forEach(problem => {
              expect(allowedComponents).toContain(problem.component);
            });
            
            // Property: Visual cues should be moderately clear
            problems.forEach(problem => {
              problem.visualCues.forEach(cue => {
                // Visual cues are scaled by config.visualCueIntensity (0.8 for middle age)
                expect(cue.intensity).toBeGreaterThanOrEqual(0.2); // Adjusted for scaling
                expect(cue.intensity).toBeLessThanOrEqual(config.visualCueIntensity);
              });
            });
            
            // Property: Hint delay should be moderate
            expect(config.hintDelay).toBeGreaterThan(15000); // More than young children
            expect(config.hintDelay).toBeLessThanOrEqual(30000); // But not too long
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should generate complex problems for older age group (9-12)', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        (id, name, petType) => {
          const pet = new RobotPet(id, name, petType);
          const problems = problemGenerator.generateProblems(pet, AgeGroup.OLDER);
          const config = problemGenerator.getDifficultyConfig(AgeGroup.OLDER);
          
          expect(config).toBeDefined();
          if (config) {
            // Property: Older children should have more problems
            expect(problems.length).toBeLessThanOrEqual(config.maxProblems);
            expect(config.maxProblems).toBeGreaterThan(3); // More than middle age
            
            // Property: Problems can have higher severity
            problems.forEach(problem => {
              expect(problem.severity).toBeLessThanOrEqual(config.maxSeverity);
            });
            expect(config.maxSeverity).toBe(3); // Full severity range
            
            // Property: Should include all problem types
            const allProblemTypes = Object.values(ProblemType);
            expect(config.allowedProblemTypes).toEqual(expect.arrayContaining(allProblemTypes));
            
            // Property: Should use all component types
            const allComponentTypes = Object.values(ComponentType);
            expect(config.allowedComponents).toEqual(expect.arrayContaining(allComponentTypes));
            
            // Property: Visual cues can be more subtle
            problems.forEach(problem => {
              problem.visualCues.forEach(cue => {
                // Visual cues are scaled by config.visualCueIntensity (0.6 for older children)
                expect(cue.intensity).toBeGreaterThanOrEqual(0.1); // Can be more subtle
                expect(cue.intensity).toBeLessThanOrEqual(config.visualCueIntensity);
              });
            });
            
            // Property: Hint delay should be longer to encourage independent thinking
            expect(config.hintDelay).toBeGreaterThan(25000); // Longer than middle age
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should scale difficulty progressively across age groups', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        (id, name, petType) => {
          const pet1 = new RobotPet(id + '_young', name, petType);
          const pet2 = new RobotPet(id + '_middle', name, petType);
          const pet3 = new RobotPet(id + '_older', name, petType);
          
          const youngProblems = problemGenerator.generateProblems(pet1, AgeGroup.YOUNG);
          const middleProblems = problemGenerator.generateProblems(pet2, AgeGroup.MIDDLE);
          const olderProblems = problemGenerator.generateProblems(pet3, AgeGroup.OLDER);
          
          const youngConfig = problemGenerator.getDifficultyConfig(AgeGroup.YOUNG)!;
          const middleConfig = problemGenerator.getDifficultyConfig(AgeGroup.MIDDLE)!;
          const olderConfig = problemGenerator.getDifficultyConfig(AgeGroup.OLDER)!;
          
          // Property: Maximum problems should increase with age
          expect(youngConfig.maxProblems).toBeLessThanOrEqual(middleConfig.maxProblems);
          expect(middleConfig.maxProblems).toBeLessThanOrEqual(olderConfig.maxProblems);
          
          // Property: Maximum severity should increase with age
          expect(youngConfig.maxSeverity).toBeLessThanOrEqual(middleConfig.maxSeverity);
          expect(middleConfig.maxSeverity).toBeLessThanOrEqual(olderConfig.maxSeverity);
          
          // Property: Number of allowed problem types should increase with age
          expect(youngConfig.allowedProblemTypes.length).toBeLessThanOrEqual(middleConfig.allowedProblemTypes.length);
          expect(middleConfig.allowedProblemTypes.length).toBeLessThanOrEqual(olderConfig.allowedProblemTypes.length);
          
          // Property: Number of allowed components should increase with age
          expect(youngConfig.allowedComponents.length).toBeLessThanOrEqual(middleConfig.allowedComponents.length);
          expect(middleConfig.allowedComponents.length).toBeLessThanOrEqual(olderConfig.allowedComponents.length);
          
          // Property: Hint delay should increase with age (more independence expected)
          expect(youngConfig.hintDelay).toBeLessThanOrEqual(middleConfig.hintDelay);
          expect(middleConfig.hintDelay).toBeLessThanOrEqual(olderConfig.hintDelay);
          
          // Property: Visual cue intensity should decrease with age (less obvious cues)
          expect(youngConfig.visualCueIntensity).toBeGreaterThanOrEqual(middleConfig.visualCueIntensity);
          expect(middleConfig.visualCueIntensity).toBeGreaterThanOrEqual(olderConfig.visualCueIntensity);
        }
      ),
      { numRuns: 3 }
    );
  });

  it('should maintain cognitive load appropriateness for each age group', () => {
    fc.assert(
      fc.property(
        fc.array(petTypeArb, { minLength: 5, maxLength: 10 }),
        fc.constantFrom(...Object.values(AgeGroup)),
        (petTypes, ageGroup) => {
          const cognitiveLoadMetrics = {
            totalProblems: 0,
            totalSeverity: 0,
            uniqueProblemTypes: new Set<ProblemType>(),
            uniqueComponents: new Set<ComponentType>(),
            averageVisualCueIntensity: 0
          };
          
          let totalVisualCues = 0;
          
          petTypes.forEach((petType, index) => {
            const pet = new RobotPet(`pet_${index}`, `Pet ${index}`, petType);
            const problems = problemGenerator.generateProblems(pet, ageGroup);
            
            cognitiveLoadMetrics.totalProblems += problems.length;
            
            problems.forEach(problem => {
              cognitiveLoadMetrics.totalSeverity += problem.severity;
              cognitiveLoadMetrics.uniqueProblemTypes.add(problem.type);
              cognitiveLoadMetrics.uniqueComponents.add(problem.component);
              
              problem.visualCues.forEach(cue => {
                cognitiveLoadMetrics.averageVisualCueIntensity += cue.intensity;
                totalVisualCues++;
              });
            });
          });
          
          if (totalVisualCues > 0) {
            cognitiveLoadMetrics.averageVisualCueIntensity /= totalVisualCues;
          }
          
          const config = problemGenerator.getDifficultyConfig(ageGroup)!;
          
          // Property: Cognitive load should be appropriate for age group
          switch (ageGroup) {
            case AgeGroup.YOUNG:
              // Young children: simple, clear, limited variety
              expect(cognitiveLoadMetrics.uniqueProblemTypes.size).toBeLessThanOrEqual(2);
              expect(cognitiveLoadMetrics.uniqueComponents.size).toBeLessThanOrEqual(2);
              expect(cognitiveLoadMetrics.averageVisualCueIntensity).toBeGreaterThanOrEqual(0.3); // Adjusted for scaling
              break;
              
            case AgeGroup.MIDDLE:
              // Middle age: moderate complexity and variety
              expect(cognitiveLoadMetrics.uniqueProblemTypes.size).toBeGreaterThan(1);
              expect(cognitiveLoadMetrics.uniqueProblemTypes.size).toBeLessThanOrEqual(3);
              expect(cognitiveLoadMetrics.uniqueComponents.size).toBeLessThanOrEqual(3);
              expect(cognitiveLoadMetrics.averageVisualCueIntensity).toBeGreaterThanOrEqual(0.2); // Adjusted for scaling
              break;
              
            case AgeGroup.OLDER:
              // Older children: full complexity and variety
              expect(cognitiveLoadMetrics.uniqueProblemTypes.size).toBeGreaterThan(2);
              expect(cognitiveLoadMetrics.uniqueComponents.size).toBeGreaterThan(2);
              expect(cognitiveLoadMetrics.averageVisualCueIntensity).toBeGreaterThanOrEqual(0.1); // Adjusted for scaling
              break;
          }
          
          // Property: Average problems per pet should be within reasonable bounds
          const averageProblemsPerPet = cognitiveLoadMetrics.totalProblems / petTypes.length;
          expect(averageProblemsPerPet).toBeGreaterThanOrEqual(1);
          expect(averageProblemsPerPet).toBeLessThanOrEqual(config.maxProblems);
        }
      ),
      { numRuns: 2 }
    );
  });

  it('should ensure problem validation respects age group constraints', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        fc.constantFrom(...Object.values(AgeGroup)),
        (id, name, petType, ageGroup) => {
          const pet = new RobotPet(id, name, petType);
          const problems = problemGenerator.generateProblems(pet, ageGroup);
          
          // Validate the generated problems
          const validation = problemGenerator.validateProblemSet(problems, ageGroup);
          
          // Property: Generated problems should always pass validation for their target age group
          expect(validation.isValid).toBe(true);
          expect(validation.issues).toHaveLength(0);
          
          // Property: If there are suggestions, they should be constructive
          validation.suggestions.forEach(suggestion => {
            expect(typeof suggestion).toBe('string');
            expect(suggestion.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should handle edge cases in age-appropriate difficulty generation', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        fc.constantFrom(...Object.values(AgeGroup)),
        (id, name, petType, ageGroup) => {
          const pet = new RobotPet(id, name, petType);
          
          // Test with constrained generation
          const constrainedProblems = problemGenerator.generateProblemsWithConstraints(
            pet,
            ageGroup,
            { exactProblemCount: 1 }
          );
          
          // Property: Even with constraints, age-appropriate rules should be followed
          expect(constrainedProblems).toHaveLength(1);
          
          const config = problemGenerator.getDifficultyConfig(ageGroup)!;
          const problem = constrainedProblems[0];
          
          expect(problem.severity).toBeLessThanOrEqual(config.maxSeverity);
          expect(config.allowedProblemTypes).toContain(problem.type);
          expect(config.allowedComponents).toContain(problem.component);
          
          // Property: Visual cues should still respect age group intensity
          problem.visualCues.forEach(cue => {
            expect(cue.intensity).toBeLessThanOrEqual(config.visualCueIntensity);
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should maintain consistency in difficulty across multiple generations for same age group', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        fc.constantFrom(...Object.values(AgeGroup)),
        fc.integer({ min: 3, max: 10 }),
        (id, name, petType, ageGroup, numGenerations) => {
          const difficultyMetrics: Array<{
            problemCount: number;
            maxSeverity: number;
            problemTypeCount: number;
            componentTypeCount: number;
            avgVisualIntensity: number;
          }> = [];
          
          for (let i = 0; i < numGenerations; i++) {
            const pet = new RobotPet(`${id}_${i}`, `${name} ${i}`, petType);
            const problems = problemGenerator.generateProblems(pet, ageGroup);
            
            const problemTypes = new Set(problems.map(p => p.type));
            const componentTypes = new Set(problems.map(p => p.component));
            const maxSeverity = Math.max(...problems.map(p => p.severity));
            
            let totalIntensity = 0;
            let cueCount = 0;
            problems.forEach(p => {
              p.visualCues.forEach(cue => {
                totalIntensity += cue.intensity;
                cueCount++;
              });
            });
            
            difficultyMetrics.push({
              problemCount: problems.length,
              maxSeverity,
              problemTypeCount: problemTypes.size,
              componentTypeCount: componentTypes.size,
              avgVisualIntensity: cueCount > 0 ? totalIntensity / cueCount : 0
            });
          }
          
          const config = problemGenerator.getDifficultyConfig(ageGroup)!;
          
          // Property: All generations should respect the same age group constraints
          difficultyMetrics.forEach(metrics => {
            expect(metrics.problemCount).toBeLessThanOrEqual(config.maxProblems);
            expect(metrics.maxSeverity).toBeLessThanOrEqual(config.maxSeverity);
            expect(metrics.avgVisualIntensity).toBeLessThanOrEqual(config.visualCueIntensity);
          });
          
          // Property: Difficulty should be relatively consistent (not wildly varying)
          if (difficultyMetrics.length > 1) {
            const problemCounts = difficultyMetrics.map(m => m.problemCount);
            const minProblems = Math.min(...problemCounts);
            const maxProblems = Math.max(...problemCounts);
            
            // Variation should not exceed the maximum allowed for the age group
            expect(maxProblems - minProblems).toBeLessThanOrEqual(config.maxProblems);
          }
        }
      ),
      { numRuns: 2 }
    );
  });
});
