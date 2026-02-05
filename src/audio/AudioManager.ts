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
  delay?: number // Delay before this pattern starts
}

export interface AdvancedHapticSequence {
  patterns: HapticPattern[]
  repeatCount?: number
  totalDuration?: number
}

export interface RepairStageAudio {
  stage: 'diagnostic' | 'cleaning' | 'repair' | 'success'
  audioType: TactileAudioType
  hapticSequence: AdvancedHapticSequence
  visualCue?: string // For integration with visual feedback
}

export type TactileAudioType = 'squishy' | 'sparkly' | 'metallic' | 'soft' | 'rough' | 'cleaning_scrub' | 'cleaning_polish' | 'repair_click' | 'repair_success'

export interface CleaningAudioPattern {
  type: 'cleaning' | 'repair'
  intensity: number
  duration: number
  hapticSequence: HapticPattern[]
}

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
    // Generate tactile audio based on type if enabled and not muted
    if (this.tactileSettings.audioTextureEnabled && !this.isMuted) {
      const audioParams = this.getTactileAudioParams(tactileType)
      
      if (this.useWebAudio && this.audioContext && this.masterGainNode) {
        this.generateTactileAudio(audioParams, intensity)
      }
    }
    
    // Provide haptic feedback if available (haptic feedback can still work when muted)
    if (this.tactileSettings.vibrationIntensity > 0 && 'vibrate' in navigator) {
      const vibrationDuration = Math.floor((intensity / 100) * this.tactileSettings.vibrationIntensity * 10)
      navigator.vibrate(vibrationDuration)
    }
  }
  
  /**
   * Play specialized cleaning audio patterns with enhanced tactile feedback
   */
  playCleaningAudio(cleaningType: 'scrub' | 'polish' | 'rinse', intensity: number): void {
    const pattern = this.getCleaningAudioPattern(cleaningType, intensity)
    
    // Play the tactile audio
    this.playTactileAudio(pattern.tactileType, intensity)
    
    // Play the haptic sequence for enhanced cleaning feedback
    if (pattern.hapticSequence.length > 0) {
      this.playHapticSequence(pattern.hapticSequence)
    }
  }
  
  /**
   * Play repair-specific audio patterns
   */
  playRepairAudio(repairType: 'tool_select' | 'repair_action' | 'repair_success', intensity: number): void {
    const pattern = this.getRepairAudioPattern(repairType, intensity)
    
    // Play the tactile audio
    this.playTactileAudio(pattern.tactileType, intensity)
    
    // Play success celebration for completed repairs
    if (repairType === 'repair_success') {
      this.playSuccessCelebration(intensity)
    }
  }
  
  /**
   * Play advanced repair stage audio with comprehensive feedback
   */
  playRepairStageAudio(stage: RepairStageAudio['stage'], componentType: string, intensity: number): void {
    const stageAudio = this.getRepairStageAudio(stage, componentType, intensity)
    
    // Play the tactile audio
    this.playTactileAudio(stageAudio.audioType, intensity)
    
    // Play the advanced haptic sequence
    this.playAdvancedHapticSequence(stageAudio.hapticSequence)
  }
  
  /**
   * Play contextual cleaning feedback based on dirt level and cleaning tool
   */
  playContextualCleaningAudio(dirtLevel: number, cleaningTool: 'brush' | 'cloth' | 'spray', intensity: number): void {
    // Adjust audio based on dirt level (0-100)
    const adjustedIntensity = Math.max(20, intensity * (dirtLevel / 100))
    
    let cleaningType: 'scrub' | 'polish' | 'rinse'
    let tactileType: TactileAudioType
    
    switch (cleaningTool) {
      case 'brush':
        cleaningType = 'scrub'
        tactileType = dirtLevel > 50 ? 'rough' : 'cleaning_scrub'
        break
      case 'cloth':
        cleaningType = 'polish'
        tactileType = 'sparkly'
        break
      case 'spray':
        cleaningType = 'rinse'
        tactileType = 'squishy'
        break
    }
    
    // Create dynamic haptic pattern based on dirt level
    const hapticPattern: HapticPattern[] = []
    
    if (dirtLevel > 70) {
      // Heavy dirt requires more intense scrubbing
      hapticPattern.push(
        { duration: 150, intensity: adjustedIntensity * 0.9, delay: 0 },
        { duration: 100, intensity: adjustedIntensity * 0.6, delay: 50 },
        { duration: 150, intensity: adjustedIntensity * 0.9, delay: 100 }
      )
    } else if (dirtLevel > 30) {
      // Medium dirt requires moderate cleaning
      hapticPattern.push(
        { duration: 120, intensity: adjustedIntensity * 0.7, delay: 0 },
        { duration: 80, intensity: adjustedIntensity * 0.5, delay: 40 }
      )
    } else {
      // Light dirt requires gentle cleaning
      hapticPattern.push(
        { duration: 100, intensity: adjustedIntensity * 0.5, delay: 0 }
      )
    }
    
    // Play the contextual audio
    this.playTactileAudio(tactileType, adjustedIntensity)
    this.playHapticSequence(hapticPattern)
  }
  
  /**
   * Play component-specific repair audio
   */
  playComponentRepairAudio(componentType: 'motor' | 'sensor' | 'battery' | 'circuit', repairAction: string, intensity: number): void {
    let tactileType: TactileAudioType
    let hapticPattern: HapticPattern[]
    
    switch (componentType) {
      case 'motor':
        tactileType = 'metallic'
        hapticPattern = [
          { duration: 200, intensity: intensity * 0.8, delay: 0 },
          { duration: 100, intensity: intensity * 0.4, delay: 50 },
          { duration: 150, intensity: intensity * 0.6, delay: 100 }
        ]
        break
      case 'sensor':
        tactileType = 'sparkly'
        hapticPattern = [
          { duration: 80, intensity: intensity * 0.6, delay: 0 },
          { duration: 60, intensity: intensity * 0.8, delay: 30 },
          { duration: 80, intensity: intensity * 0.6, delay: 60 }
        ]
        break
      case 'battery':
        tactileType = 'repair_click'
        hapticPattern = [
          { duration: 120, intensity: intensity * 0.7, delay: 0 },
          { duration: 200, intensity: intensity * 0.9, delay: 80 }
        ]
        break
      case 'circuit':
        tactileType = 'repair_success'
        hapticPattern = [
          { duration: 60, intensity: intensity * 0.5, delay: 0 },
          { duration: 40, intensity: intensity * 0.7, delay: 30 },
          { duration: 60, intensity: intensity * 0.5, delay: 50 },
          { duration: 40, intensity: intensity * 0.7, delay: 80 }
        ]
        break
      default:
        tactileType = 'metallic'
        hapticPattern = [{ duration: 100, intensity: intensity * 0.6, delay: 0 }]
    }
    
    this.playTactileAudio(tactileType, intensity)
    this.playHapticSequence(hapticPattern)
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
      case 'cleaning_scrub':
        return {
          frequency: 120,
          duration: 0.4,
          waveType: 'sawtooth',
          filterFreq: 400,
        }
      case 'cleaning_polish':
        return {
          frequency: 600,
          duration: 0.2,
          waveType: 'triangle',
          filterFreq: 1500,
        }
      case 'repair_click':
        return {
          frequency: 300,
          duration: 0.1,
          waveType: 'square',
          filterFreq: 800,
        }
      case 'repair_success':
        return {
          frequency: 500,
          duration: 0.3,
          waveType: 'sine',
          filterFreq: 1200,
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
   * Get repair stage audio configuration
   */
  private getRepairStageAudio(stage: RepairStageAudio['stage'], componentType: string, intensity: number): RepairStageAudio {
    switch (stage) {
      case 'diagnostic':
        return {
          stage: 'diagnostic',
          audioType: 'soft',
          hapticSequence: {
            patterns: [
              { duration: 80, intensity: intensity * 0.4, delay: 0 },
              { duration: 60, intensity: intensity * 0.6, delay: 100 }
            ]
          }
        }
      case 'cleaning':
        return {
          stage: 'cleaning',
          audioType: 'squishy',
          hapticSequence: {
            patterns: [
              { duration: 150, intensity: intensity * 0.7, delay: 0 },
              { duration: 100, intensity: intensity * 0.5, delay: 80 },
              { duration: 120, intensity: intensity * 0.8, delay: 150 }
            ],
            repeatCount: 2
          }
        }
      case 'repair':
        return {
          stage: 'repair',
          audioType: 'metallic',
          hapticSequence: {
            patterns: [
              { duration: 120, intensity: intensity * 0.8, delay: 0 },
              { duration: 80, intensity: intensity * 0.6, delay: 60 },
              { duration: 100, intensity: intensity * 0.7, delay: 120 }
            ]
          }
        }
      case 'success':
        return {
          stage: 'success',
          audioType: 'repair_success',
          hapticSequence: {
            patterns: [
              { duration: 100, intensity: intensity * 0.9, delay: 0 },
              { duration: 50, intensity: intensity * 0.5, delay: 50 },
              { duration: 150, intensity: intensity * 1.0, delay: 100 },
              { duration: 80, intensity: intensity * 0.7, delay: 200 }
            ]
          }
        }
      default:
        return {
          stage: 'diagnostic',
          audioType: 'soft',
          hapticSequence: { patterns: [{ duration: 100, intensity: intensity * 0.5, delay: 0 }] }
        }
    }
  }
  
  /**
   * Play an advanced haptic sequence with timing and repetition
   */
  playAdvancedHapticSequence(sequence: AdvancedHapticSequence): void {
    if (!('vibrate' in navigator) || this.tactileSettings.vibrationIntensity === 0) return
    
    const { patterns, repeatCount = 1 } = sequence
    const vibrationPattern: number[] = []
    
    for (let repeat = 0; repeat < repeatCount; repeat++) {
      patterns.forEach((pattern, index) => {
        // Add delay if specified
        if (pattern.delay && pattern.delay > 0) {
          vibrationPattern.push(pattern.delay)
        }
        
        // Add vibration duration
        const vibrationDuration = Math.floor((pattern.intensity / 100) * pattern.duration * (this.tactileSettings.vibrationIntensity / 100))
        vibrationPattern.push(Math.max(10, vibrationDuration)) // Minimum 10ms vibration
        
        // Add pause between patterns (except for the last one in the last repeat)
        if (!(repeat === repeatCount - 1 && index === patterns.length - 1)) {
          vibrationPattern.push(30) // 30ms pause between patterns
        }
      })
      
      // Add longer pause between repeats (except for the last repeat)
      if (repeat < repeatCount - 1) {
        vibrationPattern.push(100) // 100ms pause between repeats
      }
    }
    
    navigator.vibrate(vibrationPattern)
  }
  
  /**
   * Create dynamic haptic feedback based on repair progress
   */
  playProgressiveRepairFeedback(progress: number, maxIntensity: number): void {
    // Progress should be 0-100
    const normalizedProgress = Math.max(0, Math.min(100, progress))
    const intensity = (normalizedProgress / 100) * maxIntensity
    
    // Create escalating haptic pattern as progress increases
    const patterns: HapticPattern[] = []
    
    if (normalizedProgress < 25) {
      // Early stage - gentle feedback
      patterns.push({ duration: 80, intensity: intensity * 0.5, delay: 0 })
    } else if (normalizedProgress < 50) {
      // Mid stage - moderate feedback
      patterns.push(
        { duration: 100, intensity: intensity * 0.6, delay: 0 },
        { duration: 60, intensity: intensity * 0.4, delay: 40 }
      )
    } else if (normalizedProgress < 75) {
      // Advanced stage - stronger feedback
      patterns.push(
        { duration: 120, intensity: intensity * 0.7, delay: 0 },
        { duration: 80, intensity: intensity * 0.5, delay: 50 },
        { duration: 100, intensity: intensity * 0.6, delay: 100 }
      )
    } else {
      // Near completion - intense feedback building to success
      patterns.push(
        { duration: 150, intensity: intensity * 0.8, delay: 0 },
        { duration: 100, intensity: intensity * 0.6, delay: 60 },
        { duration: 120, intensity: intensity * 0.9, delay: 120 },
        { duration: 80, intensity: intensity * 0.7, delay: 180 }
      )
    }
    
    // Choose tactile audio type based on progress
    let tactileType: TactileAudioType
    if (normalizedProgress < 25) {
      tactileType = 'soft'
    } else if (normalizedProgress < 50) {
      tactileType = 'repair_click'
    } else if (normalizedProgress < 75) {
      tactileType = 'metallic'
    } else {
      tactileType = 'repair_success'
    }
    
    this.playTactileAudio(tactileType, intensity)
    this.playHapticSequence(patterns)
  }
  private getCleaningAudioPattern(cleaningType: 'scrub' | 'polish' | 'rinse', intensity: number): {
    tactileType: TactileAudioType
    hapticSequence: HapticPattern[]
  } {
    switch (cleaningType) {
      case 'scrub':
        return {
          tactileType: 'cleaning_scrub',
          hapticSequence: [
            { duration: 120, intensity: intensity * 0.8, delay: 0 },
            { duration: 80, intensity: intensity * 0.5, delay: 60 },
            { duration: 100, intensity: intensity * 0.7, delay: 120 },
            { duration: 60, intensity: intensity * 0.4, delay: 180 }
          ]
        }
      case 'polish':
        return {
          tactileType: 'sparkly',
          hapticSequence: [
            { duration: 150, intensity: intensity * 0.6, delay: 0 },
            { duration: 100, intensity: intensity * 0.8, delay: 80 },
            { duration: 120, intensity: intensity * 0.7, delay: 150 }
          ]
        }
      case 'rinse':
        return {
          tactileType: 'squishy',
          hapticSequence: [
            { duration: 200, intensity: intensity * 0.5, delay: 0 },
            { duration: 150, intensity: intensity * 0.6, delay: 100 }
          ]
        }
      default:
        return {
          tactileType: 'soft',
          hapticSequence: []
        }
    }
  }
  
  /**
   * Get repair-specific audio patterns
   */
  private getRepairAudioPattern(repairType: 'tool_select' | 'repair_action' | 'repair_success', intensity: number): {
    tactileType: TactileAudioType
    hapticSequence: HapticPattern[]
  } {
    switch (repairType) {
      case 'tool_select':
        return {
          tactileType: 'repair_click',
          hapticSequence: [
            { duration: 60, intensity: intensity * 0.6, delay: 0 }
          ]
        }
      case 'repair_action':
        return {
          tactileType: 'metallic',
          hapticSequence: [
            { duration: 150, intensity: intensity * 0.7, delay: 0 },
            { duration: 100, intensity: intensity * 0.5, delay: 80 },
            { duration: 120, intensity: intensity * 0.6, delay: 150 }
          ]
        }
      case 'repair_success':
        return {
          tactileType: 'repair_success',
          hapticSequence: [
            { duration: 100, intensity: intensity * 0.8, delay: 0 },
            { duration: 60, intensity: intensity * 0.5, delay: 50 },
            { duration: 150, intensity: intensity * 1.0, delay: 100 },
            { duration: 80, intensity: intensity * 0.7, delay: 180 }
          ]
        }
      default:
        return {
          tactileType: 'soft',
          hapticSequence: []
        }
    }
  }
  
  /**
   * Play success celebration with enhanced feedback
   */
  private playSuccessCelebration(intensity: number): void {
    if (!this.useWebAudio || !this.audioContext || !this.masterGainNode) return
    
    // Create a celebratory chord progression
    const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
    const now = this.audioContext.currentTime
    
    frequencies.forEach((freq, index) => {
      // Use Web Audio API scheduling instead of setTimeout to avoid context issues
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.value = freq
      
      const volume = (intensity / 100) * this.sfxVolume * 0.2
      const startTime = now + index * 0.1
      const endTime = startTime + 0.4
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime)
      
      oscillator.connect(gainNode)
      gainNode.connect(this.masterGainNode!)
      
      oscillator.start(startTime)
      oscillator.stop(endTime)
    })
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
    return this.isInitialized && (this.useWebAudio || !this.useWebAudio)
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