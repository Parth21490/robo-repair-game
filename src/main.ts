/**
 * Main entry point for Robo-Pet Repair Shop
 * Educational game for children ages 3-12
 */

import { GameEngine } from '@/engine/GameEngine'
import { ErrorHandler } from '@/utils/ErrorHandler'

// Global error handling for child-friendly error messages
window.addEventListener('error', (event) => {
  ErrorHandler.handleGlobalError(event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.handleGlobalError(event.reason)
})

/**
 * Initialize the game when DOM is ready
 */
async function initializeGame(): Promise<void> {
  try {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
    const loadingScreen = document.getElementById('loadingScreen') as HTMLElement
    
    if (!canvas) {
      throw new Error('Game canvas not found')
    }
    
    // Initialize game engine
    const gameEngine = new GameEngine(canvas)
    await gameEngine.initialize()
    
    // Hide loading screen and show game
    loadingScreen.style.display = 'none'
    canvas.style.display = 'block'
    
    // Focus canvas for keyboard accessibility
    canvas.focus()
    
    console.log('🤖 Robo-Pet Repair Shop initialized successfully!')
    
  } catch (error) {
    ErrorHandler.handleInitializationError(error as Error)
  }
}

// Start the game when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame)
} else {
  initializeGame()
}