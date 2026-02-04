/**
 * Unit tests for StateManager
 * Tests state transitions and lifecycle management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StateManager } from '@/engine/StateManager'
import { BaseGameState } from '@/engine/GameState'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent } from '@/input/InputHandler'

// Mock game state for testing
class MockGameState extends BaseGameState {
  public readonly name: string
  public enterCalled = false
  public exitCalled = false
  public updateCalled = false
  public renderCalled = false
  
  constructor(name: string) {
    super()
    this.name = name
  }
  
  protected onEnter(): void {
    this.enterCalled = true
  }
  
  protected onExit(): void {
    this.exitCalled = true
  }
  
  protected onUpdate(): void {
    this.updateCalled = true
  }
  
  protected onRender(): void {
    this.renderCalled = true
  }
  
  protected onHandleInput(): boolean {
    return false
  }
}

describe('StateManager', () => {
  let stateManager: StateManager
  let mockState1: MockGameState
  let mockState2: MockGameState
  
  beforeEach(() => {
    stateManager = new StateManager()
    mockState1 = new MockGameState('TestState1')
    mockState2 = new MockGameState('TestState2')
  })
  
  describe('State Management', () => {
    it('should start with no current state', () => {
      expect(stateManager.getCurrentState()).toBeNull()
    })
    
    it('should change to a new state', () => {
      stateManager.changeState(mockState1)
      
      expect(stateManager.getCurrentState()).toBe(mockState1)
      expect(mockState1.enterCalled).toBe(true)
    })
    
    it('should exit previous state when changing', () => {
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      
      expect(mockState1.exitCalled).toBe(true)
      expect(mockState2.enterCalled).toBe(true)
      expect(stateManager.getCurrentState()).toBe(mockState2)
    })
    
    it('should maintain state history', () => {
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      
      const history = stateManager.getStateHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toBe(mockState1)
    })
  })
  
  describe('State History', () => {
    it('should track previous states', () => {
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      
      expect(stateManager.getPreviousState()).toBe(mockState1)
    })
    
    it('should allow going back to previous state', () => {
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      
      expect(stateManager.canGoBack()).toBe(true)
      
      const success = stateManager.goBack()
      expect(success).toBe(true)
      expect(stateManager.getCurrentState()).toBe(mockState1)
    })
    
    it('should not allow going back when no history', () => {
      expect(stateManager.canGoBack()).toBe(false)
      
      const success = stateManager.goBack()
      expect(success).toBe(false)
    })
    
    it('should limit history size', () => {
      // Create many states to test history limit
      for (let i = 0; i < 15; i++) {
        const state = new MockGameState(`State${i}`)
        stateManager.changeState(state)
      }
      
      const history = stateManager.getStateHistory()
      expect(history.length).toBeLessThanOrEqual(10) // Max history size
    })
    
    it('should clear history when requested', () => {
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      
      expect(stateManager.getStateHistory()).toHaveLength(1)
      
      stateManager.clearHistory()
      expect(stateManager.getStateHistory()).toHaveLength(0)
    })
  })
  
  describe('State Validation', () => {
    it('should validate state transitions', () => {
      const isValid = stateManager.validateTransition(null, mockState1)
      expect(isValid).toBe(true)
    })
    
    it('should reject null state transitions', () => {
      const isValid = stateManager.validateTransition(mockState1, null as any)
      expect(isValid).toBe(false)
    })
  })
  
  describe('State Lifecycle', () => {
    it('should call enter on new state', () => {
      stateManager.changeState(mockState1)
      expect(mockState1.enterCalled).toBe(true)
    })
    
    it('should call exit on previous state', () => {
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      expect(mockState1.exitCalled).toBe(true)
    })
    
    it('should pass previous state to enter method', () => {
      const enterSpy = vi.spyOn(mockState2, 'enter')
      
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      
      expect(enterSpy).toHaveBeenCalledWith(mockState1)
    })
    
    it('should pass next state to exit method', () => {
      const exitSpy = vi.spyOn(mockState1, 'exit')
      
      stateManager.changeState(mockState1)
      stateManager.changeState(mockState2)
      
      expect(exitSpy).toHaveBeenCalledWith(mockState2)
    })
  })
})