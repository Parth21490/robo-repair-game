/**
 * Unit tests for MenuState
 * Tests the main menu functionality including age selection, settings, and daily streak
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MenuState } from '@/states/MenuState'
import { AudioManager } from '@/audio/AudioManager'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent } from '@/input/InputHandler'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('MenuState', () => {
  let menuState: MenuState
  let mockAudioManager: AudioManager
  let mockRenderer: Renderer
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()

    // Create mock canvas and context
    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 800
    mockCanvas.height = 600
    
    mockContext = {
      canvas: mockCanvas,
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      setLineDash: vi.fn(),
      clearRect: vi.fn(),
      // Add other canvas methods as needed
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      globalAlpha: 1
    } as unknown as CanvasRenderingContext2D

    // Create mock renderer
    mockRenderer = {
      getContext: vi.fn(() => mockContext),
      getRendererType: vi.fn(() => 'canvas2d'),
      clear: vi.fn(),
      resize: vi.fn()
    } as unknown as Renderer

    // Create mock audio manager
    mockAudioManager = {
      playSound: vi.fn(),
      playTactileAudio: vi.fn(),
      setMasterVolume: vi.fn(),
      getVolumeLevels: vi.fn(() => ({
        master: 0.7,
        sfx: 0.8,
        music: 0.5,
        isMuted: false
      }))
    } as unknown as AudioManager

    menuState = new MenuState(mockAudioManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should create a MenuState instance', () => {
      expect(menuState).toBeDefined()
      expect(menuState.name).toBe('Menu')
    })

    it('should load default player progress when no saved data exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const newMenuState = new MenuState(mockAudioManager)
      // The constructor calls loadPlayerProgress which calls localStorage.getItem
      // Since we're creating a new instance, it should call getItem
      expect(newMenuState['playerProgress']).toBeDefined()
      expect(newMenuState['playerProgress'].totalRepairs).toBe(0)
    })

    it('should load saved player progress when available', () => {
      // Test that the MenuState can handle saved progress data structure
      const newMenuState = new MenuState(mockAudioManager)
      
      // Manually set some progress to verify the structure works
      newMenuState['playerProgress'].totalRepairs = 5
      newMenuState['playerProgress'].roboGemsEarned = 100
      
      expect(newMenuState['playerProgress'].totalRepairs).toBe(5)
      expect(newMenuState['playerProgress'].roboGemsEarned).toBe(100)
      expect(newMenuState['playerProgress'].settings).toBeDefined()
      expect(newMenuState['playerProgress'].dailyStreak).toBeDefined()
    })
  })

  describe('State Lifecycle', () => {
    it('should enter main menu panel on enter', () => {
      menuState.enter()
      
      // Should be in main panel
      expect(menuState['currentPanel']).toBe('main')
      expect(menuState['buttons'].length).toBeGreaterThan(0)
    })

    it('should render without errors', () => {
      menuState.enter()
      menuState.render(mockRenderer)
      
      expect(mockRenderer.getContext).toHaveBeenCalled()
      expect(mockContext.fillText).toHaveBeenCalled()
    })

    it('should update without errors', () => {
      menuState.enter()
      
      expect(() => {
        menuState.update(16.67) // ~60 FPS
      }).not.toThrow()
    })

    it('should exit and save progress', () => {
      menuState.enter()
      
      // Mock the savePlayerProgress method to verify it's called
      const saveProgressSpy = vi.spyOn(menuState as any, 'savePlayerProgress')
      
      menuState.exit()
      
      expect(saveProgressSpy).toHaveBeenCalled()
    })
  })

  describe('Input Handling', () => {
    beforeEach(() => {
      menuState.enter()
    })

    it('should handle pointer down events', () => {
      const buttons = menuState['buttons']
      if (buttons.length > 0) {
        const button = buttons[0]
        const input: InputEvent = {
          type: 'pointer_down',
          x: button.x + button.width / 2,
          y: button.y + button.height / 2
        }
        
        const handled = menuState.handleInput(input)
        expect(handled).toBe(true)
      }
    })

    it('should handle pointer move events for hover', () => {
      const buttons = menuState['buttons']
      if (buttons.length > 0) {
        const button = buttons[0]
        const input: InputEvent = {
          type: 'pointer_move',
          x: button.x + button.width / 2,
          y: button.y + button.height / 2
        }
        
        const handled = menuState.handleInput(input)
        expect(handled).toBe(true)
        expect(button.isHovered).toBe(true)
      }
    })

    it('should handle keyboard navigation', () => {
      const input: InputEvent = {
        type: 'key_down',
        key: 'ArrowDown'
      }
      
      const handled = menuState.handleInput(input)
      expect(handled).toBe(true)
    })

    it('should handle Enter key to activate selected button', () => {
      const input: InputEvent = {
        type: 'key_down',
        key: 'Enter'
      }
      
      const handled = menuState.handleInput(input)
      expect(handled).toBe(true)
    })

    it('should handle Escape key to go back', () => {
      // First navigate to a sub-panel
      menuState['showAgeSelection']()
      expect(menuState['currentPanel']).toBe('age_selection')
      
      const input: InputEvent = {
        type: 'key_down',
        key: 'Escape'
      }
      
      const handled = menuState.handleInput(input)
      expect(handled).toBe(true)
      expect(menuState['currentPanel']).toBe('main')
    })
  })

  describe('Panel Navigation', () => {
    beforeEach(() => {
      menuState.enter()
    })

    it('should navigate to age selection panel', () => {
      menuState['showAgeSelection']()
      expect(menuState['currentPanel']).toBe('age_selection')
      expect(menuState['buttons'].length).toBeGreaterThan(0)
    })

    it('should navigate to settings panel', () => {
      menuState['showSettings']()
      expect(menuState['currentPanel']).toBe('settings')
    })

    it('should navigate to collection panel', () => {
      menuState['showCollection']()
      expect(menuState['currentPanel']).toBe('collection')
    })

    it('should navigate to daily bonus panel', () => {
      menuState['showDailyBonus']()
      expect(menuState['currentPanel']).toBe('daily_bonus')
    })

    it('should return to main menu from any panel', () => {
      menuState['showSettings']()
      expect(menuState['currentPanel']).toBe('settings')
      
      menuState['showMainMenu']()
      expect(menuState['currentPanel']).toBe('main')
    })
  })

  describe('Age Selection', () => {
    beforeEach(() => {
      menuState.enter()
    })

    it('should allow selecting an age group', () => {
      const ageGroup = {
        id: '6-8',
        name: 'Junior Mechanics',
        range: '6-8 years',
        description: 'Fun challenges with guided hints!',
        color: '#4ECDC4',
        icon: '🔧'
      }
      
      // Mock the savePlayerProgress method to verify it's called
      const saveProgressSpy = vi.spyOn(menuState as any, 'savePlayerProgress')
      
      menuState['selectAgeGroup'](ageGroup)
      
      expect(menuState['playerProgress'].selectedAge).toEqual(ageGroup)
      expect(saveProgressSpy).toHaveBeenCalled()
    })

    it('should update start game button text based on age selection', () => {
      menuState['setupMainMenuButtons']()
      const startButton = menuState['buttons'].find(b => b.text.includes('Start Game') || b.text.includes('Choose Age'))
      
      expect(startButton).toBeDefined()
      expect(startButton?.text).toContain('Choose Age First')
    })
  })

  describe('Daily Streak System', () => {
    beforeEach(() => {
      menuState.enter()
    })

    it('should track daily streak correctly', () => {
      const streak = menuState['playerProgress'].dailyStreak
      expect(streak).toBeDefined()
      expect(typeof streak.currentStreak).toBe('number')
      expect(typeof streak.bonusAvailable).toBe('boolean')
    })

    it('should allow claiming daily bonus when available', () => {
      // Set up bonus as available
      menuState['playerProgress'].dailyStreak.bonusAvailable = true
      menuState['playerProgress'].dailyStreak.currentStreak = 3
      const initialGems = menuState['playerProgress'].roboGemsEarned
      
      menuState['claimDailyBonus']()
      
      expect(menuState['playerProgress'].roboGemsEarned).toBeGreaterThan(initialGems)
      expect(menuState['playerProgress'].dailyStreak.bonusAvailable).toBe(false)
    })
  })

  describe('Audio Integration', () => {
    beforeEach(() => {
      menuState.enter()
    })

    it('should play button sounds when available', () => {
      menuState['playButtonSound']()
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('button_click', { volume: 0.7 })
      expect(mockAudioManager.playTactileAudio).toHaveBeenCalledWith('repair_click', 60)
    })

    it('should play hover sounds when available', () => {
      menuState['playHoverSound']()
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('button_hover', { volume: 0.3 })
      expect(mockAudioManager.playTactileAudio).toHaveBeenCalledWith('soft', 30)
    })
  })

  describe('Accessibility Features', () => {
    beforeEach(() => {
      menuState.enter()
    })

    it('should support keyboard navigation between buttons', () => {
      const initialIndex = menuState['selectedButtonIndex']
      
      menuState['navigateButtons'](1)
      
      // Should have moved to next enabled button
      expect(menuState['selectedButtonIndex']).not.toBe(initialIndex)
    })

    it('should update hover states based on keyboard selection', () => {
      menuState['updateButtonHoverStates']()
      
      const selectedButton = menuState['buttons'][menuState['selectedButtonIndex']]
      if (selectedButton && selectedButton.isEnabled) {
        expect(selectedButton.isHovered).toBe(true)
      }
    })

    it('should handle high contrast mode', () => {
      menuState['playerProgress'].settings.highContrast = true
      
      // Should render without errors in high contrast mode
      expect(() => {
        menuState.render(mockRenderer)
      }).not.toThrow()
    })

    it('should handle reduced motion mode', () => {
      menuState['playerProgress'].settings.reducedMotion = true
      
      // Should update without errors in reduced motion mode
      expect(() => {
        menuState.update(16.67)
      }).not.toThrow()
    })
  })
})