/**
 * Unified Input Handler for mouse, touch, and keyboard interactions
 * Designed for accessibility and child-friendly interaction patterns
 */

export interface InputEvent {
  type: 'pointer_down' | 'pointer_move' | 'pointer_up' | 'key_down' | 'key_up'
  x?: number
  y?: number
  key?: string
  button?: number
  timestamp: number
  target?: HTMLElement
}

export interface ClickableElement {
  x: number
  y: number
  width: number
  height: number
  id: string
  callback: (event: InputEvent) => void
  isEnabled: boolean
}

export class InputHandler {
  private canvas: HTMLCanvasElement
  private clickableElements: Map<string, ClickableElement> = new Map()
  private isInitialized: boolean = false
  
  // Input state tracking
  private pointerDown: boolean = false
  private lastPointerPosition: { x: number; y: number } = { x: 0, y: 0 }
  private keyboardNavigationEnabled: boolean = true
  private hapticFeedbackEnabled: boolean = true
  
  // Event listeners for cleanup
  private eventListeners: Array<{ element: HTMLElement | Window; event: string; handler: EventListener }> = []
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }
  
  /**
   * Initialize the input handler
   */
  initialize(): void {
    if (this.isInitialized) return
    
    this.setupEventListeners()
    this.setupAccessibility()
    this.isInitialized = true
    
    console.log('Input handler initialized')
  }
  
  /**
   * Set up all event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.addEventListeners(this.canvas, [
      { event: 'mousedown', handler: this.handleMouseDown.bind(this) },
      { event: 'mousemove', handler: this.handleMouseMove.bind(this) },
      { event: 'mouseup', handler: this.handleMouseUp.bind(this) },
      { event: 'click', handler: this.handleClick.bind(this) },
    ])
    
    // Touch events for tablet support
    this.addEventListeners(this.canvas, [
      { event: 'touchstart', handler: this.handleTouchStart.bind(this) },
      { event: 'touchmove', handler: this.handleTouchMove.bind(this) },
      { event: 'touchend', handler: this.handleTouchEnd.bind(this) },
    ])
    
    // Keyboard events for accessibility
    this.addEventListeners(this.canvas, [
      { event: 'keydown', handler: this.handleKeyDown.bind(this) },
      { event: 'keyup', handler: this.handleKeyUp.bind(this) },
    ])
    
    // Window events
    this.addEventListeners(window, [
      { event: 'blur', handler: this.handleWindowBlur.bind(this) },
    ])
  }
  
  /**
   * Helper to add event listeners and track them for cleanup
   */
  private addEventListeners(element: HTMLElement | Window, listeners: Array<{ event: string; handler: EventListener }>): void {
    listeners.forEach(({ event, handler }) => {
      element.addEventListener(event, handler)
      this.eventListeners.push({ element, event, handler })
    })
  }
  
  /**
   * Set up accessibility features
   */
  private setupAccessibility(): void {
    // Make canvas focusable
    this.canvas.tabIndex = 0
    
    // Add ARIA attributes
    this.canvas.setAttribute('role', 'application')
    this.canvas.setAttribute('aria-label', 'Robo-Pet Repair Shop Game')
    
    // Add keyboard navigation instructions
    this.canvas.setAttribute('aria-describedby', 'game-instructions')
    
    // Create hidden instructions for screen readers
    const instructions = document.createElement('div')
    instructions.id = 'game-instructions'
    instructions.className = 'sr-only'
    instructions.textContent = 'Use arrow keys to navigate, Enter to select, Space to interact'
    document.body.appendChild(instructions)
  }
  
  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault()
    
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    this.pointerDown = true
    this.lastPointerPosition = { x, y }
    
    const inputEvent: InputEvent = {
      type: 'pointer_down',
      x,
      y,
      button: event.button,
      timestamp: performance.now(),
      target: event.target as HTMLElement,
    }
    
    this.processInputEvent(inputEvent)
    this.checkClickableElements(inputEvent)
  }
  
  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    this.lastPointerPosition = { x, y }
    
    const inputEvent: InputEvent = {
      type: 'pointer_move',
      x,
      y,
      timestamp: performance.now(),
      target: event.target as HTMLElement,
    }
    
    this.processInputEvent(inputEvent)
  }
  
  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    this.pointerDown = false
    
    const inputEvent: InputEvent = {
      type: 'pointer_up',
      x,
      y,
      button: event.button,
      timestamp: performance.now(),
      target: event.target as HTMLElement,
    }
    
    this.processInputEvent(inputEvent)
  }
  
  /**
   * Handle click events (for accessibility)
   */
  private handleClick(event: MouseEvent): void {
    // Provide haptic feedback if enabled
    if (this.hapticFeedbackEnabled && 'vibrate' in navigator) {
      navigator.vibrate(50) // Short vibration
    }
  }
  
  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault()
    
    if (event.touches.length > 0) {
      const touch = event.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      
      this.pointerDown = true
      this.lastPointerPosition = { x, y }
      
      const inputEvent: InputEvent = {
        type: 'pointer_down',
        x,
        y,
        timestamp: performance.now(),
        target: event.target as HTMLElement,
      }
      
      this.processInputEvent(inputEvent)
      this.checkClickableElements(inputEvent)
    }
  }
  
  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault()
    
    if (event.touches.length > 0) {
      const touch = event.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      
      this.lastPointerPosition = { x, y }
      
      const inputEvent: InputEvent = {
        type: 'pointer_move',
        x,
        y,
        timestamp: performance.now(),
        target: event.target as HTMLElement,
      }
      
      this.processInputEvent(inputEvent)
    }
  }
  
  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault()
    
    this.pointerDown = false
    
    const inputEvent: InputEvent = {
      type: 'pointer_up',
      x: this.lastPointerPosition.x,
      y: this.lastPointerPosition.y,
      timestamp: performance.now(),
      target: event.target as HTMLElement,
    }
    
    this.processInputEvent(inputEvent)
    
    // Provide haptic feedback for touch
    if (this.hapticFeedbackEnabled && 'vibrate' in navigator) {
      navigator.vibrate(30)
    }
  }
  
  /**
   * Handle key down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.keyboardNavigationEnabled) return
    
    const inputEvent: InputEvent = {
      type: 'key_down',
      key: event.key,
      timestamp: performance.now(),
      target: event.target as HTMLElement,
    }
    
    this.processInputEvent(inputEvent)
    
    // Handle common accessibility keys
    switch (event.key) {
      case 'Enter':
      case ' ':
        // Simulate click at current focus position
        this.simulateClickAtFocus()
        event.preventDefault()
        break
      case 'Tab':
        // Let browser handle tab navigation
        break
      default:
        // Let game states handle other keys
        break
    }
  }
  
  /**
   * Handle key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.keyboardNavigationEnabled) return
    
    const inputEvent: InputEvent = {
      type: 'key_up',
      key: event.key,
      timestamp: performance.now(),
      target: event.target as HTMLElement,
    }
    
    this.processInputEvent(inputEvent)
  }
  
  /**
   * Handle window blur (pause game, etc.)
   */
  private handleWindowBlur(): void {
    this.pointerDown = false
    // Could emit a pause event here
  }
  
  /**
   * Process input event and forward to current game state
   */
  private processInputEvent(inputEvent: InputEvent): void {
    // This will be handled by the current game state
    // For now, just log in development mode
    if (import.meta.env.DEV) {
      console.log('Input event:', inputEvent)
    }
  }
  
  /**
   * Check if input event hits any clickable elements
   */
  private checkClickableElements(inputEvent: InputEvent): void {
    if (inputEvent.type !== 'pointer_down' || !inputEvent.x || !inputEvent.y) return
    
    for (const element of this.clickableElements.values()) {
      if (!element.isEnabled) continue
      
      if (
        inputEvent.x >= element.x &&
        inputEvent.x <= element.x + element.width &&
        inputEvent.y >= element.y &&
        inputEvent.y <= element.y + element.height
      ) {
        element.callback(inputEvent)
        break // Only trigger the first matching element
      }
    }
  }
  
  /**
   * Simulate a click at the current focus position
   */
  private simulateClickAtFocus(): void {
    // For now, simulate click at center of canvas
    const rect = this.canvas.getBoundingClientRect()
    const x = rect.width / 2
    const y = rect.height / 2
    
    const inputEvent: InputEvent = {
      type: 'pointer_down',
      x,
      y,
      timestamp: performance.now(),
    }
    
    this.checkClickableElements(inputEvent)
  }
  
  /**
   * Register a clickable element
   */
  registerClickTarget(element: ClickableElement): void {
    this.clickableElements.set(element.id, element)
  }
  
  /**
   * Unregister a clickable element
   */
  unregisterClickTarget(id: string): void {
    this.clickableElements.delete(id)
  }
  
  /**
   * Clear all clickable elements
   */
  clearClickTargets(): void {
    this.clickableElements.clear()
  }
  
  /**
   * Enable/disable keyboard navigation
   */
  enableKeyboardNavigation(enabled: boolean): void {
    this.keyboardNavigationEnabled = enabled
  }
  
  /**
   * Enable/disable haptic feedback
   */
  setHapticFeedback(enabled: boolean): void {
    this.hapticFeedbackEnabled = enabled
  }
  
  /**
   * Get current pointer position
   */
  getPointerPosition(): { x: number; y: number } {
    return { ...this.lastPointerPosition }
  }
  
  /**
   * Check if pointer is currently down
   */
  isPointerDown(): boolean {
    return this.pointerDown
  }
  
  /**
   * Shutdown the input handler
   */
  shutdown(): void {
    if (!this.isInitialized) return
    
    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler)
    })
    this.eventListeners = []
    
    // Clear clickable elements
    this.clickableElements.clear()
    
    this.isInitialized = false
    console.log('Input handler shutdown')
  }
}