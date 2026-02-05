/**
 * Diagnostic State - Problem identification phase of the Robo-Pet Repair Shop
 * Allows players to identify problems with Robo-Pets through interactive exploration
 * Includes progressive hint system and age-appropriate visual feedback
 */

import { BaseGameState } from '@/engine/GameState'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent, ClickableElement } from '@/input/InputHandler'
import { AudioManager } from '@/audio/AudioManager'
import { OverlayHandSystem, HandGesture } from '@/rendering/OverlayHandSystem'
import { RobotPet } from '@/pets/RobotPet'
import { Problem } from '@/pets/Problem'
import { ProblemGenerator } from '@/pets/ProblemGenerator'
import { ComponentType, ProblemType, AgeGroup, Vector2D, VisualCue } from '@/pets/types'
import { ProgressManager } from '@/progress/ProgressManager'

export interface InteractiveArea {
  id: string
  component: ComponentType
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isHighlighted: boolean
  hasBeenClicked: boolean
  hasProblem: boolean
  problem?: Problem
  visualCues: VisualCue[]
}

export interface DiagnosticHint {
  id: string
  type: 'visual' | 'audio' | 'text' | 'gesture'
  content: string
  targetComponent?: ComponentType
  position?: Vector2D
  isActive: boolean
  priority: number // 1-3, higher = more important
}

export interface DiagnosticProgress {
  totalProblems: number
  identifiedProblems: number
  correctIdentifications: number
  incorrectAttempts: number
  hintsUsed: number
  timeElapsed: number
  isComplete: boolean
}

export class DiagnosticState extends BaseGameState {
  public readonly name = 'Diagnostic'
  
  private currentPet: RobotPet | null = null
  private interactiveAreas: Map<string, InteractiveArea> = new Map()
  private problems: Problem[] = []
  private progress: DiagnosticProgress
  private ageGroup: AgeGroup = AgeGroup.MIDDLE
  
  // Hint system
  private hintTimer: number = 0
  private hintDelay: number = 30000 // 30 seconds default
  private activeHints: DiagnosticHint[] = []
  private hintCounter: number = 0
  
  // Visual feedback
  private animationTime: number = 0
  private pulseAnimations: Map<string, number> = new Map()
  private sparkleEffects: Map<string, { particles: Array<{ x: number, y: number, life: number, velocity: Vector2D }> }> = new Map()
  
  // Audio and overlay systems
  private audioManager?: AudioManager
  private overlayHandSystem?: OverlayHandSystem
  private progressManager: ProgressManager
  
  // UI elements
  private progressBar: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private hintButton: ClickableElement | null = null
  private skipButton: ClickableElement | null = null
  
  constructor(audioManager?: AudioManager, overlayHandSystem?: OverlayHandSystem) {
    super()
    this.audioManager = audioManager
    this.overlayHandSystem = overlayHandSystem
    this.progressManager = ProgressManager.getInstance()
    
    this.progress = {
      totalProblems: 0,
      identifiedProblems: 0,
      correctIdentifications: 0,
      incorrectAttempts: 0,
      hintsUsed: 0,
      timeElapsed: 0,
      isComplete: false
    }
  }
  
  /**
   * Initialize diagnostic session with a pet and age group
   */
  public initializeDiagnostic(pet: RobotPet, ageGroup: AgeGroup): void {
    this.currentPet = pet
    this.ageGroup = ageGroup
    
    // Generate problems for the pet
    const problemGenerator = new ProblemGenerator()
    this.problems = problemGenerator.generateProblems(pet, ageGroup)
    
    // Set up progress tracking
    this.progress = {
      totalProblems: this.problems.length,
      identifiedProblems: 0,
      correctIdentifications: 0,
      incorrectAttempts: 0,
      hintsUsed: 0,
      timeElapsed: 0,
      isComplete: false
    }
    
    // Configure hint delay based on age group
    const difficultyConfig = problemGenerator.getDifficultyConfig(ageGroup)
    this.hintDelay = difficultyConfig?.hintDelay || 30000
    
    // Set up interactive areas
    this.setupInteractiveAreas()
    
    console.log(`Diagnostic initialized for ${pet.name} (${ageGroup}) with ${this.problems.length} problems`)
  }
  
  protected onEnter(): void {
    console.log('Entered Diagnostic State')
    
    if (!this.currentPet) {
      console.error('No pet assigned to diagnostic state')
      return
    }
    
    // Reset timers and state
    this.hintTimer = 0
    this.animationTime = 0
    this.activeHints = []
    this.pulseAnimations.clear()
    this.sparkleEffects.clear()
    
    // Set up UI elements
    this.setupUI()
    
    // Play entry audio
    if (this.audioManager) {
      try {
        this.audioManager.playSound('diagnostic_start', { volume: 0.6 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Show initial guidance
    this.showInitialGuidance()
  }
  
  protected onUpdate(deltaTime: number): void {
    this.animationTime += deltaTime
    this.progress.timeElapsed += deltaTime
    
    // Update hint timer
    if (!this.progress.isComplete && this.progress.identifiedProblems < this.progress.totalProblems) {
      this.hintTimer += deltaTime
      
      // Check if it's time to show a hint
      if (this.hintTimer >= this.hintDelay && this.activeHints.length === 0) {
        this.showProgressiveHint()
        this.hintTimer = 0
      }
    }
    
    // Update visual effects
    this.updateVisualEffects(deltaTime)
    
    // Update active hints
    this.updateHints(deltaTime)
    
    // Check for completion
    if (!this.progress.isComplete && this.progress.identifiedProblems >= this.progress.totalProblems) {
      this.completeDignostic()
    }
  }
  
  protected onRender(renderer: Renderer): void {
    const ctx = renderer.getContext()
    const { width, height } = ctx.canvas
    
    // Clear background
    this.drawBackground(ctx, width, height)
    
    // Draw the pet
    this.drawPet(ctx, width, height)
    
    // Draw interactive areas with highlights
    this.drawInteractiveAreas(ctx)
    
    // Draw visual cues (sparks, dirt, etc.)
    this.drawVisualCues(ctx)
    
    // Draw UI elements
    this.drawUI(ctx, width, height)
    
    // Draw active hints
    this.drawHints(ctx, width, height)
    
    // Draw debug info in development
    if (import.meta.env.DEV) {
      this.drawDebugInfo(ctx, width, height)
    }
  }
  
  protected onExit(): void {
    console.log('Exited Diagnostic State')
    
    // Clear any active hints or animations
    this.activeHints = []
    this.pulseAnimations.clear()
    this.sparkleEffects.clear()
    
    // Hide overlay hand guidance
    if (this.overlayHandSystem) {
      this.overlayHandSystem.hideAllGuidingHands()
    }
  }
  
  protected onHandleInput(input: InputEvent): boolean {
    // Handle pointer input on interactive areas
    if (input.type === 'pointer_down' && input.x !== undefined && input.y !== undefined) {
      return this.handlePointerDown(input.x, input.y)
    }
    
    // Handle keyboard input
    if (input.type === 'key_down') {
      return this.handleKeyDown(input.key || '')
    }
    
    return false
  }
  
  /**
   * Set up interactive areas based on pet components
   */
  private setupInteractiveAreas(): void {
    if (!this.currentPet) return
    
    this.interactiveAreas.clear()
    
    // Create interactive areas for each component
    for (const [componentId, component] of this.currentPet.components) {
      const bounds = this.getComponentBounds(component.type, component.position)
      
      // Check if this component has a problem
      const componentProblem = this.problems.find(p => p.component === component.type)
      
      const interactiveArea: InteractiveArea = {
        id: componentId,
        component: component.type,
        bounds,
        isHighlighted: true, // Always highlight interactive areas initially
        hasBeenClicked: false,
        hasProblem: !!componentProblem,
        problem: componentProblem,
        visualCues: componentProblem?.visualCues || []
      }
      
      this.interactiveAreas.set(componentId, interactiveArea)
    }
    
    console.log(`Set up ${this.interactiveAreas.size} interactive areas`)
  }
  
  /**
   * Get bounds for a component based on its type and position
   */
  private getComponentBounds(componentType: ComponentType, position: Vector2D): { x: number, y: number, width: number, height: number } {
    // Base size varies by component type
    let width = 60
    let height = 60
    
    switch (componentType) {
      case ComponentType.CHASSIS_PLATING:
        width = 120
        height = 80
        break
      case ComponentType.POWER_CORE:
        width = 50
        height = 50
        break
      case ComponentType.SENSOR_ARRAY:
        width = 80
        height = 40
        break
      case ComponentType.MOTOR_SYSTEM:
        width = 70
        height = 60
        break
      case ComponentType.PROCESSING_UNIT:
        width = 60
        height = 40
        break
    }
    
    return {
      x: position.x - width / 2,
      y: position.y - height / 2,
      width,
      height
    }
  }
  
  /**
   * Set up UI elements
   */
  private setupUI(): void {
    // Progress bar
    this.progressBar = {
      x: 50,
      y: 20,
      width: 300,
      height: 20
    }
    
    // Hint button
    this.hintButton = {
      x: 400,
      y: 15,
      width: 100,
      height: 30,
      id: 'hint_button',
      callback: () => this.requestHint(),
      isEnabled: true,
      ariaLabel: 'Get a hint'
    }
    
    // Skip button (for accessibility)
    this.skipButton = {
      x: 520,
      y: 15,
      width: 80,
      height: 30,
      id: 'skip_button',
      callback: () => this.skipDiagnostic(),
      isEnabled: true,
      ariaLabel: 'Skip diagnostic'
    }
  }
  
  /**
   * Handle pointer down events
   */
  private handlePointerDown(x: number, y: number): boolean {
    // Check UI buttons first
    if (this.hintButton && this.isPointInBounds(x, y, this.hintButton)) {
      this.hintButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    if (this.skipButton && this.isPointInBounds(x, y, this.skipButton)) {
      this.skipButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    // Check interactive areas
    for (const area of this.interactiveAreas.values()) {
      if (this.isPointInBounds(x, y, area.bounds)) {
        this.handleAreaClick(area)
        return true
      }
    }
    
    return false
  }
  
  /**
   * Handle keyboard input
   */
  private handleKeyDown(key: string): boolean {
    switch (key) {
      case 'h':
      case 'H':
        this.requestHint()
        return true
      case 's':
      case 'S':
        this.skipDiagnostic()
        return true
      case 'Escape':
        // Could return to menu or pause
        return true
      default:
        return false
    }
  }
  
  /**
   * Handle clicking on an interactive area
   */
  private handleAreaClick(area: InteractiveArea): void {
    area.hasBeenClicked = true
    
    // Play click sound
    if (this.audioManager) {
      try {
        this.audioManager.playSound('component_click', { volume: 0.5 })
        this.audioManager.playTactileAudio('repair_click', 40)
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    if (area.hasProblem) {
      // Correct identification
      this.progress.correctIdentifications++
      this.progress.identifiedProblems++
      
      // Visual feedback for correct identification
      this.addSparkleEffect(area.bounds.x + area.bounds.width / 2, area.bounds.y + area.bounds.height / 2)
      
      // Audio feedback
      if (this.audioManager) {
        try {
          this.audioManager.playSound('problem_identified', { volume: 0.7 })
          this.audioManager.playTactileAudio('success', 80)
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      // Remove highlighting since problem is identified
      area.isHighlighted = false
      
      console.log(`Problem identified in ${area.component}: ${area.problem?.description}`)
      
    } else {
      // Incorrect identification
      this.progress.incorrectAttempts++
      
      // Visual feedback for incorrect identification
      this.addPulseAnimation(area.id, 'error')
      
      // Audio feedback
      if (this.audioManager) {
        try {
          this.audioManager.playSound('incorrect_selection', { volume: 0.4 })
          this.audioManager.playTactileAudio('soft', 30)
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      console.log(`No problem found in ${area.component}`)
    }
    
    // Clear any active hints since user is actively exploring
    this.clearActiveHints()
    this.hintTimer = 0
  }
  
  /**
   * Show initial guidance to the player
   */
  private showInitialGuidance(): void {
    // Show hand gesture pointing to first problematic area
    const firstProblemArea = Array.from(this.interactiveAreas.values()).find(area => area.hasProblem)
    
    if (firstProblemArea && this.overlayHandSystem) {
      const centerX = firstProblemArea.bounds.x + firstProblemArea.bounds.width / 2
      const centerY = firstProblemArea.bounds.y + firstProblemArea.bounds.height / 2
      
      this.overlayHandSystem.showTapGesture({ x: centerX, y: centerY }, 3000)
    }
  }
  
  /**
   * Show progressive hint based on current state
   */
  private showProgressiveHint(): void {
    this.progress.hintsUsed++
    
    // Determine what kind of hint to show
    const unidentifiedProblems = Array.from(this.interactiveAreas.values())
      .filter(area => area.hasProblem && !area.hasBeenClicked)
    
    if (unidentifiedProblems.length === 0) return
    
    // Select hint type based on age group and attempts
    let hintType: 'visual' | 'audio' | 'text' | 'gesture' = 'visual'
    
    if (this.ageGroup === AgeGroup.YOUNG) {
      hintType = this.progress.hintsUsed <= 2 ? 'gesture' : 'visual'
    } else if (this.ageGroup === AgeGroup.MIDDLE) {
      hintType = this.progress.hintsUsed <= 1 ? 'text' : 'visual'
    } else {
      hintType = 'text'
    }
    
    // Create hint for the first unidentified problem
    const targetArea = unidentifiedProblems[0]
    const hint = this.createHint(hintType, targetArea)
    
    this.activeHints.push(hint)
    
    // Execute the hint
    this.executeHint(hint)
    
    console.log(`Showing ${hintType} hint for ${targetArea.component}`)
  }
  
  /**
   * Create a hint for a specific area
   */
  private createHint(type: 'visual' | 'audio' | 'text' | 'gesture', targetArea: InteractiveArea): DiagnosticHint {
    const hintId = `hint_${++this.hintCounter}_${Date.now()}`
    const centerX = targetArea.bounds.x + targetArea.bounds.width / 2
    const centerY = targetArea.bounds.y + targetArea.bounds.height / 2
    
    let content = ''
    let priority = 1
    
    switch (type) {
      case 'visual':
        content = 'Look for visual problems'
        priority = 2
        break
      case 'audio':
        content = 'Listen for problem sounds'
        priority = 1
        break
      case 'text':
        content = `Check the ${this.getComponentDisplayName(targetArea.component)}`
        priority = 3
        break
      case 'gesture':
        content = 'Tap here'
        priority = 3
        break
    }
    
    return {
      id: hintId,
      type,
      content,
      targetComponent: targetArea.component,
      position: { x: centerX, y: centerY },
      isActive: true,
      priority
    }
  }
  
  /**
   * Execute a hint (show visual/audio/gesture feedback)
   */
  private executeHint(hint: DiagnosticHint): void {
    switch (hint.type) {
      case 'visual':
        // Add pulsing highlight to target area
        if (hint.targetComponent) {
          const targetArea = Array.from(this.interactiveAreas.values())
            .find(area => area.component === hint.targetComponent)
          if (targetArea) {
            this.addPulseAnimation(targetArea.id, 'hint')
          }
        }
        break
        
      case 'audio':
        if (this.audioManager) {
          this.audioManager.playSound('hint_audio', { volume: 0.6 })
        }
        break
        
      case 'text':
        // Text hint will be rendered in drawHints
        break
        
      case 'gesture':
        if (this.overlayHandSystem && hint.position) {
          this.overlayHandSystem.showTapGesture(hint.position, 2000)
        }
        break
    }
  }
  
  /**
   * Request a hint manually
   */
  private requestHint(): void {
    // Clear timer and show hint immediately
    this.hintTimer = 0
    this.showProgressiveHint()
    
    if (this.audioManager) {
      try {
        this.audioManager.playSound('button_click', { volume: 0.5 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
  }
  
  /**
   * Skip diagnostic (accessibility feature)
   */
  private skipDiagnostic(): void {
    console.log('Diagnostic skipped by user')
    
    // Mark all problems as identified
    this.progress.identifiedProblems = this.progress.totalProblems
    this.progress.isComplete = true
    
    if (this.audioManager) {
      try {
        this.audioManager.playSound('button_click', { volume: 0.5 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Transition to repair state would happen here
    // For now, just log completion
    this.completeDignostic()
  }
  
  /**
   * Complete the diagnostic phase
   */
  private completeDignostic(): void {
    this.progress.isComplete = true
    
    console.log('Diagnostic completed!', {
      totalProblems: this.progress.totalProblems,
      identified: this.progress.identifiedProblems,
      correct: this.progress.correctIdentifications,
      incorrect: this.progress.incorrectAttempts,
      hintsUsed: this.progress.hintsUsed,
      timeElapsed: Math.round(this.progress.timeElapsed / 1000)
    })
    
    // Play completion sound
    if (this.audioManager) {
      try {
        this.audioManager.playSound('diagnostic_complete', { volume: 0.8 })
        this.audioManager.playTactileAudio('success', 100)
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Clear all hints and effects
    this.clearActiveHints()
    this.pulseAnimations.clear()
    
    // TODO: Transition to repair state
    // This would be handled by the state manager
  }
  
  /**
   * Clear all active hints
   */
  private clearActiveHints(): void {
    this.activeHints.forEach(hint => {
      hint.isActive = false
    })
    this.activeHints = []
  }
  
  /**
   * Update visual effects
   */
  private updateVisualEffects(deltaTime: number): void {
    // Update pulse animations
    for (const [areaId, startTime] of this.pulseAnimations.entries()) {
      const elapsed = this.animationTime - startTime
      if (elapsed > 2000) { // 2 second pulse duration
        this.pulseAnimations.delete(areaId)
      }
    }
    
    // Update sparkle effects
    for (const [effectId, effect] of this.sparkleEffects.entries()) {
      effect.particles = effect.particles.filter(particle => {
        particle.life -= deltaTime
        particle.x += particle.velocity.x * deltaTime * 0.001
        particle.y += particle.velocity.y * deltaTime * 0.001
        return particle.life > 0
      })
      
      if (effect.particles.length === 0) {
        this.sparkleEffects.delete(effectId)
      }
    }
  }
  
  /**
   * Update active hints
   */
  private updateHints(deltaTime: number): void {
    // Remove expired hints (hints last 5 seconds)
    this.activeHints = this.activeHints.filter(hint => {
      // For now, keep hints active until manually cleared
      return hint.isActive
    })
  }
  
  /**
   * Add pulse animation to an area
   */
  private addPulseAnimation(areaId: string, type: 'hint' | 'error'): void {
    this.pulseAnimations.set(areaId, this.animationTime)
  }
  
  /**
   * Add sparkle effect at position
   */
  private addSparkleEffect(x: number, y: number): void {
    const effectId = `sparkle_${Date.now()}_${Math.random()}`
    const particles = []
    
    // Create 8 sparkle particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 50 + Math.random() * 30
      
      particles.push({
        x,
        y,
        life: 1000 + Math.random() * 500, // 1-1.5 seconds
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        }
      })
    }
    
    this.sparkleEffects.set(effectId, { particles })
  }
  
  /**
   * Check if point is within bounds
   */
  private isPointInBounds(x: number, y: number, bounds: { x: number, y: number, width: number, height: number }): boolean {
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height
  }
  
  /**
   * Get display name for component type
   */
  private getComponentDisplayName(componentType: ComponentType): string {
    switch (componentType) {
      case ComponentType.POWER_CORE:
        return 'Power Core'
      case ComponentType.MOTOR_SYSTEM:
        return 'Motor System'
      case ComponentType.SENSOR_ARRAY:
        return 'Sensor Array'
      case ComponentType.CHASSIS_PLATING:
        return 'Chassis Plating'
      case ComponentType.PROCESSING_UNIT:
        return 'Processing Unit'
      default:
        return 'Component'
    }
  }
  
  // Drawing methods
  
  /**
   * Draw background
   */
  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#E3F2FD')
    gradient.addColorStop(1, '#BBDEFB')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // Workshop pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    for (let x = 0; x < width; x += 40) {
      for (let y = 0; y < height; y += 40) {
        ctx.fillRect(x, y, 2, 2)
      }
    }
  }
  
  /**
   * Draw the pet
   */
  private drawPet(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.currentPet) return
    
    ctx.save()
    
    // Center the pet
    const petX = width / 2
    const petY = height / 2
    
    ctx.translate(petX, petY)
    
    // Draw pet body (simplified representation)
    ctx.fillStyle = '#90A4AE'
    ctx.strokeStyle = '#546E7A'
    ctx.lineWidth = 3
    
    // Main body
    ctx.beginPath()
    ctx.ellipse(0, 0, 80, 60, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Head
    ctx.beginPath()
    ctx.ellipse(0, -70, 50, 40, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Eyes
    ctx.fillStyle = '#2196F3'
    ctx.beginPath()
    ctx.ellipse(-15, -75, 8, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.beginPath()
    ctx.ellipse(15, -75, 8, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
  
  /**
   * Draw interactive areas with highlights
   */
  private drawInteractiveAreas(ctx: CanvasRenderingContext2D): void {
    for (const area of this.interactiveAreas.values()) {
      if (!area.isHighlighted && !area.hasBeenClicked) continue
      
      ctx.save()
      
      // Get pulse animation if active
      const pulseStartTime = this.pulseAnimations.get(area.id)
      let pulseIntensity = 0
      
      if (pulseStartTime !== undefined) {
        const elapsed = this.animationTime - pulseStartTime
        const progress = Math.min(elapsed / 2000, 1) // 2 second pulse
        pulseIntensity = Math.sin(progress * Math.PI * 4) * (1 - progress)
      }
      
      // Highlight color based on state
      let highlightColor = 'rgba(33, 150, 243, 0.3)' // Default blue
      
      if (area.hasProblem && !area.hasBeenClicked) {
        highlightColor = 'rgba(255, 193, 7, 0.4)' // Warning yellow
      } else if (area.hasProblem && area.hasBeenClicked) {
        highlightColor = 'rgba(76, 175, 80, 0.4)' // Success green
      } else if (!area.hasProblem && area.hasBeenClicked) {
        highlightColor = 'rgba(244, 67, 54, 0.3)' // Error red
      }
      
      // Apply pulse effect
      if (pulseIntensity > 0) {
        const alpha = 0.3 + pulseIntensity * 0.4
        highlightColor = highlightColor.replace(/[\d\.]+\)$/g, `${alpha})`)
      }
      
      // Draw highlight
      ctx.fillStyle = highlightColor
      ctx.strokeStyle = highlightColor.replace('0.3', '0.8').replace('0.4', '0.8')
      ctx.lineWidth = 2
      
      ctx.beginPath()
      ctx.roundRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height, 8)
      ctx.fill()
      ctx.stroke()
      
      // Draw component label for accessibility
      if (area.isHighlighted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(
          this.getComponentDisplayName(area.component),
          area.bounds.x + area.bounds.width / 2,
          area.bounds.y - 5
        )
      }
      
      ctx.restore()
    }
  }
  
  /**
   * Draw visual cues (sparks, dirt, etc.)
   */
  private drawVisualCues(ctx: CanvasRenderingContext2D): void {
    for (const area of this.interactiveAreas.values()) {
      if (!area.hasProblem || area.hasBeenClicked) continue
      
      for (const cue of area.visualCues) {
        this.drawVisualCue(ctx, cue)
      }
    }
    
    // Draw sparkle effects
    for (const effect of this.sparkleEffects.values()) {
      for (const particle of effect.particles) {
        ctx.save()
        ctx.globalAlpha = particle.life / 1000
        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  }
  
  /**
   * Draw a single visual cue
   */
  private drawVisualCue(ctx: CanvasRenderingContext2D, cue: VisualCue): void {
    ctx.save()
    ctx.globalAlpha = cue.intensity
    
    switch (cue.type) {
      case 'spark':
        this.drawSparkCue(ctx, cue.position)
        break
      case 'smoke':
        this.drawSmokeCue(ctx, cue.position)
        break
      case 'dirt':
        this.drawDirtCue(ctx, cue.position)
        break
      case 'warning_light':
        this.drawWarningLightCue(ctx, cue.position)
        break
    }
    
    ctx.restore()
  }
  
  /**
   * Draw spark visual cue
   */
  private drawSparkCue(ctx: CanvasRenderingContext2D, position: Vector2D): void {
    const time = this.animationTime * 0.01
    
    ctx.strokeStyle = '#FFC107'
    ctx.lineWidth = 2
    
    for (let i = 0; i < 5; i++) {
      const angle = (time + i * 0.5) % (Math.PI * 2)
      const length = 8 + Math.sin(time * 2 + i) * 4
      
      ctx.beginPath()
      ctx.moveTo(position.x, position.y)
      ctx.lineTo(
        position.x + Math.cos(angle) * length,
        position.y + Math.sin(angle) * length
      )
      ctx.stroke()
    }
  }
  
  /**
   * Draw smoke visual cue
   */
  private drawSmokeCue(ctx: CanvasRenderingContext2D, position: Vector2D): void {
    const time = this.animationTime * 0.005
    
    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)'
    
    for (let i = 0; i < 3; i++) {
      const offset = Math.sin(time + i) * 5
      const y = position.y - i * 8 - time * 10
      
      ctx.beginPath()
      ctx.ellipse(position.x + offset, y, 4 + i * 2, 4 + i * 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  /**
   * Draw dirt visual cue
   */
  private drawDirtCue(ctx: CanvasRenderingContext2D, position: Vector2D): void {
    ctx.fillStyle = 'rgba(101, 67, 33, 0.8)'
    
    // Draw dirt spots
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const distance = 8 + Math.random() * 8
      const x = position.x + Math.cos(angle) * distance
      const y = position.y + Math.sin(angle) * distance
      const size = 2 + Math.random() * 3
      
      ctx.beginPath()
      ctx.ellipse(x, y, size, size, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  /**
   * Draw warning light visual cue
   */
  private drawWarningLightCue(ctx: CanvasRenderingContext2D, position: Vector2D): void {
    const time = this.animationTime * 0.005
    const intensity = (Math.sin(time * 4) + 1) / 2
    
    ctx.fillStyle = `rgba(255, 87, 34, ${intensity * 0.8})`
    ctx.beginPath()
    ctx.ellipse(position.x, position.y, 8, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Warning symbol
    ctx.fillStyle = 'white'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('!', position.x, position.y + 4)
  }
  
  /**
   * Draw UI elements
   */
  private drawUI(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw progress bar
    this.drawProgressBar(ctx)
    
    // Draw buttons
    this.drawButton(ctx, this.hintButton, 'Hint')
    this.drawButton(ctx, this.skipButton, 'Skip')
    
    // Draw instructions
    this.drawInstructions(ctx, width, height)
  }
  
  /**
   * Draw progress bar
   */
  private drawProgressBar(ctx: CanvasRenderingContext2D): void {
    const progress = this.progress.totalProblems > 0 ? 
      this.progress.identifiedProblems / this.progress.totalProblems : 0
    
    ctx.save()
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.roundRect(this.progressBar.x, this.progressBar.y, this.progressBar.width, this.progressBar.height, 10)
    ctx.fill()
    
    // Progress fill
    const fillWidth = this.progressBar.width * progress
    ctx.fillStyle = '#4CAF50'
    ctx.beginPath()
    ctx.roundRect(this.progressBar.x, this.progressBar.y, fillWidth, this.progressBar.height, 10)
    ctx.fill()
    
    // Text
    ctx.fillStyle = 'black'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      `${this.progress.identifiedProblems}/${this.progress.totalProblems} Problems Found`,
      this.progressBar.x + this.progressBar.width / 2,
      this.progressBar.y + this.progressBar.height + 20
    )
    
    ctx.restore()
  }
  
  /**
   * Draw a button
   */
  private drawButton(ctx: CanvasRenderingContext2D, button: ClickableElement | null, text: string): void {
    if (!button) return
    
    ctx.save()
    
    // Button background
    ctx.fillStyle = button.isEnabled ? '#2196F3' : '#BDBDBD'
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, 5)
    ctx.fill()
    
    // Button border
    ctx.strokeStyle = button.isEnabled ? '#1976D2' : '#9E9E9E'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Button text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(text, button.x + button.width / 2, button.y + button.height / 2 + 4)
    
    ctx.restore()
  }
  
  /**
   * Draw instructions
   */
  private drawInstructions(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    
    const instructions = [
      'Click on areas that look broken or need attention',
      'Look for sparks, dirt, warning lights, or other problems',
      'Press H for a hint, S to skip'
    ]
    
    instructions.forEach((instruction, index) => {
      ctx.fillText(instruction, width / 2, height - 80 + index * 20)
    })
    
    ctx.restore()
  }
  
  /**
   * Draw active hints
   */
  private drawHints(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    for (const hint of this.activeHints) {
      if (!hint.isActive) continue
      
      if (hint.type === 'text') {
        this.drawTextHint(ctx, hint, width, height)
      }
    }
  }
  
  /**
   * Draw text hint
   */
  private drawTextHint(ctx: CanvasRenderingContext2D, hint: DiagnosticHint, width: number, height: number): void {
    ctx.save()
    
    // Hint background
    const hintWidth = 300
    const hintHeight = 60
    const hintX = (width - hintWidth) / 2
    const hintY = 80
    
    ctx.fillStyle = 'rgba(255, 235, 59, 0.95)'
    ctx.strokeStyle = '#F57F17'
    ctx.lineWidth = 2
    
    ctx.beginPath()
    ctx.roundRect(hintX, hintY, hintWidth, hintHeight, 10)
    ctx.fill()
    ctx.stroke()
    
    // Hint text
    ctx.fillStyle = 'black'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('💡 Hint:', hintX + hintWidth / 2, hintY + 25)
    ctx.fillText(hint.content, hintX + hintWidth / 2, hintY + 45)
    
    ctx.restore()
  }
  
  /**
   * Draw debug information
   */
  private drawDebugInfo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(width - 250, 0, 250, 150)
    
    ctx.fillStyle = 'white'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    
    const debugInfo = [
      `Pet: ${this.currentPet?.name || 'None'}`,
      `Age Group: ${this.ageGroup}`,
      `Problems: ${this.progress.identifiedProblems}/${this.progress.totalProblems}`,
      `Correct: ${this.progress.correctIdentifications}`,
      `Incorrect: ${this.progress.incorrectAttempts}`,
      `Hints: ${this.progress.hintsUsed}`,
      `Time: ${Math.round(this.progress.timeElapsed / 1000)}s`,
      `Hint Timer: ${Math.round((this.hintDelay - this.hintTimer) / 1000)}s`,
      `Active Hints: ${this.activeHints.length}`,
      `Pulse Anims: ${this.pulseAnimations.size}`,
      `Sparkles: ${this.sparkleEffects.size}`,
      `Interactive Areas: ${this.interactiveAreas.size}`
    ]
    
    debugInfo.forEach((info, index) => {
      ctx.fillText(info, width - 245, 15 + index * 12)
    })
    
    ctx.restore()
  }
  
  /**
   * Complete the diagnostic phase
   */
  private completeDignostic(): void {
    if (this.progress.isComplete) return // Prevent double completion
    
    this.progress.isComplete = true
    
    // Calculate diagnostic accuracy
    const accuracy = this.progress.totalProblems > 0 ? 
      this.progress.correctIdentifications / this.progress.totalProblems : 1.0
    
    // Record diagnostic completion with progress manager
    this.progressManager.recordDiagnosticCompleted(this.progress.timeElapsed, accuracy)
    
    console.log('Diagnostic completed!', {
      totalProblems: this.progress.totalProblems,
      identified: this.progress.identifiedProblems,
      correct: this.progress.correctIdentifications,
      incorrect: this.progress.incorrectAttempts,
      hintsUsed: this.progress.hintsUsed,
      accuracy: Math.round(accuracy * 100) + '%',
      timeElapsed: Math.round(this.progress.timeElapsed / 1000)
    })
    
    // Play completion sound
    if (this.audioManager) {
      try {
        this.audioManager.playSound('diagnostic_complete', { volume: 0.8 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // TODO: Transition to repair state
    // This would be handled by the StateManager
  }

  /**
   * Get current diagnostic progress
   */
  public getProgress(): DiagnosticProgress {
    return { ...this.progress }
  }
  
  /**
   * Get current pet
   */
  public getCurrentPet(): RobotPet | null {
    return this.currentPet
  }
  
  /**
   * Get identified problems
   */
  public getIdentifiedProblems(): Problem[] {
    return this.problems.filter(problem => {
      const area = Array.from(this.interactiveAreas.values())
        .find(area => area.problem?.id === problem.id)
      return area?.hasBeenClicked || false
    })
  }
}