/**
 * Unit tests for DiagnosticState
 * Tests problem identification mechanics, hint system, and interactive areas
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiagnosticState } from '@/states/DiagnosticState'
import { RobotPet } from '@/pets/RobotPet'
import { AudioManager } from '@/audio/AudioManager'
import { OverlayHandSystem } from '@/rendering/OverlayHandSystem'
import { ComponentType, PetType, AgeGroup } from '@/pets/types'

// Mock dependencies
vi.mock('@/audio/AudioManager')
vi.mock('@/rendering/OverlayHandSystem')

describe('DiagnosticState', () => {
  let diagnosticState: DiagnosticState
  let mockAudioManager: AudioManager
  let mockOverlayHandSystem: OverlayHandSystem
  let testPet: RobotPet
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D

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

    // Create mock dependencies
    mockAudioManager = new AudioManager()
    mockOverlayHandSystem = new OverlayHandSystem(mockCanvas)

    // Create test pet
    testPet = new RobotPet('test-pet-1', 'Test Bot', PetType.DOG)

    // Create diagnostic state
    diagnosticState = new DiagnosticState(mockAudioManager, mockOverlayHandSystem)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default progress state', () => {
      const progress = diagnosticState.getProgress()
      
      expect(progress.totalProblems).toBe(0)
      expect(progress.identifiedProblems).toBe(0)
      expect(progress.correctIdentifications).toBe(0)
      expect(progress.incorrectAttempts).toBe(0)
      expect(progress.hintsUsed).toBe(0)
      expect(progress.timeElapsed).toBe(0)
      expect(progress.isComplete).toBe(false)
    })

    it('should have correct state name', () => {
      expect(diagnosticState.name).toBe('Diagnostic')
    })

    it('should initialize without a current pet', () => {
      expect(diagnosticState.getCurrentPet()).toBeNull()
    })
  })

  describe('Diagnostic Initialization', () => {
    it('should initialize diagnostic session with pet and age group', () => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      
      expect(diagnosticState.getCurrentPet()).toBe(testPet)
      
      const progress = diagnosticState.getProgress()
      expect(progress.totalProblems).toBeGreaterThan(0)
      expect(progress.identifiedProblems).toBe(0)
      expect(progress.isComplete).toBe(false)
    })

    it('should generate age-appropriate problems for young children', () => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.YOUNG)
      
      const progress = diagnosticState.getProgress()
      // Young children should have fewer problems (max 2)
      expect(progress.totalProblems).toBeLessThanOrEqual(2)
      expect(progress.totalProblems).toBeGreaterThan(0)
    })

    it('should generate more complex problems for older children', () => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.OLDER)
      
      const progress = diagnosticState.getProgress()
      // Older children can have more problems (up to 4)
      expect(progress.totalProblems).toBeLessThanOrEqual(4)
      expect(progress.totalProblems).toBeGreaterThan(0)
    })
  })

  describe('State Lifecycle', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
    })

    it('should handle enter state correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      diagnosticState.enter()
      
      expect(consoleSpy).toHaveBeenCalledWith('Entered Diagnostic State')
      
      consoleSpy.mockRestore()
    })

    it('should handle exit state correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      diagnosticState.enter()
      diagnosticState.exit()
      
      expect(consoleSpy).toHaveBeenCalledWith('Exited Diagnostic State')
      
      consoleSpy.mockRestore()
    })

    it('should update time elapsed during update', () => {
      diagnosticState.enter()
      
      const initialProgress = diagnosticState.getProgress()
      expect(initialProgress.timeElapsed).toBe(0)
      
      diagnosticState.update(1000) // 1 second
      
      const updatedProgress = diagnosticState.getProgress()
      expect(updatedProgress.timeElapsed).toBe(1000)
    })
  })

  describe('Input Handling', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
    })

    it('should handle pointer down events', () => {
      const inputEvent = {
        type: 'pointer_down' as const,
        x: 100,
        y: 100,
        timestamp: performance.now()
      }
      
      const handled = diagnosticState.handleInput(inputEvent)
      
      // Should return true if input was handled (clicked on interactive area or UI)
      expect(typeof handled).toBe('boolean')
    })

    it('should handle keyboard input for hints', () => {
      const inputEvent = {
        type: 'key_down' as const,
        key: 'h',
        timestamp: performance.now()
      }
      
      const handled = diagnosticState.handleInput(inputEvent)
      
      expect(handled).toBe(true)
      
      // Should increase hints used
      const progress = diagnosticState.getProgress()
      expect(progress.hintsUsed).toBe(1)
    })

    it('should handle keyboard input for skip', () => {
      const inputEvent = {
        type: 'key_down' as const,
        key: 's',
        timestamp: performance.now()
      }
      
      const handled = diagnosticState.handleInput(inputEvent)
      
      expect(handled).toBe(true)
      
      // Should complete diagnostic
      const progress = diagnosticState.getProgress()
      expect(progress.isComplete).toBe(true)
    })

    it('should not handle unrecognized input', () => {
      const inputEvent = {
        type: 'key_down' as const,
        key: 'z',
        timestamp: performance.now()
      }
      
      const handled = diagnosticState.handleInput(inputEvent)
      
      expect(handled).toBe(false)
    })
  })

  describe('Progress Tracking', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
    })

    it('should track correct identifications', () => {
      const initialProgress = diagnosticState.getProgress()
      expect(initialProgress.correctIdentifications).toBe(0)
      
      // This would be tested with actual component clicking in integration tests
      // For unit tests, we verify the progress structure is correct
      expect(initialProgress.totalProblems).toBeGreaterThan(0)
    })

    it('should track time elapsed', () => {
      diagnosticState.update(500)
      diagnosticState.update(300)
      
      const progress = diagnosticState.getProgress()
      expect(progress.timeElapsed).toBe(800)
    })

    it('should track hints used', () => {
      const hintEvent = {
        type: 'key_down' as const,
        key: 'h',
        timestamp: performance.now()
      }
      
      diagnosticState.handleInput(hintEvent)
      diagnosticState.handleInput(hintEvent)
      
      const progress = diagnosticState.getProgress()
      expect(progress.hintsUsed).toBe(2)
    })
  })

  describe('Hint System', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
    })

    it('should show hints after delay for young children', () => {
      // Reinitialize with young age group for faster hints
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.YOUNG)
      diagnosticState.enter()
      
      const initialProgress = diagnosticState.getProgress()
      expect(initialProgress.hintsUsed).toBe(0)
      
      // Simulate time passing (15 seconds for young children)
      diagnosticState.update(15000)
      
      const updatedProgress = diagnosticState.getProgress()
      expect(updatedProgress.hintsUsed).toBe(1)
    })

    it('should allow manual hint requests', () => {
      const hintEvent = {
        type: 'key_down' as const,
        key: 'h',
        timestamp: performance.now()
      }
      
      diagnosticState.handleInput(hintEvent)
      
      const progress = diagnosticState.getProgress()
      expect(progress.hintsUsed).toBe(1)
    })

    it('should not show hints when diagnostic is complete', () => {
      // Complete the diagnostic first
      const skipEvent = {
        type: 'key_down' as const,
        key: 's',
        timestamp: performance.now()
      }
      
      diagnosticState.handleInput(skipEvent)
      
      const initialHints = diagnosticState.getProgress().hintsUsed
      
      // Try to trigger hint after completion
      diagnosticState.update(30000)
      
      const finalHints = diagnosticState.getProgress().hintsUsed
      expect(finalHints).toBe(initialHints) // Should not increase
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
    })

    it('should render without errors', () => {
      const mockRenderer = {
        getContext: () => mockContext
      }
      
      expect(() => {
        diagnosticState.render(mockRenderer as any)
      }).not.toThrow()
      
      // Verify some rendering calls were made
      expect(mockContext.fillRect).toHaveBeenCalled()
    })

    it('should render progress bar', () => {
      const mockRenderer = {
        getContext: () => mockContext
      }
      
      diagnosticState.render(mockRenderer as any)
      
      // Should call roundRect for progress bar
      expect(mockContext.roundRect).toHaveBeenCalled()
    })

    it('should render interactive areas', () => {
      const mockRenderer = {
        getContext: () => mockContext
      }
      
      diagnosticState.render(mockRenderer as any)
      
      // Should render highlights and labels
      expect(mockContext.fillText).toHaveBeenCalled()
    })
  })

  describe('Accessibility Features', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
    })

    it('should provide skip functionality', () => {
      const skipEvent = {
        type: 'key_down' as const,
        key: 's',
        timestamp: performance.now()
      }
      
      const handled = diagnosticState.handleInput(skipEvent)
      
      expect(handled).toBe(true)
      
      const progress = diagnosticState.getProgress()
      expect(progress.isComplete).toBe(true)
      expect(progress.identifiedProblems).toBe(progress.totalProblems)
    })

    it('should provide keyboard navigation', () => {
      const escapeEvent = {
        type: 'key_down' as const,
        key: 'Escape',
        timestamp: performance.now()
      }
      
      const handled = diagnosticState.handleInput(escapeEvent)
      
      expect(handled).toBe(true)
    })

    it('should support both uppercase and lowercase hint keys', () => {
      const lowerHint = {
        type: 'key_down' as const,
        key: 'h',
        timestamp: performance.now()
      }
      
      const upperHint = {
        type: 'key_down' as const,
        key: 'H',
        timestamp: performance.now()
      }
      
      expect(diagnosticState.handleInput(lowerHint)).toBe(true)
      expect(diagnosticState.handleInput(upperHint)).toBe(true)
      
      const progress = diagnosticState.getProgress()
      expect(progress.hintsUsed).toBe(2)
    })
  })

  describe('Age-Appropriate Difficulty', () => {
    it('should configure different hint delays for different age groups', () => {
      // Young children (3-5) should get hints faster
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.YOUNG)
      diagnosticState.enter()
      
      // Simulate 15 seconds (young children's hint delay)
      diagnosticState.update(15000)
      
      let progress = diagnosticState.getProgress()
      expect(progress.hintsUsed).toBe(1)
      
      // Older children (9-12) should wait longer for hints
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.OLDER)
      diagnosticState.enter()
      
      // 15 seconds should not trigger hint for older children
      diagnosticState.update(15000)
      
      progress = diagnosticState.getProgress()
      expect(progress.hintsUsed).toBe(0)
      
      // But 30 seconds should
      diagnosticState.update(15000) // Total 30 seconds
      
      progress = diagnosticState.getProgress()
      expect(progress.hintsUsed).toBe(1)
    })

    it('should generate appropriate number of problems for each age group', () => {
      // Young children should have fewer problems
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.YOUNG)
      const youngProgress = diagnosticState.getProgress()
      
      // Older children can have more problems
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.OLDER)
      const olderProgress = diagnosticState.getProgress()
      
      // Older children should generally have same or more problems
      expect(olderProgress.totalProblems).toBeGreaterThanOrEqual(youngProgress.totalProblems)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing pet gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Try to enter without initializing pet
      diagnosticState.enter()
      
      expect(consoleSpy).toHaveBeenCalledWith('No pet assigned to diagnostic state')
      
      consoleSpy.mockRestore()
    })

    it('should handle rendering without pet', () => {
      const mockRenderer = {
        getContext: () => mockContext
      }
      
      // Should not throw even without pet
      expect(() => {
        diagnosticState.render(mockRenderer as any)
      }).not.toThrow()
    })

    it('should handle input without pet', () => {
      const inputEvent = {
        type: 'pointer_down' as const,
        x: 100,
        y: 100,
        timestamp: performance.now()
      }
      
      // Should not throw even without pet
      expect(() => {
        diagnosticState.handleInput(inputEvent)
      }).not.toThrow()
    })
  })

  describe('Integration with Audio System', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
    })

    it('should play sounds when available', () => {
      const playSoundSpy = vi.spyOn(mockAudioManager, 'playSound')
      const playTactileSpy = vi.spyOn(mockAudioManager, 'playTactileAudio')
      
      // Trigger hint request
      const hintEvent = {
        type: 'key_down' as const,
        key: 'h',
        timestamp: performance.now()
      }
      
      diagnosticState.handleInput(hintEvent)
      
      expect(playSoundSpy).toHaveBeenCalledWith('button_click', { volume: 0.5 })
    })

    it('should handle missing audio manager gracefully', () => {
      const stateWithoutAudio = new DiagnosticState()
      stateWithoutAudio.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      stateWithoutAudio.enter()
      
      // Should not throw when audio manager is not available
      expect(() => {
        const hintEvent = {
          type: 'key_down' as const,
          key: 'h',
          timestamp: performance.now()
        }
        stateWithoutAudio.handleInput(hintEvent)
      }).not.toThrow()
    })
  })

  describe('Integration with Overlay Hand System', () => {
    beforeEach(() => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
    })

    it('should show hand gestures when available', () => {
      const showTapSpy = vi.spyOn(mockOverlayHandSystem, 'showTapGesture')
      
      diagnosticState.enter()
      
      // Should show initial guidance
      expect(showTapSpy).toHaveBeenCalled()
    })

    it('should handle missing overlay system gracefully', () => {
      const stateWithoutOverlay = new DiagnosticState(mockAudioManager)
      stateWithoutOverlay.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      
      // Should not throw when overlay system is not available
      expect(() => {
        stateWithoutOverlay.enter()
      }).not.toThrow()
    })
  })
})