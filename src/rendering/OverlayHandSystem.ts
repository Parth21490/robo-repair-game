/**
 * Overlay Hand System - Visual guidance system for accessibility
 * Provides animated hand gestures to guide users through interactions
 */

export interface Vector2D {
  x: number
  y: number
}

export enum HandGesture {
  TAP = 'tap',
  DRAG = 'drag',
  PINCH = 'pinch',
  SWIPE = 'swipe'
}

export interface HandAnimation {
  id: string
  gesture: HandGesture
  startPosition: Vector2D
  endPosition?: Vector2D
  duration: number
  startTime: number
  isActive: boolean
  scale?: number
}

export class OverlayHandSystem {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private animations: Map<string, HandAnimation> = new Map()
  private isInitialized: boolean = false
  private animationCounter: number = 0
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context for OverlayHandSystem')
    }
    this.ctx = ctx
  }
  
  /**
   * Initialize the overlay hand system
   */
  initialize(): void {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('OverlayHandSystem initialized')
  }
  
  /**
   * Show a guiding hand animation
   */
  showGuidingHand(
    position: Vector2D,
    gesture: HandGesture,
    duration: number = 2000
  ): string {
    const animationId = `hand_${++this.animationCounter}_${Date.now()}`
    
    const animation: HandAnimation = {
      id: animationId,
      gesture,
      startPosition: { ...position },
      duration,
      startTime: performance.now(),
      isActive: true
    }
    
    this.animations.set(animationId, animation)
    return animationId
  }
  
  /**
   * Show a tap gesture
   */
  showTapGesture(position: Vector2D, duration: number = 1000): string {
    return this.showGuidingHand(position, HandGesture.TAP, duration)
  }
  
  /**
   * Show a drag gesture
   */
  showDragGesture(
    startPosition: Vector2D,
    endPosition: Vector2D,
    duration: number = 2000
  ): string {
    const animationId = this.showGuidingHand(startPosition, HandGesture.DRAG, duration)
    const animation = this.animations.get(animationId)
    if (animation) {
      animation.endPosition = { ...endPosition }
    }
    return animationId
  }
  
  /**
   * Show a pinch gesture
   */
  showPinchGesture(
    position: Vector2D,
    scale: number = 0.5,
    duration: number = 2000
  ): string {
    const animationId = this.showGuidingHand(position, HandGesture.PINCH, duration)
    const animation = this.animations.get(animationId)
    if (animation) {
      animation.scale = scale
    }
    return animationId
  }
  
  /**
   * Show a swipe gesture
   */
  showSwipeGesture(
    startPosition: Vector2D,
    endPosition: Vector2D,
    duration: number = 1500
  ): string {
    const animationId = this.showGuidingHand(startPosition, HandGesture.SWIPE, duration)
    const animation = this.animations.get(animationId)
    if (animation) {
      animation.endPosition = { ...endPosition }
    }
    return animationId
  }
  
  /**
   * Hide a specific guiding hand animation
   */
  hideGuidingHand(animationId: string): void {
    const animation = this.animations.get(animationId)
    if (animation) {
      animation.isActive = false
      this.animations.delete(animationId)
    }
  }
  
  /**
   * Hide all guiding hand animations
   */
  hideAllGuidingHands(): void {
    this.animations.clear()
  }
  
  /**
   * Update all active animations
   */
  update(deltaTime: number): void {
    if (!this.isInitialized) return
    
    const currentTime = performance.now()
    
    // Update and clean up expired animations
    for (const [id, animation] of this.animations.entries()) {
      const elapsed = currentTime - animation.startTime
      
      if (elapsed >= animation.duration) {
        animation.isActive = false
        this.animations.delete(id)
      }
    }
  }
  
  /**
   * Render all active hand animations
   */
  render(): void {
    if (!this.isInitialized) return
    
    const currentTime = performance.now()
    
    for (const animation of this.animations.values()) {
      if (!animation.isActive) continue
      
      const elapsed = currentTime - animation.startTime
      const progress = Math.min(elapsed / animation.duration, 1)
      
      this.renderHandAnimation(animation, progress)
    }
  }
  
  /**
   * Render a single hand animation
   */
  private renderHandAnimation(animation: HandAnimation, progress: number): void {
    this.ctx.save()
    
    // Calculate current position based on gesture type and progress
    let currentPos = { ...animation.startPosition }
    
    if (animation.endPosition && (animation.gesture === HandGesture.DRAG || animation.gesture === HandGesture.SWIPE)) {
      currentPos.x = animation.startPosition.x + (animation.endPosition.x - animation.startPosition.x) * progress
      currentPos.y = animation.startPosition.y + (animation.endPosition.y - animation.startPosition.y) * progress
    }
    
    // Set up rendering context
    this.ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8 + 0.2 // Fade in/out
    this.ctx.translate(currentPos.x, currentPos.y)
    
    // Render based on gesture type
    switch (animation.gesture) {
      case HandGesture.TAP:
        this.renderTapHand(progress)
        break
      case HandGesture.DRAG:
        this.renderDragHand(progress)
        break
      case HandGesture.PINCH:
        this.renderPinchHand(progress, animation.scale || 0.5)
        break
      case HandGesture.SWIPE:
        this.renderSwipeHand(progress)
        break
    }
    
    this.ctx.restore()
  }
  
  /**
   * Render a tap hand gesture
   */
  private renderTapHand(progress: number): void {
    const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.2
    this.ctx.scale(scale, scale)
    
    // Draw hand icon
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.lineWidth = 2
    
    // Simple hand representation
    this.ctx.beginPath()
    this.ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()
    
    // Finger pointing down
    this.ctx.beginPath()
    this.ctx.ellipse(0, -25, 5, 12, 0, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()
  }
  
  /**
   * Render a drag hand gesture
   */
  private renderDragHand(progress: number): void {
    // Draw hand with motion blur effect
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.lineWidth = 2
    
    // Hand body
    this.ctx.beginPath()
    this.ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()
    
    // Drag trail
    if (progress > 0.2) {
      this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.moveTo(-20, 0)
      this.ctx.lineTo(0, 0)
      this.ctx.stroke()
    }
  }
  
  /**
   * Render a pinch hand gesture
   */
  private renderPinchHand(progress: number, targetScale: number): void {
    const currentScale = 1 + (targetScale - 1) * progress
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.lineWidth = 2
    
    // Two fingers pinching
    this.ctx.save()
    this.ctx.scale(currentScale, currentScale)
    
    // First finger
    this.ctx.beginPath()
    this.ctx.ellipse(-8, -10, 4, 10, Math.PI / 6, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()
    
    // Second finger
    this.ctx.beginPath()
    this.ctx.ellipse(8, 10, 4, 10, -Math.PI / 6, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()
    
    this.ctx.restore()
  }
  
  /**
   * Render a swipe hand gesture
   */
  private renderSwipeHand(progress: number): void {
    // Fast-moving hand with trail
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.lineWidth = 2
    
    // Hand body with motion
    const skew = progress * 0.3
    this.ctx.transform(1, skew, 0, 1, 0, 0)
    
    this.ctx.beginPath()
    this.ctx.ellipse(0, 0, 10, 15, 0, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.stroke()
    
    // Motion lines
    this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)'
    this.ctx.lineWidth = 1
    for (let i = 1; i <= 3; i++) {
      this.ctx.beginPath()
      this.ctx.moveTo(-i * 8, -5)
      this.ctx.lineTo(-i * 8, 5)
      this.ctx.stroke()
    }
  }
  
  /**
   * Get the number of active animations
   */
  getActiveAnimationCount(): number {
    return this.animations.size
  }
  
  /**
   * Check if the system is initialized
   */
  isSystemInitialized(): boolean {
    return this.isInitialized
  }
  
  /**
   * Shutdown the overlay hand system
   */
  shutdown(): void {
    if (!this.isInitialized) return
    
    this.hideAllGuidingHands()
    this.isInitialized = false
    console.log('OverlayHandSystem shutdown')
  }
}