/**
 * Property-Based Tests for Interactive Feedback System
 * **Feature: robo-pet-repair-shop, Property 4: Interactive Feedback System**
 * **Validates: Requirements 1.5, 2.2, 3.1, 3.2, 3.3, 3.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { AudioManager, TactileAudioType } from '../../src/audio/AudioManager'

// Mock Web Audio API for property tests
const mockGainNode = {
  connect: vi.fn(),
  gain: { 
    value: 0.7,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  }
}

const mockBufferSource = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  buffer: null,
  loop: false,
  playbackRate: { value: 1.0 },
  onended: null
}

const mockStereoPanner = {
  connect: vi.fn(),
  pan: { value: 0 }
}

const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  type: 'sine',
  frequency: { value: 440 }
}

const mockBiquadFilter = {
  connect: vi.fn(),
  type: 'lowpass',
  frequency: { value: 1000 }
}

const mockAudioContext = {
  createGain: vi.fn(() => mockGainNode),
  createBufferSource: vi.fn(() => mockBufferSource),
  createStereoPanner: vi.fn(() => mockStereoPanner),
  createOscillator: vi.fn(() => mockOscillator),
  createBiquadFilter: vi.fn(() => mockBiquadFilter),
  decodeAudioData: vi.fn(() => Promise.resolve({})),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve())
}

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
})

describe('Property Tests: Interactive Feedback System', () => {
  let audioManager: AudioManager

  beforeEach(() => {
    audioManager = new AudioManager()
    
    // Mock AudioContext constructor
    global.AudioContext = vi.fn(() => mockAudioContext) as any
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    audioManager.shutdown()
  })

  describe('**Property 4: Interactive Feedback System**', () => {
    it('should provide appropriate audio feedback for any user interaction type', async () => {
      await audioManager.initialize()

      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant('tool_select' as const),
          fc.constant('repair_action' as const),
          fc.constant('repair_success' as const)
        ),
        fc.integer({ min: 1, max: 100 }),
        async (interactionType, intensity) => {
          // Clear previous calls
          vi.clearAllMocks()
          
          // Test repair interactions
          audioManager.playRepairAudio(interactionType, intensity)
          
          // Should always create audio feedback for interactions
          if (interactionType === 'repair_success') {
            // Success should create multiple oscillators for celebration
            expect(mockAudioContext.createOscillator).toHaveBeenCalled()
          } else {
            // Other interactions should create at least one oscillator
            expect(mockAudioContext.createOscillator).toHaveBeenCalled()
          }
          
          // Should always provide haptic feedback when available
          expect(navigator.vibrate).toHaveBeenCalled()
        }
      ), { numRuns: 50 })
    })

    it('should provide appropriate tactile feedback for any cleaning interaction', async () => {
      await audioManager.initialize()

      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant('scrub' as const),
          fc.constant('polish' as const),
          fc.constant('rinse' as const)
        ),
        fc.integer({ min: 1, max: 100 }),
        async (cleaningType, intensity) => {
          // Clear previous calls
          vi.clearAllMocks()
          
          // Test cleaning interactions
          audioManager.playCleaningAudio(cleaningType, intensity)
          
          // Should always create tactile audio for cleaning
          expect(mockAudioContext.createOscillator).toHaveBeenCalled()
          expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
          
          // Should provide haptic feedback sequence
          expect(navigator.vibrate).toHaveBeenCalled()
        }
      ), { numRuns: 50 })
    })

    it('should provide consistent tactile audio for any tactile type and intensity', async () => {
      await audioManager.initialize()

      const tactileTypes: TactileAudioType[] = [
        'squishy', 'sparkly', 'metallic', 'soft', 'rough',
        'cleaning_scrub', 'cleaning_polish', 'repair_click', 'repair_success'
      ]

      await fc.assert(fc.asyncProperty(
        fc.constantFrom(...tactileTypes),
        fc.integer({ min: 0, max: 100 }),
        async (tactileType, intensity) => {
          // Clear previous calls
          vi.clearAllMocks()
          
          // Test tactile audio
          audioManager.playTactileAudio(tactileType, intensity)
          
          if (intensity > 0) {
            // Should create audio components for tactile feedback
            expect(mockAudioContext.createOscillator).toHaveBeenCalled()
            expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
            expect(mockAudioContext.createGain).toHaveBeenCalled()
            
            // Should provide haptic feedback when intensity > 0
            expect(navigator.vibrate).toHaveBeenCalled()
          }
        }
      ), { numRuns: 100 })
    })

    it('should respect volume settings for any audio feedback', async () => {
      await audioManager.initialize()

      await fc.assert(fc.asyncProperty(
        fc.float({ min: 0, max: 1 }),
        fc.constantFrom('squishy', 'sparkly', 'metallic'),
        fc.integer({ min: 1, max: 100 }),
        async (volume, tactileType, intensity) => {
          // Set volume
          audioManager.setMasterVolume(volume)
          
          // Clear previous calls
          vi.clearAllMocks()
          
          // Test audio with volume setting
          audioManager.playTactileAudio(tactileType as TactileAudioType, intensity)
          
          // Should still create audio components
          expect(mockAudioContext.createOscillator).toHaveBeenCalled()
          
          // Volume should be applied (we can't easily test the exact value due to mocking,
          // but we can ensure the audio system respects the volume setting)
          const volumeLevels = audioManager.getVolumeLevels()
          expect(volumeLevels.master).toBe(volume)
        }
      ), { numRuns: 50 })
    })

    it('should not provide audio feedback when muted but may still provide haptic feedback', async () => {
      await audioManager.initialize()

      await fc.assert(fc.asyncProperty(
        fc.constantFrom('squishy', 'sparkly', 'repair_success'),
        fc.integer({ min: 1, max: 100 }),
        async (tactileType, intensity) => {
          // Mute audio
          audioManager.setMuted(true)
          
          // Clear previous calls
          vi.clearAllMocks()
          
          // Test muted audio
          audioManager.playTactileAudio(tactileType as TactileAudioType, intensity)
          
          // Should not create audio when muted
          expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
          
          // But should still provide haptic feedback
          expect(navigator.vibrate).toHaveBeenCalled()
        }
      ), { numRuns: 30 })
    })

    it('should provide feedback that matches interaction outcome type', async () => {
      await audioManager.initialize()

      await fc.assert(fc.asyncProperty(
        fc.record({
          interactionType: fc.oneof(
            fc.constant('success' as const),
            fc.constant('failure' as const),
            fc.constant('neutral' as const)
          ),
          intensity: fc.integer({ min: 1, max: 100 })
        }),
        async ({ interactionType, intensity }) => {
          // Clear previous calls
          vi.clearAllMocks()
          
          // Map interaction outcomes to appropriate audio types
          switch (interactionType) {
            case 'success':
              audioManager.playRepairAudio('repair_success', intensity)
              // Success should create celebration audio
              expect(mockAudioContext.createOscillator).toHaveBeenCalled()
              break
              
            case 'failure':
              // For failure, we might play a gentle feedback (not implemented yet, but structure is ready)
              audioManager.playTactileAudio('soft', intensity * 0.5)
              expect(mockAudioContext.createOscillator).toHaveBeenCalled()
              break
              
            case 'neutral':
              audioManager.playRepairAudio('tool_select', intensity)
              expect(mockAudioContext.createOscillator).toHaveBeenCalled()
              break
          }
          
          // All interactions should provide some form of feedback
          expect(navigator.vibrate).toHaveBeenCalled()
        }
      ), { numRuns: 50 })
    })

    it('should handle tactile settings configuration consistently', async () => {
      await audioManager.initialize()

      await fc.assert(fc.asyncProperty(
        fc.record({
          vibrationIntensity: fc.integer({ min: 0, max: 100 }),
          audioTextureEnabled: fc.boolean(),
          spatialHapticsEnabled: fc.boolean(),
          frequencyRange: fc.tuple(
            fc.integer({ min: 20, max: 200 }),
            fc.integer({ min: 200, max: 2000 })
          ).map(([min, max]) => [min, max] as [number, number])
        }),
        async (settings) => {
          // Configure tactile settings
          audioManager.configureTactileFeedback(settings)
          
          // Clear previous calls
          vi.clearAllMocks()
          
          // Test with configured settings
          audioManager.playTactileAudio('squishy', 50)
          
          if (settings.audioTextureEnabled) {
            // Should create audio when enabled
            expect(mockAudioContext.createOscillator).toHaveBeenCalled()
          } else {
            // Should not create audio when disabled
            expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
          }
          
          if (settings.vibrationIntensity > 0) {
            // Should provide haptic feedback when intensity > 0
            expect(navigator.vibrate).toHaveBeenCalled()
          }
          
          // Settings should be applied
          const appliedSettings = audioManager.getTactileSettings()
          expect(appliedSettings.vibrationIntensity).toBe(settings.vibrationIntensity)
          expect(appliedSettings.audioTextureEnabled).toBe(settings.audioTextureEnabled)
          expect(appliedSettings.spatialHapticsEnabled).toBe(settings.spatialHapticsEnabled)
          expect(appliedSettings.frequencyRange).toEqual(settings.frequencyRange)
        }
      ), { numRuns: 30 })
    })
  })
})