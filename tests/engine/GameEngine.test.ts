/**
 * Unit tests for GameEngine
 * Tests core game loop functionality and system initialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameEngine } from '@/engine/GameEngine'

describe('GameEngine', () => {
  let canvas: HTMLCanvasElement
  let gameEngine: GameEngine
  
  beforeEach(() => {
    canvas = testUtils.createMockCanvas()
    document.body.appendChild(canvas)
    gameEngine = new GameEngine(canvas)
  })
  
  afterEach(() => {
    gameEngine.shutdown()
    document.body.removeChild(canvas)
  })
  
  describe('Initialization', () => {
    it('should create a GameEngine instance', () => {
      expect(gameEngine).toBeDefined()
      expect(gameEngine).toBeInstanceOf(GameEngine)
    })
    
    it('should initialize all systems', async () => {
      await expect(gameEngine.initialize()).resolves.not.toThrow()
      
      // Verify systems are initialized
      expect(gameEngine.getRenderer()).toBeDefined()
      expect(gameEngine.getAudioManager()).toBeDefined()
      expect(gameEngine.getInputHandler()).toBeDefined()
      expect(gameEngine.getStateManager()).toBeDefined()
    })
    
    it('should start with menu state', async () => {
      await gameEngine.initialize()
      
      const currentState = gameEngine.getStateManager().getCurrentState()
      expect(currentState).toBeDefined()
      expect(currentState?.name).toBe('Menu')
    })
  })
  
  describe('Game Loop', () => {
    beforeEach(async () => {
      await gameEngine.initialize()
    })
    
    it('should start and stop the game loop', () => {
      gameEngine.start()
      // Game should be running (hard to test directly, but no errors should occur)
      
      gameEngine.stop()
      // Game should stop (again, hard to test directly)
    })
    
    it('should track FPS', async () => {
      gameEngine.start()
      
      // Wait a bit for FPS calculation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const fps = gameEngine.getCurrentFPS()
      expect(fps).toBeGreaterThanOrEqual(0)
      
      gameEngine.stop()
    })
  })
  
  describe('System Access', () => {
    beforeEach(async () => {
      await gameEngine.initialize()
    })
    
    it('should provide access to renderer', () => {
      const renderer = gameEngine.getRenderer()
      expect(renderer).toBeDefined()
      expect(renderer.getRendererType()).toBe('canvas2d')
    })
    
    it('should provide access to audio manager', () => {
      const audioManager = gameEngine.getAudioManager()
      expect(audioManager).toBeDefined()
      expect(audioManager.isAudioSupported()).toBeDefined()
    })
    
    it('should provide access to input handler', () => {
      const inputHandler = gameEngine.getInputHandler()
      expect(inputHandler).toBeDefined()
    })
    
    it('should provide access to state manager', () => {
      const stateManager = gameEngine.getStateManager()
      expect(stateManager).toBeDefined()
      expect(stateManager.getCurrentState()).toBeDefined()
    })
  })
  
  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Create a canvas that will cause initialization to fail
      const badCanvas = document.createElement('canvas')
      // Mock getContext to return null for both 2D and WebGL
      badCanvas.getContext = vi.fn(() => null)
      
      // The test should expect the error to be thrown during construction
      expect(() => new GameEngine(badCanvas)).toThrow('Failed to get 2D rendering context')
    })
  })
  
  describe('Canvas Resizing', () => {
    beforeEach(async () => {
      await gameEngine.initialize()
    })
    
    it('should handle canvas resize', () => {
      // Simulate window resize
      const resizeEvent = new Event('resize')
      window.dispatchEvent(resizeEvent)
      
      // Should not throw errors
      expect(canvas.width).toBeGreaterThan(0)
      expect(canvas.height).toBeGreaterThan(0)
    })
  })
  
  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await gameEngine.initialize()
      gameEngine.start()
      
      expect(() => gameEngine.shutdown()).not.toThrow()
    })
    
    it('should stop game loop on shutdown', async () => {
      await gameEngine.initialize()
      gameEngine.start()
      
      const stopSpy = vi.spyOn(gameEngine, 'stop')
      gameEngine.shutdown()
      
      expect(stopSpy).toHaveBeenCalled()
    })
  })
})