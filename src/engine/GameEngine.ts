/**
 * Core Game Engine for Robo-Pet Repair Shop
 * Manages the main game loop, state transitions, and system coordination
 */

import { StateManager } from './StateManager'
import { Renderer } from '@/rendering/Renderer'
import { InputHandler } from '@/input/InputHandler'
import { AudioManager } from '@/audio/AudioManager'
import { GameState } from './GameState'
import { MenuState } from '@/states/MenuState'
import { ErrorHandler } from '@/utils/ErrorHandler'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private stateManager: StateManager
  private renderer: Renderer
  private inputHandler: InputHandler
  private audioManager: AudioManager
  
  private lastFrameTime: number = 0
  private isRunning: boolean = false
  private animationFrameId: number = 0
  
  // Performance monitoring
  private frameCount: number = 0
  private fpsStartTime: number = 0
  private currentFPS: number = 0
  private targetFPS: number = 60
  private frameTimeHistory: number[] = []
  private maxFrameTimeHistory: number = 60 // Keep 1 second of frame times
  
  // Error handling and graceful degradation
  private systemFailures: Map<string, number> = new Map()
  private maxRetries: number = 3
  private isInGracefulMode: boolean = false
  private lastErrorTime: number = 0
  private errorCooldown: number = 5000 // 5 seconds between error reports
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    
    // Initialize systems with error handling
    try {
      this.stateManager = new StateManager()
      this.renderer = new Renderer(canvas)
      this.inputHandler = new InputHandler(canvas)
      this.audioManager = new AudioManager()
    } catch (error) {
      ErrorHandler.handleInitializationError(error as Error)
      throw error
    }
  }
  
  /**
   * Initialize all game systems with graceful degradation
   */
  async initialize(): Promise<void> {
    try {
      // Initialize systems in order with error handling
      await this.initializeRenderer()
      await this.initializeAudio()
      this.initializeInput()
      
      // Set up canvas size
      this.resizeCanvas()
      window.addEventListener('resize', () => this.resizeCanvas())
      
      // Initialize with menu state
      const menuState = new MenuState()
      this.stateManager.changeState(menuState)
      
      // Start the game loop
      this.start()
      
      console.log('🎮 Game Engine initialized successfully')
      
    } catch (error) {
      ErrorHandler.handleInitializationError(error as Error)
      throw error
    }
  }
  
  /**
   * Initialize renderer with fallback support
   */
  private async initializeRenderer(): Promise<void> {
    try {
      await this.renderer.initialize()
      console.log(`✅ Renderer initialized: ${this.renderer.getRendererType()}`)
    } catch (error) {
      this.recordSystemFailure('renderer')
      ErrorHandler.handleRenderingError(error as Error)
      
      // Try to continue with basic rendering
      if (this.systemFailures.get('renderer')! < this.maxRetries) {
        console.warn('Retrying renderer initialization...')
        await this.initializeRenderer()
      } else {
        throw new Error('Renderer initialization failed after maximum retries')
      }
    }
  }
  
  /**
   * Initialize audio with graceful degradation
   */
  private async initializeAudio(): Promise<void> {
    try {
      await this.audioManager.initialize()
      console.log('✅ Audio system initialized')
    } catch (error) {
      this.recordSystemFailure('audio')
      ErrorHandler.handleAudioError(error as Error)
      
      // Audio failure is non-critical, continue without audio
      console.warn('⚠️ Continuing without audio support')
    }
  }
  
  /**
   * Initialize input system
   */
  private initializeInput(): void {
    try {
      this.inputHandler.initialize()
      console.log('✅ Input system initialized')
    } catch (error) {
      this.recordSystemFailure('input')
      ErrorHandler.logError(error as Error, 'Input initialization')
      
      // Input failure is critical, but try to continue
      console.warn('⚠️ Input system may not work properly')
    }
  }
  
  /**
   * Start the main game loop
   */
  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.fpsStartTime = this.lastFrameTime
    this.gameLoop()
  }
  
  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }
  
  /**
   * Main game loop with enhanced error handling and performance monitoring
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return
    
    const currentTime = performance.now()
    const deltaTime = Math.min(currentTime - this.lastFrameTime, 100) // Cap delta time to prevent large jumps
    this.lastFrameTime = currentTime
    
    // Track frame time for performance monitoring
    this.trackFrameTime(deltaTime)
    
    // Update FPS counter
    this.updateFPS(currentTime)
    
    // Check for performance issues
    this.monitorPerformance(deltaTime)
    
    try {
      // Update current state with error handling
      const currentState = this.stateManager.getCurrentState()
      if (currentState) {
        this.safeStateUpdate(currentState, deltaTime)
      }
      
      // Render frame with error handling
      this.safeRender()
      
    } catch (error) {
      this.handleGameLoopError(error as Error)
    }
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop)
  }
  
  /**
   * Safely update game state with error handling
   */
  private safeStateUpdate(state: GameState, deltaTime: number): void {
    try {
      state.update(deltaTime)
    } catch (error) {
      ErrorHandler.logError(error as Error, `State update: ${state.name}`)
      
      // Try to recover by switching to a safe state
      if (!this.isInGracefulMode) {
        this.enterGracefulMode()
      }
    }
  }
  
  /**
   * Safely render with error handling
   */
  private safeRender(): void {
    try {
      this.render()
    } catch (error) {
      this.recordSystemFailure('render')
      ErrorHandler.handleRenderingError(error as Error)
      
      // Try to continue with basic rendering
      if (this.systemFailures.get('render')! < this.maxRetries) {
        this.renderFallback()
      }
    }
  }
  
  /**
   * Handle errors in the main game loop
   */
  private handleGameLoopError(error: Error): void {
    const currentTime = performance.now()
    
    // Avoid spamming error reports
    if (currentTime - this.lastErrorTime < this.errorCooldown) {
      return
    }
    
    this.lastErrorTime = currentTime
    ErrorHandler.logError(error, 'Game loop')
    
    // Enter graceful mode if not already
    if (!this.isInGracefulMode) {
      this.enterGracefulMode()
    }
  }
  
  /**
   * Enter graceful degradation mode
   */
  private enterGracefulMode(): void {
    this.isInGracefulMode = true
    console.warn('🛡️ Entering graceful degradation mode')
    
    // Reduce target FPS for better stability
    this.targetFPS = 30
    
    // Try to switch to a safe menu state
    try {
      const menuState = new MenuState()
      this.stateManager.changeState(menuState)
    } catch (error) {
      ErrorHandler.logError(error as Error, 'Graceful mode state change')
    }
  }
  
  /**
   * Track frame time for performance monitoring
   */
  private trackFrameTime(deltaTime: number): void {
    this.frameTimeHistory.push(deltaTime)
    
    // Keep only recent frame times
    if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
      this.frameTimeHistory.shift()
    }
  }
  
  /**
   * Monitor performance and adjust if needed
   */
  private monitorPerformance(deltaTime: number): void {
    // Check for consistently slow frames
    if (this.frameTimeHistory.length >= 30) { // Check after 30 frames
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      const targetFrameTime = 1000 / this.targetFPS
      
      // If average frame time is significantly higher than target
      if (avgFrameTime > targetFrameTime * 1.5) {
        this.handlePerformanceIssue()
      }
    }
  }
  
  /**
   * Handle performance issues by reducing quality
   */
  private handlePerformanceIssue(): void {
    if (this.isInGracefulMode) return // Already in graceful mode
    
    console.warn('⚠️ Performance issue detected, reducing quality')
    
    // Switch to Canvas 2D if using WebGL
    if (this.renderer.getRendererType() === 'webgl') {
      this.renderer.enableCanvas2D()
      console.log('Switched to Canvas 2D for better performance')
    }
    
    // Reduce target FPS
    if (this.targetFPS > 30) {
      this.targetFPS = 30
      console.log('Reduced target FPS to 30')
    }
    
    // Clear frame time history to start fresh
    this.frameTimeHistory = []
  }
  
  /**
   * Record system failure for tracking
   */
  private recordSystemFailure(system: string): void {
    const currentFailures = this.systemFailures.get(system) || 0
    this.systemFailures.set(system, currentFailures + 1)
  }
  
  /**
   * Render the current frame
   */
  private render(): void {
    // Clear the canvas
    this.renderer.clear()
    
    // Render current state
    const currentState = this.stateManager.getCurrentState()
    if (currentState) {
      currentState.render(this.renderer)
    }
    
    // Render debug info in development
    if (import.meta.env.DEV) {
      this.renderDebugInfo()
    }
  }
  
  /**
   * Fallback rendering when main render fails
   */
  private renderFallback(): void {
    try {
      const ctx = this.renderer.getContext()
      ctx.save()
      
      // Clear with a solid color
      ctx.fillStyle = '#87CEEB' // Sky blue background
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      
      // Show a simple message
      ctx.fillStyle = '#333'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(
        'Robo-Pet Workshop is taking a quick break!',
        this.canvas.width / 2,
        this.canvas.height / 2 - 20
      )
      
      ctx.font = '16px Arial'
      ctx.fillText(
        'Please refresh the page to continue playing.',
        this.canvas.width / 2,
        this.canvas.height / 2 + 20
      )
      
      ctx.restore()
    } catch (error) {
      // If even fallback rendering fails, just log it
      ErrorHandler.logError(error as Error, 'Fallback render')
    }
  }
  
  /**
   * Update FPS counter for performance monitoring
   */
  private updateFPS(currentTime: number): void {
    this.frameCount++
    
    if (currentTime - this.fpsStartTime >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.fpsStartTime))
      this.frameCount = 0
      this.fpsStartTime = currentTime
    }
  }
  
  /**
   * Render debug information with performance metrics
   */
  private renderDebugInfo(): void {
    const ctx = this.renderer.getContext()
    ctx.save()
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(10, 10, 200, 120)
    
    // Text
    ctx.fillStyle = 'white'
    ctx.font = '12px monospace'
    
    let y = 25
    const lineHeight = 15
    
    ctx.fillText(`FPS: ${this.currentFPS} / ${this.targetFPS}`, 15, y)
    y += lineHeight
    
    ctx.fillText(`State: ${this.stateManager.getCurrentState()?.name || 'None'}`, 15, y)
    y += lineHeight
    
    ctx.fillText(`Renderer: ${this.renderer.getRendererType()}`, 15, y)
    y += lineHeight
    
    // Performance info
    if (this.frameTimeHistory.length > 0) {
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      ctx.fillText(`Avg Frame: ${avgFrameTime.toFixed(1)}ms`, 15, y)
      y += lineHeight
    }
    
    // System status
    ctx.fillText(`Graceful Mode: ${this.isInGracefulMode ? 'ON' : 'OFF'}`, 15, y)
    y += lineHeight
    
    // System failures
    if (this.systemFailures.size > 0) {
      ctx.fillStyle = '#ff6b6b'
      ctx.fillText('System Failures:', 15, y)
      y += lineHeight
      
      this.systemFailures.forEach((count, system) => {
        ctx.fillText(`  ${system}: ${count}`, 15, y)
        y += lineHeight
      })
    }
    
    ctx.restore()
  }
  
  /**
   * Resize canvas to maintain aspect ratio
   */
  private resizeCanvas(): void {
    const container = this.canvas.parentElement
    if (!container) return
    
    const containerWidth = container.clientWidth - 40 // Account for padding
    const containerHeight = container.clientHeight - 40
    
    // Target aspect ratio for child-friendly interface (4:3)
    const targetAspectRatio = 4 / 3
    
    let canvasWidth = containerWidth
    let canvasHeight = containerWidth / targetAspectRatio
    
    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight
      canvasWidth = containerHeight * targetAspectRatio
    }
    
    // Ensure minimum size for accessibility
    canvasWidth = Math.max(800, canvasWidth)
    canvasHeight = Math.max(600, canvasHeight)
    
    this.canvas.width = canvasWidth
    this.canvas.height = canvasHeight
    this.canvas.style.width = `${canvasWidth}px`
    this.canvas.style.height = `${canvasHeight}px`
    
    // Notify renderer of size change
    this.renderer.onResize(canvasWidth, canvasHeight)
  }
  
  /**
   * Get current FPS for performance monitoring
   */
  getCurrentFPS(): number {
    return this.currentFPS
  }
  
  /**
   * Get target FPS
   */
  getTargetFPS(): number {
    return this.targetFPS
  }
  
  /**
   * Get average frame time over recent history
   */
  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0
    return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
  }
  
  /**
   * Check if the engine is in graceful degradation mode
   */
  isInGracefulDegradationMode(): boolean {
    return this.isInGracefulMode
  }
  
  /**
   * Get system failure counts
   */
  getSystemFailures(): Map<string, number> {
    return new Map(this.systemFailures)
  }
  
  /**
   * Reset system failure counts (for recovery)
   */
  resetSystemFailures(): void {
    this.systemFailures.clear()
    this.isInGracefulMode = false
    this.targetFPS = 60
    console.log('🔄 System failure counts reset')
  }
  
  /**
   * Get renderer instance
   */
  getRenderer(): Renderer {
    return this.renderer
  }
  
  /**
   * Get audio manager instance
   */
  getAudioManager(): AudioManager {
    return this.audioManager
  }
  
  /**
   * Get input handler instance
   */
  getInputHandler(): InputHandler {
    return this.inputHandler
  }
  
  /**
   * Get state manager instance
   */
  getStateManager(): StateManager {
    return this.stateManager
  }
  
  /**
   * Shutdown the game engine with proper cleanup
   */
  shutdown(): void {
    console.log('🛑 Shutting down game engine...')
    
    this.stop()
    
    // Clean up systems in reverse order
    try {
      this.audioManager.shutdown()
    } catch (error) {
      ErrorHandler.logError(error as Error, 'Audio shutdown')
    }
    
    try {
      this.inputHandler.shutdown()
    } catch (error) {
      ErrorHandler.logError(error as Error, 'Input shutdown')
    }
    
    try {
      this.renderer.shutdown()
    } catch (error) {
      ErrorHandler.logError(error as Error, 'Renderer shutdown')
    }
    
    // Clean up event listeners
    window.removeEventListener('resize', this.resizeCanvas)
    
    // Clear state
    this.systemFailures.clear()
    this.frameTimeHistory = []
    
    console.log('✅ Game engine shutdown complete')
  }
}