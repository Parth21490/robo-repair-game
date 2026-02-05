/**
 * Menu State - Main menu for the Robo-Pet Repair Shop
 * Child-friendly interface with large buttons and accessibility features
 * Includes age selection, settings panel, collection viewer, and daily streak system
 */

import { BaseGameState } from '@/engine/GameState'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent } from '@/input/InputHandler'
import { AudioManager } from '@/audio/AudioManager'

export interface MenuButton {
  x: number
  y: number
  width: number
  height: number
  text: string
  icon?: string
  action: () => void
  isHovered: boolean
  isEnabled: boolean
  color?: string
}

export interface AgeGroup {
  id: string
  name: string
  range: string
  description: string
  color: string
  icon: string
}

export interface DailyStreak {
  currentStreak: number
  lastPlayDate: string
  totalDays: number
  bonusAvailable: boolean
  streakRewards: number[]
}

export interface PlayerProgress {
  selectedAge?: AgeGroup
  totalRepairs: number
  roboGemsEarned: number
  unlockedPets: string[]
  achievements: string[]
  dailyStreak: DailyStreak
  settings: {
    masterVolume: number
    sfxVolume: number
    musicVolume: number
    hapticFeedback: boolean
    highContrast: boolean
    reducedMotion: boolean
    keyboardNavigation: boolean
  }
}

export type MenuPanel = 'main' | 'age_selection' | 'settings' | 'collection' | 'daily_bonus'

export class MenuState extends BaseGameState {
  public readonly name = 'Menu'
  
  private currentPanel: MenuPanel = 'main'
  private buttons: MenuButton[] = []
  private audioManager?: AudioManager
  private playerProgress: PlayerProgress
  private animationTime: number = 0
  private selectedButtonIndex: number = 0 // For keyboard navigation
  
  // Age groups for difficulty scaling
  private ageGroups: AgeGroup[] = [
    {
      id: '3-5',
      name: 'Little Engineers',
      range: '3-5 years',
      description: 'Simple repairs with lots of help!',
      color: '#FF6B6B',
      icon: '🧸'
    },
    {
      id: '6-8',
      name: 'Junior Mechanics',
      range: '6-8 years',
      description: 'Fun challenges with guided hints!',
      color: '#4ECDC4',
      icon: '🔧'
    },
    {
      id: '9-12',
      name: 'Expert Technicians',
      range: '9-12 years',
      description: 'Complex problems to solve!',
      color: '#45B7D1',
      icon: '⚙️'
    }
  ]
  
  constructor(audioManager?: AudioManager) {
    super()
    this.audioManager = audioManager
    this.playerProgress = this.loadPlayerProgress()
    this.checkDailyStreak()
  }
  
  protected onEnter(): void {
    console.log('Entered Menu State')
    this.currentPanel = 'main'
    this.setupMainMenuButtons()
    this.selectedButtonIndex = 0
  }
  
  protected onUpdate(deltaTime: number): void {
    this.animationTime += deltaTime
    
    // Update button animations and daily streak timer
    this.updateButtonAnimations(deltaTime)
    this.updateDailyStreakTimer()
  }
  
  protected onRender(renderer: Renderer): void {
    const ctx = renderer.getContext()
    const { width, height } = ctx.canvas
    
    // Clear background with gradient
    this.drawBackground(ctx, width, height)
    
    // Render current panel
    switch (this.currentPanel) {
      case 'main':
        this.renderMainMenu(ctx, width, height)
        break
      case 'age_selection':
        this.renderAgeSelection(ctx, width, height)
        break
      case 'settings':
        this.renderSettings(ctx, width, height)
        break
      case 'collection':
        this.renderCollection(ctx, width, height)
        break
      case 'daily_bonus':
        this.renderDailyBonus(ctx, width, height)
        break
    }
    
    // Draw development info
    if (import.meta.env.DEV) {
      this.drawDebugInfo(ctx, width, height)
    }
  }
  
  protected onExit(): void {
    console.log('Exited Menu State')
    this.savePlayerProgress()
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
   * Handle pointer down events
   */
  private handlePointerDown(x: number, y: number): boolean {
    for (const button of this.buttons) {
      if (button.isEnabled && this.isPointInButton(x, y, button)) {
        this.playButtonSound()
        button.action()
        return true
      }
    }
    return false
  }
  
  /**
   * Handle pointer move events
   */
  private handlePointerMove(x: number, y: number): boolean {
    let hasHover = false
    this.buttons.forEach((button, index) => {
      const wasHovered = button.isHovered
      button.isHovered = button.isEnabled && this.isPointInButton(x, y, button)
      
      if (button.isHovered && !wasHovered) {
        this.selectedButtonIndex = index
        this.playHoverSound()
        hasHover = true
      }
    })
    return hasHover
  }
  
  /**
   * Handle keyboard input
   */
  private handleKeyDown(key: string): boolean {
    switch (key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        this.navigateButtons(-1)
        return true
      case 'ArrowDown':
      case 'ArrowRight':
        this.navigateButtons(1)
        return true
      case 'Enter':
      case ' ':
        if (this.buttons[this.selectedButtonIndex]?.isEnabled) {
          this.playButtonSound()
          this.buttons[this.selectedButtonIndex].action()
          return true
        }
        break
      case 'Escape':
        if (this.currentPanel !== 'main') {
          this.showMainMenu()
          return true
        }
        break
      case 'Tab':
        this.navigateButtons(1)
        return true
    }
    return false
  }
  
  /**
   * Navigate between buttons with keyboard
   */
  private navigateButtons(direction: number): void {
    if (this.buttons.length === 0) return
    
    const enabledButtons = this.buttons.map((button, index) => ({ button, index }))
      .filter(item => item.button.isEnabled)
    
    if (enabledButtons.length === 0) return
    
    const currentEnabledIndex = enabledButtons.findIndex(item => item.index === this.selectedButtonIndex)
    let newEnabledIndex = currentEnabledIndex + direction
    
    if (newEnabledIndex < 0) {
      newEnabledIndex = enabledButtons.length - 1
    } else if (newEnabledIndex >= enabledButtons.length) {
      newEnabledIndex = 0
    }
    
    this.selectedButtonIndex = enabledButtons[newEnabledIndex].index
    this.updateButtonHoverStates()
    this.playHoverSound()
  }
  
  /**
   * Update button hover states based on selected index
   */
  private updateButtonHoverStates(): void {
    this.buttons.forEach((button, index) => {
      button.isHovered = index === this.selectedButtonIndex && button.isEnabled
    })
  }
  
  /**
   * Draw background with gradient
   */
  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Create animated gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    const time = this.animationTime * 0.001
    
    if (this.playerProgress.settings.highContrast) {
      gradient.addColorStop(0, '#FFFFFF')
      gradient.addColorStop(1, '#F0F0F0')
    } else {
      const hue1 = (Math.sin(time * 0.5) * 30 + 200) % 360
      const hue2 = (hue1 + 60) % 360
      gradient.addColorStop(0, `hsl(${hue1}, 70%, 85%)`)
      gradient.addColorStop(1, `hsl(${hue2}, 60%, 90%)`)
    }
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // Add floating robot icons for decoration
    if (!this.playerProgress.settings.reducedMotion) {
      this.drawFloatingDecorations(ctx, width, height)
    }
  }
  
  /**
   * Draw floating decorative elements
   */
  private drawFloatingDecorations(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const time = this.animationTime * 0.001
    const decorations = ['🤖', '⚙️', '🔧', '⭐', '💎']
    
    for (let i = 0; i < 8; i++) {
      const x = (Math.sin(time * 0.3 + i) * 0.1 + 0.5) * width
      const y = (Math.cos(time * 0.2 + i * 1.5) * 0.1 + 0.5) * height
      const scale = Math.sin(time * 0.4 + i * 2) * 0.3 + 0.7
      
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.font = `${20 * scale}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(decorations[i % decorations.length], x, y)
      ctx.restore()
    }
  }
  
  /**
   * Render main menu
   */
  private renderMainMenu(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw title
    this.drawTitle(ctx, width, height)
    
    // Draw daily streak indicator
    this.drawDailyStreakIndicator(ctx, width, height)
    
    // Draw buttons
    this.buttons.forEach(button => {
      this.drawButton(ctx, button)
    })
    
    // Draw player info
    this.drawPlayerInfo(ctx, width, height)
  }
  
  /**
   * Draw game title
   */
  private drawTitle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    
    // Title shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.font = 'bold 48px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🤖 Robo-Pet Repair Shop', width / 2 + 3, height * 0.15 + 3)
    
    // Title text
    const gradient = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.2)
    gradient.addColorStop(0, '#2C3E50')
    gradient.addColorStop(1, '#34495E')
    ctx.fillStyle = gradient
    ctx.fillText('🤖 Robo-Pet Repair Shop', width / 2, height * 0.15)
    
    // Subtitle
    ctx.fillStyle = this.playerProgress.settings.highContrast ? '#000000' : '#7F8C8D'
    ctx.font = 'bold 24px Comic Sans MS, cursive, sans-serif'
    ctx.fillText('Fix, Customize, and Play!', width / 2, height * 0.22)
    
    ctx.restore()
  }
  
  /**
   * Draw daily streak indicator
   */
  private drawDailyStreakIndicator(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const streak = this.playerProgress.dailyStreak
    if (streak.currentStreak === 0) return
    
    const x = width - 200
    const y = 50
    
    ctx.save()
    
    // Background
    ctx.fillStyle = streak.bonusAvailable ? '#FFD700' : '#E74C3C'
    ctx.beginPath()
    ctx.roundRect(x, y, 180, 60, 15)
    ctx.fill()
    
    // Border
    ctx.strokeStyle = streak.bonusAvailable ? '#FFA500' : '#C0392B'
    ctx.lineWidth = 3
    ctx.stroke()
    
    // Text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`🔥 ${streak.currentStreak} Day Streak!`, x + 90, y + 25)
    
    if (streak.bonusAvailable) {
      ctx.fillText('Bonus Ready!', x + 90, y + 45)
    } else {
      ctx.fillText('Keep it up!', x + 90, y + 45)
    }
    
    ctx.restore()
    
    // Make it clickable if bonus is available
    if (streak.bonusAvailable) {
      // Add to buttons for interaction
      const bonusButton: MenuButton = {
        x, y, width: 180, height: 60,
        text: 'Daily Bonus',
        action: () => this.showDailyBonus(),
        isHovered: false,
        isEnabled: true,
        color: '#FFD700'
      }
      
      // Check if already in buttons array
      if (!this.buttons.some(b => b.text === 'Daily Bonus')) {
        this.buttons.push(bonusButton)
      }
    }
  }
  
  /**
   * Draw player info
   */
  private drawPlayerInfo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const x = 20
    const y = height - 120
    
    ctx.save()
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(x, y, 250, 100, 10)
    ctx.fill()
    
    // Border
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Text
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 14px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'left'
    
    const ageText = this.playerProgress.selectedAge ? 
      `Age Group: ${this.playerProgress.selectedAge.name}` : 
      'Age Group: Not Selected'
    
    ctx.fillText(ageText, x + 15, y + 25)
    ctx.fillText(`Repairs: ${this.playerProgress.totalRepairs}`, x + 15, y + 45)
    ctx.fillText(`💎 Robo-Gems: ${this.playerProgress.roboGemsEarned}`, x + 15, y + 65)
    ctx.fillText(`🏆 Pets: ${this.playerProgress.unlockedPets.length}`, x + 15, y + 85)
    
    ctx.restore()
  }
  
  /**
   * Set up main menu buttons
   */
  private setupMainMenuButtons(): void {
    const canvasWidth = 800 // Default width, will be adjusted by renderer
    const canvasHeight = 600 // Default height
    
    const buttonWidth = 300
    const buttonHeight = 80
    const buttonSpacing = 20
    const startY = canvasHeight * 0.4
    
    this.buttons = [
      {
        x: (canvasWidth - buttonWidth) / 2,
        y: startY,
        width: buttonWidth,
        height: buttonHeight,
        text: this.playerProgress.selectedAge ? '🎮 Start Game' : '👶 Choose Age First',
        action: () => this.startGame(),
        isHovered: false,
        isEnabled: true,
        color: this.playerProgress.selectedAge ? '#4CAF50' : '#FF9800'
      },
      {
        x: (canvasWidth - buttonWidth) / 2,
        y: startY + buttonHeight + buttonSpacing,
        width: buttonWidth,
        height: buttonHeight,
        text: '📚 My Collection',
        action: () => this.showCollection(),
        isHovered: false,
        isEnabled: true,
        color: '#9C27B0'
      },
      {
        x: (canvasWidth - buttonWidth) / 2,
        y: startY + (buttonHeight + buttonSpacing) * 2,
        width: buttonWidth,
        height: buttonHeight,
        text: '⚙️ Settings',
        action: () => this.showSettings(),
        isHovered: false,
        isEnabled: true,
        color: '#607D8B'
      },
      {
        x: (canvasWidth - buttonWidth) / 2,
        y: startY + (buttonHeight + buttonSpacing) * 3,
        width: buttonWidth,
        height: buttonHeight,
        text: '👶 Age Selection',
        action: () => this.showAgeSelection(),
        isHovered: false,
        isEnabled: true,
        color: '#FF5722'
      }
    ]
  }
  
  /**
   * Draw a menu button with enhanced styling
   */
  private drawButton(ctx: CanvasRenderingContext2D, button: MenuButton): void {
    ctx.save()
    
    // Button shadow (if not hovered and not disabled)
    if (!button.isHovered && button.isEnabled) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.roundRect(button.x + 4, button.y + 4, button.width, button.height, 15)
      ctx.fill()
    }
    
    // Button background
    let gradient: CanvasGradient
    if (!button.isEnabled) {
      gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height)
      gradient.addColorStop(0, '#BDC3C7')
      gradient.addColorStop(1, '#95A5A6')
    } else if (button.isHovered || (this.selectedButtonIndex === this.buttons.indexOf(button))) {
      gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height)
      const baseColor = button.color || '#4CAF50'
      gradient.addColorStop(0, this.lightenColor(baseColor, 20))
      gradient.addColorStop(1, baseColor)
    } else {
      gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height)
      const baseColor = button.color || '#4CAF50'
      gradient.addColorStop(0, baseColor)
      gradient.addColorStop(1, this.darkenColor(baseColor, 10))
    }
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, 15)
    ctx.fill()
    
    // Button border
    ctx.strokeStyle = button.isEnabled ? 
      (button.isHovered ? '#FFFFFF' : this.darkenColor(button.color || '#4CAF50', 20)) : 
      '#7F8C8D'
    ctx.lineWidth = button.isHovered || (this.selectedButtonIndex === this.buttons.indexOf(button)) ? 4 : 2
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, 15)
    ctx.stroke()
    
    // Button text
    ctx.fillStyle = button.isEnabled ? 'white' : '#7F8C8D'
    ctx.font = 'bold 20px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Text shadow for enabled buttons
    if (button.isEnabled) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 2
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
    }
    
    ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2)
    
    // Focus indicator for keyboard navigation
    if (this.selectedButtonIndex === this.buttons.indexOf(button) && button.isEnabled) {
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      
      // Use setLineDash if available (not available in some test environments)
      if (ctx.setLineDash) {
        ctx.setLineDash([5, 5])
      }
      
      ctx.beginPath()
      ctx.roundRect(button.x - 3, button.y - 3, button.width + 6, button.height + 6, 18)
      ctx.stroke()
      
      if (ctx.setLineDash) {
        ctx.setLineDash([])
      }
    }
    
    ctx.restore()
  }
  
  /**
   * Render age selection panel
   */
  private renderAgeSelection(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw title
    ctx.save()
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 36px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Choose Your Age Group', width / 2, height * 0.15)
    
    ctx.fillStyle = '#7F8C8D'
    ctx.font = 'bold 18px Comic Sans MS, cursive, sans-serif'
    ctx.fillText('This helps us make the game just right for you!', width / 2, height * 0.22)
    ctx.restore()
    
    // Draw age group buttons
    const buttonWidth = 280
    const buttonHeight = 120
    const spacing = 40
    const startX = (width - (buttonWidth * 3 + spacing * 2)) / 2
    const startY = height * 0.35
    
    this.ageGroups.forEach((ageGroup, index) => {
      const x = startX + (buttonWidth + spacing) * index
      const y = startY
      
      const isSelected = this.playerProgress.selectedAge?.id === ageGroup.id
      const isHovered = this.buttons.some(b => b.text.includes(ageGroup.name) && b.isHovered)
      
      // Draw age group card
      this.drawAgeGroupCard(ctx, ageGroup, x, y, buttonWidth, buttonHeight, isSelected, isHovered)
    })
    
    // Draw back button
    this.drawBackButton(ctx, width, height)
  }
  
  /**
   * Draw age group card
   */
  private drawAgeGroupCard(
    ctx: CanvasRenderingContext2D, 
    ageGroup: AgeGroup, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    isSelected: boolean, 
    isHovered: boolean
  ): void {
    ctx.save()
    
    // Card shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.roundRect(x + 4, y + 4, width, height, 20)
    ctx.fill()
    
    // Card background
    const gradient = ctx.createLinearGradient(x, y, x, y + height)
    if (isSelected) {
      gradient.addColorStop(0, this.lightenColor(ageGroup.color, 30))
      gradient.addColorStop(1, ageGroup.color)
    } else if (isHovered) {
      gradient.addColorStop(0, this.lightenColor(ageGroup.color, 20))
      gradient.addColorStop(1, this.lightenColor(ageGroup.color, 10))
    } else {
      gradient.addColorStop(0, this.lightenColor(ageGroup.color, 10))
      gradient.addColorStop(1, ageGroup.color)
    }
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 20)
    ctx.fill()
    
    // Card border
    ctx.strokeStyle = isSelected ? '#FFD700' : (isHovered ? '#FFFFFF' : this.darkenColor(ageGroup.color, 20))
    ctx.lineWidth = isSelected ? 4 : 2
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 20)
    ctx.stroke()
    
    // Icon
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'white'
    ctx.fillText(ageGroup.icon, x + width / 2, y + 50)
    
    // Name
    ctx.font = 'bold 20px Comic Sans MS, cursive, sans-serif'
    ctx.fillText(ageGroup.name, x + width / 2, y + 80)
    
    // Age range
    ctx.font = 'bold 16px Comic Sans MS, cursive, sans-serif'
    ctx.fillText(ageGroup.range, x + width / 2, y + 100)
    
    // Description
    ctx.font = '14px Comic Sans MS, cursive, sans-serif'
    ctx.fillText(ageGroup.description, x + width / 2, y + 120)
    
    // Selected indicator
    if (isSelected) {
      ctx.font = '24px Arial'
      ctx.fillText('✓', x + width - 30, y + 30)
    }
    
    ctx.restore()
  }
  
  /**
   * Render settings panel
   */
  private renderSettings(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw title
    ctx.save()
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 36px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚙️ Settings', width / 2, height * 0.12)
    ctx.restore()
    
    // Draw settings sections
    this.drawVolumeControls(ctx, width, height)
    this.drawAccessibilityControls(ctx, width, height)
    
    // Draw back button
    this.drawBackButton(ctx, width, height)
  }
  
  /**
   * Draw volume controls
   */
  private drawVolumeControls(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const sectionX = width * 0.1
    const sectionY = height * 0.25
    const sectionWidth = width * 0.35
    const sectionHeight = height * 0.5
    
    // Section background
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(sectionX, sectionY, sectionWidth, sectionHeight, 15)
    ctx.fill()
    
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Section title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 24px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🔊 Volume', sectionX + sectionWidth / 2, sectionY + 40)
    
    // Volume sliders
    const sliders = [
      { label: 'Master Volume', value: this.playerProgress.settings.masterVolume, key: 'masterVolume' },
      { label: 'Sound Effects', value: this.playerProgress.settings.sfxVolume, key: 'sfxVolume' },
      { label: 'Music', value: this.playerProgress.settings.musicVolume, key: 'musicVolume' }
    ]
    
    sliders.forEach((slider, index) => {
      const sliderY = sectionY + 80 + index * 80
      this.drawVolumeSlider(ctx, sectionX + 20, sliderY, sectionWidth - 40, slider.label, slider.value, slider.key)
    })
    
    ctx.restore()
  }
  
  /**
   * Draw accessibility controls
   */
  private drawAccessibilityControls(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const sectionX = width * 0.55
    const sectionY = height * 0.25
    const sectionWidth = width * 0.35
    const sectionHeight = height * 0.5
    
    // Section background
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(sectionX, sectionY, sectionWidth, sectionHeight, 15)
    ctx.fill()
    
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Section title
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 24px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('♿ Accessibility', sectionX + sectionWidth / 2, sectionY + 40)
    
    // Accessibility toggles
    const toggles = [
      { label: 'Haptic Feedback', value: this.playerProgress.settings.hapticFeedback, key: 'hapticFeedback' },
      { label: 'High Contrast', value: this.playerProgress.settings.highContrast, key: 'highContrast' },
      { label: 'Reduced Motion', value: this.playerProgress.settings.reducedMotion, key: 'reducedMotion' },
      { label: 'Keyboard Navigation', value: this.playerProgress.settings.keyboardNavigation, key: 'keyboardNavigation' }
    ]
    
    toggles.forEach((toggle, index) => {
      const toggleY = sectionY + 80 + index * 60
      this.drawToggleSwitch(ctx, sectionX + 20, toggleY, sectionWidth - 40, toggle.label, toggle.value, toggle.key)
    })
    
    ctx.restore()
  }
  
  /**
   * Draw volume slider
   */
  private drawVolumeSlider(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    label: string, 
    value: number, 
    key: string
  ): void {
    ctx.save()
    
    // Label
    ctx.fillStyle = '#2C3E50'
    ctx.font = '16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(label, x, y)
    
    // Slider track
    const trackY = y + 20
    const trackHeight = 8
    ctx.fillStyle = '#BDC3C7'
    ctx.beginPath()
    ctx.roundRect(x, trackY, width, trackHeight, 4)
    ctx.fill()
    
    // Slider fill
    const fillWidth = width * value
    ctx.fillStyle = '#3498DB'
    ctx.beginPath()
    ctx.roundRect(x, trackY, fillWidth, trackHeight, 4)
    ctx.fill()
    
    // Slider handle
    const handleX = x + fillWidth - 8
    const handleY = trackY - 4
    ctx.fillStyle = '#2980B9'
    ctx.beginPath()
    ctx.roundRect(handleX, handleY, 16, 16, 8)
    ctx.fill()
    
    // Value text
    ctx.fillStyle = '#7F8C8D'
    ctx.font = '14px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(value * 100)}%`, x + width, y)
    
    ctx.restore()
  }
  
  /**
   * Draw toggle switch
   */
  private drawToggleSwitch(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    label: string, 
    value: boolean, 
    key: string
  ): void {
    ctx.save()
    
    // Label
    ctx.fillStyle = '#2C3E50'
    ctx.font = '16px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(label, x, y)
    
    // Toggle background
    const toggleX = x + width - 60
    const toggleY = y + 10
    const toggleWidth = 50
    const toggleHeight = 25
    
    ctx.fillStyle = value ? '#4CAF50' : '#BDC3C7'
    ctx.beginPath()
    ctx.roundRect(toggleX, toggleY, toggleWidth, toggleHeight, 12.5)
    ctx.fill()
    
    // Toggle handle
    const handleX = value ? toggleX + toggleWidth - 20 : toggleX + 3
    const handleY = toggleY + 2.5
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.roundRect(handleX, handleY, 20, 20, 10)
    ctx.fill()
    
    // Status text
    ctx.fillStyle = '#7F8C8D'
    ctx.font = '14px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(value ? 'ON' : 'OFF', toggleX - 10, y)
    
    ctx.restore()
  }
  
  /**
   * Render collection viewer
   */
  private renderCollection(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw title
    ctx.save()
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 36px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('📚 My Pet Collection', width / 2, height * 0.12)
    
    // Draw collection stats
    ctx.fillStyle = '#7F8C8D'
    ctx.font = 'bold 18px Comic Sans MS, cursive, sans-serif'
    const statsText = `${this.playerProgress.unlockedPets.length} pets collected • ${this.playerProgress.totalRepairs} repairs completed`
    ctx.fillText(statsText, width / 2, height * 0.18)
    ctx.restore()
    
    // Draw pet grid
    this.drawPetGrid(ctx, width, height)
    
    // Draw back button
    this.drawBackButton(ctx, width, height)
  }
  
  /**
   * Draw pet collection grid
   */
  private drawPetGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gridStartX = width * 0.1
    const gridStartY = height * 0.25
    const gridWidth = width * 0.8
    const gridHeight = height * 0.5
    
    const cols = 4
    const rows = 3
    const petWidth = (gridWidth - (cols - 1) * 20) / cols
    const petHeight = (gridHeight - (rows - 1) * 20) / rows
    
    // Draw pet slots
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = gridStartX + col * (petWidth + 20)
        const y = gridStartY + row * (petHeight + 20)
        const petIndex = row * cols + col
        
        this.drawPetSlot(ctx, x, y, petWidth, petHeight, petIndex)
      }
    }
  }
  
  /**
   * Draw individual pet slot
   */
  private drawPetSlot(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    petIndex: number
  ): void {
    ctx.save()
    
    const hasUnlocked = petIndex < this.playerProgress.unlockedPets.length
    
    // Slot background
    ctx.fillStyle = hasUnlocked ? 'rgba(76, 175, 80, 0.1)' : 'rgba(189, 195, 199, 0.3)'
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 15)
    ctx.fill()
    
    // Slot border
    ctx.strokeStyle = hasUnlocked ? '#4CAF50' : '#BDC3C7'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 15)
    ctx.stroke()
    
    if (hasUnlocked) {
      // Draw pet icon/image
      ctx.font = '48px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#4CAF50'
      const petEmojis = ['🐕', '🐱', '🐦', '🐉', '🦎', '🐢', '🦔', '🐰', '🐭', '🐸', '🦊', '🐺']
      ctx.fillText(petEmojis[petIndex % petEmojis.length], x + width / 2, y + height / 2 - 10)
      
      // Pet name
      ctx.font = 'bold 14px Comic Sans MS, cursive, sans-serif'
      ctx.fillStyle = '#2C3E50'
      ctx.fillText(`Pet #${petIndex + 1}`, x + width / 2, y + height - 20)
    } else {
      // Locked slot
      ctx.font = '32px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#BDC3C7'
      ctx.fillText('🔒', x + width / 2, y + height / 2 - 10)
      
      ctx.font = 'bold 12px Comic Sans MS, cursive, sans-serif'
      ctx.fillText('Locked', x + width / 2, y + height - 20)
    }
    
    ctx.restore()
  }
  
  /**
   * Render daily bonus panel
   */
  private renderDailyBonus(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw title
    ctx.save()
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 42px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🎉 Daily Bonus!', width / 2, height * 0.15)
    
    // Draw streak info
    ctx.fillStyle = '#E67E22'
    ctx.font = 'bold 24px Comic Sans MS, cursive, sans-serif'
    ctx.fillText(`${this.playerProgress.dailyStreak.currentStreak} Day Streak!`, width / 2, height * 0.25)
    ctx.restore()
    
    // Draw bonus reward
    this.drawBonusReward(ctx, width, height)
    
    // Draw claim button
    this.drawClaimButton(ctx, width, height)
    
    // Draw back button
    this.drawBackButton(ctx, width, height)
  }
  
  /**
   * Draw bonus reward display
   */
  private drawBonusReward(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2
    const centerY = height * 0.5
    const rewardSize = 120
    
    // Reward background
    ctx.save()
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(centerX, centerY, rewardSize, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.strokeStyle = '#FFA500'
    ctx.lineWidth = 6
    ctx.stroke()
    
    // Reward icon
    ctx.font = '64px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'white'
    ctx.fillText('💎', centerX, centerY + 20)
    
    // Reward amount
    const bonusAmount = Math.min(this.playerProgress.dailyStreak.currentStreak * 10, 100)
    ctx.font = 'bold 24px Comic Sans MS, cursive, sans-serif'
    ctx.fillStyle = '#2C3E50'
    ctx.fillText(`+${bonusAmount} Robo-Gems!`, centerX, centerY + 80)
    
    ctx.restore()
  }
  
  /**
   * Draw claim button
   */
  private drawClaimButton(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const buttonWidth = 200
    const buttonHeight = 60
    const buttonX = (width - buttonWidth) / 2
    const buttonY = height * 0.7
    
    const claimButton: MenuButton = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      text: '🎁 Claim Bonus',
      action: () => this.claimDailyBonus(),
      isHovered: false,
      isEnabled: true,
      color: '#FFD700'
    }
    
    this.drawButton(ctx, claimButton)
  }
  
  /**
   * Draw back button
   */
  private drawBackButton(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const backButton: MenuButton = {
      x: 20,
      y: height - 80,
      width: 120,
      height: 50,
      text: '← Back',
      action: () => this.showMainMenu(),
      isHovered: false,
      isEnabled: true,
      color: '#95A5A6'
    }
    
    this.drawButton(ctx, backButton)
  }
  
  /**
   * Check if a point is inside a button
   */
  private isPointInButton(x: number, y: number, button: MenuButton): boolean {
    return (
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height
    )
  }
  
  /**
   * Update button animations
   */
  private updateButtonAnimations(deltaTime: number): void {
    // Add subtle pulsing animation to hovered buttons
    if (!this.playerProgress.settings.reducedMotion) {
      // Animation logic can be added here
    }
  }
  
  /**
   * Update daily streak timer
   */
  private updateDailyStreakTimer(): void {
    const now = new Date()
    const today = now.toDateString()
    const lastPlay = new Date(this.playerProgress.dailyStreak.lastPlayDate)
    
    // Check if it's a new day
    if (today !== lastPlay.toDateString()) {
      const daysDiff = Math.floor((now.getTime() - lastPlay.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === 1) {
        // Consecutive day - maintain streak
        this.playerProgress.dailyStreak.bonusAvailable = true
      } else if (daysDiff > 1) {
        // Streak broken - reset
        this.playerProgress.dailyStreak.currentStreak = 0
        this.playerProgress.dailyStreak.bonusAvailable = false
      }
    }
  }
  
  /**
   * Color utility functions
   */
  private lightenColor(color: string, percent: number): string {
    // Simple color lightening - in a real implementation, you'd use a proper color library
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  }
  
  private darkenColor(color: string, percent: number): string {
    return this.lightenColor(color, -percent)
  }
  
  /**
   * Audio feedback methods
   */
  private playButtonSound(): void {
    if (this.audioManager) {
      this.audioManager.playSound('button_click', { volume: 0.7 })
      this.audioManager.playTactileAudio('repair_click', 60)
    }
  }
  
  private playHoverSound(): void {
    if (this.audioManager) {
      this.audioManager.playSound('button_hover', { volume: 0.3 })
      this.audioManager.playTactileAudio('soft', 30)
    }
  }
  
  /**
   * Debug info rendering
   */
  private drawDebugInfo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, height - 100, 300, 100)
    
    ctx.fillStyle = 'white'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    
    const debugInfo = [
      `Panel: ${this.currentPanel}`,
      `Selected: ${this.selectedButtonIndex}`,
      `Buttons: ${this.buttons.length}`,
      `Age: ${this.playerProgress.selectedAge?.name || 'None'}`,
      `Streak: ${this.playerProgress.dailyStreak.currentStreak}`,
      `Gems: ${this.playerProgress.roboGemsEarned}`,
      `Development Build`
    ]
    
    debugInfo.forEach((info, index) => {
      ctx.fillText(info, 10, height - 85 + index * 12)
    })
    
    ctx.restore()
  }
  
  /**
   * Panel navigation methods
   */
  private showMainMenu(): void {
    this.currentPanel = 'main'
    this.setupMainMenuButtons()
    this.selectedButtonIndex = 0
  }
  
  private showAgeSelection(): void {
    this.currentPanel = 'age_selection'
    this.setupAgeSelectionButtons()
    this.selectedButtonIndex = 0
  }
  
  private showSettings(): void {
    this.currentPanel = 'settings'
    this.setupSettingsButtons()
    this.selectedButtonIndex = 0
  }
  
  private showCollection(): void {
    this.currentPanel = 'collection'
    this.setupCollectionButtons()
    this.selectedButtonIndex = 0
  }
  
  private showDailyBonus(): void {
    this.currentPanel = 'daily_bonus'
    this.setupDailyBonusButtons()
    this.selectedButtonIndex = 0
  }
  
  /**
   * Setup buttons for different panels
   */
  private setupAgeSelectionButtons(): void {
    const canvasWidth = 800
    const canvasHeight = 600
    
    this.buttons = []
    
    // Age group buttons
    const buttonWidth = 280
    const buttonHeight = 120
    const spacing = 40
    const startX = (canvasWidth - (buttonWidth * 3 + spacing * 2)) / 2
    const startY = canvasHeight * 0.35
    
    this.ageGroups.forEach((ageGroup, index) => {
      const x = startX + (buttonWidth + spacing) * index
      const y = startY
      
      this.buttons.push({
        x, y, width: buttonWidth, height: buttonHeight,
        text: `${ageGroup.icon} ${ageGroup.name}`,
        action: () => this.selectAgeGroup(ageGroup),
        isHovered: false,
        isEnabled: true,
        color: ageGroup.color
      })
    })
    
    // Back button
    this.buttons.push({
      x: 20, y: canvasHeight - 80, width: 120, height: 50,
      text: '← Back',
      action: () => this.showMainMenu(),
      isHovered: false,
      isEnabled: true,
      color: '#95A5A6'
    })
  }
  
  private setupSettingsButtons(): void {
    this.buttons = [
      {
        x: 20, y: 500, width: 120, height: 50,
        text: '← Back',
        action: () => this.showMainMenu(),
        isHovered: false,
        isEnabled: true,
        color: '#95A5A6'
      }
    ]
    
    // Add interactive elements for sliders and toggles
    // This would be expanded with actual interactive controls
  }
  
  private setupCollectionButtons(): void {
    this.buttons = [
      {
        x: 20, y: 500, width: 120, height: 50,
        text: '← Back',
        action: () => this.showMainMenu(),
        isHovered: false,
        isEnabled: true,
        color: '#95A5A6'
      }
    ]
  }
  
  private setupDailyBonusButtons(): void {
    this.buttons = [
      {
        x: 300, y: 420, width: 200, height: 60,
        text: '🎁 Claim Bonus',
        action: () => this.claimDailyBonus(),
        isHovered: false,
        isEnabled: this.playerProgress.dailyStreak.bonusAvailable,
        color: '#FFD700'
      },
      {
        x: 20, y: 500, width: 120, height: 50,
        text: '← Back',
        action: () => this.showMainMenu(),
        isHovered: false,
        isEnabled: true,
        color: '#95A5A6'
      }
    ]
  }
  
  /**
   * Action handlers
   */
  private startGame(): void {
    if (!this.playerProgress.selectedAge) {
      this.showAgeSelection()
      return
    }
    
    console.log('Starting game with age group:', this.playerProgress.selectedAge.name)
    // TODO: Transition to diagnostic state
    alert(`Starting game for ${this.playerProgress.selectedAge.name}! 🤖`)
  }
  
  private selectAgeGroup(ageGroup: AgeGroup): void {
    this.playerProgress.selectedAge = ageGroup
    this.savePlayerProgress()
    this.playButtonSound()
    
    // Show confirmation and return to main menu
    setTimeout(() => {
      this.showMainMenu()
    }, 500)
    
    console.log('Selected age group:', ageGroup.name)
  }
  
  private claimDailyBonus(): void {
    if (!this.playerProgress.dailyStreak.bonusAvailable) return
    
    const bonusAmount = Math.min(this.playerProgress.dailyStreak.currentStreak * 10, 100)
    this.playerProgress.roboGemsEarned += bonusAmount
    this.playerProgress.dailyStreak.bonusAvailable = false
    this.playerProgress.dailyStreak.lastPlayDate = new Date().toISOString()
    this.playerProgress.dailyStreak.currentStreak += 1
    this.playerProgress.dailyStreak.totalDays += 1
    
    this.savePlayerProgress()
    this.playButtonSound()
    
    console.log(`Claimed daily bonus: ${bonusAmount} Robo-Gems!`)
    
    // Return to main menu after claiming
    setTimeout(() => {
      this.showMainMenu()
    }, 1000)
  }
  
  /**
   * Data persistence methods
   */
  private loadPlayerProgress(): PlayerProgress {
    try {
      const saved = localStorage.getItem('robo-pet-progress')
      if (saved) {
        const progress = JSON.parse(saved) as PlayerProgress
        
        // Ensure all required properties exist with defaults
        return {
          selectedAge: progress.selectedAge,
          totalRepairs: progress.totalRepairs || 0,
          roboGemsEarned: progress.roboGemsEarned || 0,
          unlockedPets: progress.unlockedPets || [],
          achievements: progress.achievements || [],
          dailyStreak: {
            currentStreak: progress.dailyStreak?.currentStreak || 0,
            lastPlayDate: progress.dailyStreak?.lastPlayDate || new Date().toISOString(),
            totalDays: progress.dailyStreak?.totalDays || 0,
            bonusAvailable: progress.dailyStreak?.bonusAvailable || false,
            streakRewards: progress.dailyStreak?.streakRewards || []
          },
          settings: {
            masterVolume: progress.settings?.masterVolume ?? 0.7,
            sfxVolume: progress.settings?.sfxVolume ?? 0.8,
            musicVolume: progress.settings?.musicVolume ?? 0.5,
            hapticFeedback: progress.settings?.hapticFeedback ?? true,
            highContrast: progress.settings?.highContrast ?? false,
            reducedMotion: progress.settings?.reducedMotion ?? false,
            keyboardNavigation: progress.settings?.keyboardNavigation ?? true
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load player progress:', error)
    }
    
    // Return default progress
    return {
      totalRepairs: 0,
      roboGemsEarned: 0,
      unlockedPets: [],
      achievements: [],
      dailyStreak: {
        currentStreak: 0,
        lastPlayDate: new Date().toISOString(),
        totalDays: 0,
        bonusAvailable: false,
        streakRewards: []
      },
      settings: {
        masterVolume: 0.7,
        sfxVolume: 0.8,
        musicVolume: 0.5,
        hapticFeedback: true,
        highContrast: false,
        reducedMotion: false,
        keyboardNavigation: true
      }
    }
  }
  
  private savePlayerProgress(): void {
    try {
      localStorage.setItem('robo-pet-progress', JSON.stringify(this.playerProgress))
    } catch (error) {
      console.error('Failed to save player progress:', error)
    }
  }
  
  private checkDailyStreak(): void {
    const now = new Date()
    const today = now.toDateString()
    const lastPlay = new Date(this.playerProgress.dailyStreak.lastPlayDate)
    const lastPlayDate = lastPlay.toDateString()
    
    if (today !== lastPlayDate) {
      const daysDiff = Math.floor((now.getTime() - lastPlay.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === 1) {
        // Consecutive day - bonus available
        this.playerProgress.dailyStreak.bonusAvailable = true
      } else if (daysDiff > 1) {
        // Streak broken - reset
        this.playerProgress.dailyStreak.currentStreak = 0
        this.playerProgress.dailyStreak.bonusAvailable = false
      }
      // If daysDiff === 0, it's the same day, no changes needed
    }
  }
}