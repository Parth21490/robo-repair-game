/**
 * UI Renderer - Specialized renderer for child-friendly UI elements with accessibility features
 * Implements large buttons, high contrast, keyboard focus indicators, and responsive layouts
 */

export interface UIElement {
  id: string
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  interactive: boolean
  focused: boolean
  hovered: boolean
  pressed: boolean
}

export interface ButtonElement extends UIElement {
  text: string
  fontSize: number
  backgroundColor: string
  textColor: string
  borderColor: string
  borderWidth: number
  cornerRadius: number
  shadowEnabled: boolean
  accessibilityLabel?: string
}

export interface TextElement extends UIElement {
  text: string
  fontSize: number
  color: string
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  maxWidth?: number
  shadowEnabled: boolean
  accessibilityLabel?: string
}

export interface LayoutContainer {
  x: number
  y: number
  width: number
  height: number
  padding: number
  gap: number
  direction: 'horizontal' | 'vertical'
  alignment: 'start' | 'center' | 'end'
  children: UIElement[]
}

export interface AccessibilityOptions {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  keyboardNavigation: boolean
  screenReaderSupport: boolean
}

export interface ResponsiveBreakpoints {
  mobile: number    // 0-768px
  tablet: number    // 769-1024px
  desktop: number   // 1025px+
}

export class UIRenderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private elements: Map<string, UIElement> = new Map()
  private focusedElementId: string | null = null
  private accessibilityOptions: AccessibilityOptions
  private breakpoints: ResponsiveBreakpoints
  private currentBreakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  
  // Child-friendly color palette
  private readonly colorPalette = {
    primary: '#FF6B6B',      // Coral red
    secondary: '#4ECDC4',    // Turquoise
    success: '#45B7D1',      // Sky blue
    warning: '#FFA726',      // Orange
    danger: '#EF5350',       // Red
    background: '#F8F9FA',   // Light gray
    surface: '#FFFFFF',      // White
    text: '#2C3E50',         // Dark blue-gray
    textLight: '#7F8C8D',    // Light gray
    accent: '#9B59B6',       // Purple
    highlight: '#F39C12',    // Golden yellow
  }
  
  // High contrast color palette for accessibility
  private readonly highContrastPalette = {
    primary: '#000000',      // Black
    secondary: '#FFFFFF',    // White
    success: '#00AA00',      // Green
    warning: '#FF8800',      // Orange
    danger: '#CC0000',       // Red
    background: '#FFFFFF',   // White
    surface: '#F0F0F0',      // Light gray
    text: '#000000',         // Black
    textLight: '#333333',    // Dark gray
    accent: '#0066CC',       // Blue
    highlight: '#FFFF00',    // Yellow
  }
  
  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.ctx = ctx
    
    // Default accessibility options
    this.accessibilityOptions = {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      keyboardNavigation: true,
      screenReaderSupport: true,
    }
    
    // Responsive breakpoints
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1025,
    }
    
    this.updateBreakpoint()
    this.setupEventListeners()
  }
  
  /**
   * Set accessibility options
   */
  setAccessibilityOptions(options: Partial<AccessibilityOptions>): void {
    this.accessibilityOptions = { ...this.accessibilityOptions, ...options }
  }
  
  /**
   * Get current color palette based on accessibility settings
   */
  private getColorPalette() {
    return this.accessibilityOptions.highContrast ? this.highContrastPalette : this.colorPalette
  }
  
  /**
   * Update current breakpoint based on canvas size
   */
  private updateBreakpoint(): void {
    const width = this.canvas.width
    
    if (width <= this.breakpoints.mobile) {
      this.currentBreakpoint = 'mobile'
    } else if (width <= this.breakpoints.tablet) {
      this.currentBreakpoint = 'tablet'
    } else {
      this.currentBreakpoint = 'desktop'
    }
  }
  
  /**
   * Get responsive scale factor
   */
  private getScaleFactor(): number {
    const baseScale = this.accessibilityOptions.largeText ? 1.25 : 1.0
    
    let responsiveScale: number
    switch (this.currentBreakpoint) {
      case 'mobile':
        responsiveScale = baseScale * 0.8
        break
      case 'tablet':
        responsiveScale = baseScale * 0.9
        break
      case 'desktop':
        responsiveScale = baseScale * 1.0
        break
      default:
        responsiveScale = baseScale
    }
    
    return responsiveScale
  }
  
  /**
   * Create a button element with child-friendly styling
   */
  createButton(options: {
    id: string
    x: number
    y: number
    width: number
    height: number
    text: string
    fontSize?: number
    backgroundColor?: string
    textColor?: string
    borderColor?: string
    borderWidth?: number
    cornerRadius?: number
    shadowEnabled?: boolean
    accessibilityLabel?: string
  }): ButtonElement {
    const palette = this.getColorPalette()
    const scaleFactor = this.getScaleFactor()
    
    const button: ButtonElement = {
      id: options.id,
      x: options.x,
      y: options.y,
      width: Math.max(options.width * scaleFactor, 120), // Minimum touch target size (absolute minimum)
      height: Math.max(options.height * scaleFactor, 44), // WCAG minimum (absolute minimum)
      text: options.text,
      fontSize: (options.fontSize || 18) * scaleFactor,
      backgroundColor: options.backgroundColor || palette.primary,
      textColor: options.textColor || palette.surface,
      borderColor: options.borderColor || palette.text,
      borderWidth: (options.borderWidth || 3) * scaleFactor,
      cornerRadius: (options.cornerRadius || 12) * scaleFactor,
      shadowEnabled: options.shadowEnabled !== false,
      visible: true,
      interactive: true,
      focused: false,
      hovered: false,
      pressed: false,
      accessibilityLabel: options.accessibilityLabel || options.text,
    }
    
    this.elements.set(options.id, button)
    return button
  }
  
  /**
   * Create a text element with child-friendly styling
   */
  createText(options: {
    id: string
    x: number
    y: number
    width: number
    height: number
    text: string
    fontSize?: number
    color?: string
    fontFamily?: string
    textAlign?: 'left' | 'center' | 'right'
    maxWidth?: number
    shadowEnabled?: boolean
    accessibilityLabel?: string
  }): TextElement {
    const palette = this.getColorPalette()
    const scaleFactor = this.getScaleFactor()
    
    const textElement: TextElement = {
      id: options.id,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      text: options.text,
      fontSize: (options.fontSize || 16) * scaleFactor,
      color: options.color || palette.text,
      fontFamily: options.fontFamily || 'Comic Sans MS, Bubblegum Sans, cursive, sans-serif',
      textAlign: options.textAlign || 'left',
      maxWidth: options.maxWidth,
      shadowEnabled: options.shadowEnabled !== false,
      visible: true,
      interactive: false,
      focused: false,
      hovered: false,
      pressed: false,
      accessibilityLabel: options.accessibilityLabel || options.text,
    }
    
    this.elements.set(options.id, textElement)
    return textElement
  }
  
  /**
   * Create a responsive layout container
   */
  createLayout(options: {
    x: number
    y: number
    width: number
    height: number
    padding?: number
    gap?: number
    direction?: 'horizontal' | 'vertical'
    alignment?: 'start' | 'center' | 'end'
    children: UIElement[]
  }): LayoutContainer {
    const scaleFactor = this.getScaleFactor()
    
    return {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      padding: (options.padding || 16) * scaleFactor,
      gap: (options.gap || 8) * scaleFactor,
      direction: options.direction || 'vertical',
      alignment: options.alignment || 'start',
      children: options.children,
    }
  }
  
  /**
   * Apply layout to children elements
   */
  applyLayout(layout: LayoutContainer): void {
    let currentX = layout.x + layout.padding
    let currentY = layout.y + layout.padding
    
    for (let i = 0; i < layout.children.length; i++) {
      const child = layout.children[i]
      
      if (layout.direction === 'horizontal') {
        child.x = currentX
        child.y = currentY
        
        // Apply alignment
        if (layout.alignment === 'center') {
          child.y = layout.y + (layout.height - child.height) / 2
        } else if (layout.alignment === 'end') {
          child.y = layout.y + layout.height - child.height - layout.padding
        }
        
        currentX += child.width + layout.gap
      } else {
        child.x = currentX
        child.y = currentY
        
        // Apply alignment
        if (layout.alignment === 'center') {
          child.x = layout.x + (layout.width - child.width) / 2
        } else if (layout.alignment === 'end') {
          child.x = layout.x + layout.width - child.width - layout.padding
        }
        
        currentY += child.height + layout.gap
      }
    }
  }
  
  /**
   * Render a button with puffy, child-friendly styling
   */
  renderButton(button: ButtonElement): void {
    if (!button.visible) return
    
    this.ctx.save()
    
    const palette = this.getColorPalette()
    
    // Calculate button state colors
    let bgColor = button.backgroundColor
    let borderColor = button.borderColor
    
    if (button.pressed) {
      bgColor = this.darkenColor(bgColor, 0.2)
      borderColor = this.darkenColor(borderColor, 0.2)
    } else if (button.hovered) {
      bgColor = this.lightenColor(bgColor, 0.1)
    }
    
    // Draw button shadow (puffy effect)
    if (button.shadowEnabled && !button.pressed) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      this.drawRoundedRect(
        button.x + 4,
        button.y + 4,
        button.width,
        button.height,
        button.cornerRadius
      )
      this.ctx.fill()
    }
    
    // Draw button background with gradient for puffy effect
    const gradient = this.ctx.createLinearGradient(
      button.x,
      button.y,
      button.x,
      button.y + button.height
    )
    gradient.addColorStop(0, this.lightenColor(bgColor, 0.2))
    gradient.addColorStop(0.5, bgColor)
    gradient.addColorStop(1, this.darkenColor(bgColor, 0.1))
    
    this.ctx.fillStyle = gradient
    this.drawRoundedRect(button.x, button.y, button.width, button.height, button.cornerRadius)
    this.ctx.fill()
    
    // Draw button border
    this.ctx.strokeStyle = borderColor
    this.ctx.lineWidth = button.borderWidth
    this.drawRoundedRect(button.x, button.y, button.width, button.height, button.cornerRadius)
    this.ctx.stroke()
    
    // Draw focus indicator
    if (button.focused && this.accessibilityOptions.keyboardNavigation) {
      this.ctx.strokeStyle = palette.highlight
      this.ctx.lineWidth = 4
      this.ctx.setLineDash([5, 5])
      this.drawRoundedRect(
        button.x - 4,
        button.y - 4,
        button.width + 8,
        button.height + 8,
        button.cornerRadius + 4
      )
      this.ctx.stroke()
      this.ctx.setLineDash([])
    }
    
    // Draw button text with bubbly font
    this.ctx.fillStyle = button.textColor
    this.ctx.font = `bold ${button.fontSize}px Comic Sans MS, Bubblegum Sans, cursive, sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    // Add text shadow for better readability
    if (button.shadowEnabled) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      this.ctx.shadowBlur = 2
      this.ctx.shadowOffsetX = 1
      this.ctx.shadowOffsetY = 1
    }
    
    const textX = button.x + button.width / 2
    const textY = button.y + button.height / 2
    this.ctx.fillText(button.text, textX, textY)
    
    this.ctx.restore()
  }
  
  /**
   * Render text with child-friendly styling
   */
  renderText(textElement: TextElement): void {
    if (!textElement.visible) return
    
    this.ctx.save()
    
    // Set font with bubbly, child-friendly typeface
    this.ctx.font = `bold ${textElement.fontSize}px ${textElement.fontFamily}`
    this.ctx.fillStyle = textElement.color
    this.ctx.textAlign = textElement.textAlign
    this.ctx.textBaseline = 'top'
    
    // Add text shadow for better readability
    if (textElement.shadowEnabled) {
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
      this.ctx.shadowBlur = 2
      this.ctx.shadowOffsetX = 1
      this.ctx.shadowOffsetY = 1
    }
    
    // Handle text wrapping if maxWidth is specified
    if (textElement.maxWidth) {
      this.wrapText(textElement.text, textElement.x, textElement.y, textElement.maxWidth, textElement.fontSize * 1.2)
    } else {
      this.ctx.fillText(textElement.text, textElement.x, textElement.y)
    }
    
    this.ctx.restore()
  }
  
  /**
   * Render all UI elements
   */
  render(): void {
    for (const element of this.elements.values()) {
      if (element.visible) {
        if ('text' in element && 'backgroundColor' in element) {
          // It's a button
          this.renderButton(element as ButtonElement)
        } else if ('text' in element) {
          // It's a text element
          this.renderText(element as TextElement)
        }
      }
    }
  }
  
  /**
   * Handle canvas resize and update responsive layout
   */
  onResize(width: number, height: number): void {
    this.updateBreakpoint()
    
    // Update all elements with new scale factor
    const scaleFactor = this.getScaleFactor()
    
    for (const element of this.elements.values()) {
      if ('fontSize' in element) {
        const baseSize = element.fontSize / this.getScaleFactor() // Get original size
        element.fontSize = baseSize * scaleFactor
      }
      
      if ('borderWidth' in element) {
        const baseBorder = (element as ButtonElement).borderWidth / this.getScaleFactor()
        ;(element as ButtonElement).borderWidth = baseBorder * scaleFactor
      }
      
      if ('cornerRadius' in element) {
        const baseRadius = (element as ButtonElement).cornerRadius / this.getScaleFactor()
        ;(element as ButtonElement).cornerRadius = baseRadius * scaleFactor
      }
    }
  }
  
  /**
   * Handle keyboard navigation
   */
  handleKeyboardInput(key: string): boolean {
    if (!this.accessibilityOptions.keyboardNavigation) return false
    
    const interactiveElements = Array.from(this.elements.values()).filter(el => el.interactive && el.visible)
    
    if (interactiveElements.length === 0) return false
    
    switch (key) {
      case 'Tab':
        this.focusNext(interactiveElements)
        return true
      case 'Shift+Tab':
        this.focusPrevious(interactiveElements)
        return true
      case 'Enter':
      case ' ':
        if (this.focusedElementId) {
          const element = this.elements.get(this.focusedElementId)
          if (element) {
            // Provide visual feedback for keyboard activation
            element.pressed = true
            setTimeout(() => {
              if (element) {
                element.pressed = false
              }
            }, 150)
          }
          this.activateElement(this.focusedElementId)
          return true
        }
        break
    }
    
    return false
  }
  
  /**
   * Focus next interactive element
   */
  private focusNext(elements: UIElement[]): void {
    const currentIndex = this.focusedElementId 
      ? elements.findIndex(el => el.id === this.focusedElementId)
      : -1
    
    const nextIndex = (currentIndex + 1) % elements.length
    this.setFocus(elements[nextIndex].id)
  }
  
  /**
   * Focus previous interactive element
   */
  private focusPrevious(elements: UIElement[]): void {
    const currentIndex = this.focusedElementId 
      ? elements.findIndex(el => el.id === this.focusedElementId)
      : 0
    
    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1
    this.setFocus(elements[prevIndex].id)
  }
  
  /**
   * Set focus to an element
   */
  setFocus(elementId: string): void {
    // Clear previous focus
    if (this.focusedElementId) {
      const prevElement = this.elements.get(this.focusedElementId)
      if (prevElement) {
        prevElement.focused = false
      }
    }
    
    // Set new focus
    const element = this.elements.get(elementId)
    if (element && element.interactive) {
      element.focused = true
      this.focusedElementId = elementId
      
      // Announce to screen readers
      if (this.accessibilityOptions.screenReaderSupport && 'accessibilityLabel' in element) {
        this.announceToScreenReader((element as any).accessibilityLabel || elementId)
      }
    }
  }
  
  /**
   * Activate an element (simulate click)
   */
  private activateElement(elementId: string): void {
    const element = this.elements.get(elementId)
    if (element && element.interactive) {
      // Don't change pressed state here - it's already handled in handlePointerInput
      
      // Trigger click event
      this.canvas.dispatchEvent(new CustomEvent('ui-element-activated', {
        detail: { elementId, element }
      }))
    }
  }
  
  /**
   * Handle mouse/touch input
   */
  handlePointerInput(x: number, y: number, type: 'down' | 'up' | 'move'): string | null {
    for (const element of this.elements.values()) {
      if (!element.interactive || !element.visible) continue
      
      const isInside = this.isPointInElement(x, y, element)
      
      switch (type) {
        case 'down':
          if (isInside) {
            element.pressed = true
            this.setFocus(element.id)
            return element.id
          }
          break
        case 'up':
          if (element.pressed) {
            element.pressed = false
            if (isInside) {
              this.activateElement(element.id)
              return element.id
            }
          }
          break
        case 'move':
          element.hovered = isInside
          break
      }
    }
    
    return null
  }
  
  /**
   * Check if point is inside element
   */
  private isPointInElement(x: number, y: number, element: UIElement): boolean {
    return x >= element.x && 
           x <= element.x + element.width && 
           y >= element.y && 
           y <= element.y + element.height
  }
  
  /**
   * Get element by ID
   */
  getElement(id: string): UIElement | undefined {
    return this.elements.get(id)
  }
  
  /**
   * Remove element
   */
  removeElement(id: string): void {
    if (this.focusedElementId === id) {
      this.focusedElementId = null
    }
    this.elements.delete(id)
  }
  
  /**
   * Clear all elements
   */
  clear(): void {
    this.elements.clear()
    this.focusedElementId = null
  }
  
  /**
   * Utility: Draw rounded rectangle
   */
  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
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
   * Utility: Wrap text to fit within maxWidth
   */
  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ')
    let line = ''
    let currentY = y
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' '
      const metrics = this.ctx.measureText(testLine)
      const testWidth = metrics.width
      
      if (testWidth > maxWidth && i > 0) {
        this.ctx.fillText(line, x, currentY)
        line = words[i] + ' '
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    
    this.ctx.fillText(line, x, currentY)
  }
  
  /**
   * Utility: Lighten color
   */
  private lightenColor(color: string, amount: number): string {
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
   * Utility: Darken color
   */
  private darkenColor(color: string, amount: number): string {
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16)
      const r = Math.max(0, Math.floor((num >> 16) - 255 * amount))
      const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) - 255 * amount))
      const b = Math.max(0, Math.floor((num & 0x0000FF) - 255 * amount))
      return `rgb(${r}, ${g}, ${b})`
    }
    return color
  }
  
  /**
   * Announce text to screen readers
   */
  private announceToScreenReader(text: string): void {
    if (!this.accessibilityOptions.screenReaderSupport) return
    
    // Create temporary element for screen reader announcement
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.style.width = '1px'
    announcement.style.height = '1px'
    announcement.style.overflow = 'hidden'
    
    document.body.appendChild(announcement)
    announcement.textContent = text
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }
  
  /**
   * Setup event listeners for accessibility
   */
  private setupEventListeners(): void {
    // Listen for keyboard events
    document.addEventListener('keydown', (event) => {
      const key = event.shiftKey ? `Shift+${event.key}` : event.key
      if (this.handleKeyboardInput(key)) {
        event.preventDefault()
      }
    })
    
    // Listen for resize events
    window.addEventListener('resize', () => {
      this.onResize(this.canvas.width, this.canvas.height)
    })
    
    // Listen for accessibility preference changes
    if (window.matchMedia) {
      // High contrast preference
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      highContrastQuery.addEventListener('change', (e) => {
        this.setAccessibilityOptions({ highContrast: e.matches })
      })
      
      // Reduced motion preference
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      reducedMotionQuery.addEventListener('change', (e) => {
        this.setAccessibilityOptions({ reducedMotion: e.matches })
      })
    }
  }
}