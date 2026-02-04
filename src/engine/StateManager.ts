/**
 * State Manager for handling game state transitions
 * Manages the lifecycle of different game states (Menu, Diagnostic, Repair, etc.)
 */

import { GameState } from './GameState'

export class StateManager {
  private currentState: GameState | null = null
  private stateHistory: GameState[] = []
  private maxHistorySize: number = 10
  
  /**
   * Change to a new game state
   */
  changeState(newState: GameState): void {
    // Exit current state
    if (this.currentState) {
      this.currentState.exit(newState)
      
      // Add to history (for debugging and potential back navigation)
      this.stateHistory.push(this.currentState)
      if (this.stateHistory.length > this.maxHistorySize) {
        this.stateHistory.shift()
      }
    }
    
    const previousState = this.currentState
    this.currentState = newState
    
    // Enter new state
    if (this.currentState) {
      this.currentState.enter(previousState)
    }
    
    console.log(`State changed: ${previousState?.name || 'None'} → ${newState.name}`)
  }
  
  /**
   * Get the current active state
   */
  getCurrentState(): GameState | null {
    return this.currentState
  }
  
  /**
   * Get the previous state from history
   */
  getPreviousState(): GameState | null {
    return this.stateHistory.length > 0 ? this.stateHistory[this.stateHistory.length - 1] : null
  }
  
  /**
   * Get state history for debugging
   */
  getStateHistory(): GameState[] {
    return [...this.stateHistory]
  }
  
  /**
   * Check if we can go back to a previous state
   */
  canGoBack(): boolean {
    return this.stateHistory.length > 0
  }
  
  /**
   * Go back to the previous state (if available)
   */
  goBack(): boolean {
    if (!this.canGoBack()) {
      return false
    }
    
    const previousState = this.stateHistory.pop()
    if (previousState) {
      this.changeState(previousState)
      return true
    }
    
    return false
  }
  
  /**
   * Clear state history
   */
  clearHistory(): void {
    this.stateHistory = []
  }
  
  /**
   * Validate state transition (for debugging and safety)
   */
  validateTransition(fromState: GameState | null, toState: GameState): boolean {
    // Basic validation - can be extended with specific rules
    if (!toState) {
      console.warn('Attempting to transition to null state')
      return false
    }
    
    // Log transition for debugging
    console.log(`Validating transition: ${fromState?.name || 'None'} → ${toState.name}`)
    
    return true
  }
}