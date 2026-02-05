/**
 * Integration tests for DiagnosticState with other game systems
 * Tests the complete diagnostic workflow with real dependencies
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiagnosticState } from '@/states/DiagnosticState'
import { RobotPet } from '@/pets/RobotPet'
import { AudioManager } from '@/audio/AudioManager'
import { OverlayHandSystem } from '@/rendering/OverlayHandSystem'
import { CanvasRenderer } from '@/rendering/CanvasRenderer'
import { ComponentType, PetType, AgeGroup } from '@/pets/types'

describe('Diagnostic State Integration', () => {
  let diagnosticState: DiagnosticState
  let testPet: RobotPet
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D
  let renderer: CanvasRenderer
  let audioManager: AudioManager
  let overlayHandSystem: OverlayHandSystem

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
      height: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setAttribute: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }))
    } as any

    // Create real instances
    renderer = new CanvasRenderer(mockCanvas)
    audioManager = new AudioManager()
    overlayHandSystem = new OverlayHandSystem(mockCanvas)
    
    // Initialize systems
    renderer.initialize()
    audioManager.initialize()
    overlayHandSystem.initialize()

    // Create test pet with all components
    testPet = new RobotPet('integration-test-pet', 'Integration Test Bot', PetType.DOG)

    // Create diagnostic state with all dependencies
    diagnosticState = new DiagnosticState(audioManager, overlayHandSystem)
  })

  afterEach(() => {
    vi.clearAllMocks()
    
    // Cleanup systems
    renderer.shutdown()
    audioManager.shutdown()
    overlayHandSystem.shutdown()
  })

  describe('Complete Diagnostic Workflow', () => {
    it('should complete full diagnostic workflow for young children', () => {
      // Initialize diagnostic for young age group
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.YOUNG)
      
      // Enter diagnostic state
      diagnosticState.enter()
      
      const initialProgress = diagnosticState.getProgress()
      expect(initialProgress.totalProblems).toBeGreaterThan(0)
      expect(initialProgress.totalProblems).toBeLessThanOrEqual(2) // Young children limit
      
      // Simulate game loop updates
      diagnosticState.update(100) // 100ms
      diagnosticState.render(renderer)
      
      // Verify rendering calls were made
      expect(mockContext.fillRect).toHaveBeenCalled()
      expect(mockContext.fillText).toHaveBeenCalled()
      
      // Simulate hint timing for young children (15 seconds)
      diagnosticState.update(15000)
      
      const progressAfterHint = diagnosticState.getProgress()
      if (progressAfterHint.identifiedProblems < progressAfterHint.totalProblems) {
        expect(progressAfterHint.hintsUsed).toBe(1)
      }
      
      // Complete diagnostic by skipping
      const skipEvent = {
        type: 'key_down' as const,
        key: 's',
        timestamp: performance.now()
      }
      
      diagnosticState.handleInput(skipEvent)
      
      const finalProgress = diagnosticState.getProgress()
      expect(finalProgress.isComplete).toBe(true)
      expect(finalProgress.identifiedProblems).toBe(finalProgress.totalProblems)
      
      // Exit state
      diagnosticState.exit()
    })

    it('should complete full diagnostic workflow for older children', () => {
      // Initialize diagnostic for older age group
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.OLDER)
      
      // Enter diagnostic state
      diagnosticState.enter()
      
      const initialProgress = diagnosticState.getProgress()
      expect(initialProgress.totalProblems).toBeGreaterThan(0)
      expect(initialProgress.totalProblems).toBeLessThanOrEqual(4) // Older children limit
      
      // Simulate game loop updates
      for (let i = 0; i < 10; i++) {
        diagnosticState.update(100) // 100ms each
        diagnosticState.render(renderer)
      }
      
      // Verify no hints yet (older children wait 30 seconds)
      let progressBeforeHint = diagnosticState.getProgress()
      expect(progressBeforeHint.hintsUsed).toBe(0)
      
      // Simulate hint timing for older children (30 seconds total)
      diagnosticState.update(29000) // 29 more seconds
      
      const progressAfterHint = diagnosticState.getProgress()
      if (progressAfterHint.identifiedProblems < progressAfterHint.totalProblems) {
        expect(progressAfterHint.hintsUsed).toBe(1)
      }
      
      // Test manual hint request
      const hintEvent = {
        type: 'key_down' as const,
        key: 'h',
        timestamp: performance.now()
      }
      
      diagnosticState.handleInput(hintEvent)
      
      const progressAfterManualHint = diagnosticState.getProgress()
      expect(progressAfterManualHint.hintsUsed).toBeGreaterThan(progressAfterHint.hintsUsed)
      
      // Exit state
      diagnosticState.exit()
    })

    it('should handle component interactions correctly', () => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
      
      const initialProgress = diagnosticState.getProgress()
      
      // Simulate clicking on different areas of the canvas
      const clickPositions = [
        { x: 100, y: 100 }, // Likely component area
        { x: 200, y: 150 }, // Another component area
        { x: 400, y: 20 },  // UI area (hint button)
        { x: 520, y: 20 },  // UI area (skip button)
        { x: 50, y: 50 },   // Empty area
      ]
      
      for (const position of clickPositions) {
        const clickEvent = {
          type: 'pointer_down' as const,
          x: position.x,
          y: position.y,
          timestamp: performance.now()
        }
        
        const handled = diagnosticState.handleInput(clickEvent)
        
        // Should handle input without throwing
        expect(typeof handled).toBe('boolean')
        
        // Update and render after each interaction
        diagnosticState.update(50)
        diagnosticState.render(renderer)
      }
      
      const finalProgress = diagnosticState.getProgress()
      
      // Some interactions should have occurred
      const totalInteractions = finalProgress.correctIdentifications + 
                              finalProgress.incorrectAttempts
      
      // Progress should be valid
      expect(finalProgress.identifiedProblems).toBeLessThanOrEqual(finalProgress.totalProblems)
      expect(finalProgress.correctIdentifications).toBeLessThanOrEqual(finalProgress.identifiedProblems)
      expect(finalProgress.timeElapsed).toBeGreaterThan(0)
      
      diagnosticState.exit()
    })
  })

  describe('System Integration', () => {
    it('should integrate with audio system correctly', () => {
      const playSoundSpy = vi.spyOn(audioManager, 'playSound')
      const playTactileSpy = vi.spyOn(audioManager, 'playTactileAudio')
      
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
      
      // Request a hint (should trigger audio)
      const hintEvent = {
        type: 'key_down' as const,
        key: 'h',
        timestamp: performance.now()
      }
      
      diagnosticState.handleInput(hintEvent)
      
      // Verify audio calls were made
      expect(playSoundSpy).toHaveBeenCalled()
      
      diagnosticState.exit()
    })

    it('should integrate with overlay hand system correctly', () => {
      const showTapSpy = vi.spyOn(overlayHandSystem, 'showTapGesture')
      const hideAllSpy = vi.spyOn(overlayHandSystem, 'hideAllGuidingHands')
      
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
      
      // Should show initial guidance
      expect(showTapSpy).toHaveBeenCalled()
      
      diagnosticState.exit()
      
      // Should hide guidance on exit
      expect(hideAllSpy).toHaveBeenCalled()
    })

    it('should integrate with renderer correctly', () => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
      
      // Render multiple frames
      for (let i = 0; i < 5; i++) {
        diagnosticState.update(16) // ~60 FPS
        diagnosticState.render(renderer)
      }
      
      // Verify rendering calls were made consistently
      expect(mockContext.fillRect).toHaveBeenCalled()
      expect(mockContext.fillText).toHaveBeenCalled()
      expect(mockContext.roundRect).toHaveBeenCalled()
      
      // Verify no rendering errors occurred
      expect(() => {
        diagnosticState.render(renderer)
      }).not.toThrow()
      
      diagnosticState.exit()
    })
  })

  describe('Pet Component Integration', () => {
    it('should work with pets of different types', () => {
      const petTypes = [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.DRAGON]
      
      for (const petType of petTypes) {
        const pet = new RobotPet(`test-${petType}`, `Test ${petType}`, petType)
        
        diagnosticState.initializeDiagnostic(pet, AgeGroup.MIDDLE)
        diagnosticState.enter()
        
        const progress = diagnosticState.getProgress()
        
        // Should generate problems for any pet type
        expect(progress.totalProblems).toBeGreaterThan(0)
        
        // Should render without errors
        expect(() => {
          diagnosticState.render(renderer)
        }).not.toThrow()
        
        diagnosticState.exit()
      }
    })

    it('should handle pets with all component types', () => {
      // Verify test pet has all expected components
      expect(testPet.hasComponent(ComponentType.POWER_CORE)).toBe(true)
      expect(testPet.hasComponent(ComponentType.MOTOR_SYSTEM)).toBe(true)
      expect(testPet.hasComponent(ComponentType.SENSOR_ARRAY)).toBe(true)
      expect(testPet.hasComponent(ComponentType.CHASSIS_PLATING)).toBe(true)
      expect(testPet.hasComponent(ComponentType.PROCESSING_UNIT)).toBe(true)
      
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
      
      const progress = diagnosticState.getProgress()
      
      // Should generate problems that can target any component
      expect(progress.totalProblems).toBeGreaterThan(0)
      
      // Should set up interactive areas for components
      diagnosticState.render(renderer)
      
      // Verify component labels are rendered
      expect(mockContext.fillText).toHaveBeenCalled()
      
      diagnosticState.exit()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle rapid state transitions', () => {
      // Rapid enter/exit cycles
      for (let i = 0; i < 5; i++) {
        diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
        diagnosticState.enter()
        diagnosticState.update(10)
        diagnosticState.render(renderer)
        diagnosticState.exit()
      }
      
      // Should not throw errors
      expect(true).toBe(true)
    })

    it('should handle missing dependencies gracefully', () => {
      // Create diagnostic state without optional dependencies
      const minimalState = new DiagnosticState()
      
      minimalState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      minimalState.enter()
      
      // Should work without audio or overlay systems
      expect(() => {
        minimalState.update(100)
        minimalState.render(renderer)
        
        const hintEvent = {
          type: 'key_down' as const,
          key: 'h',
          timestamp: performance.now()
        }
        
        minimalState.handleInput(hintEvent)
      }).not.toThrow()
      
      minimalState.exit()
    })

    it('should maintain performance with many updates', () => {
      diagnosticState.initializeDiagnostic(testPet, AgeGroup.MIDDLE)
      diagnosticState.enter()
      
      const startTime = performance.now()
      
      // Simulate many rapid updates (stress test)
      for (let i = 0; i < 1000; i++) {
        diagnosticState.update(1) // 1ms each
        
        // Render every 16ms (60 FPS)
        if (i % 16 === 0) {
          diagnosticState.render(renderer)
        }
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)
      
      // State should still be valid
      const progress = diagnosticState.getProgress()
      expect(progress.timeElapsed).toBe(1000) // 1000 * 1ms
      
      diagnosticState.exit()
    })
  })
})