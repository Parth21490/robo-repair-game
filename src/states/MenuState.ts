/**
 * Menu State - Main menu for the Robo-Pet Repair Shop
 * Child-friendly interface with large buttons and accessibility features
 */

import { BaseGameState } from '@/engine/GameState'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent } from '@/input/InputHandler'

export class MenuState extends BaseGameState {
  public readonly name = 'Menu'
  
  private buttons: Array<{
    x: number
    y: number
    width: number
    height: number
    text: string
    action: () => void
    isHovered: boolean
  }> = []
  
  protected onEnter(): void {
    console.log('Entered Menu State')
    this.setupButtons()
  }
  
  protected onUpdate(deltaTime: number): void {
    // Menu doesn't need complex updates
    // Could add button animations here
  }
  
  protected onRender(renderer: Renderer): void {
    const ctx = renderer.getContext()
    const { width, height } = ctx.canvas
    
    // Draw title
    ctx.save()
    ctx.fillStyle = '#2C3E50'
    ctx.font = 'bold 48px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Add shadow for title
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    
    ctx.fillText('🤖 Robo-Pet Repair Shop', width / 2, height * 0.2)
    ctx.restore()
    
    // Draw subtitle
    ctx.save()
    ctx.fillStyle = '#34495E'
    ctx.font = 'bold 24px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Fix, Customize, and Play!', width / 2, height * 0.3)
    ctx.restore()
    
    // Draw buttons
    this.buttons.forEach(button => {
      this.drawButton(ctx, button)
    })
    
    // Draw version info in development
    if (import.meta.env.DEV) {
      ctx.save()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('Development Build', 10, height - 20)
      ctx.restore()
    }
  }
  
  protected onExit(): void {
    console.log('Exited Menu State')
  }
  
  protected onHandleInput(input: InputEvent): boolean {
    if (input.type === 'pointer_down' && input.x !== undefined && input.y !== undefined) {
      // Check button clicks
      for (const button of this.buttons) {
        if (this.isPointInButton(input.x, input.y, button)) {
          button.action()
          return true
        }
      }
    }
    
    if (input.type === 'pointer_move' && input.x !== undefined && input.y !== undefined) {
      // Update button hover states
      this.buttons.forEach(button => {
        button.isHovered = this.isPointInButton(input.x!, input.y!, button)
      })
      return true
    }
    
    if (input.type === 'key_down') {
      switch (input.key) {
        case 'Enter':
        case ' ':
          // Activate first button (Start Game)
          if (this.buttons.length > 0) {
            this.buttons[0].action()
            return true
          }
          break
      }
    }
    
    return false
  }
  
  /**
   * Set up menu buttons
   */
  private setupButtons(): void {
    const canvasWidth = 800 // Default width, will be adjusted by renderer
    const canvasHeight = 600 // Default height
    
    const buttonWidth = 300
    const buttonHeight = 80
    const buttonSpacing = 20
    const startY = canvasHeight * 0.45
    
    this.buttons = [
      {
        x: (canvasWidth - buttonWidth) / 2,
        y: startY,
        width: buttonWidth,
        height: buttonHeight,
        text: '🎮 Start Game',
        action: () => this.startGame(),
        isHovered: false,
      },
      {
        x: (canvasWidth - buttonWidth) / 2,
        y: startY + buttonHeight + buttonSpacing,
        width: buttonWidth,
        height: buttonHeight,
        text: '⚙️ Settings',
        action: () => this.openSettings(),
        isHovered: false,
      },
      {
        x: (canvasWidth - buttonWidth) / 2,
        y: startY + (buttonHeight + buttonSpacing) * 2,
        width: buttonWidth,
        height: buttonHeight,
        text: '📚 How to Play',
        action: () => this.showInstructions(),
        isHovered: false,
      },
    ]
  }
  
  /**
   * Draw a menu button
   */
  private drawButton(ctx: CanvasRenderingContext2D, button: any): void {
    ctx.save()
    
    // Button shadow
    if (!button.isHovered) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.roundRect(button.x + 4, button.y + 4, button.width, button.height, 15)
      ctx.fill()
    }
    
    // Button background
    const gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height)
    if (button.isHovered) {
      gradient.addColorStop(0, '#5DADE2')
      gradient.addColorStop(1, '#3498DB')
    } else {
      gradient.addColorStop(0, '#4CAF50')
      gradient.addColorStop(1, '#45a049')
    }
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, 15)
    ctx.fill()
    
    // Button border
    ctx.strokeStyle = button.isHovered ? '#2980B9' : '#388E3C'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, 15)
    ctx.stroke()
    
    // Button text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 24px Comic Sans MS, cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    
    ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2)
    
    ctx.restore()
  }
  
  /**
   * Check if a point is inside a button
   */
  private isPointInButton(x: number, y: number, button: any): boolean {
    return (
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height
    )
  }
  
  /**
   * Start the game
   */
  private startGame(): void {
    console.log('Start Game clicked!')
    // TODO: Transition to age selection or diagnostic state
    alert('Game starting soon! 🤖')
  }
  
  /**
   * Open settings
   */
  private openSettings(): void {
    console.log('Settings clicked!')
    // TODO: Transition to settings state
    alert('Settings coming soon! ⚙️')
  }
  
  /**
   * Show instructions
   */
  private showInstructions(): void {
    console.log('Instructions clicked!')
    // TODO: Transition to instructions state
    alert('Instructions coming soon! 📚')
  }
}