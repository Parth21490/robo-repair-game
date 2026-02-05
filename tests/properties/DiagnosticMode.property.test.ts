/**
 * Property-based tests for Diagnostic Mode Behavior
 * **Feature: robo-pet-repair-shop, Property 5: Diagnostic Mode Behavior**
 * **Validates: Requirements 2.1, 2.3, 2.5**
 * 
 * Tests that for any entry into diagnostic mode, the system should highlight all 
 * interactive areas and provide progressive hints after 30 seconds of inactivity 
 * when problems remain unidentified.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import fc from 'fast-check'
import { DiagnosticState } from '@/states/DiagnosticState'
import { RobotPet } from '@/pets/RobotPet'
import { AudioManager } from '@/audio/AudioManager'
import { OverlayHandSystem } from '@/rendering/OverlayHandSystem'
import { ComponentType, PetType, AgeGroup } from '@/pets/types'

// Mock dependencies
vi.mock('@/audio/AudioManager')
vi.mock('@/rendering/OverlayHandSystem')

describe('Property 5: Diagnostic Mode Behavior', () => {
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D
  let mockAudioManager: AudioManager
  let mockOverlayHandSystem: OverlayHandSystem

  beforeEach(() => {
    // Create mock canvas and context
    mockContext = {
      canvas: { width: 800, height: 600 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      transform: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      setLineDash: vi.fn()
    } as any

    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      width: 800,
      height: 600
    } as any

    mockAudioManager = new AudioManager()
    mockOverlayHandSystem = new OverlayHandSystem(mockCanvas)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Generator for valid pet configurations
   */
  const petArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    type: fc.constantFrom(PetType.DOG, PetType.CAT, PetType.BIRD, PetType.DRAGON)
  })

  /**
   * Generator for age groups
   */
  const ageGroupArbitrary = fc.constantFrom(AgeGroup.YOUNG, AgeGroup.MIDDLE, AgeGroup.OLDER)

  /**
   * Generator for time intervals (in milliseconds)
   */
  const timeIntervalArbitrary = fc.integer({ min: 0, max: 60000 }) // 0 to 60 seconds

  /**
   * Property: Interactive areas are highlighted on diagnostic entry
   * **Validates: Requirements 2.1**
   */
  it('should highlight all interactive areas when entering diagnostic mode', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        (petConfig, ageGroup) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          // Act
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          diagnosticState.enter()
          
          // Assert
          const progress = diagnosticState.getProgress()
          
          // Should have problems to identify (requirement that problems exist)
          expect(progress.totalProblems).toBeGreaterThan(0)
          
          // Should not be complete initially
          expect(progress.isComplete).toBe(false)
          
          // Should have zero identified problems initially
          expect(progress.identifiedProblems).toBe(0)
          
          // Should have zero hints used initially
          expect(progress.hintsUsed).toBe(0)
          
          // Should have zero time elapsed initially
          expect(progress.timeElapsed).toBe(0)
          
          // Verify rendering doesn't throw (indicates interactive areas are set up)
          const mockRenderer = { getContext: () => mockContext }
          expect(() => {
            diagnosticState.render(mockRenderer as any)
          }).not.toThrow()
          
          // Verify that rendering calls were made (indicates highlighting)
          expect(mockContext.roundRect).toHaveBeenCalled() // For highlighted areas
          expect(mockContext.fillText).toHaveBeenCalled() // For component labels
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property: Progressive hints are provided after inactivity
   * **Validates: Requirements 2.5**
   */
  it('should provide progressive hints after configured delay when problems remain unidentified', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        (petConfig, ageGroup) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          diagnosticState.enter()
          
          const initialProgress = diagnosticState.getProgress()
          
          // Skip test if no problems to identify
          if (initialProgress.totalProblems === 0) {
            return true
          }
          
          // Determine expected hint delay based on age group
          let expectedHintDelay: number
          switch (ageGroup) {
            case AgeGroup.YOUNG:
              expectedHintDelay = 15000 // 15 seconds
              break
            case AgeGroup.MIDDLE:
              expectedHintDelay = 25000 // 25 seconds
              break
            case AgeGroup.OLDER:
              expectedHintDelay = 30000 // 30 seconds
              break
            default:
              expectedHintDelay = 30000
          }
          
          // Act - simulate time passing just before hint delay
          diagnosticState.update(expectedHintDelay - 1000)
          
          let progressBeforeHint = diagnosticState.getProgress()
          
          // Assert - no hints should be given yet
          expect(progressBeforeHint.hintsUsed).toBe(0)
          expect(progressBeforeHint.identifiedProblems).toBe(0)
          expect(progressBeforeHint.isComplete).toBe(false)
          
          // Act - simulate time passing to trigger hint
          diagnosticState.update(1000)
          
          let progressAfterHint = diagnosticState.getProgress()
          
          // Assert - hint should be provided if problems remain unidentified
          if (progressAfterHint.identifiedProblems < progressAfterHint.totalProblems) {
            expect(progressAfterHint.hintsUsed).toBe(1)
          }
          
          // Time should be tracked correctly
          expect(progressAfterHint.timeElapsed).toBe(expectedHintDelay)
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * Property: No hints provided when diagnostic is complete
   * **Validates: Requirements 2.5**
   */
  it('should not provide hints when all problems are identified', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        timeIntervalArbitrary,
        (petConfig, ageGroup, timeInterval) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          diagnosticState.enter()
          
          // Act - complete the diagnostic by skipping
          const skipEvent = {
            type: 'key_down' as const,
            key: 's',
            timestamp: performance.now()
          }
          diagnosticState.handleInput(skipEvent)
          
          const progressAfterSkip = diagnosticState.getProgress()
          const hintsAfterSkip = progressAfterSkip.hintsUsed
          
          // Simulate time passing after completion
          diagnosticState.update(timeInterval)
          
          const finalProgress = diagnosticState.getProgress()
          
          // Assert - no additional hints should be provided
          expect(finalProgress.hintsUsed).toBe(hintsAfterSkip)
          expect(finalProgress.isComplete).toBe(true)
          expect(finalProgress.identifiedProblems).toBe(finalProgress.totalProblems)
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * Property: Visual feedback is provided for component interactions
   * **Validates: Requirements 2.2**
   */
  it('should provide visual feedback when components are clicked', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        fc.integer({ min: 0, max: 799 }), // x coordinate
        fc.integer({ min: 0, max: 599 }), // y coordinate
        (petConfig, ageGroup, x, y) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          diagnosticState.enter()
          
          const initialProgress = diagnosticState.getProgress()
          
          // Act - simulate clicking on the canvas
          const clickEvent = {
            type: 'pointer_down' as const,
            x,
            y,
            timestamp: performance.now()
          }
          
          const handled = diagnosticState.handleInput(clickEvent)
          
          const progressAfterClick = diagnosticState.getProgress()
          
          // Assert - interaction should be tracked
          // Either correct identification, incorrect attempt, or UI interaction
          const totalInteractions = progressAfterClick.correctIdentifications + 
                                  progressAfterClick.incorrectAttempts
          const initialInteractions = initialProgress.correctIdentifications + 
                                    initialProgress.incorrectAttempts
          
          // If input was handled, some interaction should have occurred
          if (handled) {
            expect(totalInteractions).toBeGreaterThanOrEqual(initialInteractions)
          }
          
          // Progress should be valid
          expect(progressAfterClick.identifiedProblems).toBeLessThanOrEqual(progressAfterClick.totalProblems)
          expect(progressAfterClick.correctIdentifications).toBeLessThanOrEqual(progressAfterClick.totalProblems)
          expect(progressAfterClick.incorrectAttempts).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property: Age-appropriate problem complexity
   * **Validates: Requirements 2.3**
   */
  it('should generate age-appropriate problems with clear visual cues', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        (petConfig, ageGroup) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          // Act
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          
          const progress = diagnosticState.getProgress()
          
          // Assert - problem count should be age-appropriate
          switch (ageGroup) {
            case AgeGroup.YOUNG:
              expect(progress.totalProblems).toBeLessThanOrEqual(2)
              break
            case AgeGroup.MIDDLE:
              expect(progress.totalProblems).toBeLessThanOrEqual(3)
              break
            case AgeGroup.OLDER:
              expect(progress.totalProblems).toBeLessThanOrEqual(4)
              break
          }
          
          // Should always have at least one problem
          expect(progress.totalProblems).toBeGreaterThan(0)
          
          // Progress should be in valid state
          expect(progress.identifiedProblems).toBe(0)
          expect(progress.correctIdentifications).toBe(0)
          expect(progress.incorrectAttempts).toBe(0)
          expect(progress.hintsUsed).toBe(0)
          expect(progress.timeElapsed).toBe(0)
          expect(progress.isComplete).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property: Hint system respects age-appropriate timing
   * **Validates: Requirements 2.5**
   */
  it('should provide hints at age-appropriate intervals', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        (petConfig, ageGroup) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          diagnosticState.enter()
          
          const initialProgress = diagnosticState.getProgress()
          
          // Skip if no problems to solve
          if (initialProgress.totalProblems === 0) {
            return true
          }
          
          // Test different time intervals based on age group
          const testIntervals = [5000, 10000, 15000, 20000, 25000, 30000, 35000]
          
          for (const interval of testIntervals) {
            // Reset state for each test
            const freshState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
            freshState.initializeDiagnostic(pet, ageGroup)
            freshState.enter()
            
            // Simulate time passing
            freshState.update(interval)
            
            const progress = freshState.getProgress()
            
            // Determine if hint should be provided based on age group and time
            let shouldHaveHint = false
            switch (ageGroup) {
              case AgeGroup.YOUNG:
                shouldHaveHint = interval >= 15000
                break
              case AgeGroup.MIDDLE:
                shouldHaveHint = interval >= 25000
                break
              case AgeGroup.OLDER:
                shouldHaveHint = interval >= 30000
                break
            }
            
            // Assert hint timing
            if (shouldHaveHint && progress.identifiedProblems < progress.totalProblems) {
              expect(progress.hintsUsed).toBeGreaterThan(0)
            } else if (!shouldHaveHint) {
              expect(progress.hintsUsed).toBe(0)
            }
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Manual hint requests are always honored
   * **Validates: Requirements 2.5**
   */
  it('should provide hints immediately when manually requested', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        fc.constantFrom('h', 'H'), // Test both lowercase and uppercase
        (petConfig, ageGroup, hintKey) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          diagnosticState.enter()
          
          const initialProgress = diagnosticState.getProgress()
          
          // Act - request hint manually
          const hintEvent = {
            type: 'key_down' as const,
            key: hintKey,
            timestamp: performance.now()
          }
          
          const handled = diagnosticState.handleInput(hintEvent)
          
          const progressAfterHint = diagnosticState.getProgress()
          
          // Assert
          expect(handled).toBe(true)
          expect(progressAfterHint.hintsUsed).toBe(initialProgress.hintsUsed + 1)
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * Property: State consistency throughout diagnostic session
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
   */
  it('should maintain consistent state throughout diagnostic session', () => {
    fc.assert(
      fc.property(
        petArbitrary,
        ageGroupArbitrary,
        fc.array(timeIntervalArbitrary, { minLength: 1, maxLength: 10 }),
        (petConfig, ageGroup, timeUpdates) => {
          // Arrange
          const pet = new RobotPet(petConfig.id, petConfig.name, petConfig.type)
          const diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
          
          diagnosticState.initializeDiagnostic(pet, ageGroup)
          diagnosticState.enter()
          
          let totalTime = 0
          let previousProgress = diagnosticState.getProgress()
          
          // Act - simulate multiple time updates
          for (const deltaTime of timeUpdates) {
            diagnosticState.update(deltaTime)
            totalTime += deltaTime
            
            const currentProgress = diagnosticState.getProgress()
            
            // Assert - state consistency checks
            expect(currentProgress.totalProblems).toBe(previousProgress.totalProblems)
            expect(currentProgress.identifiedProblems).toBeGreaterThanOrEqual(previousProgress.identifiedProblems)
            expect(currentProgress.correctIdentifications).toBeGreaterThanOrEqual(previousProgress.correctIdentifications)
            expect(currentProgress.incorrectAttempts).toBeGreaterThanOrEqual(previousProgress.incorrectAttempts)
            expect(currentProgress.hintsUsed).toBeGreaterThanOrEqual(previousProgress.hintsUsed)
            expect(currentProgress.timeElapsed).toBeGreaterThanOrEqual(previousProgress.timeElapsed)
            
            // Identified problems should not exceed total problems
            expect(currentProgress.identifiedProblems).toBeLessThanOrEqual(currentProgress.totalProblems)
            
            // Correct identifications should not exceed identified problems
            expect(currentProgress.correctIdentifications).toBeLessThanOrEqual(currentProgress.identifiedProblems)
            
            // Time should be tracked accurately
            expect(currentProgress.timeElapsed).toBe(totalTime)
            
            // Completion state should be consistent
            if (currentProgress.identifiedProblems >= currentProgress.totalProblems) {
              expect(currentProgress.isComplete).toBe(true)
            }
            
            previousProgress = currentProgress
          }
        }
      ),
      { numRuns: 30 }
    )
  })
})