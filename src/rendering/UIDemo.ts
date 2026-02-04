/**
 * UI Rendering System Demo
 * Demonstrates the child-friendly UI system with accessibility features
 */

import { UIRenderer } from './UIRenderer'

export class UIDemo {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private uiRenderer: UIRenderer
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context')
    }
    this.ctx = ctx
    this.uiRenderer = new UIRenderer(canvas, ctx)
    
    this.setupDemo()
  }
  
  private setupDemo(): void {
    // Create demo buttons with child-friendly styling
    this.uiRenderer.createButton({
      id: 'start-button',
      x: 50,
      y: 50,
      width: 200,
      height: 60,
      text: 'Start Game!',
      fontSize: 24,
      accessibilityLabel: 'Start the Robo-Pet repair game'
    })
    
    this.uiRenderer.createButton({
      id: 'settings-button',
      x: 50,
      y: 130,
      width: 200,
      height: 60,
      text: 'Settings',
      fontSize: 20,
      backgroundColor: '#4ECDC4',
      accessibilityLabel: 'Open game settings'
    })
    
    this.uiRenderer.createButton({
      id: 'help-button',
      x: 50,
      y: 210,
      width: 200,
      height: 60,
      text: 'Help & Tutorial',
      fontSize: 18,
      backgroundColor: '#FFA726',
      accessibilityLabel: 'View help and tutorial'
    })
    
    // Create demo text
    this.uiRenderer.createText({
      id: 'title-text',
      x: 300,
      y: 50,
      width: 400,
      height: 80,
      text: 'Robo-Pet Repair Shop',
      fontSize: 32,
      color: '#2C3E50',
      textAlign: 'center',
      accessibilityLabel: 'Game title: Robo-Pet Repair Shop'
    })
    
    this.uiRenderer.createText({
      id: 'subtitle-text',
      x: 300,
      y: 100,
      width: 400,
      height: 40,
      text: 'Fix, customize, and play with robotic pets!',
      fontSize: 18,
      color: '#7F8C8D',
      textAlign: 'center',
      accessibilityLabel: 'Game description: Fix, customize, and play with robotic pets'
    })
    
    // Create accessibility controls
    this.uiRenderer.createButton({
      id: 'high-contrast-button',
      x: 300,
      y: 200,
      width: 180,
      height: 50,
      text: 'High Contrast',
      fontSize: 16,
      backgroundColor: '#9B59B6',
      accessibilityLabel: 'Toggle high contrast mode for better visibility'
    })
    
    this.uiRenderer.createButton({
      id: 'large-text-button',
      x: 500,
      y: 200,
      width: 180,
      height: 50,
      text: 'Large Text',
      fontSize: 16,
      backgroundColor: '#E67E22',
      accessibilityLabel: 'Toggle large text mode for easier reading'
    })
    
    // Setup event listeners
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    // Handle UI element activation
    this.canvas.addEventListener('ui-element-activated', (event: any) => {
      const { elementId } = event.detail
      this.handleButtonClick(elementId)
    })
    
    // Handle mouse events
    this.canvas.addEventListener('mousedown', (event) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      this.uiRenderer.handlePointerInput(x, y, 'down')
      this.render()
    })
    
    this.canvas.addEventListener('mouseup', (event) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      this.uiRenderer.handlePointerInput(x, y, 'up')
      this.render()
    })
    
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      this.uiRenderer.handlePointerInput(x, y, 'move')
      this.render()
    })
    
    // Handle touch events for mobile
    this.canvas.addEventListener('touchstart', (event) => {
      event.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const touch = event.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      this.uiRenderer.handlePointerInput(x, y, 'down')
      this.render()
    })
    
    this.canvas.addEventListener('touchend', (event) => {
      event.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      if (event.changedTouches.length > 0) {
        const touch = event.changedTouches[0]
        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top
        this.uiRenderer.handlePointerInput(x, y, 'up')
      }
      this.render()
    })
  }
  
  private handleButtonClick(elementId: string): void {
    console.log(`Button clicked: ${elementId}`)
    
    switch (elementId) {
      case 'start-button':
        this.showMessage('Starting game... 🎮')
        break
      case 'settings-button':
        this.showMessage('Opening settings... ⚙️')
        break
      case 'help-button':
        this.showMessage('Loading tutorial... 📚')
        break
      case 'high-contrast-button':
        this.toggleHighContrast()
        break
      case 'large-text-button':
        this.toggleLargeText()
        break
    }
  }
  
  private toggleHighContrast(): void {
    const currentOptions = this.uiRenderer['accessibilityOptions']
    const newHighContrast = !currentOptions.highContrast
    
    this.uiRenderer.setAccessibilityOptions({ highContrast: newHighContrast })
    
    // Recreate buttons with new colors
    this.uiRenderer.clear()
    this.setupDemo()
    
    this.showMessage(newHighContrast ? 'High contrast enabled ✨' : 'High contrast disabled 🎨')
    this.render()
  }
  
  private toggleLargeText(): void {
    const currentOptions = this.uiRenderer['accessibilityOptions']
    const newLargeText = !currentOptions.largeText
    
    this.uiRenderer.setAccessibilityOptions({ largeText: newLargeText })
    
    // Recreate buttons with new sizes
    this.uiRenderer.clear()
    this.setupDemo()
    
    this.showMessage(newLargeText ? 'Large text enabled 🔍' : 'Large text disabled 📝')
    this.render()
  }
  
  private showMessage(message: string): void {
    // Remove existing message
    this.uiRenderer.removeElement('message-text')
    
    // Add new message
    this.uiRenderer.createText({
      id: 'message-text',
      x: 50,
      y: 300,
      width: 600,
      height: 40,
      text: message,
      fontSize: 20,
      color: '#27AE60',
      textAlign: 'left',
      accessibilityLabel: `Status message: ${message}`
    })
    
    this.render()
    
    // Remove message after 3 seconds
    setTimeout(() => {
      this.uiRenderer.removeElement('message-text')
      this.render()
    }, 3000)
  }
  
  public render(): void {
    // Clear canvas with child-friendly background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Draw gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height)
    gradient.addColorStop(0, '#87CEEB') // Sky blue
    gradient.addColorStop(1, '#E0F6FF') // Light blue
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Render UI elements
    this.uiRenderer.render()
  }
  
  public handleResize(width: number, height: number): void {
    this.uiRenderer.onResize(width, height)
    this.render()
  }
}