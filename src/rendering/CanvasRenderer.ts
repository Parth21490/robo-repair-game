/**
 * Canvas 2D Renderer - Primary renderer for reliable cross-device performance
 * Optimized for educational games with child-friendly graphics
 */

export class CanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number = 0
  private height: number = 0
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context')
    }
    this.ctx = ctx
  }
  
  /**
   * Initialize the Canvas renderer
   */
  async initialize(): Promise<void> {
    this.width = this.canvas.width
    this.height = this.canvas.height
    
    // Set up canvas for crisp rendering
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
    
    // Set default styles for child-friendly appearance
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    
    console.log('Canvas 2D renderer initialized')
  }
  
  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height)
    
    // Set a pleasant background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB') // Sky blue
    gradient.addColorStop(1, '#E0F6FF') // Light blue
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
  
  /**
   * Get the 2D rendering context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }
  
  /**
   * Handle canvas resize
   */
  onResize(width: number, height: number): void {
    this.width = width
    this.height = height
    
    // Re-initialize context settings after resize
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
  }
  
  /**
   * Draw a rounded rectangle (useful for child-friendly UI)
   */
  drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
  }
  
  /**
   * Draw text with child-friendly styling
   */
  drawChildFriendlyText(text: string, x: number, y: number, options: {
    fontSize?: number
    color?: string
    fontFamily?: string
    maxWidth?: number
    shadow?: boolean
  } = {}): void {
    const {
      fontSize = 24,
      color = '#2C3E50',
      fontFamily = 'Comic Sans MS, cursive, sans-serif',
      maxWidth,
      shadow = true
    } = options
    
    this.ctx.save()
    
    // Set font
    this.ctx.font = `bold ${fontSize}px ${fontFamily}`
    this.ctx.fillStyle = color
    
    // Add shadow for better readability
    if (shadow) {
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
      this.ctx.shadowBlur = 2
      this.ctx.shadowOffsetX = 1
      this.ctx.shadowOffsetY = 1
    }
    
    // Draw text
    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth)
    } else {
      this.ctx.fillText(text, x, y)
    }
    
    this.ctx.restore()
  }
  
  /**
   * Draw a button with child-friendly styling
   */
  drawButton(x: number, y: number, width: number, height: number, text: string, options: {
    backgroundColor?: string
    textColor?: string
    borderColor?: string
    borderWidth?: number
    fontSize?: number
    isPressed?: boolean
    isHovered?: boolean
  } = {}): void {
    const {
      backgroundColor = '#4CAF50',
      textColor = 'white',
      borderColor = '#45a049',
      borderWidth = 3,
      fontSize = 20,
      isPressed = false,
      isHovered = false
    } = options
    
    this.ctx.save()
    
    // Adjust position for pressed effect
    const offsetX = isPressed ? 2 : 0
    const offsetY = isPressed ? 2 : 0
    
    // Draw button shadow
    if (!isPressed) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      this.drawRoundedRect(x + 4, y + 4, width, height, 10)
      this.ctx.fill()
    }
    
    // Draw button background
    this.ctx.fillStyle = isHovered ? this.lightenColor(backgroundColor, 0.1) : backgroundColor
    this.drawRoundedRect(x + offsetX, y + offsetY, width, height, 10)
    this.ctx.fill()
    
    // Draw button border
    this.ctx.strokeStyle = borderColor
    this.ctx.lineWidth = borderWidth
    this.drawRoundedRect(x + offsetX, y + offsetY, width, height, 10)
    this.ctx.stroke()
    
    // Draw button text
    this.ctx.fillStyle = textColor
    this.ctx.font = `bold ${fontSize}px Comic Sans MS, cursive, sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    const textX = x + offsetX + width / 2
    const textY = y + offsetY + height / 2
    this.ctx.fillText(text, textX, textY)
    
    this.ctx.restore()
  }
  
  /**
   * Utility function to lighten a color
   */
  private lightenColor(color: string, amount: number): string {
    // Simple color lightening - can be enhanced
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16)
      const r = Math.min(255, Math.floor((num >> 16) + 255 * amount))
      const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + 255 * amount))
      const b = Math.min(255, Math.floor((num & 0x0000FF) + 255 * amount))
      return `rgb(${r}, ${g}, ${b})`
    }
    return color
  }
  
  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }
  
  /**
   * Shutdown the renderer
   */
  shutdown(): void {
    // Canvas 2D doesn't need special cleanup
    console.log('Canvas 2D renderer shutdown')
  }
}