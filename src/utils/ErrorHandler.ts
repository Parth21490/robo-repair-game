/**
 * Error Handler with child-friendly error messages
 * Provides graceful error handling and recovery mechanisms
 */

export class ErrorHandler {
  private static errorContainer: HTMLElement | null = null
  
  /**
   * Handle global errors with child-friendly messages
   */
  static handleGlobalError(error: Error | any): void {
    console.error('Global error:', error)
    
    const friendlyMessage = this.getFriendlyErrorMessage(error)
    this.showErrorMessage(friendlyMessage, 'global')
  }
  
  /**
   * Handle initialization errors
   */
  static handleInitializationError(error: Error): void {
    console.error('Initialization error:', error)
    
    const friendlyMessage = this.getFriendlyInitializationMessage(error)
    this.showErrorMessage(friendlyMessage, 'initialization')
  }
  
  /**
   * Handle rendering errors
   */
  static handleRenderingError(error: Error): void {
    console.error('Rendering error:', error)
    
    const friendlyMessage = 'Oops! The workshop is having trouble drawing. Let\'s try refreshing!'
    this.showErrorMessage(friendlyMessage, 'rendering')
  }
  
  /**
   * Handle audio errors
   */
  static handleAudioError(error: Error): void {
    console.error('Audio error:', error)
    
    const friendlyMessage = 'The workshop sounds are taking a little break. The game will still work great!'
    this.showErrorMessage(friendlyMessage, 'audio', false) // Non-critical error
  }
  
  /**
   * Handle storage errors
   */
  static handleStorageError(error: Error): void {
    console.error('Storage error:', error)
    
    const friendlyMessage = 'We can\'t save your progress right now, but you can keep playing!'
    this.showErrorMessage(friendlyMessage, 'storage', false) // Non-critical error
  }
  
  /**
   * Get a child-friendly error message
   */
  private static getFriendlyErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return this.translateTechnicalError(error)
    }
    
    if (error instanceof Error) {
      return this.translateTechnicalError(error.message)
    }
    
    return 'Something unexpected happened in the workshop. Let\'s try again!'
  }
  
  /**
   * Get a child-friendly initialization error message
   */
  private static getFriendlyInitializationMessage(error: Error): string {
    const message = error.message.toLowerCase()
    
    if (message.includes('canvas')) {
      return 'The workshop drawing board isn\'t working. Please try using a different web browser!'
    }
    
    if (message.includes('webgl') || message.includes('context')) {
      return 'Your device is having trouble with the workshop graphics. The game will use a simpler drawing mode!'
    }
    
    if (message.includes('audio')) {
      return 'The workshop sounds aren\'t working, but you can still play and have fun!'
    }
    
    return 'The workshop is having trouble starting up. Please refresh the page to try again!'
  }
  
  /**
   * Translate technical error messages to child-friendly ones
   */
  private static translateTechnicalError(message: string): string {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'The workshop is having trouble connecting. Please check your internet!'
    }
    
    if (lowerMessage.includes('memory') || lowerMessage.includes('out of')) {
      return 'The workshop is using too much memory. Try closing other apps and refreshing!'
    }
    
    if (lowerMessage.includes('permission') || lowerMessage.includes('blocked')) {
      return 'The workshop needs permission to work properly. Please check your browser settings!'
    }
    
    if (lowerMessage.includes('timeout')) {
      return 'The workshop is taking too long to respond. Let\'s try again!'
    }
    
    return 'Something went wrong in the workshop. Don\'t worry, let\'s try again!'
  }
  
  /**
   * Show error message to user
   */
  private static showErrorMessage(message: string, type: string, isCritical: boolean = true): void {
    // Remove existing error messages
    this.clearErrorMessages()
    
    // Create error container
    const errorDiv = document.createElement('div')
    errorDiv.className = `error-message ${type} ${isCritical ? 'critical' : 'warning'}`
    errorDiv.innerHTML = `
      <div class="error-content">
        <div class="error-icon">${isCritical ? '😟' : '⚠️'}</div>
        <div class="error-text">
          <h3>${isCritical ? 'Oops!' : 'Heads up!'}</h3>
          <p>${message}</p>
        </div>
        <div class="error-actions">
          ${isCritical ? '<button onclick="location.reload()" class="retry-button">Try Again</button>' : ''}
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-button">OK</button>
        </div>
      </div>
    `
    
    // Add styles
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 400px;
      font-family: 'Comic Sans MS', cursive, sans-serif;
      text-align: center;
      border: 3px solid ${isCritical ? '#e74c3c' : '#f39c12'};
    `
    
    // Add to page
    document.body.appendChild(errorDiv)
    this.errorContainer = errorDiv
    
    // Auto-remove non-critical errors after 5 seconds
    if (!isCritical) {
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove()
        }
      }, 5000)
    }
  }
  
  /**
   * Clear existing error messages
   */
  private static clearErrorMessages(): void {
    const existingErrors = document.querySelectorAll('.error-message')
    existingErrors.forEach(error => error.remove())
    this.errorContainer = null
  }
  
  /**
   * Log error for debugging (in development mode)
   */
  static logError(error: Error, context: string): void {
    if (import.meta.env.DEV) {
      console.group(`🐛 Error in ${context}`)
      console.error('Error:', error)
      console.error('Stack:', error.stack)
      console.error('Context:', context)
      console.groupEnd()
    }
  }
  
  /**
   * Report error to analytics (if implemented)
   */
  static reportError(error: Error, context: string): void {
    // In a real application, this would send error data to analytics
    // For now, just log it
    this.logError(error, context)
    
    // Could implement error reporting to a service here
    // But remember: no PII collection for children's privacy
  }
  
  /**
   * Create a safe error boundary for async operations
   */
  static async safeAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation()
    } catch (error) {
      this.logError(error as Error, context)
      
      if (fallback !== undefined) {
        return fallback
      }
      
      return undefined
    }
  }
  
  /**
   * Create a safe error boundary for synchronous operations
   */
  static safe<T>(
    operation: () => T,
    context: string,
    fallback?: T
  ): T | undefined {
    try {
      return operation()
    } catch (error) {
      this.logError(error as Error, context)
      
      if (fallback !== undefined) {
        return fallback
      }
      
      return undefined
    }
  }
}