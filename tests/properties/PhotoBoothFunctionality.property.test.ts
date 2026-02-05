/**
 * Property-based tests for Photo Booth functionality
 * **Feature: robo-pet-repair-shop, Property 13: Photo Booth Functionality**
 * **Validates: Requirements 10.2, 10.3, 10.4, 10.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { PhotoBoothState } from '@/states/PhotoBoothState'
import { AudioManager } from '@/audio/AudioManager'
import { RobotPet } from '@/pets/RobotPet'
import { AgeGroup, PetType } from '@/pets/types'
import { Renderer } from '@/rendering/Renderer'

// Mock dependencies
vi.mock('@/audio/AudioManager')
vi.mock('@/rendering/Renderer')

describe('Property 13: Photo Booth Functionality', () => {
  let mockAudioManager: AudioManager
  let mockRenderer: Renderer
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn()
    } as unknown as HTMLCanvasElement

    mockContext = {
      canvas: mockCanvas,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      roundRect: vi.fn(),
      setLineDash: vi.fn()
    } as unknown as CanvasRenderingContext2D

    mockCanvas.getContext = vi.fn().mockReturnValue(mockContext)

    // Create mock renderer
    mockRenderer = {
      getContext: vi.fn().mockReturnValue(mockContext)
    } as unknown as Renderer

    // Create mock audio manager
    mockAudioManager = {
      playSound: vi.fn(),
      playTactileAudio: vi.fn()
    } as unknown as AudioManager

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue('[]'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    })
  })

  // Generators for test data
  const ageGroupGen = fc.constantFrom(AgeGroup.YOUNG, AgeGroup.MIDDLE, AgeGroup.OLDER)
  const petTypeGen = fc.constantFrom(PetType.DOG, PetType.CAT, PetType.BIRD, PetType.DRAGON)
  const petNameGen = fc.string({ minLength: 1, maxLength: 20 })
  
  const petGen = fc.record({
    id: fc.uuid(),
    name: petNameGen,
    type: petTypeGen
  }).map(data => ({
    ...data,
    components: new Map(),
    customizations: [],
    toJSON: () => data
  } as unknown as RobotPet))

  const coordinateGen = fc.record({
    x: fc.integer({ min: 0, max: 800 }),
    y: fc.integer({ min: 0, max: 600 })
  })

  const inputEventGen = fc.oneof(
    fc.record({
      type: fc.constant('pointer_down' as const),
      x: fc.integer({ min: 0, max: 800 }),
      y: fc.integer({ min: 0, max: 600 }),
      timestamp: fc.float({ min: 0, max: 10000 })
    }),
    fc.record({
      type: fc.constant('pointer_move' as const),
      x: fc.integer({ min: 0, max: 800 }),
      y: fc.integer({ min: 0, max: 600 }),
      timestamp: fc.float({ min: 0, max: 10000 })
    }),
    fc.record({
      type: fc.constant('key_down' as const),
      key: fc.constantFrom('1', '2', '3', '4', '5', '6', 'c', 's', 'r', 'g', 'Escape', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'),
      timestamp: fc.float({ min: 0, max: 10000 })
    })
  )

  /**
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
   * For any Robo-Pet that has completed customization, the photo booth should provide 
   * backgrounds, props, positioning tools, editing features, and save photos to the local gallery.
   */
  it('should provide complete photo booth functionality for any customized pet', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      (pet, ageGroup) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        // Initialize photo booth with pet
        expect(() => {
          photoBoothState.initializePhotoBooth(pet, ageGroup)
        }).not.toThrow()
        
        // Enter state
        expect(() => {
          photoBoothState.enter()
        }).not.toThrow()
        
        // Should be able to update without errors
        expect(() => {
          photoBoothState.update(16.67)
        }).not.toThrow()
        
        // Should be able to render without errors
        expect(() => {
          photoBoothState.render(mockRenderer)
        }).not.toThrow()
        
        // Should have called renderer to get context (indicating rendering occurred)
        expect(mockRenderer.getContext).toHaveBeenCalled()
        
        // Exit state
        expect(() => {
          photoBoothState.exit()
        }).not.toThrow()
        
        return true
      }
    ), { numRuns: 100 })
  })

  /**
   * **Validates: Requirements 10.2**
   * For any photo booth session, the system should provide various background scenes 
   * and props for photo composition.
   */
  it('should provide backgrounds and props for photo composition', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      fc.array(inputEventGen, { minLength: 1, maxLength: 10 }),
      (pet, ageGroup, inputEvents) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        photoBoothState.initializePhotoBooth(pet, ageGroup)
        photoBoothState.enter()
        
        // Test panel switching (backgrounds, props, etc.)
        const panelSwitchEvents = [
          { type: 'key_down' as const, key: '1', timestamp: 100 }, // backgrounds
          { type: 'key_down' as const, key: '2', timestamp: 200 }, // props
          { type: 'key_down' as const, key: 'Tab', timestamp: 300 } // cycle panels
        ]
        
        panelSwitchEvents.forEach(event => {
          expect(() => {
            const result = photoBoothState.handleInput(event)
            expect(typeof result).toBe('boolean')
          }).not.toThrow()
        })
        
        // Should be able to render after panel changes
        expect(() => {
          photoBoothState.render(mockRenderer)
        }).not.toThrow()
        
        photoBoothState.exit()
        return true
      }
    ), { numRuns: 50 })
  })

  /**
   * **Validates: Requirements 10.3**
   * For any photo booth session, the system should allow pet positioning and pose selection.
   */
  it('should allow pet positioning and pose selection', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      fc.array(coordinateGen, { minLength: 1, maxLength: 5 }),
      (pet, ageGroup, positions) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        photoBoothState.initializePhotoBooth(pet, ageGroup)
        photoBoothState.enter()
        
        // Test pet movement with arrow keys
        const movementKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
        movementKeys.forEach(key => {
          const result = photoBoothState.handleInput({
            type: 'key_down',
            key,
            timestamp: performance.now()
          })
          expect(result).toBe(true) // Movement should be handled
        })
        
        // Test pose selection panel
        const poseResult = photoBoothState.handleInput({
          type: 'key_down',
          key: '3', // poses panel
          timestamp: performance.now()
        })
        expect(poseResult).toBe(true)
        
        // Should render without errors after positioning
        expect(() => {
          photoBoothState.render(mockRenderer)
        }).not.toThrow()
        
        photoBoothState.exit()
        return true
      }
    ), { numRuns: 50 })
  })

  /**
   * **Validates: Requirements 10.4**
   * For any photo booth session, the system should implement photo capture and local gallery storage.
   */
  it('should implement photo capture and local gallery storage', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      (pet, ageGroup) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        photoBoothState.initializePhotoBooth(pet, ageGroup)
        photoBoothState.enter()
        
        // Test photo capture
        const captureResult = photoBoothState.handleInput({
          type: 'key_down',
          key: 'c', // capture photo
          timestamp: performance.now()
        })
        expect(typeof captureResult).toBe('boolean')
        
        // Test gallery access
        const galleryResult = photoBoothState.handleInput({
          type: 'key_down',
          key: 'g', // show gallery
          timestamp: performance.now()
        })
        expect(galleryResult).toBe(true)
        
        // Should render gallery panel
        expect(() => {
          photoBoothState.render(mockRenderer)
        }).not.toThrow()
        
        photoBoothState.exit()
        return true
      }
    ), { numRuns: 50 })
  })

  /**
   * **Validates: Requirements 10.5**
   * For any photo booth session, the system should provide simple photo editing tools 
   * (filters, stickers, frames) appropriate for children.
   */
  it('should provide simple photo editing tools appropriate for children', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      (pet, ageGroup) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        photoBoothState.initializePhotoBooth(pet, ageGroup)
        photoBoothState.enter()
        
        // Test filters panel
        const filtersResult = photoBoothState.handleInput({
          type: 'key_down',
          key: '4', // filters panel
          timestamp: performance.now()
        })
        expect(filtersResult).toBe(true)
        
        // Test stickers panel
        const stickersResult = photoBoothState.handleInput({
          type: 'key_down',
          key: '5', // stickers panel
          timestamp: performance.now()
        })
        expect(stickersResult).toBe(true)
        
        // Test frames panel
        const framesResult = photoBoothState.handleInput({
          type: 'key_down',
          key: '6', // frames panel
          timestamp: performance.now()
        })
        expect(framesResult).toBe(true)
        
        // Should render editing tools without errors
        expect(() => {
          photoBoothState.render(mockRenderer)
        }).not.toThrow()
        
        // Test reset functionality
        const resetResult = photoBoothState.handleInput({
          type: 'key_down',
          key: 'r', // reset photo
          timestamp: performance.now()
        })
        expect(typeof resetResult).toBe('boolean')
        
        photoBoothState.exit()
        return true
      }
    ), { numRuns: 50 })
  })

  /**
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
   * For any sequence of user interactions in the photo booth, the system should maintain 
   * consistent state and provide appropriate feedback.
   */
  it('should maintain consistent state across any sequence of interactions', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      fc.array(inputEventGen, { minLength: 5, maxLength: 20 }),
      (pet, ageGroup, inputSequence) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        photoBoothState.initializePhotoBooth(pet, ageGroup)
        photoBoothState.enter()
        
        // Apply sequence of inputs
        inputSequence.forEach(input => {
          expect(() => {
            const result = photoBoothState.handleInput(input)
            expect(typeof result).toBe('boolean')
          }).not.toThrow()
          
          // Should be able to update and render after each input
          expect(() => {
            photoBoothState.update(16.67)
            photoBoothState.render(mockRenderer)
          }).not.toThrow()
        })
        
        // Final state should still be valid
        expect(() => {
          photoBoothState.update(16.67)
          photoBoothState.render(mockRenderer)
          photoBoothState.exit()
        }).not.toThrow()
        
        return true
      }
    ), { numRuns: 30 })
  })

  /**
   * **Validates: Requirements 10.1**
   * For any Robo-Pet that has completed customization, the photo booth should be unlocked 
   * and accessible.
   */
  it('should be accessible for any customized pet regardless of pet characteristics', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      fc.float({ min: 0, max: 1000 }), // animation time
      (pet, ageGroup, deltaTime) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        // Should initialize successfully for any pet
        expect(() => {
          photoBoothState.initializePhotoBooth(pet, ageGroup)
        }).not.toThrow()
        
        // Should enter successfully
        expect(() => {
          photoBoothState.enter()
        }).not.toThrow()
        
        // Should update with any delta time
        expect(() => {
          photoBoothState.update(deltaTime)
        }).not.toThrow()
        
        // Should render successfully
        expect(() => {
          photoBoothState.render(mockRenderer)
        }).not.toThrow()
        
        // Should exit successfully
        expect(() => {
          photoBoothState.exit()
        }).not.toThrow()
        
        return true
      }
    ), { numRuns: 100 })
  })

  /**
   * **Validates: All photo booth requirements**
   * For any photo booth session, keyboard accessibility should be maintained throughout 
   * all interactions.
   */
  it('should maintain keyboard accessibility for all photo booth functions', () => {
    fc.assert(fc.property(
      petGen,
      ageGroupGen,
      fc.shuffledSubarray(['1', '2', '3', '4', '5', '6', 'c', 's', 'r', 'g', 'Escape', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], { minLength: 5, maxLength: 16 }),
      (pet, ageGroup, keySequence) => {
        const photoBoothState = new PhotoBoothState(mockAudioManager)
        
        photoBoothState.initializePhotoBooth(pet, ageGroup)
        photoBoothState.enter()
        
        // All keyboard shortcuts should be handled
        keySequence.forEach(key => {
          const result = photoBoothState.handleInput({
            type: 'key_down',
            key,
            timestamp: performance.now()
          })
          
          // Should either handle the key (true) or explicitly not handle it (false)
          expect(typeof result).toBe('boolean')
          
          // Should not throw regardless of key
          expect(() => {
            photoBoothState.update(16.67)
            photoBoothState.render(mockRenderer)
          }).not.toThrow()
        })
        
        photoBoothState.exit()
        return true
      }
    ), { numRuns: 50 })
  })
})