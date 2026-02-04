/**
 * Unified Input Handler for mouse, touch, and keyboard interactions
 * Designed for accessibility and child-friendly interaction patterns
 */

export interface InputEvent {
  type: 'pointer_down' | 'pointer_move' | 'pointer_up' | 'key_down' | 'key_up' | 'gesture'
  x?: number
  y?: number
  key?: string
  button?: number
  timestamp: number
  target?: HTMLElement
  gesture?: GestureData
}

export interface GestureData {
  type: 'tap' | 'drag' | 'pinch' | 'swipe'
  startX: number
  startY: number
  endX?: number
  endY?: number
  scale?: number
  velocity?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

export interface ClickableElement {
  x: number
  y: number
  width: number
  height: number
  id: string
  callback: (event: InputEvent) => void
  isEnabled: boolean
  tabIndex?: number
  ariaLabel?: string
  isFocused?: boolean
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
  
  // Touch gesture tracking
  private touchStartTime: number = 0
  private touchStartPosition: { x: number; y: number } = { x: 0, y: 0 }
  private lastTouchDistance: number = 0
  private gestureThreshold: number = 10 // pixels
  private tapTimeout: number = 300 // milliseconds
  
  // Keyboard navigation
  private focusedElementId: string | null = null
  private tabOrder: string[] = []
  
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
      this.touchStartPosition = { x, y }
      this.touchStartTime = performance.now()
      
      // Track initial distance for pinch gestures
      if (event.touches.length === 2) {
        const touch2 = event.touches[1]
        const x2 = touch2.clientX - rect.left
        const y2 = touch2.clientY - rect.top
        this.lastTouchDistance = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2))
      }
      
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
      
      // Detect pinch gesture
      if (event.touches.length === 2) {
        const touch2 = event.touches[1]
        const x2 = touch2.clientX - rect.left
        const y2 = touch2.clientY - rect.top
        const currentDistance = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2))
        
        if (this.lastTouchDistance > 0) {
          const scale = currentDistance / this.lastTouchDistance
          this.emitGestureEvent('pinch', {
            type: 'pinch',
            startX: this.touchStartPosition.x,
            startY: this.touchStartPosition.y,
            endX: x,
            endY: y,
            scale: scale
          })
        }
        
        this.lastTouchDistance = currentDistance
      }
      
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
    const endTime = performance.now()
    const duration = endTime - this.touchStartTime
    
    const inputEvent: InputEvent = {
      type: 'pointer_up',
      x: this.lastPointerPosition.x,
      y: this.lastPointerPosition.y,
      timestamp: performance.now(),
      target: event.target as HTMLElement,
    }
    
    this.processInputEvent(inputEvent)
    
    // Detect gesture based on movement and duration
    this.detectGesture(duration)
    
    // Provide haptic feedback for touch
    if (this.hapticFeedbackEnabled && 'vibrate' in navigator) {
      navigator.vibrate(30)
    }
    
    // Reset touch tracking
    this.lastTouchDistance = 0
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
        // Handle tab navigation
        if (event.shiftKey) {
          this.focusPreviousElement()
        } else {
          this.focusNextElement()
        }
        event.preventDefault()
        break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Handle arrow key navigation
        this.handleArrowNavigation(event.key)
        event.preventDefault()
        break
      case 'Escape':
        // Clear focus
        this.clearFocus()
        event.preventDefault()
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
    if (this.focusedElementId) {
      const element = this.clickableElements.get(this.focusedElementId)
      if (element && element.isEnabled) {
        const inputEvent: InputEvent = {
          type: 'pointer_down',
          x: element.x + element.width / 2,
          y: element.y + element.height / 2,
          timestamp: performance.now(),
        }
        
        element.callback(inputEvent)
        return
      }
    }
    
    // Fallback: simulate click at center of canvas
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
   * Detect gesture based on touch movement and duration
   */
  private detectGesture(duration: number): void {
    const deltaX = this.lastPointerPosition.x - this.touchStartPosition.x
    const deltaY = this.lastPointerPosition.y - this.touchStartPosition.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (duration < this.tapTimeout && distance < this.gestureThreshold) {
      // Tap gesture
      this.emitGestureEvent('tap', {
        type: 'tap',
        startX: this.touchStartPosition.x,
        startY: this.touchStartPosition.y,
        endX: this.lastPointerPosition.x,
        endY: this.lastPointerPosition.y
      })
    } else if (distance >= this.gestureThreshold) {
      // Determine swipe or drag
      const velocity = distance / duration
      
      if (velocity > 0.5) { // Fast movement = swipe
        const direction = this.getSwipeDirection(deltaX, deltaY)
        this.emitGestureEvent('swipe', {
          type: 'swipe',
          startX: this.touchStartPosition.x,
          startY: this.touchStartPosition.y,
          endX: this.lastPointerPosition.x,
          endY: this.lastPointerPosition.y,
          velocity: velocity,
          direction: direction
        })
      } else { // Slow movement = drag
        this.emitGestureEvent('drag', {
          type: 'drag',
          startX: this.touchStartPosition.x,
          startY: this.touchStartPosition.y,
          endX: this.lastPointerPosition.x,
          endY: this.lastPointerPosition.y,
          velocity: velocity
        })
      }
    }
  }
  
  /**
   * Determine swipe direction
   */
  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }
  
  /**
   * Emit gesture event
   */
  private emitGestureEvent(gestureType: 'tap' | 'drag' | 'pinch' | 'swipe', gestureData: GestureData): void {
    const inputEvent: InputEvent = {
      type: 'gesture',
      timestamp: performance.now(),
      gesture: gestureData
    }
    
    this.processInputEvent(inputEvent)
  }
  
  /**
   * Focus next element in tab order
   */
  private focusNextElement(): void {
    this.updateTabOrder()
    
    if (this.tabOrder.length === 0) return
    
    let currentIndex = this.focusedElementId ? this.tabOrder.indexOf(this.focusedElementId) : -1
    let nextIndex = (currentIndex + 1) % this.tabOrder.length
    
    // Find next enabled element
    let attempts = 0
    while (attempts < this.tabOrder.length) {
      const elementId = this.tabOrder[nextIndex]
      const element = this.clickableElements.get(elementId)
      
      if (element && element.isEnabled) {
        this.setFocus(elementId)
        return
      }
      
      nextIndex = (nextIndex + 1) % this.tabOrder.length
      attempts++
    }
    
    // If no enabled element found, clear focus
    this.clearFocus()
  }
  
  /**
   * Focus previous element in tab order
   */
  private focusPreviousElement(): void {
    this.updateTabOrder()
    
    if (this.tabOrder.length === 0) return
    
    let currentIndex = this.focusedElementId ? this.tabOrder.indexOf(this.focusedElementId) : 0
    let prevIndex = currentIndex === 0 ? this.tabOrder.length - 1 : currentIndex - 1
    
    // Find previous enabled element
    let attempts = 0
    while (attempts < this.tabOrder.length) {
      const elementId = this.tabOrder[prevIndex]
      const element = this.clickableElements.get(elementId)
      
      if (element && element.isEnabled) {
        this.setFocus(elementId)
        return
      }
      
      prevIndex = prevIndex === 0 ? this.tabOrder.length - 1 : prevIndex - 1
      attempts++
    }
    
    // If no enabled element found, clear focus
    this.clearFocus()
  }
  
  /**
   * Handle arrow key navigation
   */
  private handleArrowNavigation(key: string): void {
    if (!this.focusedElementId) {
      // No current focus, focus first element
      this.focusNextElement()
      return
    }
    
    const currentElement = this.clickableElements.get(this.focusedElementId)
    if (!currentElement) return
    
    // Find closest element in the direction of arrow key
    let closestElement: ClickableElement | null = null
    let closestDistance = Infinity
    
    for (const element of this.clickableElements.values()) {
      if (!element.isEnabled || element.id === this.focusedElementId) continue
      
      const isInDirection = this.isElementInDirection(currentElement, element, key)
      if (!isInDirection) continue
      
      const distance = this.getElementDistance(currentElement, element)
      if (distance < closestDistance) {
        closestDistance = distance
        closestElement = element
      }
    }
    
    if (closestElement) {
      this.setFocus(closestElement.id)
    }
  }
  
  /**
   * Check if element is in the direction of arrow key
   */
  private isElementInDirection(from: ClickableElement, to: ClickableElement, direction: string): boolean {
    const fromCenterX = from.x + from.width / 2
    const fromCenterY = from.y + from.height / 2
    const toCenterX = to.x + to.width / 2
    const toCenterY = to.y + to.height / 2
    
    switch (direction) {
      case 'ArrowUp':
        return toCenterY < fromCenterY
      case 'ArrowDown':
        return toCenterY > fromCenterY
      case 'ArrowLeft':
        return toCenterX < fromCenterX
      case 'ArrowRight':
        return toCenterX > fromCenterX
      default:
        return false
    }
  }
  
  /**
   * Get distance between two elements
   */
  private getElementDistance(from: ClickableElement, to: ClickableElement): number {
    const fromCenterX = from.x + from.width / 2
    const fromCenterY = from.y + from.height / 2
    const toCenterX = to.x + to.width / 2
    const toCenterY = to.y + to.height / 2
    
    return Math.sqrt(Math.pow(toCenterX - fromCenterX, 2) + Math.pow(toCenterY - fromCenterY, 2))
  }
  
  /**
   * Set focus to element
   */
  private setFocus(elementId: string): void {
    // Clear previous focus
    if (this.focusedElementId) {
      const prevElement = this.clickableElements.get(this.focusedElementId)
      if (prevElement) {
        prevElement.isFocused = false
      }
    }
    
    // Set new focus
    this.focusedElementId = elementId
    const element = this.clickableElements.get(elementId)
    if (element) {
      element.isFocused = true
    }
  }
  
  /**
   * Clear focus
   */
  private clearFocus(): void {
    if (this.focusedElementId) {
      const element = this.clickableElements.get(this.focusedElementId)
      if (element) {
        element.isFocused = false
      }
      this.focusedElementId = null
    }
  }
  
  /**
   * Update tab order based on current elements
   */
  private updateTabOrder(): void {
    const elements = Array.from(this.clickableElements.values())
      .filter(element => element.isEnabled && element.id && element.id.trim().length > 0) // Filter out invalid IDs
      .sort((a, b) => {
        // Sort by tabIndex first, then by position (top to bottom, left to right)
        if (a.tabIndex !== undefined && b.tabIndex !== undefined) {
          return a.tabIndex - b.tabIndex
        }
        if (a.tabIndex !== undefined) return -1
        if (b.tabIndex !== undefined) return 1
        
        // Sort by Y position first, then X position
        if (Math.abs(a.y - b.y) < 10) { // Same row
          return a.x - b.x
        }
        return a.y - b.y
      })
    
    this.tabOrder = elements.map(element => element.id)
  }
  
  /**
   * Register a clickable element
   */
  registerClickTarget(element: ClickableElement): void {
    // Validate element ID
    if (!element.id || element.id.trim().length === 0) {
      console.warn('InputHandler: Attempted to register element with invalid ID:', element.id)
      return
    }
    
    this.clickableElements.set(element.id, element)
    this.updateTabOrder() // Update tab order when elements change
  }
  
  /**
   * Unregister a clickable element
   */
  unregisterClickTarget(id: string): void {
    // Clear focus if this element was focused
    if (this.focusedElementId === id) {
      this.clearFocus()
    }
    
    this.clickableElements.delete(id)
    this.updateTabOrder() // Update tab order when elements change
  }
  
  /**
   * Clear all clickable elements
   */
  clearClickTargets(): void {
    this.clearFocus()
    this.clickableElements.clear()
    this.tabOrder = []
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
   * Get currently focused element
   */
  getFocusedElement(): ClickableElement | null {
    return this.focusedElementId ? this.clickableElements.get(this.focusedElementId) || null : null
  }
  
  /**
   * Get all clickable elements
   */
  getClickableElements(): ClickableElement[] {
    return Array.from(this.clickableElements.values())
  }
  
  /**
   * Check if gesture recognition is supported
   */
  isGestureSupported(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }
  
  /**
   * Check if haptic feedback is supported
   */
  isHapticSupported(): boolean {
    return 'vibrate' in navigator
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