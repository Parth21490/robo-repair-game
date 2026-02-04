/**
 * Audio Manager with Web Audio API and HTML5 Audio fallback
 * Includes high-fidelity tactile audio for enhanced sensory experience
 */

export interface AudioOptions {
  volume?: number
  loop?: boolean
  playbackRate?: number
  pan?: number
}

export interface TactileSettings {
  vibrationIntensity: number // 0-100
  audioTextureEnabled: boolean
  spatialHapticsEnabled: boolean
  frequencyRange: [number, number] // Hz range for tactile audio
}

export interface HapticPattern {
  duration: number
  intensity: number
  frequency?: number
}

export type TactileAudioType = 'squishy' | 'sparkly' | 'metallic' | 'soft' | 'rough'

export class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGainNode: GainNode | null = null
  private soundEffects: Map<string, AudioBuffer> = new Map()
  private activeSources: Set<AudioBufferSourceNode> = new Set()
  
  // HTML5 Audio fallback
  private htmlAudioElements: Map<string, HTMLAudioElement> = new Map()
  private useWebAudio: boolean = false
  
  // Volume controls
  private masterVolume: number = 0.7
  private sfxVolume: number = 0.8
  private musicVolume: number = 0.5
  private isMuted: boolean = false
  
  // Tactile audio settings
  private tactileSettings: TactileSettings = {
    vibrationIntensity: 50,
    audioTextureEnabled: true,
    spatialHapticsEnabled: true,
    frequencyRange: [20, 200],
  }
  
  private isInitialized: boolean = false
  
  /**
   * Initialize the audio manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      // Try to initialize Web Audio API
      await this.initializeWebAudio()
      this.useWebAudio = true
      console.log('Audio Manager initialized with Web Audio API')
    } catch (error) {
      console.warn('Web Audio API not available, falling back to HTML5 Audio:', error)
      this.initializeHTMLAudio()
      this.useWebAudio = false
    }
    
    this.isInitialized = true
  }
  
  /**
   * Initialize Web Audio API
   */
  private async initializeWebAudio(): Promise<void> {
    // Create audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Create master gain node
    this.masterGainNode = this.audioContext.createGain()
    this.masterGainNode.connect(this.audioContext.destination)
    this.masterGainNode.gain.value = this.masterVolume
    
    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }
  
  /**
   * Initialize HTML5 Audio fallback
   */
  private initializeHTMLAudio(): void {
    // HTML5 Audio doesn't need special initialization
    console.log('HTML5 Audio fallback initialized')
  }
  
  /**
   * Load a sound effect
   */
  async loadSound(soundId: string, url: string): Promise<void> {
    if (this.useWebAudio && this.audioContext) {
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
        this.soundEffects.set(soundId, audioBuffer)
      } catch (error) {
        console.error(`Failed to load sound ${soundId}:`, error)
      }
    } else {
      // Use HTML5 Audio
      const audio = new Audio(url)
      audio.preload = 'auto'
      this.htmlAudioElements.set(soundId, audio)
    }
  }
  
  /**
   * Play a sound effect
   */
  playSound(soundId: string, options: AudioOptions = {}): void {
    if (this.isMuted) return
    
    const {
      volume = 1.0,
      loop = false,
      playbackRate = 1.0,
      pan = 0,
    } = options
    
    if (this.useWebAudio && this.audioContext && this.masterGainNode) {
      this.playWebAudioSound(soundId, volume, loop, playbackRate, pan)
    } else {
      this.playHTMLAudioSound(soundId, volume, loop, playbackRate)
    }
  }
  
  /**
   * Play sound using Web Audio API
   */
  private playWebAudioSound(soundId: string, volume: number, loop: boolean, playbackRate: number, pan: number): void {
    const audioBuffer = this.soundEffects.get(soundId)
    if (!audioBuffer || !this.audioContext || !this.masterGainNode) return
    
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    const pannerNode = this.audioContext.createStereoPanner()
    
    source.buffer = audioBuffer
    source.loop = loop
    source.playbackRate.value = playbackRate
    
    gainNode.gain.value = volume * this.sfxVolume
    pannerNode.pan.value = Math.max(-1, Math.min(1, pan))
    
    // Connect nodes
    source.connect(gainNode)
    gainNode.connect(pannerNode)
    pannerNode.connect(this.masterGainNode)
    
    // Track active sources
    this.activeSources.add(source)
    
    source.onended = () => {
      this.activeSources.delete(source)
    }
    
    source.start()
  }
  
  /**
   * Play sound using HTML5 Audio
   */
  private playHTMLAudioSound(soundId: string, volume: number, loop: boolean, playbackRate: number): void {
    const audio = this.htmlAudioElements.get(soundId)
    if (!audio) return
    
    // Clone audio element to allow multiple simultaneous plays
    const audioClone = audio.cloneNode() as HTMLAudioElement
    audioClone.volume = volume * this.sfxVolume * this.masterVolume
    audioClone.loop = loop
    audioClone.playbackRate = playbackRate
    
    audioClone.play().catch(error => {
      console.warn(`Failed to play sound ${soundId}:`, error)
    })
  }
  
  /**
   * Play tactile audio with haptic feedback
   */
  playTactileAudio(tactileType: TactileAudioType, intensity: number): void {
    if (!this.tactileSettings.audioTextureEnabled) return
    
    // Generate tactile audio based on type
    const audioParams = this.getTactileAudioParams(tactileType)
    
    if (this.useWebAudio && this.audioContext && this.masterGainNode) {
      this.generateTactileAudio(audioParams, intensity)
    }
    
    // Provide haptic feedback if available
    if (this.tactileSettings.vibrationIntensity > 0 && 'vibrate' in navigator) {
      const vibrationDuration = Math.floor((intensity / 100) * this.tactileSettings.vibrationIntensity * 10)
      navigator.vibrate(vibrationDuration)
    }
  }
  
  /**
   * Get audio parameters for different tactile types
   */
  private getTactileAudioParams(tactileType: TactileAudioType): {
    frequency: number
    duration: number
    waveType: OscillatorType
    filterFreq: number
  } {
    switch (tactileType) {
      case 'squishy':
        return {
          frequency: 80,
          duration: 0.3,
          waveType: 'sine',
          filterFreq: 200,
        }
      case 'sparkly':
        return {
          frequency: 800,
          duration: 0.15,
          waveType: 'triangle',
          filterFreq: 2000,
        }
      case 'metallic':
        return {
          frequency: 400,
          duration: 0.2,
          waveType: 'square',
          filterFreq: 1000,
        }
      case 'soft':
        return {
          frequency: 150,
          duration: 0.4,
          waveType: 'sine',
          filterFreq: 300,
        }
      case 'rough':
        return {
          frequency: 200,
          duration: 0.25,
          waveType: 'sawtooth',
          filterFreq: 500,
        }
      default:
        return {
          frequency: 200,
          duration: 0.2,
          waveType: 'sine',
          filterFreq: 400,
        }
    }
  }
  
  /**
   * Generate tactile audio using Web Audio API
   */
  private generateTactileAudio(params: any, intensity: number): void {
    if (!this.audioContext || !this.masterGainNode) return
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    const filterNode = this.audioContext.createBiquadFilter()
    
    // Set up oscillator
    oscillator.type = params.waveType
    oscillator.frequency.value = params.frequency
    
    // Set up filter
    filterNode.type = 'lowpass'
    filterNode.frequency.value = params.filterFreq
    
    // Set up gain envelope
    const now = this.audioContext.currentTime
    const volume = (intensity / 100) * this.sfxVolume * 0.3 // Keep tactile audio subtle
    
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + params.duration)
    
    // Connect nodes
    oscillator.connect(filterNode)
    filterNode.connect(gainNode)
    gainNode.connect(this.masterGainNode)
    
    // Start and stop
    oscillator.start(now)
    oscillator.stop(now + params.duration)
  }
  
  /**
   * Play a haptic sequence
   */
  playHapticSequence(sequence: HapticPattern[]): void {
    if (!('vibrate' in navigator) || this.tactileSettings.vibrationIntensity === 0) return
    
    const vibrationPattern: number[] = []
    
    sequence.forEach((pattern, index) => {
      const vibrationDuration = Math.floor((pattern.intensity / 100) * pattern.duration * 10)
      vibrationPattern.push(vibrationDuration)
      
      // Add pause between patterns (except for the last one)
      if (index < sequence.length - 1) {
        vibrationPattern.push(50) // 50ms pause
      }
    })
    
    navigator.vibrate(vibrationPattern)
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume
    }
    
    // Update HTML5 Audio elements
    this.htmlAudioElements.forEach(audio => {
      audio.volume = this.masterVolume * this.sfxVolume
    })
  }
  
  /**
   * Set sound effects volume
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
  }
  
  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
  }
  
  /**
   * Mute/unmute all audio
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted
    
    if (muted) {
      this.stopAllSounds()
    }
  }
  
  /**
   * Configure tactile feedback settings
   */
  configureTactileFeedback(settings: Partial<TactileSettings>): void {
    this.tactileSettings = { ...this.tactileSettings, ...settings }
  }
  
  /**
   * Stop all currently playing sounds
   */
  stopAllSounds(): void {
    // Stop Web Audio sources
    this.activeSources.forEach(source => {
      try {
        source.stop()
      } catch (error) {
        // Source might already be stopped
      }
    })
    this.activeSources.clear()
    
    // Stop HTML5 Audio elements
    this.htmlAudioElements.forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
  }
  
  /**
   * Get current volume levels
   */
  getVolumeLevels(): {
    master: number
    sfx: number
    music: number
    isMuted: boolean
  } {
    return {
      master: this.masterVolume,
      sfx: this.sfxVolume,
      music: this.musicVolume,
      isMuted: this.isMuted,
    }
  }
  
  /**
   * Get tactile settings
   */
  getTactileSettings(): TactileSettings {
    return { ...this.tactileSettings }
  }
  
  /**
   * Check if audio is supported
   */
  isAudioSupported(): boolean {
    return this.useWebAudio || this.htmlAudioElements.size > 0
  }
  
  /**
   * Shutdown the audio manager
   */
  shutdown(): void {
    if (!this.isInitialized) return
    
    this.stopAllSounds()
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.soundEffects.clear()
    this.htmlAudioElements.clear()
    this.activeSources.clear()
    
    this.isInitialized = false
    console.log('Audio manager shutdown')
  }
}