/**
 * Repair State - Tool-based repair phase of the Robo-Pet Repair Shop
 * Allows players to fix identified problems using various tools
 * Includes cleaning stage with tactile feedback and visual effects
 */

import { BaseGameState } from '@/engine/GameState'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent, ClickableElement } from '@/input/InputHandler'
import { AudioManager } from '@/audio/AudioManager'
import { OverlayHandSystem, HandGesture } from '@/rendering/OverlayHandSystem'
import { RobotPet } from '@/pets/RobotPet'
import { Problem } from '@/pets/Problem'
import { ComponentType, ProblemType, ToolType, AgeGroup, Vector2D, VisualCue } from '@/pets/types'
import { ProgressManager } from '@/progress/ProgressManager'

export interface RepairTool {
  type: ToolType
  name: string
  icon: string
  description: string
  isSelected: boolean
  isUnlocked: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface RepairArea {
  id: string
  component: ComponentType
  problem: Problem
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isHighlighted: boolean
  isBeingRepaired: boolean
  isFixed: boolean
  repairProgress: number // 0-100
  requiredTool: ToolType
  visualEffects: RepairVisualEffect[]
}

export interface RepairVisualEffect {
  id: string
  type: 'sparks' | 'cleaning_bubbles' | 'polish_shine' | 'repair_glow' | 'success_burst'
  position: Vector2D
  intensity: number
  duration: number
  startTime: number
  particles: RepairParticle[]
}

export interface RepairParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

export interface CleaningStage {
  isActive: boolean
  targetArea: RepairArea | null
  cleaningTool: 'brush' | 'cloth' | 'spray'
  dirtLevel: number // 0-100
  cleaningProgress: number // 0-100
  textureType: 'puffy' | 'soft' | 'squishy'
  tactileFeedbackActive: boolean
}

export interface RepairProgress {
  totalProblems: number
  fixedProblems: number
  currentProblem: Problem | null
  selectedTool: ToolType | null
  repairAttempts: number
  correctToolUsages: number
  incorrectToolUsages: number
  cleaningStagesCompleted: number
  timeElapsed: number
  isComplete: boolean
}

export class RepairState extends BaseGameState {
  public readonly name = 'Repair'
  
  private currentPet: RobotPet | null = null
  private problems: Problem[] = []
  private repairAreas: Map<string, RepairArea> = new Map()
  private availableTools: RepairTool[] = []
  private selectedTool: ToolType | null = null
  private progress: RepairProgress
  private ageGroup: AgeGroup = AgeGroup.MIDDLE
  
  // Cleaning stage
  private cleaningStage: CleaningStage = {
    isActive: false,
    targetArea: null,
    cleaningTool: 'brush',
    dirtLevel: 0,
    cleaningProgress: 0,
    textureType: 'puffy',
    tactileFeedbackActive: false
  }
  
  // Visual effects and animations
  private animationTime: number = 0
  private visualEffects: Map<string, RepairVisualEffect> = new Map()
  private effectCounter: number = 0
  
  // Audio and overlay systems
  private audioManager?: AudioManager
  private overlayHandSystem?: OverlayHandSystem
  private progressManager: ProgressManager
  
  // UI elements
  private toolPanel: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private progressBar: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private skipButton: ClickableElement | null = null
  private hintButton: ClickableElement | null = null
  
  constructor(audioManager?: AudioManager, overlayHandSystem?: OverlayHandSystem) {
    super()
    this.audioManager = audioManager
    this.overlayHandSystem = overlayHandSystem
    this.progressManager = ProgressManager.getInstance()
    
    this.progress = {
      totalProblems: 0,
      fixedProblems: 0,
      currentProblem: null,
      selectedTool: null,
      repairAttempts: 0,
      correctToolUsages: 0,
      incorrectToolUsages: 0,
      cleaningStagesCompleted: 0,
      timeElapsed: 0,
      isComplete: false
    }
  }
  
  /**
   * Initialize repair session with a pet, problems, and age group
   */
  public initializeRepair(pet: RobotPet, problems: Problem[], ageGroup: AgeGroup): void {
    this.currentPet = pet
    this.problems = [...problems]
    this.ageGroup = ageGroup
    
    // Set up progress tracking
    this.progress = {
      totalProblems: problems.length,
      fixedProblems: 0,
      currentProblem: problems.length > 0 ? problems[0] : null,
      selectedTool: null,
      repairAttempts: 0,
      correctToolUsages: 0,
      incorrectToolUsages: 0,
      cleaningStagesCompleted: 0,
      timeElapsed: 0,
      isComplete: false
    }
    
    // Set up repair areas
    this.setupRepairAreas()
    
    // Set up available tools
    this.setupAvailableTools()
    
    console.log(`Repair initialized for ${pet.name} (${ageGroup}) with ${problems.length} problems`)
  }
  
  protected onEnter(): void {
    console.log('Entered Repair State')
    
    if (!this.currentPet || this.problems.length === 0) {
      console.error('No pet or problems assigned to repair state')
      return
    }
    
    // Reset timers and state
    this.animationTime = 0
    this.visualEffects.clear()
    this.selectedTool = null
    this.cleaningStage.isActive = false
    
    // Set up UI elements
    this.setupUI()
    
    // Play entry audio
    if (this.audioManager) {
      try {
        this.audioManager.playSound('repair_start', { volume: 0.6 })
        this.audioManager.playRepairStageAudio('repair', 'general', 60)
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
    
    // Update visual effects
    this.updateVisualEffects(deltaTime)
    
    // Update cleaning stage
    if (this.cleaningStage.isActive) {
      this.updateCleaningStage(deltaTime)
    }
    
    // Update repair areas
    this.updateRepairAreas(deltaTime)
    
    // Check for completion
    if (!this.progress.isComplete) {
      // Count actually fixed problems
      let fixedCount = 0
      for (const area of this.repairAreas.values()) {
        if (area.isFixed) {
          fixedCount++
        }
      }
      this.progress.fixedProblems = fixedCount
      
      if (fixedCount >= this.progress.totalProblems) {
        this.completeRepair()
      }
    }
  }
  
  protected onRender(renderer: Renderer): void {
    const ctx = renderer.getContext()
    const { width, height } = ctx.canvas
    
    // Clear background
    this.drawBackground(ctx, width, height)
    
    // Draw the pet
    this.drawPet(ctx, width, height)
    
    // Draw repair areas with highlights
    this.drawRepairAreas(ctx)
    
    // Draw visual effects
    this.drawVisualEffects(ctx)
    
    // Draw tool panel
    this.drawToolPanel(ctx, width, height)
    
    // Draw cleaning stage overlay if active
    if (this.cleaningStage.isActive) {
      this.drawCleaningStage(ctx, width, height)
    }
    
    // Draw UI elements
    this.drawUI(ctx, width, height)
    
    // Draw debug info in development
    if (import.meta.env.DEV) {
      this.drawDebugInfo(ctx, width, height)
    }
  }
  
  protected onExit(): void {
    console.log('Exited Repair State')
    
    // Clear any active effects or animations
    this.visualEffects.clear()
    this.cleaningStage.isActive = false
    
    // Hide overlay hand guidance
    if (this.overlayHandSystem) {
      this.overlayHandSystem.hideAllGuidingHands()
    }
  }
  
  protected onHandleInput(input: InputEvent): boolean {
    // Handle pointer input
    if (input.type === 'pointer_down' && input.x !== undefined && input.y !== undefined) {
      return this.handlePointerDown(input.x, input.y)
    }
    
    if (input.type === 'pointer_move' && input.x !== undefined && input.y !== undefined) {
      return this.handlePointerMove(input.x, input.y)
    }
    
    // Handle keyboard input
    if (input.type === 'key_down') {
      return this.handleKeyDown(input.key || '')
    }
    
    return false
  }
  
  /**
   * Set up repair areas based on problems
   */
  private setupRepairAreas(): void {
    if (!this.currentPet) return
    
    this.repairAreas.clear()
    
    this.problems.forEach((problem, index) => {
      // Find component by type since we might not have exact component mapping
      let component = null
      for (const [id, comp] of this.currentPet!.components) {
        if (comp.type === problem.component) {
          component = comp
          break
        }
      }
      
      // If no component found, create a default position based on component type
      let position = { x: 200, y: 200 }
      if (component) {
        position = component.position
      } else {
        // Default positions for different component types
        switch (problem.component) {
          case ComponentType.POWER_CORE:
            position = { x: 150, y: 180 }
            break
          case ComponentType.MOTOR_SYSTEM:
            position = { x: 250, y: 200 }
            break
          case ComponentType.SENSOR_ARRAY:
            position = { x: 200, y: 120 }
            break
          case ComponentType.CHASSIS_PLATING:
            position = { x: 200, y: 250 }
            break
          case ComponentType.PROCESSING_UNIT:
            position = { x: 200, y: 150 }
            break
        }
      }
      
      const bounds = this.getComponentBounds(problem.component, position)
      
      const repairArea: RepairArea = {
        id: `repair_${problem.id}`,
        component: problem.component,
        problem,
        bounds,
        isHighlighted: true,
        isBeingRepaired: false,
        isFixed: problem.isFixed,
        repairProgress: 0,
        requiredTool: problem.requiredTool,
        visualEffects: []
      }
      
      this.repairAreas.set(repairArea.id, repairArea)
    })
    
    console.log(`Set up ${this.repairAreas.size} repair areas`)
  }
  
  /**
   * Set up available tools based on age group and problems
   */
  private setupAvailableTools(): void {
    const requiredTools = new Set(this.problems.map(p => p.requiredTool))
    
    // Base tools that are always available
    const baseTools: { type: ToolType, name: string, icon: string, description: string }[] = [
      {
        type: ToolType.SCREWDRIVER,
        name: 'Screwdriver',
        icon: '🪛',
        description: 'Fix loose connections'
      },
      {
        type: ToolType.WRENCH,
        name: 'Wrench',
        icon: '🔧',
        description: 'Tighten mechanical parts'
      },
      {
        type: ToolType.OIL_CAN,
        name: 'Oil Can',
        icon: '🛢️',
        description: 'Clean dirty components'
      },
      {
        type: ToolType.BATTERY,
        name: 'Battery',
        icon: '🔋',
        description: 'Restore power'
      },
      {
        type: ToolType.CIRCUIT_BOARD,
        name: 'Circuit Board',
        icon: '💾',
        description: 'Replace broken circuits'
      }
    ]
    
    this.availableTools = baseTools.map((tool, index) => ({
      ...tool,
      isSelected: false,
      isUnlocked: true, // All tools unlocked for now
      bounds: {
        x: 50 + index * 80,
        y: 50,
        width: 70,
        height: 70
      }
    }))
    
    console.log(`Set up ${this.availableTools.length} available tools`)
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
    // Tool panel
    this.toolPanel = {
      x: 20,
      y: 20,
      width: 500,
      height: 100
    }
    
    // Progress bar
    this.progressBar = {
      x: 50,
      y: 140,
      width: 300,
      height: 20
    }
    
    // Hint button
    this.hintButton = {
      x: 400,
      y: 135,
      width: 100,
      height: 30,
      id: 'hint_button',
      callback: () => this.showHint(),
      isEnabled: true,
      ariaLabel: 'Get a hint'
    }
    
    // Skip button (for accessibility)
    this.skipButton = {
      x: 520,
      y: 135,
      width: 80,
      height: 30,
      id: 'skip_button',
      callback: () => this.skipRepair(),
      isEnabled: true,
      ariaLabel: 'Skip repair'
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
    
    // Check tool selection
    for (const tool of this.availableTools) {
      if (tool.isUnlocked && this.isPointInBounds(x, y, tool.bounds)) {
        this.selectTool(tool.type)
        return true
      }
    }
    
    // Check repair areas (only if a tool is selected)
    if (this.selectedTool) {
      for (const area of this.repairAreas.values()) {
        if (!area.isFixed && this.isPointInBounds(x, y, area.bounds)) {
          this.attemptRepair(area)
          return true
        }
      }
    }
    
    return false
  }
  
  /**
   * Handle pointer move events
   */
  private handlePointerMove(x: number, y: number): boolean {
    // Update tool hover states
    for (const tool of this.availableTools) {
      const wasHovered = tool.bounds.x === x // Simple hover detection
      // In a real implementation, you'd track hover state properly
    }
    
    return false
  }
  
  /**
   * Handle keyboard input
   */
  private handleKeyDown(key: string): boolean {
    switch (key) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        const toolIndex = parseInt(key) - 1
        if (toolIndex < this.availableTools.length) {
          this.selectTool(this.availableTools[toolIndex].type)
          return true
        }
        break
      case 'h':
      case 'H':
        this.showHint()
        return true
      case 's':
      case 'S':
        this.skipRepair()
        return true
      case 'Escape':
        // Could return to menu or pause
        return true
      default:
        return false
    }
    return false
  }
  
  /**
   * Select a repair tool
   */
  private selectTool(toolType: ToolType): void {
    // Deselect all tools
    this.availableTools.forEach(tool => {
      tool.isSelected = false
    })
    
    // Select the chosen tool
    const selectedTool = this.availableTools.find(tool => tool.type === toolType)
    if (selectedTool && selectedTool.isUnlocked) {
      selectedTool.isSelected = true
      this.selectedTool = toolType
      this.progress.selectedTool = toolType
      
      // Play tool selection sound
      if (this.audioManager) {
        try {
          this.audioManager.playSound('tool_select', { volume: 0.5 })
          this.audioManager.playRepairAudio('tool_select', 50)
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      // Highlight compatible repair areas
      this.highlightCompatibleAreas(toolType)
      
      console.log(`Selected tool: ${selectedTool.name}`)
    }
  }
  
  /**
   * Highlight repair areas compatible with the selected tool
   */
  private highlightCompatibleAreas(toolType: ToolType): void {
    for (const area of this.repairAreas.values()) {
      if (!area.isFixed) {
        area.isHighlighted = area.requiredTool === toolType
      }
    }
  }
  
  /**
   * Attempt to repair an area with the selected tool
   */
  private attemptRepair(area: RepairArea): void {
    if (!this.selectedTool || area.isFixed) return
    
    this.progress.repairAttempts++
    
    if (this.selectedTool === area.requiredTool) {
      // Correct tool - start repair process
      this.progress.correctToolUsages++
      this.startRepairProcess(area)
    } else {
      // Incorrect tool - provide feedback
      this.progress.incorrectToolUsages++
      this.handleIncorrectTool(area)
    }
  }
  
  /**
   * Start the repair process for an area
   */
  private startRepairProcess(area: RepairArea): void {
    area.isBeingRepaired = true
    this.progress.currentProblem = area.problem
    
    // Check if this is a cleaning problem
    if (area.problem.type === ProblemType.DIRTY) {
      this.startCleaningStage(area)
    } else {
      this.performStandardRepair(area)
    }
    
    console.log(`Started repair process for ${area.component} with ${this.selectedTool}`)
  }
  
  /**
   * Start the cleaning stage for dirty components
   */
  private startCleaningStage(area: RepairArea): void {
    this.cleaningStage = {
      isActive: true,
      targetArea: area,
      cleaningTool: this.getCleaningToolType(this.selectedTool!),
      dirtLevel: area.problem.severity * 30 + 10, // 40-100 dirt level
      cleaningProgress: 0,
      textureType: this.getTextureType(area.component),
      tactileFeedbackActive: true
    }
    
    // Play cleaning start audio
    if (this.audioManager) {
      try {
        this.audioManager.playRepairStageAudio('cleaning', area.component, 70)
        this.audioManager.playCleaningAudio('scrub', this.cleaningStage.dirtLevel)
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Add cleaning visual effects
    this.addCleaningEffects(area)
    
    console.log(`Started cleaning stage for ${area.component} with ${this.cleaningStage.dirtLevel}% dirt`)
  }
  
  /**
   * Get cleaning tool type based on repair tool
   */
  private getCleaningToolType(toolType: ToolType): 'brush' | 'cloth' | 'spray' {
    switch (toolType) {
      case ToolType.OIL_CAN:
        return 'spray'
      default:
        return 'brush'
    }
  }
  
  /**
   * Get texture type based on component
   */
  private getTextureType(componentType: ComponentType): 'puffy' | 'soft' | 'squishy' {
    switch (componentType) {
      case ComponentType.CHASSIS_PLATING:
        return 'soft'
      case ComponentType.POWER_CORE:
        return 'squishy'
      case ComponentType.SENSOR_ARRAY:
        return 'puffy'
      default:
        return 'soft'
    }
  }
  
  /**
   * Perform standard (non-cleaning) repair
   */
  private performStandardRepair(area: RepairArea): void {
    // Simulate repair progress over time
    const repairDuration = 2000 + area.problem.severity * 500 // 2-3.5 seconds
    const startTime = this.animationTime
    
    const repairInterval = setInterval(() => {
      const elapsed = this.animationTime - startTime
      const progress = Math.min(elapsed / repairDuration, 1)
      
      area.repairProgress = progress * 100
      
      // Play progressive repair feedback
      if (this.audioManager) {
        try {
          this.audioManager.playProgressiveRepairFeedback(progress * 100, 80)
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      // Add repair visual effects
      if (progress < 1) {
        this.addRepairEffects(area, progress)
      } else {
        // Repair complete
        this.completeAreaRepair(area)
        clearInterval(repairInterval)
      }
    }, 100)
  }
  
  /**
   * Handle incorrect tool usage
   */
  private handleIncorrectTool(area: RepairArea): void {
    // Visual feedback for incorrect tool
    this.addIncorrectToolEffect(area)
    
    // Audio feedback
    if (this.audioManager) {
      try {
        this.audioManager.playSound('incorrect_tool', { volume: 0.4 })
        this.audioManager.playTactileAudio('soft', 30)
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Show hint about correct tool if this is their second incorrect attempt
    if (this.progress.incorrectToolUsages >= 2) {
      this.showToolHint(area)
    }
    
    console.log(`Incorrect tool ${this.selectedTool} used on ${area.component}, requires ${area.requiredTool}`)
  }
  
  /**
   * Complete repair for an area
   */
  private completeAreaRepair(area: RepairArea): void {
    area.isFixed = true
    area.isBeingRepaired = false
    area.repairProgress = 100
    area.problem.fix()
    
    this.progress.fixedProblems++
    
    // Add success visual effects
    this.addSuccessEffects(area)
    
    // Play success audio
    if (this.audioManager) {
      try {
        this.audioManager.playSound('repair_success', { volume: 0.8 })
        this.audioManager.playRepairAudio('repair_success', 100)
        this.audioManager.playRepairStageAudio('success', area.component, 90)
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    console.log(`Completed repair of ${area.component}`)
  }
  
  /**
   * Update cleaning stage
   */
  private updateCleaningStage(deltaTime: number): void {
    if (!this.cleaningStage.isActive || !this.cleaningStage.targetArea) return
    
    // Simulate cleaning progress (faster for younger age groups)
    const cleaningSpeed = this.ageGroup === AgeGroup.YOUNG ? 0.05 : 0.03
    this.cleaningStage.cleaningProgress += cleaningSpeed * deltaTime
    
    // Update dirt level
    const dirtReduction = (this.cleaningStage.cleaningProgress / 100) * this.cleaningStage.dirtLevel
    const currentDirtLevel = Math.max(0, this.cleaningStage.dirtLevel - dirtReduction)
    
    // Play contextual cleaning audio
    if (this.audioManager && this.cleaningStage.tactileFeedbackActive) {
      try {
        this.audioManager.playContextualCleaningAudio(
          currentDirtLevel,
          this.cleaningStage.cleaningTool,
          Math.min(80, this.cleaningStage.cleaningProgress)
        )
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Check if cleaning is complete
    if (this.cleaningStage.cleaningProgress >= 100) {
      this.completeCleaningStage()
    }
  }
  
  /**
   * Complete the cleaning stage
   */
  private completeCleaningStage(): void {
    if (!this.cleaningStage.targetArea) return
    
    this.progress.cleaningStagesCompleted++
    this.completeAreaRepair(this.cleaningStage.targetArea)
    
    // Reset cleaning stage
    this.cleaningStage.isActive = false
    this.cleaningStage.targetArea = null
    this.cleaningStage.tactileFeedbackActive = false
    
    console.log('Completed cleaning stage')
  }
  
  /**
   * Update repair areas
   */
  private updateRepairAreas(deltaTime: number): void {
    // Update any ongoing repair processes
    for (const area of this.repairAreas.values()) {
      if (area.isBeingRepaired && !area.isFixed) {
        // Update visual effects for ongoing repairs
        this.updateAreaVisualEffects(area, deltaTime)
      }
    }
  }
  
  /**
   * Update visual effects
   */
  private updateVisualEffects(deltaTime: number): void {
    const currentTime = this.animationTime
    
    // Update and clean up expired effects
    for (const [id, effect] of this.visualEffects.entries()) {
      const elapsed = currentTime - effect.startTime
      
      if (elapsed >= effect.duration) {
        this.visualEffects.delete(id)
        continue
      }
      
      // Update particles
      effect.particles = effect.particles.filter(particle => {
        particle.life -= deltaTime
        particle.x += particle.vx * deltaTime * 0.001
        particle.y += particle.vy * deltaTime * 0.001
        particle.alpha = particle.life / particle.maxLife
        return particle.life > 0
      })
      
      // Remove effect if no particles remain
      if (effect.particles.length === 0) {
        this.visualEffects.delete(id)
      }
    }
  }
  
  /**
   * Update area-specific visual effects
   */
  private updateAreaVisualEffects(area: RepairArea, deltaTime: number): void {
    // Add periodic repair sparks or effects based on repair progress
    if (Math.random() < 0.1) { // 10% chance per frame
      this.addRepairEffects(area, area.repairProgress / 100)
    }
  }
  
  /**
   * Show initial guidance
   */
  private showInitialGuidance(): void {
    // Show hand gesture pointing to first available tool
    if (this.availableTools.length > 0 && this.overlayHandSystem) {
      const firstTool = this.availableTools[0]
      const centerX = firstTool.bounds.x + firstTool.bounds.width / 2
      const centerY = firstTool.bounds.y + firstTool.bounds.height / 2
      
      this.overlayHandSystem.showTapGesture({ x: centerX, y: centerY }, 3000)
    }
  }
  
  /**
   * Show hint about repair process
   */
  private showHint(): void {
    if (!this.progress.currentProblem) {
      // General hint about tool selection
      console.log('Hint: Select a tool first, then click on the highlighted area to repair it')
      return
    }
    
    const requiredTool = this.progress.currentProblem.requiredTool
    const toolName = this.availableTools.find(t => t.type === requiredTool)?.name || 'Unknown'
    
    console.log(`Hint: Use the ${toolName} to fix this problem`)
    
    // Show visual hint
    if (this.overlayHandSystem) {
      const tool = this.availableTools.find(t => t.type === requiredTool)
      if (tool) {
        const centerX = tool.bounds.x + tool.bounds.width / 2
        const centerY = tool.bounds.y + tool.bounds.height / 2
        this.overlayHandSystem.showTapGesture({ x: centerX, y: centerY }, 2000)
      }
    }
    
    if (this.audioManager) {
      try {
        this.audioManager.playSound('hint_audio', { volume: 0.6 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
  }
  
  /**
   * Show tool-specific hint
   */
  private showToolHint(area: RepairArea): void {
    const requiredTool = area.requiredTool
    const toolName = this.availableTools.find(t => t.type === requiredTool)?.name || 'Unknown'
    
    console.log(`Try using the ${toolName} instead!`)
    
    // Highlight the correct tool
    if (this.overlayHandSystem) {
      const tool = this.availableTools.find(t => t.type === requiredTool)
      if (tool) {
        const centerX = tool.bounds.x + tool.bounds.width / 2
        const centerY = tool.bounds.y + tool.bounds.height / 2
        this.overlayHandSystem.showTapGesture({ x: centerX, y: centerY }, 2000)
      }
    }
  }
  
  /**
   * Skip repair (accessibility feature)
   */
  private skipRepair(): void {
    console.log('Repair skipped by user')
    
    // Mark all problems as fixed
    for (const area of this.repairAreas.values()) {
      if (!area.isFixed) {
        this.completeAreaRepair(area)
      }
    }
    
    if (this.audioManager) {
      try {
        this.audioManager.playSound('button_click', { volume: 0.5 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
  }
  
  /**
   * Complete the repair phase
   */
  private completeRepair(): void {
    if (this.progress.isComplete) return // Prevent double completion
    
    this.progress.isComplete = true
    
    // Record repair completion with progress manager
    const problemsFixed = this.problems.map(p => p.component.toString())
    this.progressManager.recordRepairCompleted(this.progress.timeElapsed, problemsFixed)
    
    console.log('Repair completed!', {
      totalProblems: this.progress.totalProblems,
      fixed: this.progress.fixedProblems,
      attempts: this.progress.repairAttempts,
      correctTools: this.progress.correctToolUsages,
      incorrectTools: this.progress.incorrectToolUsages,
      cleaningStages: this.progress.cleaningStagesCompleted,
      timeElapsed: Math.round(this.progress.timeElapsed / 1000)
    })
    
    // Play completion sound
    if (this.audioManager) {
      try {
        this.audioManager.playSound('repair_complete', { volume: 0.8 })
        this.audioManager.playRepairStageAudio('success', 'all_components', 100)
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Add celebration effects
    this.addCelebrationEffects()
    
    // TODO: Transition to customization state
    // This would be handled by the StateManager
  } the state manager
  }
  
  // Visual effect methods
  
  /**
   * Add cleaning visual effects
   */
  private addCleaningEffects(area: RepairArea): void {
    const effectId = `cleaning_${++this.effectCounter}_${Date.now()}`
    const centerX = area.bounds.x + area.bounds.width / 2
    const centerY = area.bounds.y + area.bounds.height / 2
    
    const particles: RepairParticle[] = []
    
    // Create cleaning bubbles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const distance = 20 + Math.random() * 15
      
      particles.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: Math.cos(angle) * 20,
        vy: Math.sin(angle) * 20 - 30, // Float upward
        life: 2000 + Math.random() * 1000,
        maxLife: 2000 + Math.random() * 1000,
        size: 4 + Math.random() * 6,
        color: '#87CEEB',
        alpha: 0.8
      })
    }
    
    const effect: RepairVisualEffect = {
      id: effectId,
      type: 'cleaning_bubbles',
      position: { x: centerX, y: centerY },
      intensity: 0.8,
      duration: 3000,
      startTime: this.animationTime,
      particles
    }
    
    this.visualEffects.set(effectId, effect)
  }
  
  /**
   * Add repair visual effects
   */
  private addRepairEffects(area: RepairArea, progress: number): void {
    const effectId = `repair_${++this.effectCounter}_${Date.now()}`
    const centerX = area.bounds.x + area.bounds.width / 2
    const centerY = area.bounds.y + area.bounds.height / 2
    
    const particles: RepairParticle[] = []
    
    // Create repair sparks
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 30 + Math.random() * 40
      
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 300,
        maxLife: 500 + Math.random() * 300,
        size: 2 + Math.random() * 3,
        color: '#FFD700',
        alpha: 1.0
      })
    }
    
    const effect: RepairVisualEffect = {
      id: effectId,
      type: 'sparks',
      position: { x: centerX, y: centerY },
      intensity: progress,
      duration: 800,
      startTime: this.animationTime,
      particles
    }
    
    this.visualEffects.set(effectId, effect)
  }
  
  /**
   * Add success visual effects
   */
  private addSuccessEffects(area: RepairArea): void {
    const effectId = `success_${++this.effectCounter}_${Date.now()}`
    const centerX = area.bounds.x + area.bounds.width / 2
    const centerY = area.bounds.y + area.bounds.height / 2
    
    const particles: RepairParticle[] = []
    
    // Create success burst
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2
      const speed = 50 + Math.random() * 30
      
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1500 + Math.random() * 500,
        maxLife: 1500 + Math.random() * 500,
        size: 3 + Math.random() * 4,
        color: '#00FF00',
        alpha: 1.0
      })
    }
    
    const effect: RepairVisualEffect = {
      id: effectId,
      type: 'success_burst',
      position: { x: centerX, y: centerY },
      intensity: 1.0,
      duration: 2000,
      startTime: this.animationTime,
      particles
    }
    
    this.visualEffects.set(effectId, effect)
  }
  
  /**
   * Add incorrect tool visual effects
   */
  private addIncorrectToolEffect(area: RepairArea): void {
    const effectId = `incorrect_${++this.effectCounter}_${Date.now()}`
    const centerX = area.bounds.x + area.bounds.width / 2
    const centerY = area.bounds.y + area.bounds.height / 2
    
    const particles: RepairParticle[] = []
    
    // Create error particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 25 + Math.random() * 20
      
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800 + Math.random() * 400,
        maxLife: 800 + Math.random() * 400,
        size: 2 + Math.random() * 2,
        color: '#FF6B6B',
        alpha: 0.8
      })
    }
    
    const effect: RepairVisualEffect = {
      id: effectId,
      type: 'repair_glow',
      position: { x: centerX, y: centerY },
      intensity: 0.6,
      duration: 1200,
      startTime: this.animationTime,
      particles
    }
    
    this.visualEffects.set(effectId, effect)
  }
  
  /**
   * Add celebration effects for completion
   */
  private addCelebrationEffects(): void {
    // Add multiple celebration effects across the screen
    for (let i = 0; i < 5; i++) {
      const effectId = `celebration_${++this.effectCounter}_${Date.now()}_${i}`
      const x = 100 + Math.random() * 600
      const y = 100 + Math.random() * 400
      
      const particles: RepairParticle[] = []
      
      // Create celebration particles
      for (let j = 0; j < 20; j++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 40 + Math.random() * 60
        
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20, // Slight upward bias
          life: 2000 + Math.random() * 1000,
          maxLife: 2000 + Math.random() * 1000,
          size: 4 + Math.random() * 6,
          color: ['#FFD700', '#FF69B4', '#00FF00', '#87CEEB'][Math.floor(Math.random() * 4)],
          alpha: 1.0
        })
      }
      
      const effect: RepairVisualEffect = {
        id: effectId,
        type: 'success_burst',
        position: { x, y },
        intensity: 1.0,
        duration: 3000,
        startTime: this.animationTime,
        particles
      }
      
      this.visualEffects.set(effectId, effect)
    }
  }
  
  // Drawing methods
  
  /**
   * Draw background
   */
  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#F0F8FF')
    gradient.addColorStop(1, '#E6F3FF')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // Workshop pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)'
    for (let x = 0; x < width; x += 50) {
      for (let y = 0; y < height; y += 50) {
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
    const petY = height / 2 + 50
    
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
    
    // Eyes (animate based on repair progress)
    const eyeColor = this.progress.isComplete ? '#00FF00' : '#2196F3'
    ctx.fillStyle = eyeColor
    ctx.beginPath()
    ctx.ellipse(-15, -75, 8, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.beginPath()
    ctx.ellipse(15, -75, 8, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
  
  /**
   * Draw repair areas with highlights
   */
  private drawRepairAreas(ctx: CanvasRenderingContext2D): void {
    for (const area of this.repairAreas.values()) {
      ctx.save()
      
      // Determine highlight color based on state
      let highlightColor = 'rgba(33, 150, 243, 0.3)' // Default blue
      
      if (area.isFixed) {
        highlightColor = 'rgba(76, 175, 80, 0.4)' // Success green
      } else if (area.isBeingRepaired) {
        highlightColor = 'rgba(255, 193, 7, 0.5)' // Working yellow
      } else if (area.isHighlighted && this.selectedTool === area.requiredTool) {
        highlightColor = 'rgba(255, 193, 7, 0.4)' // Compatible yellow
      } else if (area.isHighlighted) {
        highlightColor = 'rgba(244, 67, 54, 0.3)' // Incompatible red
      }
      
      // Draw highlight
      ctx.fillStyle = highlightColor
      ctx.strokeStyle = highlightColor.replace('0.3', '0.8').replace('0.4', '0.8').replace('0.5', '0.9')
      ctx.lineWidth = 2
      
      ctx.beginPath()
      ctx.roundRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height, 8)
      ctx.fill()
      ctx.stroke()
      
      // Draw repair progress bar if being repaired
      if (area.isBeingRepaired && area.repairProgress > 0) {
        const progressBarY = area.bounds.y - 15
        const progressWidth = (area.bounds.width * area.repairProgress) / 100
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(area.bounds.x, progressBarY, area.bounds.width, 8)
        
        // Progress
        ctx.fillStyle = '#4CAF50'
        ctx.fillRect(area.bounds.x, progressBarY, progressWidth, 8)
      }
      
      // Draw component label
      if (area.isHighlighted || area.isBeingRepaired) {
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
   * Draw visual effects
   */
  private drawVisualEffects(ctx: CanvasRenderingContext2D): void {
    for (const effect of this.visualEffects.values()) {
      for (const particle of effect.particles) {
        ctx.save()
        ctx.globalAlpha = particle.alpha
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  }
  
  /**
   * Draw tool panel
   */
  private drawToolPanel(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    // Panel background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(this.toolPanel.x, this.toolPanel.y, this.toolPanel.width, this.toolPanel.height, 10)
    ctx.fill()
    ctx.stroke()
    
    // Panel title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('🔧 Repair Tools', this.toolPanel.x + 15, this.toolPanel.y + 25)
    
    // Draw tools
    this.availableTools.forEach((tool, index) => {
      this.drawTool(ctx, tool)
    })
    
    ctx.restore()
  }
  
  /**
   * Draw a single tool
   */
  private drawTool(ctx: CanvasRenderingContext2D, tool: RepairTool): void {
    ctx.save()
    
    // Tool background
    let bgColor = tool.isUnlocked ? '#FFFFFF' : '#F5F5F5'
    if (tool.isSelected) {
      bgColor = '#E3F2FD'
    }
    
    ctx.fillStyle = bgColor
    ctx.strokeStyle = tool.isSelected ? '#2196F3' : '#BDC3C7'
    ctx.lineWidth = tool.isSelected ? 3 : 1
    ctx.beginPath()
    ctx.roundRect(tool.bounds.x, tool.bounds.y, tool.bounds.width, tool.bounds.height, 8)
    ctx.fill()
    ctx.stroke()
    
    // Tool icon
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = tool.isUnlocked ? '#2C3E50' : '#BDC3C7'
    ctx.fillText(
      tool.icon,
      tool.bounds.x + tool.bounds.width / 2,
      tool.bounds.y + tool.bounds.height / 2 + 8
    )
    
    // Tool name
    ctx.font = '10px Arial'
    ctx.fillText(
      tool.name,
      tool.bounds.x + tool.bounds.width / 2,
      tool.bounds.y + tool.bounds.height - 5
    )
    
    // Selection indicator
    if (tool.isSelected) {
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.roundRect(tool.bounds.x - 2, tool.bounds.y - 2, tool.bounds.width + 4, tool.bounds.height + 4, 10)
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    ctx.restore()
  }
  
  /**
   * Draw cleaning stage overlay
   */
  private drawCleaningStage(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.cleaningStage.isActive || !this.cleaningStage.targetArea) return
    
    ctx.save()
    
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(0, 0, width, height)
    
    // Cleaning area highlight
    const area = this.cleaningStage.targetArea
    ctx.fillStyle = 'rgba(135, 206, 235, 0.6)' // Light blue for cleaning
    ctx.strokeStyle = '#87CEEB'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(area.bounds.x - 10, area.bounds.y - 10, area.bounds.width + 20, area.bounds.height + 20, 15)
    ctx.fill()
    ctx.stroke()
    
    // Cleaning progress indicator
    const progressX = width / 2 - 150
    const progressY = height - 100
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(progressX, progressY, 300, 60, 10)
    ctx.fill()
    
    // Title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🧽 Cleaning in Progress...', progressX + 150, progressY + 25)
    
    // Progress bar
    const progressBarWidth = 250
    const progressBarHeight = 15
    const progressBarX = progressX + 25
    const progressBarY = progressY + 35
    
    // Background
    ctx.fillStyle = '#E0E0E0'
    ctx.beginPath()
    ctx.roundRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 7)
    ctx.fill()
    
    // Progress
    const progressWidth = (progressBarWidth * this.cleaningStage.cleaningProgress) / 100
    ctx.fillStyle = '#4CAF50'
    ctx.beginPath()
    ctx.roundRect(progressBarX, progressBarY, progressWidth, progressBarHeight, 7)
    ctx.fill()
    
    // Progress text
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.fillText(`${Math.round(this.cleaningStage.cleaningProgress)}%`, progressBarX + progressBarWidth + 15, progressBarY + 12)
    
    ctx.restore()
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
  }
  
  /**
   * Draw progress bar
   */
  private drawProgressBar(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(this.progressBar.x - 5, this.progressBar.y - 5, this.progressBar.width + 10, this.progressBar.height + 10, 5)
    ctx.fill()
    ctx.stroke()
    
    // Progress background
    ctx.fillStyle = '#E0E0E0'
    ctx.beginPath()
    ctx.roundRect(this.progressBar.x, this.progressBar.y, this.progressBar.width, this.progressBar.height, 10)
    ctx.fill()
    
    // Progress fill
    const progressPercent = this.progress.totalProblems > 0 ? (this.progress.fixedProblems / this.progress.totalProblems) : 0
    const progressWidth = this.progressBar.width * progressPercent
    
    ctx.fillStyle = '#4CAF50'
    ctx.beginPath()
    ctx.roundRect(this.progressBar.x, this.progressBar.y, progressWidth, this.progressBar.height, 10)
    ctx.fill()
    
    // Progress text
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      `${this.progress.fixedProblems}/${this.progress.totalProblems} Fixed`,
      this.progressBar.x + this.progressBar.width / 2,
      this.progressBar.y - 10
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
    ctx.fillStyle = button.isEnabled ? '#2196F3' : '#BDC3C7'
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, 5)
    ctx.fill()
    
    // Button text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(text, button.x + button.width / 2, button.y + button.height / 2 + 4)
    
    ctx.restore()
  }
  
  /**
   * Draw debug info
   */
  private drawDebugInfo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    
    const debugInfo = [
      `Selected Tool: ${this.selectedTool || 'None'}`,
      `Fixed: ${this.progress.fixedProblems}/${this.progress.totalProblems}`,
      `Attempts: ${this.progress.repairAttempts}`,
      `Correct: ${this.progress.correctToolUsages}`,
      `Incorrect: ${this.progress.incorrectToolUsages}`,
      `Cleaning Active: ${this.cleaningStage.isActive}`,
      `Effects: ${this.visualEffects.size}`,
      `Time: ${Math.round(this.progress.timeElapsed / 1000)}s`
    ]
    
    debugInfo.forEach((info, index) => {
      ctx.fillText(info, width - 200, 20 + index * 15)
    })
    
    ctx.restore()
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
  
  /**
   * Check if point is within bounds
   */
  private isPointInBounds(x: number, y: number, bounds: { x: number, y: number, width: number, height: number }): boolean {
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height
  }
  
  /**
   * Get current repair progress data
   */
  public getRepairProgress(): RepairProgress {
    return { ...this.progress }
  }
  
  /**
   * Get current cleaning stage data
   */
  public getCleaningStage(): CleaningStage {
    return { ...this.cleaningStage }
  }
}