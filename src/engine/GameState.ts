/**
 * Base GameState interface and abstract class
 * All game states (Menu, Diagnostic, Repair, etc.) implement this interface
 */

import { Renderer } from '@/rendering/Renderer'
import { InputEvent } from '@/input/InputHandler'

export interface GameState {
  readonly name: string
  
  /**
   * Called when entering this state
   */
  enter(previousState?: GameState): void
  
  /**
   * Called every frame to update state logic
   */
  update(deltaTime: number): void
  
  /**
   * Called every frame to render the state
   */
  render(renderer: Renderer): void
  
  /**
   * Called when exiting this state
   */
  exit(nextState?: GameState): void
  
  /**
   * Handle input events
   * @returns true if the input was handled, false otherwise
   */
  handleInput(input: InputEvent): boolean
}

/**
 * Abstract base class for game states with common functionality
 */
export abstract class BaseGameState implements GameState {
  public abstract readonly name: string
  
  protected isActive: boolean = false
  protected enterTime: number = 0
  
  /**
   * Enter the state
   */
  enter(previousState?: GameState): void {
    this.isActive = true
    this.enterTime = performance.now()
    this.onEnter(previousState)
  }
  
  /**
   * Update the state
   */
  update(deltaTime: number): void {
    if (!this.isActive) return
    this.onUpdate(deltaTime)
  }
  
  /**
   * Render the state
   */
  render(renderer: Renderer): void {
    if (!this.isActive) return
    this.onRender(renderer)
  }
  
  /**
   * Exit the state
   */
  exit(nextState?: GameState): void {
    this.isActive = false
    this.onExit(nextState)
  }
  
  /**
   * Handle input
   */
  handleInput(input: InputEvent): boolean {
    if (!this.isActive) return false
    return this.onHandleInput(input)
  }
  
  /**
   * Get time since state was entered (in milliseconds)
   */
  protected getTimeInState(): number {
    return performance.now() - this.enterTime
  }
  
  /**
   * Check if state is currently active
   */
  protected getIsActive(): boolean {
    return this.isActive
  }
  
  // Abstract methods to be implemented by concrete states
  protected abstract onEnter(previousState?: GameState): void
  protected abstract onUpdate(deltaTime: number): void
  protected abstract onRender(renderer: Renderer): void
  protected abstract onExit(nextState?: GameState): void
  protected abstract onHandleInput(input: InputEvent): boolean
}