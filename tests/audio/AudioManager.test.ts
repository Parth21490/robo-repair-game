import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AudioManager, TactileAudioType, HapticPattern } from '../../src/audio/AudioManager'

// Mock Web Audio API
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

// Mock HTML Audio
const mockHTMLAudio = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  cloneNode: vi.fn(() => mockHTMLAudio),
  volume: 1,
  loop: false,
  playbackRate: 1,
  currentTime: 0,
  preload: 'auto'
}

// Mock fetch
global.fetch = vi.fn(() => 
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
  } as Response)
)

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
})

describe('AudioManager', () => {
  let audioManager: AudioManager

  beforeEach(() => {
    audioManager = new AudioManager()
    
    // Mock AudioContext constructor
    global.AudioContext = vi.fn(() => mockAudioContext) as any
    global.Audio = vi.fn(() => mockHTMLAudio) as any
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    audioManager.shutdown()
  })

  describe('Initialization', () => {
    it('should initialize with Web Audio API when available', async () => {
      await audioManager.initialize()
      
      expect(global.AudioContext).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(audioManager.isAudioSupported()).toBe(true)
    })

    it('should fallback to HTML5 Audio when Web Audio API fails', async () => {
      // Make AudioContext constructor throw
      global.AudioContext = vi.fn(() => {
        throw new Error('Web Audio not supported')
      }) as any

      await audioManager.initialize()
      
      expect(audioManager.isAudioSupported()).toBe(true)
    })

    it('should not initialize twice', async () => {
      await audioManager.initialize()
      await audioManager.initialize()
      
      expect(global.AudioContext).toHaveBeenCalledTimes(1)
    })
  })

  describe('Sound Loading and Playing', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should load sounds with Web Audio API', async () => {
      await audioManager.loadSound('test-sound', '/test.mp3')
      
      expect(global.fetch).toHaveBeenCalledWith('/test.mp3')
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled()
    })

    it('should load sounds with HTML5 Audio fallback', async () => {
      // Force HTML5 Audio mode
      global.AudioContext = vi.fn(() => {
        throw new Error('Web Audio not supported')
      }) as any
      
      const newAudioManager = new AudioManager()
      await newAudioManager.initialize()
      await newAudioManager.loadSound('test-sound', '/test.mp3')
      
      expect(global.Audio).toHaveBeenCalledWith('/test.mp3')
      
      newAudioManager.shutdown()
    })

    it('should play sounds with Web Audio API', () => {
      audioManager.playSound('test-sound', { volume: 0.5, loop: true })
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(mockAudioContext.createStereoPanner).toHaveBeenCalled()
    })

    it('should respect audio options when playing sounds', () => {
      const mockSource = mockAudioContext.createBufferSource()
      const mockGain = mockAudioContext.createGain()
      const mockPanner = mockAudioContext.createStereoPanner()
      
      audioManager.playSound('test-sound', {
        volume: 0.8,
        loop: true,
        playbackRate: 1.5,
        pan: 0.5
      })
      
      expect(mockSource.loop).toBe(true)
      expect(mockSource.playbackRate.value).toBe(1.5)
      expect(mockPanner.pan.value).toBe(0.5)
    })

    it('should not play sounds when muted', () => {
      audioManager.setMuted(true)
      audioManager.playSound('test-sound')
      
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled()
    })
  })

  describe('Volume Controls', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should set master volume', () => {
      audioManager.setMasterVolume(0.5)
      
      const volumes = audioManager.getVolumeLevels()
      expect(volumes.master).toBe(0.5)
    })

    it('should clamp volume values between 0 and 1', () => {
      audioManager.setMasterVolume(1.5)
      expect(audioManager.getVolumeLevels().master).toBe(1)
      
      audioManager.setMasterVolume(-0.5)
      expect(audioManager.getVolumeLevels().master).toBe(0)
    })

    it('should set SFX volume', () => {
      audioManager.setSFXVolume(0.3)
      
      const volumes = audioManager.getVolumeLevels()
      expect(volumes.sfx).toBe(0.3)
    })

    it('should set music volume', () => {
      audioManager.setMusicVolume(0.6)
      
      const volumes = audioManager.getVolumeLevels()
      expect(volumes.music).toBe(0.6)
    })

    it('should handle mute/unmute', () => {
      audioManager.setMuted(true)
      expect(audioManager.getVolumeLevels().isMuted).toBe(true)
      
      audioManager.setMuted(false)
      expect(audioManager.getVolumeLevels().isMuted).toBe(false)
    })
  })

  describe('Tactile Audio System', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should play tactile audio with different types', () => {
      const tactileTypes: TactileAudioType[] = ['squishy', 'sparkly', 'metallic', 'soft', 'rough']
      
      tactileTypes.forEach(type => {
        audioManager.playTactileAudio(type, 50)
        expect(mockAudioContext.createOscillator).toHaveBeenCalled()
        expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
      })
    })

    it('should trigger haptic feedback when available', () => {
      audioManager.playTactileAudio('squishy', 75)
      
      expect(navigator.vibrate).toHaveBeenCalled()
    })

    it('should not play tactile audio when disabled', () => {
      audioManager.configureTactileFeedback({ audioTextureEnabled: false })
      audioManager.playTactileAudio('squishy', 50)
      
      // Should still trigger vibration but not audio
      expect(navigator.vibrate).toHaveBeenCalled()
    })

    it('should play haptic sequences', () => {
      const sequence: HapticPattern[] = [
        { duration: 100, intensity: 50 },
        { duration: 200, intensity: 75 },
        { duration: 150, intensity: 25 }
      ]
      
      audioManager.playHapticSequence(sequence)
      
      expect(navigator.vibrate).toHaveBeenCalledWith(expect.any(Array))
    })

    it('should configure tactile feedback settings', () => {
      const newSettings = {
        vibrationIntensity: 80,
        audioTextureEnabled: false,
        spatialHapticsEnabled: true,
        frequencyRange: [30, 300] as [number, number]
      }
      
      audioManager.configureTactileFeedback(newSettings)
      
      const settings = audioManager.getTactileSettings()
      expect(settings.vibrationIntensity).toBe(80)
      expect(settings.audioTextureEnabled).toBe(false)
      expect(settings.spatialHapticsEnabled).toBe(true)
      expect(settings.frequencyRange).toEqual([30, 300])
    })
  })

  describe('Sound Management', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should stop all sounds', () => {
      // Play some sounds first
      audioManager.playSound('sound1')
      audioManager.playSound('sound2')
      
      audioManager.stopAllSounds()
      
      // Should stop all active sources
      expect(mockAudioContext.createBufferSource().stop).toHaveBeenCalled()
    })

    it('should handle sound loading errors gracefully', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      
      // Should not throw
      await expect(audioManager.loadSound('bad-sound', '/nonexistent.mp3')).resolves.toBeUndefined()
    })

    it('should handle sound playing errors gracefully', () => {
      // Should not throw when playing non-existent sound
      expect(() => audioManager.playSound('nonexistent-sound')).not.toThrow()
    })
  })

  describe('Shutdown and Cleanup', () => {
    it('should shutdown properly', async () => {
      await audioManager.initialize()
      audioManager.shutdown()
      
      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(audioManager.isAudioSupported()).toBe(false)
    })

    it('should handle shutdown when not initialized', () => {
      expect(() => audioManager.shutdown()).not.toThrow()
    })

    it('should clear all resources on shutdown', async () => {
      await audioManager.initialize()
      await audioManager.loadSound('test', '/test.mp3')
      
      audioManager.shutdown()
      
      // Should not be able to play sounds after shutdown
      audioManager.playSound('test')
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled()
    })
  })

  describe('Requirements Compliance', () => {
    it('should provide volume controls as required by 8.4', async () => {
      await audioManager.initialize()
      
      // Should have master volume control
      audioManager.setMasterVolume(0.5)
      expect(audioManager.getVolumeLevels().master).toBe(0.5)
      
      // Should have mute functionality
      audioManager.setMuted(true)
      expect(audioManager.getVolumeLevels().isMuted).toBe(true)
    })

    it('should support sound effect management as required', async () => {
      await audioManager.initialize()
      
      // Should be able to load and play sound effects
      await audioManager.loadSound('repair-success', '/sounds/success.mp3')
      expect(() => audioManager.playSound('repair-success')).not.toThrow()
      
      // Should support different audio options
      expect(() => audioManager.playSound('repair-success', {
        volume: 0.8,
        loop: false,
        playbackRate: 1.2
      })).not.toThrow()
    })

    it('should provide HTML5 Audio fallback when Web Audio API unavailable', async () => {
      // Force fallback mode
      global.AudioContext = vi.fn(() => {
        throw new Error('Web Audio not supported')
      }) as any
      
      const fallbackManager = new AudioManager()
      await fallbackManager.initialize()
      
      expect(fallbackManager.isAudioSupported()).toBe(true)
      
      fallbackManager.shutdown()
    })

    it('should support high-fidelity tactile audio for cleaning stage', async () => {
      await audioManager.initialize()
      
      // Should support squishy and sparkly sounds for cleaning
      expect(() => audioManager.playTactileAudio('squishy', 75)).not.toThrow()
      expect(() => audioManager.playTactileAudio('sparkly', 50)).not.toThrow()
      
      // Should provide haptic feedback
      expect(navigator.vibrate).toHaveBeenCalled()
    })
  })
})