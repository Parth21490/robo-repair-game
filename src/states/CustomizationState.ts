/**
 * Customization State - Pet personalization phase of the Robo-Pet Repair Shop
 * Allows players to customize their repaired pets with colors and accessories
 * Saves customizations to local storage for the player's collection
 */

import { BaseGameState } from '@/engine/GameState'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent, ClickableElement } from '@/input/InputHandler'
import { AudioManager } from '@/audio/AudioManager'
import { RobotPet } from '@/pets/RobotPet'
import { ComponentType, Customization, Vector2D, AgeGroup } from '@/pets/types'
import { ProgressManager } from '@/progress/ProgressManager'

export interface ColorPalette {
  id: string
  name: string
  colors: string[]
  isUnlocked: boolean
  category: 'basic' | 'premium' | 'special'
}

export interface AccessoryItem {
  id: string
  name: string
  type: 'hat' | 'bow_tie' | 'sticker' | 'pattern'
  icon: string
  position: Vector2D
  scale: number
  rotation: number
  isUnlocked: boolean
  category: 'basic' | 'premium' | 'special'
  roboGemCost: number
}

export interface CustomizationTool {
  id: string
  name: string
  type: 'color_brush' | 'accessory_placer' | 'pattern_stamp'
  icon: string
  isSelected: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface CustomizationArea {
  id: string
  component: ComponentType
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isHighlighted: boolean
  currentCustomization?: Customization
  allowedCustomizations: ('color' | 'accessory' | 'pattern')[]
}

export interface CustomizationProgress {
  totalCustomizations: number
  appliedCustomizations: number
  selectedColor?: string
  selectedAccessory?: AccessoryItem
  selectedTool?: CustomizationTool
  roboGemsSpent: number
  timeElapsed: number
  isComplete: boolean
}

export class CustomizationState extends BaseGameState {
  public readonly name = 'Customization'
  
  private currentPet: RobotPet | null = null
  private ageGroup: AgeGroup = AgeGroup.MIDDLE
  private progress: CustomizationProgress
  
  // Customization options
  private colorPalettes: ColorPalette[] = []
  private accessories: AccessoryItem[] = []
  private customizationTools: CustomizationTool[] = []
  private customizationAreas: Map<string, CustomizationArea> = new Map()
  
  // UI state
  private selectedTool: CustomizationTool | null = null
  private selectedColor: string | null = null
  private selectedAccessory: AccessoryItem | null = null
  private animationTime: number = 0
  private currentPanel: 'colors' | 'accessories' | 'preview' = 'colors'
  
  // UI elements
  private colorPalette: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private accessoryPanel: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private previewArea: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 }
  private saveButton: ClickableElement | null = null
  private resetButton: ClickableElement | null = null
  private backButton: ClickableElement | null = null
  
  // Audio system
  private audioManager?: AudioManager
  private progressManager: ProgressManager
  
  constructor(audioManager?: AudioManager) {
    super()
    this.audioManager = audioManager
    this.progressManager = ProgressManager.getInstance()
    
    this.progress = {
      totalCustomizations: 0,
      appliedCustomizations: 0,
      roboGemsSpent: 0,
      timeElapsed: 0,
      isComplete: false
    }
  }
  
  /**
   * Initialize customization session with a pet and age group
   */
  public initializeCustomization(pet: RobotPet, ageGroup: AgeGroup): void {
    this.currentPet = pet
    this.ageGroup = ageGroup
    
    // Reset progress
    this.progress = {
      totalCustomizations: 0,
      appliedCustomizations: 0,
      roboGemsSpent: 0,
      timeElapsed: 0,
      isComplete: false
    }
    
    // Set up customization options
    this.setupColorPalettes()
    this.setupAccessories()
    this.setupCustomizationTools()
    this.setupCustomizationAreas()
    
    console.log(`Customization initialized for ${pet.name} (${ageGroup})`)
  }
  
  protected onEnter(): void {
    console.log('Entered Customization State')
    
    if (!this.currentPet) {
      console.error('No pet assigned to customization state')
      return
    }
    
    // Reset state
    this.animationTime = 0
    this.selectedTool = null
    this.selectedColor = null
    this.selectedAccessory = null
    this.currentPanel = 'colors'
    
    // Set up UI elements
    this.setupUI()
    
    // Play entry audio
    if (this.audioManager) {
      try {
        this.audioManager.playSound('customization_start', { volume: 0.6 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    // Show initial guidance
    this.showInitialGuidance()
  }
  
  /**
   * Set up UI elements
   */
  private setupUI(): void {
    // Color palette area
    this.colorPalette = {
      x: 20,
      y: 160,
      width: 200,
      height: 200
    }
    
    // Accessory panel area
    this.accessoryPanel = {
      x: 20,
      y: 160,
      width: 200,
      height: 300
    }
    
    // Preview area
    this.previewArea = {
      x: 250,
      y: 160,
      width: 300,
      height: 300
    }
    
    // Save button
    this.saveButton = {
      x: 570,
      y: 400,
      width: 100,
      height: 40,
      id: 'save_button',
      callback: () => this.saveCustomizations(),
      isEnabled: true,
      ariaLabel: 'Save customizations'
    }
    
    // Reset button
    this.resetButton = {
      x: 570,
      y: 350,
      width: 100,
      height: 40,
      id: 'reset_button',
      callback: () => this.resetCustomizations(),
      isEnabled: true,
      ariaLabel: 'Reset customizations'
    }
    
    // Back button
    this.backButton = {
      x: 570,
      y: 300,
      width: 100,
      height: 40,
      id: 'back_button',
      callback: () => this.goBack(),
      isEnabled: true,
      ariaLabel: 'Go back'
    }
  }
  
  protected onUpdate(deltaTime: number): void {
    this.animationTime += deltaTime
    this.progress.timeElapsed += deltaTime
    
    // Update UI animations
    this.updateAnimations(deltaTime)
    
    // Check for completion (optional - user can save anytime)
    this.updateProgress()
  }
  
  /**
   * Set up color palettes based on age group
   */
  private setupColorPalettes(): void {
    this.colorPalettes = [
      {
        id: 'basic_colors',
        name: this.getAgeAppropriateColorName(),
        colors: this.getAgeAppropriateColors(),
        isUnlocked: true,
        category: 'basic'
      },
      {
        id: 'premium_colors',
        name: 'Premium Colors',
        colors: ['#FFD700', '#FF69B4', '#00CED1', '#9370DB', '#FF4500', '#32CD32', '#FF1493', '#00BFFF'],
        isUnlocked: false, // Unlocked through progress
        category: 'premium'
      }
    ]
  }
  
  /**
   * Set up available accessories
   */
  private setupAccessories(): void {
    this.accessories = [
      {
        id: 'hat_basic',
        name: 'Basic Hat',
        type: 'hat',
        icon: '🎩',
        position: { x: 0, y: -30 },
        scale: 1.0,
        rotation: 0,
        isUnlocked: true,
        category: 'basic',
        roboGemCost: 0
      },
      {
        id: 'bow_tie_basic',
        name: 'Bow Tie',
        type: 'bow_tie',
        icon: '🎀',
        position: { x: 0, y: 10 },
        scale: 1.0,
        rotation: 0,
        isUnlocked: true,
        category: 'basic',
        roboGemCost: 0
      },
      {
        id: 'hat_wizard',
        name: 'Wizard Hat',
        type: 'hat',
        icon: '🧙‍♂️',
        position: { x: 0, y: -35 },
        scale: 1.2,
        rotation: 0,
        isUnlocked: false, // Unlocked through milestones
        category: 'premium',
        roboGemCost: 15
      }
    ]
  }
  
  /**
   * Set up customization tools
   */
  private setupCustomizationTools(): void {
    this.customizationTools = [
      {
        id: 'color_brush',
        name: 'Paint Brush',
        type: 'color_brush',
        icon: '🖌️',
        isSelected: false,
        bounds: { x: 20, y: 80, width: 50, height: 50 }
      },
      {
        id: 'accessory_placer',
        name: 'Accessories',
        type: 'accessory_placer',
        icon: '👑',
        isSelected: false,
        bounds: { x: 80, y: 80, width: 50, height: 50 }
      }
    ]
  }
  
  /**
   * Set up customization areas on the pet
   */
  private setupCustomizationAreas(): void {
    if (!this.currentPet) return
    
    this.customizationAreas.clear()
    
    // Create customization areas for each component
    for (const [componentId, component] of this.currentPet.components) {
      const bounds = this.getComponentCustomizationBounds(component.type, component.position)
      
      const customizationArea: CustomizationArea = {
        id: componentId,
        component: component.type,
        bounds,
        isHighlighted: false,
        allowedCustomizations: this.getAllowedCustomizations(component.type)
      }
      
      this.customizationAreas.set(componentId, customizationArea)
    }
    
    console.log(`Set up ${this.customizationAreas.size} customization areas`)
  }
  
  protected onRender(renderer: Renderer): void {
    const ctx = renderer.getContext()
    const { width, height } = ctx.canvas
    
    // Clear background
    this.drawBackground(ctx, width, height)
    
    // Draw the pet in preview area
    this.drawPetPreview(ctx, width, height)
    
    // Draw customization panels
    this.drawCustomizationPanels(ctx, width, height)
    
    // Draw UI elements
    this.drawUI(ctx, width, height)
    
    // Draw debug info in development
    if (import.meta.env.DEV) {
      this.drawDebugInfo(ctx, width, height)
    }
  }
  
  protected onExit(): void {
    console.log('Exited Customization State')
    
    // Save any pending customizations
    this.saveCustomizations()
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
   * Set up color palettes based on age group
   */
  private setupColorPalettes(): void {
    // Basic colors available to all age groups
    const basicColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    
    // Age-appropriate color palettes
    const youngColors = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E6B3FF', '#FFB3E6', '#C9FFB3']
    const middleColors = ['#FF5722', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#CDDC39', '#E91E63']
    const olderColors = ['#B71C1C', '#0D47A1', '#1B5E20', '#E65100', '#4A148C', '#006064', '#827717', '#880E4F']
    
    this.colorPalettes = [
      {
        id: 'basic',
        name: 'Basic Colors',
        colors: basicColors,
        isUnlocked: true,
        category: 'basic'
      },
      {
        id: 'age_appropriate',
        name: this.getAgeAppropriateColorName(),
        colors: this.getAgeAppropriateColors(),
        isUnlocked: true,
        category: 'basic'
      },
      {
        id: 'rainbow',
        name: 'Rainbow Pack',
        colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FF1493'],
        isUnlocked: this.progress.appliedCustomizations >= 3,
        category: 'premium'
      },
      {
        id: 'metallic',
        name: 'Metallic Finish',
        colors: ['#C0C0C0', '#FFD700', '#CD7F32', '#E5E4E2', '#B87333', '#918151', '#FAFAD2', '#F5F5DC'],
        isUnlocked: this.progress.appliedCustomizations >= 5,
        category: 'special'
      }
    ]
  }
  
  /**
   * Set up accessories based on age group
   */
  private setupAccessories(): void {
    const baseAccessories: Omit<AccessoryItem, 'isUnlocked' | 'roboGemCost'>[] = [
      // Hats
      {
        id: 'hat_cap',
        name: 'Baseball Cap',
        type: 'hat',
        icon: '🧢',
        position: { x: 0, y: -30 },
        scale: 1,
        rotation: 0,
        category: 'basic'
      },
      {
        id: 'hat_crown',
        name: 'Royal Crown',
        type: 'hat',
        icon: '👑',
        position: { x: 0, y: -35 },
        scale: 0.8,
        rotation: 0,
        category: 'premium'
      },
      {
        id: 'hat_wizard',
        name: 'Wizard Hat',
        type: 'hat',
        icon: '🧙‍♂️',
        position: { x: 0, y: -40 },
        scale: 0.9,
        rotation: 0,
        category: 'special'
      },
      
      // Bow ties
      {
        id: 'bowtie_red',
        name: 'Red Bow Tie',
        type: 'bow_tie',
        icon: '🎀',
        position: { x: 0, y: 10 },
        scale: 0.6,
        rotation: 0,
        category: 'basic'
      },
      {
        id: 'bowtie_fancy',
        name: 'Fancy Bow Tie',
        type: 'bow_tie',
        icon: '🎩',
        position: { x: 0, y: 8 },
        scale: 0.7,
        rotation: 0,
        category: 'premium'
      },
      
      // Stickers
      {
        id: 'sticker_star',
        name: 'Star Sticker',
        type: 'sticker',
        icon: '⭐',
        position: { x: 15, y: 5 },
        scale: 0.5,
        rotation: 0,
        category: 'basic'
      },
      {
        id: 'sticker_heart',
        name: 'Heart Sticker',
        type: 'sticker',
        icon: '❤️',
        position: { x: -15, y: 5 },
        scale: 0.5,
        rotation: 0,
        category: 'basic'
      },
      {
        id: 'sticker_lightning',
        name: 'Lightning Bolt',
        type: 'sticker',
        icon: '⚡',
        position: { x: 20, y: -5 },
        scale: 0.6,
        rotation: 15,
        category: 'premium'
      }
    ]
    
    // Add unlock status and costs
    this.accessories = baseAccessories.map(accessory => ({
      ...accessory,
      isUnlocked: this.getAccessoryUnlockStatus(accessory.category),
      roboGemCost: this.getAccessoryCost(accessory.category)
    }))
  }
  
  /**
   * Set up customization tools
   */
  private setupCustomizationTools(): void {
    this.customizationTools = [
      {
        id: 'color_brush',
        name: 'Color Brush',
        type: 'color_brush',
        icon: '🎨',
        isSelected: false,
        bounds: { x: 50, y: 50, width: 60, height: 60 }
      },
      {
        id: 'accessory_placer',
        name: 'Accessory Tool',
        type: 'accessory_placer',
        icon: '🎭',
        isSelected: false,
        bounds: { x: 120, y: 50, width: 60, height: 60 }
      },
      {
        id: 'pattern_stamp',
        name: 'Pattern Stamp',
        type: 'pattern_stamp',
        icon: '🖌️',
        isSelected: false,
        bounds: { x: 190, y: 50, width: 60, height: 60 }
      }
    ]
  }
  
  /**
   * Set up customization areas on the pet
   */
  private setupCustomizationAreas(): void {
    if (!this.currentPet) return
    
    this.customizationAreas.clear()
    
    // Create customization areas for each component
    for (const [componentId, component] of this.currentPet.components) {
      const bounds = this.getComponentCustomizationBounds(component.type, component.position)
      
      const area: CustomizationArea = {
        id: `custom_${componentId}`,
        component: component.type,
        bounds,
        isHighlighted: false,
        currentCustomization: component.customization,
        allowedCustomizations: this.getAllowedCustomizations(component.type)
      }
      
      this.customizationAreas.set(area.id, area)
    }
    
    console.log(`Set up ${this.customizationAreas.size} customization areas`)
  }
  
  /**
   * Set up UI elements
   */
  private setupUI(): void {
    const canvasWidth = 800 // Default width
    const canvasHeight = 600 // Default height
    
    // Color palette panel
    this.colorPalette = {
      x: 20,
      y: 150,
      width: 200,
      height: 300
    }
    
    // Accessory panel
    this.accessoryPanel = {
      x: 20,
      y: 150,
      width: 200,
      height: 300
    }
    
    // Preview area (center-right)
    this.previewArea = {
      x: 250,
      y: 150,
      width: 350,
      height: 300
    }
    
    // Control buttons
    this.saveButton = {
      x: canvasWidth - 150,
      y: canvasHeight - 100,
      width: 120,
      height: 40,
      id: 'save_button',
      callback: () => this.saveCustomizations(),
      isEnabled: true,
      ariaLabel: 'Save customizations'
    }
    
    this.resetButton = {
      x: canvasWidth - 280,
      y: canvasHeight - 100,
      width: 120,
      height: 40,
      id: 'reset_button',
      callback: () => this.resetCustomizations(),
      isEnabled: true,
      ariaLabel: 'Reset customizations'
    }
    
    this.backButton = {
      x: 20,
      y: canvasHeight - 60,
      width: 100,
      height: 40,
      id: 'back_button',
      callback: () => this.goBack(),
      isEnabled: true,
      ariaLabel: 'Go back'
    }
  }
  
  /**
   * Handle pointer down events
   */
  private handlePointerDown(x: number, y: number): boolean {
    // Check UI buttons first
    if (this.saveButton && this.isPointInBounds(x, y, this.saveButton)) {
      this.saveButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    if (this.resetButton && this.isPointInBounds(x, y, this.resetButton)) {
      this.resetButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    if (this.backButton && this.isPointInBounds(x, y, this.backButton)) {
      this.backButton.callback({ type: 'pointer_down', x, y, timestamp: performance.now() })
      return true
    }
    
    // Check tool selection
    for (const tool of this.customizationTools) {
      if (this.isPointInBounds(x, y, tool.bounds)) {
        this.selectTool(tool)
        return true
      }
    }
    
    // Check color palette (if color tool is selected)
    if (this.selectedTool?.type === 'color_brush' && this.currentPanel === 'colors') {
      const colorIndex = this.getColorIndexAtPoint(x, y)
      if (colorIndex !== -1) {
        this.selectColor(colorIndex)
        return true
      }
    }
    
    // Check accessory selection (if accessory tool is selected)
    if (this.selectedTool?.type === 'accessory_placer' && this.currentPanel === 'accessories') {
      const accessoryIndex = this.getAccessoryIndexAtPoint(x, y)
      if (accessoryIndex !== -1) {
        this.selectAccessory(accessoryIndex)
        return true
      }
    }
    
    // Check customization areas (if tool and option are selected)
    if (this.selectedTool && (this.selectedColor || this.selectedAccessory)) {
      for (const area of this.customizationAreas.values()) {
        if (this.isPointInBounds(x, y, area.bounds)) {
          this.applyCustomization(area)
          return true
        }
      }
    }
    
    // Check panel tabs
    if (this.isPointInPanelTab(x, y, 'colors')) {
      this.currentPanel = 'colors'
      return true
    }
    if (this.isPointInPanelTab(x, y, 'accessories')) {
      this.currentPanel = 'accessories'
      return true
    }
    if (this.isPointInPanelTab(x, y, 'preview')) {
      this.currentPanel = 'preview'
      return true
    }
    
    return false
  }
  
  /**
   * Handle pointer move events
   */
  private handlePointerMove(x: number, y: number): boolean {
    // Update hover states for customization areas
    for (const area of this.customizationAreas.values()) {
      area.isHighlighted = this.selectedTool && this.isPointInBounds(x, y, area.bounds)
    }
    
    return false
  }
  
  /**
   * Handle keyboard input
   */
  private handleKeyDown(key: string): boolean {
    switch (key) {
      case '1':
        this.selectTool(this.customizationTools[0])
        return true
      case '2':
        this.selectTool(this.customizationTools[1])
        return true
      case '3':
        this.selectTool(this.customizationTools[2])
        return true
      case 's':
      case 'S':
        this.saveCustomizations()
        return true
      case 'r':
      case 'R':
        this.resetCustomizations()
        return true
      case 'Escape':
        this.goBack()
        return true
      case 'Tab':
        this.switchPanel()
        return true
      default:
        return false
    }
  }
  
  /**
   * Select a customization tool
   */
  private selectTool(tool: CustomizationTool): void {
    // Deselect all tools
    this.customizationTools.forEach(t => t.isSelected = false)
    
    // Select the chosen tool
    tool.isSelected = true
    this.selectedTool = tool
    this.progress.selectedTool = tool
    
    // Switch to appropriate panel
    if (tool.type === 'color_brush') {
      this.currentPanel = 'colors'
    } else if (tool.type === 'accessory_placer') {
      this.currentPanel = 'accessories'
    }
    
    // Play tool selection sound
    if (this.audioManager) {
      try {
        this.audioManager.playSound('tool_select', { volume: 0.5 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    console.log(`Selected customization tool: ${tool.name}`)
  }
  
  /**
   * Select a color from the palette
   */
  private selectColor(colorIndex: number): void {
    const currentPalette = this.colorPalettes.find(p => p.isUnlocked) || this.colorPalettes[0]
    if (colorIndex >= 0 && colorIndex < currentPalette.colors.length) {
      this.selectedColor = currentPalette.colors[colorIndex]
      this.progress.selectedColor = this.selectedColor
      
      // Play color selection sound
      if (this.audioManager) {
        try {
          this.audioManager.playSound('color_select', { volume: 0.4 })
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      console.log(`Selected color: ${this.selectedColor}`)
    }
  }
  
  /**
   * Select an accessory
   */
  private selectAccessory(accessoryIndex: number): void {
    const unlockedAccessories = this.accessories.filter(a => a.isUnlocked)
    if (accessoryIndex >= 0 && accessoryIndex < unlockedAccessories.length) {
      this.selectedAccessory = unlockedAccessories[accessoryIndex]
      
      // Play accessory selection sound
      if (this.audioManager) {
        try {
          this.audioManager.playSound('accessory_select', { volume: 0.4 })
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      console.log(`Selected accessory: ${this.selectedAccessory.name}`)
    }
  }
  
  /**
   * Apply customization to an area
   */
  private applyCustomization(area: CustomizationArea): void {
    if (!this.currentPet || !this.selectedTool) return
    
    let customization: Customization | null = null
    
    if (this.selectedTool.type === 'color_brush' && this.selectedColor) {
      customization = {
        id: `color_${Date.now()}`,
        type: 'color',
        value: this.selectedColor,
        appliedAt: new Date()
      }
    } else if (this.selectedTool.type === 'accessory_placer' && this.selectedAccessory) {
      customization = {
        id: `accessory_${Date.now()}`,
        type: 'accessory',
        value: JSON.stringify(this.selectedAccessory),
        appliedAt: new Date()
      }
      
      // Deduct robo gems if needed
      this.progress.roboGemsSpent += this.selectedAccessory.roboGemCost
    }
    
    if (customization) {
      // Apply to component
      const component = this.currentPet.getComponentByType(area.component)
      if (component) {
        component.applyCustomization(customization)
      }
      
      // Add to pet's customization list
      this.currentPet.addCustomization(customization)
      
      // Update area
      area.currentCustomization = customization
      this.progress.appliedCustomizations++
      
      // Play customization sound
      if (this.audioManager) {
        try {
          this.audioManager.playSound('customization_applied', { volume: 0.6 })
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      console.log(`Applied ${customization.type} customization to ${area.component}`)
    }
  }
  
  /**
   * Save customizations to local storage
   */
  private saveCustomizations(): void {
    if (!this.currentPet) {
      console.warn('No pet to save customizations for')
      return
    }
    
    try {
      // Get existing saved pets
      const savedPetsJson = localStorage.getItem('robo_pet_collection')
      const savedPets = savedPetsJson ? JSON.parse(savedPetsJson) : []
      
      // Add or update current pet
      const existingIndex = savedPets.findIndex((p: any) => p.id === this.currentPet!.id)
      const petData = this.currentPet.toJSON()
      
      if (existingIndex !== -1) {
        savedPets[existingIndex] = petData
      } else {
        savedPets.push(petData)
      }
      
      // Save back to localStorage
      localStorage.setItem('robo_pet_collection', JSON.stringify(savedPets))
      
      // Update progress
      this.progress.isComplete = true
      
      // Play save sound
      if (this.audioManager) {
        try {
          this.audioManager.playSound('save_success', { volume: 0.7 })
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      console.log('Customizations saved successfully')
      
      // TODO: Transition to photo booth or menu state
      
    } catch (error) {
      console.error('Failed to save customizations:', error)
      
      if (this.audioManager) {
        try {
          this.audioManager.playSound('error', { volume: 0.5 })
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      throw error // Re-throw for test detection
    }
  }
  
  /**
   * Save current customizations and complete customization phase
   */
  private saveCustomizations(): void {
    if (!this.currentPet) return
    
    try {
      // Get all applied customizations
      const customizations: string[] = []
      
      for (const area of this.customizationAreas.values()) {
        if (area.currentCustomization) {
          customizations.push(`${area.component}_${area.currentCustomization.type}_${area.currentCustomization.value}`)
        }
      }
      
      // Save to local storage (pet collection)
      const savedPets = JSON.parse(localStorage.getItem('robo_pet_collection') || '[]')
      
      // Create pet data for collection
      const petData = {
        id: this.currentPet.id,
        name: this.currentPet.name,
        type: this.currentPet.type,
        customizations: this.currentPet.customizations,
        completedAt: new Date().toISOString(),
        repairTime: this.progress.timeElapsed
      }
      
      savedPets.push(petData)
      localStorage.setItem('robo_pet_collection', JSON.stringify(savedPets))
      
      // Record customization completion with progress manager
      this.progressManager.recordCustomizationCompleted(this.progress.timeElapsed, customizations)
      
      // Mark as complete
      this.progress.isComplete = true
      
      console.log('Customizations saved!', {
        petId: this.currentPet.id,
        customizations: customizations.length,
        gemsSpent: this.progress.roboGemsSpent,
        timeElapsed: Math.round(this.progress.timeElapsed / 1000)
      })
      
      // Play save sound
      if (this.audioManager) {
        try {
          this.audioManager.playSound('customization_save', { volume: 0.8 })
        } catch (error) {
          console.warn('Audio playback failed:', error)
        }
      }
      
      // TODO: Transition to photo booth or menu
      // This would be handled by the StateManager
      
    } catch (error) {
      console.error('Failed to save customizations:', error)
      
      // Re-throw for test detection
      throw error
    }
  }

  /**
   * Reset all customizations
   */
  private resetCustomizations(): void {
    if (!this.currentPet) return
    
    // Remove customizations from components
    for (const component of this.currentPet.components.values()) {
      component.removeCustomization()
    }
    
    // Clear pet's customization list
    this.currentPet.customizations.splice(0)
    
    // Reset areas
    for (const area of this.customizationAreas.values()) {
      area.currentCustomization = undefined
    }
    
    // Reset progress
    this.progress.appliedCustomizations = 0
    this.progress.roboGemsSpent = 0
    
    // Play reset sound
    if (this.audioManager) {
      try {
        this.audioManager.playSound('reset', { volume: 0.5 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
    
    console.log('Customizations reset')
  }
  
  /**
   * Go back to previous state
   */
  private goBack(): void {
    // TODO: Transition back to repair state or menu
    console.log('Going back from customization')
    
    if (this.audioManager) {
      try {
        this.audioManager.playSound('button_click', { volume: 0.5 })
      } catch (error) {
        console.warn('Audio playback failed:', error)
      }
    }
  }
  
  // Helper methods
  
  private getAgeAppropriateColorName(): string {
    switch (this.ageGroup) {
      case AgeGroup.YOUNG: return 'Soft Colors'
      case AgeGroup.MIDDLE: return 'Bright Colors'
      case AgeGroup.OLDER: return 'Bold Colors'
      default: return 'Special Colors'
    }
  }
  
  private getAgeAppropriateColors(): string[] {
    switch (this.ageGroup) {
      case AgeGroup.YOUNG:
        return ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E6B3FF', '#FFB3E6', '#C9FFB3']
      case AgeGroup.MIDDLE:
        return ['#FF5722', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#CDDC39', '#E91E63']
      case AgeGroup.OLDER:
        return ['#B71C1C', '#0D47A1', '#1B5E20', '#E65100', '#4A148C', '#006064', '#827717', '#880E4F']
      default:
        return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    }
  }
  
  private getAccessoryUnlockStatus(category: 'basic' | 'premium' | 'special'): boolean {
    switch (category) {
      case 'basic': return true
      case 'premium': return this.progress.appliedCustomizations >= 2
      case 'special': return this.progress.appliedCustomizations >= 5
      default: return false
    }
  }
  
  private getAccessoryCost(category: 'basic' | 'premium' | 'special'): number {
    switch (category) {
      case 'basic': return 0
      case 'premium': return 10
      case 'special': return 25
      default: return 0
    }
  }
  
  private getComponentCustomizationBounds(componentType: ComponentType, position: Vector2D): { x: number, y: number, width: number, height: number } {
    // Adjust bounds based on component type (similar to RepairState)
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
  
  private getAllowedCustomizations(componentType: ComponentType): ('color' | 'accessory' | 'pattern')[] {
    switch (componentType) {
      case ComponentType.CHASSIS_PLATING:
        return ['color', 'pattern']
      case ComponentType.SENSOR_ARRAY:
        return ['color', 'accessory']
      default:
        return ['color']
    }
  }
  
  private getColorIndexAtPoint(x: number, y: number): number {
    // Calculate which color was clicked based on palette layout
    if (!this.isPointInBounds(x, y, this.colorPalette)) return -1
    
    const relativeX = x - this.colorPalette.x
    const relativeY = y - this.colorPalette.y
    
    const colorsPerRow = 4
    const colorSize = 40
    const padding = 10
    
    const col = Math.floor(relativeX / (colorSize + padding))
    const row = Math.floor(relativeY / (colorSize + padding))
    
    const index = row * colorsPerRow + col
    
    const currentPalette = this.colorPalettes.find(p => p.isUnlocked) || this.colorPalettes[0]
    return index < currentPalette.colors.length ? index : -1
  }
  
  private getAccessoryIndexAtPoint(x: number, y: number): number {
    // Calculate which accessory was clicked
    if (!this.isPointInBounds(x, y, this.accessoryPanel)) return -1
    
    const relativeY = y - this.accessoryPanel.y
    const itemHeight = 50
    const padding = 10
    
    const index = Math.floor(relativeY / (itemHeight + padding))
    const unlockedAccessories = this.accessories.filter(a => a.isUnlocked)
    
    return index < unlockedAccessories.length ? index : -1
  }
  
  private isPointInPanelTab(x: number, y: number, panel: 'colors' | 'accessories' | 'preview'): boolean {
    const tabWidth = 80
    const tabHeight = 30
    const tabY = 120
    
    let tabX: number
    switch (panel) {
      case 'colors': tabX = 20; break
      case 'accessories': tabX = 110; break
      case 'preview': tabX = 200; break
      default: return false
    }
    
    return x >= tabX && x <= tabX + tabWidth && y >= tabY && y <= tabY + tabHeight
  }
  
  private switchPanel(): void {
    const panels: ('colors' | 'accessories' | 'preview')[] = ['colors', 'accessories', 'preview']
    const currentIndex = panels.indexOf(this.currentPanel)
    this.currentPanel = panels[(currentIndex + 1) % panels.length]
  }
  
  private isPointInBounds(x: number, y: number, bounds: { x: number, y: number, width: number, height: number }): boolean {
    return x >= bounds.x && x <= bounds.x + bounds.width && 
           y >= bounds.y && y <= bounds.y + bounds.height
  }
  
  private updateAnimations(deltaTime: number): void {
    // Update any UI animations here
  }
  
  private updateProgress(): void {
    // Update progress tracking
    this.progress.totalCustomizations = this.customizationAreas.size
  }
  
  private showInitialGuidance(): void {
    // Show initial guidance for customization
    console.log('Welcome to customization! Select a tool and start personalizing your pet!')
  }
  
  // Rendering methods
  
  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#E8F5E8')
    gradient.addColorStop(1, '#F0F8FF')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  private drawPetPreview(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.currentPet) return
    
    // Draw preview area background
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(this.previewArea.x, this.previewArea.y, this.previewArea.width, this.previewArea.height, 15)
    ctx.fill()
    
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw pet representation (simplified)
    const centerX = this.previewArea.x + this.previewArea.width / 2
    const centerY = this.previewArea.y + this.previewArea.height / 2
    
    // Draw pet body
    ctx.fillStyle = '#4ECDC4'
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, 60, 80, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw customization areas
    for (const area of this.customizationAreas.values()) {
      this.drawCustomizationArea(ctx, area, centerX, centerY)
    }
    
    ctx.restore()
  }
  
  private drawCustomizationArea(ctx: CanvasRenderingContext2D, area: CustomizationArea, offsetX: number, offsetY: number): void {
    const x = offsetX + area.bounds.x - 200 // Adjust for preview area
    const y = offsetY + area.bounds.y - 200
    
    // Draw area background
    if (area.currentCustomization?.type === 'color') {
      ctx.fillStyle = area.currentCustomization.value
    } else {
      ctx.fillStyle = area.isHighlighted ? 'rgba(255, 255, 0, 0.3)' : 'rgba(200, 200, 200, 0.3)'
    }
    
    ctx.beginPath()
    ctx.roundRect(x, y, area.bounds.width, area.bounds.height, 5)
    ctx.fill()
    
    // Draw accessory if present
    if (area.currentCustomization?.type === 'accessory') {
      try {
        const accessoryData = JSON.parse(area.currentCustomization.value)
        ctx.font = '20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(accessoryData.icon, x + area.bounds.width / 2, y + area.bounds.height / 2)
      } catch (error) {
        console.warn('Failed to parse accessory data:', error)
      }
    }
    
    // Draw highlight border
    if (area.isHighlighted) {
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(x, y, area.bounds.width, area.bounds.height, 5)
      ctx.stroke()
    }
  }
  
  private drawCustomizationPanels(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw panel tabs
    this.drawPanelTabs(ctx)
    
    // Draw current panel content
    switch (this.currentPanel) {
      case 'colors':
        this.drawColorPalette(ctx)
        break
      case 'accessories':
        this.drawAccessoryPanel(ctx)
        break
      case 'preview':
        this.drawPreviewPanel(ctx)
        break
    }
  }
  
  private drawPanelTabs(ctx: CanvasRenderingContext2D): void {
    const tabs = [
      { id: 'colors', name: 'Colors', x: 20 },
      { id: 'accessories', name: 'Accessories', x: 110 },
      { id: 'preview', name: 'Preview', x: 200 }
    ]
    
    ctx.save()
    
    for (const tab of tabs) {
      const isActive = tab.id === this.currentPanel
      
      // Tab background
      ctx.fillStyle = isActive ? '#4CAF50' : '#E0E0E0'
      ctx.beginPath()
      ctx.roundRect(tab.x, 120, 80, 30, 5)
      ctx.fill()
      
      // Tab text
      ctx.fillStyle = isActive ? 'white' : '#333'
      ctx.font = '14px Comic Sans MS, cursive, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(tab.name, tab.x + 40, 140)
    }
    
    ctx.restore()
  }
  
  private drawColorPalette(ctx: CanvasRenderingContext2D): void {
    // Draw palette background
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(this.colorPalette.x, this.colorPalette.y, this.colorPalette.width, this.colorPalette.height, 10)
    ctx.fill()
    
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw colors
    const currentPalette = this.colorPalettes.find(p => p.isUnlocked) || this.colorPalettes[0]
    const colorsPerRow = 4
    const colorSize = 35
    const padding = 10
    
    currentPalette.colors.forEach((color, index) => {
      const row = Math.floor(index / colorsPerRow)
      const col = index % colorsPerRow
      const x = this.colorPalette.x + padding + col * (colorSize + padding)
      const y = this.colorPalette.y + padding + 30 + row * (colorSize + padding)
      
      // Color swatch
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x, y, colorSize, colorSize, 5)
      ctx.fill()
      
      // Selection border
      if (this.selectedColor === color) {
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(x - 2, y - 2, colorSize + 4, colorSize + 4, 7)
        ctx.stroke()
      }
    })
    
    // Palette title
    ctx.fillStyle = '#333'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(currentPalette.name, this.colorPalette.x + this.colorPalette.width / 2, this.colorPalette.y + 20)
    
    ctx.restore()
  }
  
  private drawAccessoryPanel(ctx: CanvasRenderingContext2D): void {
    // Draw panel background
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(this.accessoryPanel.x, this.accessoryPanel.y, this.accessoryPanel.width, this.accessoryPanel.height, 10)
    ctx.fill()
    
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw accessories
    const unlockedAccessories = this.accessories.filter(a => a.isUnlocked)
    const itemHeight = 45
    const padding = 10
    
    unlockedAccessories.forEach((accessory, index) => {
      const y = this.accessoryPanel.y + padding + 30 + index * (itemHeight + padding)
      
      // Item background
      const isSelected = this.selectedAccessory?.id === accessory.id
      ctx.fillStyle = isSelected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(240, 240, 240, 0.8)'
      ctx.beginPath()
      ctx.roundRect(this.accessoryPanel.x + padding, y, this.accessoryPanel.width - padding * 2, itemHeight, 5)
      ctx.fill()
      
      // Icon
      ctx.font = '24px Arial'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#333'
      ctx.fillText(accessory.icon, this.accessoryPanel.x + padding + 10, y + 30)
      
      // Name
      ctx.font = '12px Comic Sans MS, cursive, sans-serif'
      ctx.fillText(accessory.name, this.accessoryPanel.x + padding + 50, y + 20)
      
      // Cost
      if (accessory.roboGemCost > 0) {
        ctx.fillStyle = '#666'
        ctx.fillText(`💎 ${accessory.roboGemCost}`, this.accessoryPanel.x + padding + 50, y + 35)
      }
      
      // Selection border
      if (isSelected) {
        ctx.strokeStyle = '#4CAF50'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(this.accessoryPanel.x + padding, y, this.accessoryPanel.width - padding * 2, itemHeight, 5)
        ctx.stroke()
      }
    })
    
    // Panel title
    ctx.fillStyle = '#333'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Accessories', this.accessoryPanel.x + this.accessoryPanel.width / 2, this.accessoryPanel.y + 20)
    
    ctx.restore()
  }
  
  private drawPreviewPanel(ctx: CanvasRenderingContext2D): void {
    // Preview panel is drawn in drawPetPreview
    // This could show additional preview options or stats
  }
  
  private drawUI(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw customization tools
    this.drawCustomizationTools(ctx)
    
    // Draw progress info
    this.drawProgressInfo(ctx, width, height)
    
    // Draw buttons
    this.drawButtons(ctx)
  }
  
  private drawCustomizationTools(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    for (const tool of this.customizationTools) {
      // Tool background
      ctx.fillStyle = tool.isSelected ? '#4CAF50' : '#E0E0E0'
      ctx.beginPath()
      ctx.roundRect(tool.bounds.x, tool.bounds.y, tool.bounds.width, tool.bounds.height, 10)
      ctx.fill()
      
      // Tool border
      ctx.strokeStyle = tool.isSelected ? '#2E7D32' : '#BDBDBD'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(tool.bounds.x, tool.bounds.y, tool.bounds.width, tool.bounds.height, 10)
      ctx.stroke()
      
      // Tool icon
      ctx.font = '24px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = tool.isSelected ? 'white' : '#333'
      ctx.fillText(tool.icon, tool.bounds.x + tool.bounds.width / 2, tool.bounds.y + tool.bounds.height / 2 + 8)
      
      // Tool name
      ctx.font = '10px Comic Sans MS, cursive, sans-serif'
      ctx.fillText(tool.name, tool.bounds.x + tool.bounds.width / 2, tool.bounds.y + tool.bounds.height + 15)
    }
    
    ctx.restore()
  }
  
  private drawProgressInfo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    // Progress background
    const infoX = width - 250
    const infoY = 20
    const infoWidth = 220
    const infoHeight = 100
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(infoX, infoY, infoWidth, infoHeight, 10)
    ctx.fill()
    
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Progress text
    ctx.fillStyle = '#333'
    ctx.font = 'bold 14px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'left'
    
    ctx.fillText('Customization Progress', infoX + 10, infoY + 20)
    ctx.fillText(`Applied: ${this.progress.appliedCustomizations}`, infoX + 10, infoY + 40)
    ctx.fillText(`💎 Spent: ${this.progress.roboGemsSpent}`, infoX + 10, infoY + 60)
    ctx.fillText(`Time: ${Math.round(this.progress.timeElapsed / 1000)}s`, infoX + 10, infoY + 80)
    
    ctx.restore()
  }
  
  private drawButtons(ctx: CanvasRenderingContext2D): void {
    const buttons = [this.saveButton, this.resetButton, this.backButton].filter(Boolean) as ClickableElement[]
    
    ctx.save()
    
    for (const button of buttons) {
      // Button background
      let bgColor = '#4CAF50'
      if (button.id === 'reset_button') bgColor = '#FF9800'
      if (button.id === 'back_button') bgColor = '#607D8B'
      
      ctx.fillStyle = bgColor
      ctx.beginPath()
      ctx.roundRect(button.x, button.y, button.width, button.height, 8)
      ctx.fill()
      
      // Button border
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(button.x, button.y, button.width, button.height, 8)
      ctx.stroke()
      
      // Button text
      ctx.fillStyle = 'white'
      ctx.font = 'bold 14px Comic Sans MS, cursive, sans-serif'
      ctx.textAlign = 'center'
      
      let buttonText = 'Button'
      if (button.id === 'save_button') buttonText = '💾 Save'
      if (button.id === 'reset_button') buttonText = '🔄 Reset'
      if (button.id === 'back_button') buttonText = '← Back'
      
      ctx.fillText(buttonText, button.x + button.width / 2, button.y + button.height / 2 + 5)
    }
    
    ctx.restore()
  }
  
  private drawDebugInfo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    
    const debugInfo = [
      `Pet: ${this.currentPet?.name || 'None'}`,
      `Tool: ${this.selectedTool?.name || 'None'}`,
      `Color: ${this.selectedColor || 'None'}`,
      `Accessory: ${this.selectedAccessory?.name || 'None'}`,
      `Panel: ${this.currentPanel}`,
      `Customizations: ${this.progress.appliedCustomizations}`
    ]
    
    debugInfo.forEach((info, index) => {
      ctx.fillText(info, 10, height - 100 + index * 15)
    })
    
    ctx.restore()
  }
}