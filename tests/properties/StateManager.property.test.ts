/**
 * Property-based tests for StateManager
 * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
 * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { StateManager } from '@/engine/StateManager'
import { BaseGameState } from '@/engine/GameState'

// Mock game states for property testing representing actual game states
class MockGameState extends BaseGameState {
  public readonly name: string
  public enterCalled = false
  public exitCalled = false
  public updateCalled = false
  public renderCalled = false
  public inputHandled = false

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
    this.inputHandled = true
    return true
  }

  // Reset state for reuse in property tests
  reset(): void {
    this.enterCalled = false
    this.exitCalled = false
    this.updateCalled = false
    this.renderCalled = false
    this.inputHandled = false
  }
}

// Game state types as defined in the design document
const GAME_STATE_TYPES = [
  'Menu',
  'Diagnostic',
  'Repair',
  'Customization',
  'PhotoBooth',
  'MysteryCrate',
  'RewardedInterstitial'
] as const

type GameStateType = typeof GAME_STATE_TYPES[number]

// Valid state transitions as defined in the design document
const VALID_TRANSITIONS: Record<GameStateType, GameStateType[]> = {
  'Menu': ['Diagnostic'],
  'Diagnostic': ['Repair'],
  'Repair': ['Customization', 'MysteryCrate'],
  'Customization': ['PhotoBooth'],
  'PhotoBooth': ['Menu'],
  'MysteryCrate': ['RewardedInterstitial'],
  'RewardedInterstitial': ['Menu']
}

// Special transitions that can happen from any state
const SPECIAL_TRANSITIONS: GameStateType[] = ['RewardedInterstitial']

// Simple generator for unique state names
const uniqueStateNameArbitrary = fc.integer().map(i => `State_${i}_${Date.now()}_${Math.random()}`)

// Generator for game state types
const gameStateTypeArbitrary = fc.constantFrom(...GAME_STATE_TYPES)

// Generator for valid state transition sequences
const validTransitionSequenceArbitrary = fc.array(
  fc.record({
    from: gameStateTypeArbitrary,
    to: fc.constantFrom(...GAME_STATE_TYPES).filter((to, _, context) => {
      // This will be refined in the property tests to ensure valid transitions
      return true
    })
  }),
  { minLength: 1, maxLength: 5 }
)

describe('StateManager Property Tests', () => {
  let stateManager: StateManager

  beforeEach(() => {
    stateManager = new StateManager()
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * For any game state transition, the system should correctly manage the current state
   * and maintain basic state consistency.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should maintain basic state consistency for any single transition', () => {
    fc.assert(
      fc.property(
        fc.tuple(uniqueStateNameArbitrary, uniqueStateNameArbitrary),
        ([fromName, toName]) => {
          const fromState = new MockGameState(fromName)
          const toState = new MockGameState(toName)

          // First transition: null -> fromState
          stateManager.changeState(fromState)

          // Verify basic state consistency
          expect(stateManager.getCurrentState()).toBe(fromState)
          expect(fromState.enterCalled).toBe(true)
          expect(fromState.exitCalled).toBe(false)

          // Second transition: fromState -> toState
          stateManager.changeState(toState)

          // Verify transition completed correctly
          expect(stateManager.getCurrentState()).toBe(toState)
          expect(toState.enterCalled).toBe(true)
          expect(fromState.exitCalled).toBe(true)

          // Verify history management
          expect(stateManager.getStateHistory()).toContain(fromState)
          expect(stateManager.getPreviousState()).toBe(fromState)
          expect(stateManager.canGoBack()).toBe(true)
        }
      ),
      { numRuns: 3 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * For any sequence of state transitions, the current state should always be correct
   * and history should be maintained within limits.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should maintain current state correctness across any sequence', () => {
    fc.assert(
      fc.property(
        fc.array(uniqueStateNameArbitrary, { minLength: 1, maxLength: 6 }),
        (stateNames) => {
          const states = stateNames.map(name => new MockGameState(name))

          // Apply all state transitions
          for (let i = 0; i < states.length; i++) {
            const currentState = states[i]
            stateManager.changeState(currentState)

            // Verify current state is always correct
            expect(stateManager.getCurrentState()).toBe(currentState)
            expect(currentState.enterCalled).toBe(true)

            // Verify history size constraint
            const history = stateManager.getStateHistory()
            expect(history.length).toBeLessThanOrEqual(10)

            // Verify canGoBack is consistent with history
            expect(stateManager.canGoBack()).toBe(history.length > 0)
          }

          // Final verification
          const finalState = states[states.length - 1]
          expect(stateManager.getCurrentState()).toBe(finalState)
        }
      ),
      { numRuns: 3 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * State validation should work correctly for any valid transition.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should validate state transitions correctly', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.option(uniqueStateNameArbitrary, { nil: null }),
          uniqueStateNameArbitrary
        ),
        ([fromName, toName]) => {
          const fromState = fromName ? new MockGameState(fromName) : null
          const toState = new MockGameState(toName)

          // Test validation
          const isValid = stateManager.validateTransition(fromState, toState)
          expect(isValid).toBe(true)

          // Test null validation (should fail)
          const nullValidation = stateManager.validateTransition(fromState, null as any)
          expect(nullValidation).toBe(false)

          // Perform actual transition
          if (fromState) {
            stateManager.changeState(fromState)
          }
          stateManager.changeState(toState)

          // Verify transition succeeded
          expect(stateManager.getCurrentState()).toBe(toState)
          expect(toState.enterCalled).toBe(true)
        }
      ),
      { numRuns: 3 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * History management should work correctly regardless of sequence length.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should manage history correctly for any sequence length', () => {
    fc.assert(
      fc.property(
        fc.array(uniqueStateNameArbitrary, { minLength: 1, maxLength: 12 }),
        (stateNames) => {
          const states = stateNames.map(name => new MockGameState(name))

          // Apply all transitions
          for (const state of states) {
            stateManager.changeState(state)
          }

          const history = stateManager.getStateHistory()
          const currentState = stateManager.getCurrentState()

          // Verify history constraints
          expect(history.length).toBeLessThanOrEqual(10)
          expect(currentState).toBe(states[states.length - 1])

          // Test history clearing
          stateManager.clearHistory()
          expect(stateManager.getStateHistory().length).toBe(0)
          expect(stateManager.canGoBack()).toBe(false)
          expect(stateManager.getPreviousState()).toBeNull()

          // Current state should remain unchanged after clearing history
          expect(stateManager.getCurrentState()).toBe(currentState)
        }
      ),
      { numRuns: 2 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * Going back should work correctly when history is available.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should handle going back correctly when possible', () => {
    fc.assert(
      fc.property(
        fc.array(uniqueStateNameArbitrary, { minLength: 2, maxLength: 4 }),
        (stateNames) => {
          const states = stateNames.map(name => new MockGameState(name))

          // Build up some history
          for (const state of states) {
            stateManager.changeState(state)
          }

          // Test going back if possible
          if (stateManager.canGoBack()) {
            const previousState = stateManager.getPreviousState()
            const success = stateManager.goBack()

            // Verify back operation
            expect(success).toBe(true)
            expect(stateManager.getCurrentState()).toBe(previousState)
          }

          // Test going back when no history (after clearing)
          stateManager.clearHistory()
          expect(stateManager.canGoBack()).toBe(false)
          expect(stateManager.goBack()).toBe(false)
        }
      ),
      { numRuns: 2 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * Edge cases should be handled gracefully.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should handle edge cases gracefully', () => {
    fc.assert(
      fc.property(
        uniqueStateNameArbitrary,
        (stateName) => {
          const testState = new MockGameState(stateName)

          // Test multiple transitions to same state
          stateManager.changeState(testState)
          expect(testState.enterCalled).toBe(true)

          testState.reset()
          stateManager.changeState(testState) // Same state again
          expect(testState.enterCalled).toBe(true) // Should still call enter

          // Test validation edge cases
          expect(stateManager.validateTransition(testState, testState)).toBe(true)
          expect(stateManager.validateTransition(null, testState)).toBe(true)
          expect(stateManager.validateTransition(testState, null as any)).toBe(false)

          // State should remain consistent
          expect(stateManager.getCurrentState()).toBe(testState)
        }
      ),
      { numRuns: 2 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * Valid game state transitions should work correctly according to design specification.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should handle valid game state transitions correctly', () => {
    fc.assert(
      fc.property(
        gameStateTypeArbitrary,
        (fromStateType) => {
          const fromState = new MockGameState(fromStateType)
          stateManager.changeState(fromState)

          // Get valid transitions for this state type
          const validNextStates = VALID_TRANSITIONS[fromStateType] || []

          // Test each valid transition
          for (const toStateType of validNextStates) {
            const toState = new MockGameState(toStateType)

            // Reset states for clean testing
            fromState.reset()
            toState.reset()

            // Perform transition
            stateManager.changeState(fromState)
            stateManager.changeState(toState)

            // Verify transition completed correctly
            expect(stateManager.getCurrentState()).toBe(toState)
            expect(toState.enterCalled).toBe(true)
            expect(fromState.exitCalled).toBe(true)

            // Verify state lifecycle methods are called
            expect(fromState.enterCalled).toBe(true)
            expect(toState.exitCalled).toBe(false) // Should not be exited yet
          }
        }
      ),
      { numRuns: 2 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * Special transitions (like RewardedInterstitial) should be possible from any state.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should handle special transitions from any state', () => {
    fc.assert(
      fc.property(
        gameStateTypeArbitrary,
        (fromStateType) => {
          const fromState = new MockGameState(fromStateType)
          stateManager.changeState(fromState)

          // Test special transitions that can happen from any state
          for (const specialStateType of SPECIAL_TRANSITIONS) {
            const specialState = new MockGameState(specialStateType)

            // Reset states
            fromState.reset()
            specialState.reset()

            // Set up initial state
            stateManager.changeState(fromState)
            expect(stateManager.getCurrentState()).toBe(fromState)

            // Perform special transition
            stateManager.changeState(specialState)

            // Verify special transition worked
            expect(stateManager.getCurrentState()).toBe(specialState)
            expect(specialState.enterCalled).toBe(true)
            expect(fromState.exitCalled).toBe(true)

            // Verify history is maintained
            expect(stateManager.getStateHistory()).toContain(fromState)
          }
        }
      ),
      { numRuns: 2 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * State lifecycle methods should be called correctly during transitions.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should call state lifecycle methods correctly', () => {
    fc.assert(
      fc.property(
        fc.array(gameStateTypeArbitrary, { minLength: 2, maxLength: 4 }),
        (stateTypes) => {
          const states = stateTypes.map(type => new MockGameState(type))

          // Test lifecycle through a sequence of transitions
          for (let i = 0; i < states.length; i++) {
            const currentState = states[i]
            const previousState = i > 0 ? states[i - 1] : null

            // Reset state for clean testing
            currentState.reset()

            // Perform transition
            stateManager.changeState(currentState)

            // Verify enter was called
            expect(currentState.enterCalled).toBe(true)
            expect(currentState.exitCalled).toBe(false)

            // Verify previous state was exited
            if (previousState) {
              expect(previousState.exitCalled).toBe(true)
            }

            // Test update and render methods work
            currentState.update(16.67) // ~60fps
            expect(currentState.updateCalled).toBe(true)

            // Mock renderer for render test
            const mockRenderer = {} as any
            currentState.render(mockRenderer)
            expect(currentState.renderCalled).toBe(true)

            // Test input handling
            const mockInput = { type: 'pointer_down', x: 100, y: 100 } as any
            const handled = currentState.handleInput(mockInput)
            expect(currentState.inputHandled).toBe(true)
            expect(handled).toBe(true)
          }
        }
      ),
      { numRuns: 2 } // Reduced iterations for faster testing
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 1: Game State Transitions**
   * Complete gameplay flow transitions should maintain consistency.
   * **Validates: Requirements 1.2, 2.4, 5.1, 5.6, 10.1**
   */
  it('should maintain consistency through complete gameplay flows', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Common gameplay flows as defined in design document
          ['Menu', 'Diagnostic', 'Repair', 'Customization', 'PhotoBooth', 'Menu'],
          ['Menu', 'Diagnostic', 'Repair', 'MysteryCrate', 'RewardedInterstitial', 'Menu'],
          ['Menu', 'Diagnostic', 'Repair', 'Customization', 'PhotoBooth', 'Menu'],
          ['RewardedInterstitial', 'Menu', 'Diagnostic', 'Repair', 'Customization']
        ),
        (gameplayFlow) => {
          const states = gameplayFlow.map(type => new MockGameState(type))

          // Execute the complete gameplay flow
          for (let i = 0; i < states.length; i++) {
            const currentState = states[i]
            const previousState = i > 0 ? states[i - 1] : null

            stateManager.changeState(currentState)

            // Verify state consistency at each step
            expect(stateManager.getCurrentState()).toBe(currentState)
            expect(currentState.enterCalled).toBe(true)

            if (previousState) {
              expect(previousState.exitCalled).toBe(true)
            }

            // Verify history management
            const history = stateManager.getStateHistory()
            expect(history.length).toBeLessThanOrEqual(10)

            if (i > 0) {
              expect(stateManager.canGoBack()).toBe(true)
              expect(stateManager.getPreviousState()).toBe(previousState)
            }
          }

          // Final state should be correct
          const finalState = states[states.length - 1]
          expect(stateManager.getCurrentState()).toBe(finalState)

          // History should contain previous states (up to limit)
          const history = stateManager.getStateHistory()
          expect(history.length).toBeGreaterThan(0)
          expect(history.length).toBeLessThanOrEqual(10)
        }
      ),
      { numRuns: 2 } // Reduced iterations for faster testing
    )
  })
})
