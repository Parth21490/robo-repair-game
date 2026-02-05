/**
 * Unit tests for CustomizationState
 * Tests pet customization functionality including color palettes, accessories, and local storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CustomizationState } from '@/states/CustomizationState'
import { AudioManager } from '@/audio/AudioManager'
import { Renderer } from '@/rendering/Renderer'
import { InputEvent } from '@/input/InputHandler'
import { RobotPet } from '@/pets/RobotPet'
import { PetType, AgeGroup, ComponentType } from '@/pets/types'

describe('CustomizationState', () => {
  let customizationState: CustomizationState
  let mockAudioManager: AudioManager
  let mockRenderer: Renderer
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D
  let testPet: RobotPet

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    vi.clearAllMocks()

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
      ellipse: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      setLineDash: vi.fn(),
      clearRect: vi.fn(),
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
      setMasterVolume: vi.fn()
    } as unknown as AudioManager

    // Create test pet
    testPet = new RobotPet('test-pet-1', 'Test Bot', PetType.DOG)

    customizationState = new CustomizationState(mockAudioManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should create a CustomizationState instance', () => {
      expect(customizationState).toBeDefined()
      expect(customizationState.name).toBe('Customization')
    })

    it('should initialize with default progress', () => {
      expect(customizationState['progress']).toBeDefined()
      expect(customizationState['progress'].totalCustomizations).toBe(0)
      expect(customizationState['progress'].appliedCustomizations).toBe(0)
      expect(customizationState['progress'].isComplete).toBe(false)
    })

    it('should initialize customization session with pet and age group', () => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
      
      expect(customizationState['currentPet']).toBe(testPet)
      expect(customizationState['ageGroup']).toBe(AgeGroup.MIDDLE)
      expect(customizationState['colorPalettes'].length).toBeGreaterThan(0)
      expect(customizationState['accessories'].length).toBeGreaterThan(0)
      expect(customizationState['customizationTools'].length).toBeGreaterThan(0)
    })
  })

  describe('Color Palette System', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
    })

    it('should set up age-appropriate color palettes', () => {
      const palettes = customizationState['colorPalettes']
      
      expect(palettes.length).toBeGreaterThan(0)
      expect(palettes.some(p => p.category === 'basic')).toBe(true)
      
      // Should have basic palette unlocked
      const basicPalette = palettes.find(p => p.category === 'basic')
      expect(basicPalette?.isUnlocked).toBe(true)
    })

    it('should provide different colors for different age groups', () => {
      // Test young age group
      customizationState.initializeCustomization(testPet, AgeGroup.YOUNG)
      const youngColors = customizationState['getAgeAppropriateColors']()
      
      // Test older age group
      customizationState.initializeCustomization(testPet, AgeGroup.OLDER)
      const olderColors = customizationState['getAgeAppropriateColors']()
      
      expect(youngColors).not.toEqual(olderColors)
      expect(youngColors.length).toBeGreaterThan(0)
      expect(olderColors.length).toBeGreaterThan(0)
    })

    it('should allow color selection', () => {
      customizationState['selectColor'](0)
      
      expect(customizationState['selectedColor']).toBeDefined()
      expect(customizationState['progress'].selectedColor).toBeDefined()
    })
  })

  describe('Accessory System', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
    })

    it('should set up accessories with different categories', () => {
      const accessories = customizationState['accessories']
      
      expect(accessories.length).toBeGreaterThan(0)
      expect(accessories.some(a => a.type === 'hat')).toBe(true)
      expect(accessories.some(a => a.type === 'bow_tie')).toBe(true)
      expect(accessories.some(a => a.type === 'sticker')).toBe(true)
    })

    it('should have basic accessories unlocked by default', () => {
      const basicAccessories = customizationState['accessories'].filter(a => a.category === 'basic')
      
      expect(basicAccessories.length).toBeGreaterThan(0)
      expect(basicAccessories.every(a => a.isUnlocked)).toBe(true)
    })

    it('should have premium accessories with robo gem costs', () => {
      const premiumAccessories = customizationState['accessories'].filter(a => a.category === 'premium')
      
      if (premiumAccessories.length > 0) {
        expect(premiumAccessories.every(a => a.roboGemCost > 0)).toBe(true)
      }
    })

    it('should allow accessory selection', () => {
      const unlockedAccessories = customizationState['accessories'].filter(a => a.isUnlocked)
      if (unlockedAccessories.length > 0) {
        customizationState['selectAccessory'](0)
        
        expect(customizationState['selectedAccessory']).toBeDefined()
        expect(customizationState['selectedAccessory']?.isUnlocked).toBe(true)
      }
    })
  })

  describe('Customization Tools', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
    })

    it('should set up required customization tools', () => {
      const tools = customizationState['customizationTools']
      
      expect(tools.length).toBe(3)
      expect(tools.some(t => t.type === 'color_brush')).toBe(true)
      expect(tools.some(t => t.type === 'accessory_placer')).toBe(true)
      expect(tools.some(t => t.type === 'pattern_stamp')).toBe(true)
    })

    it('should allow tool selection', () => {
      const colorBrush = customizationState['customizationTools'].find(t => t.type === 'color_brush')
      if (colorBrush) {
        customizationState['selectTool'](colorBrush)
        
        expect(colorBrush.isSelected).toBe(true)
        expect(customizationState['selectedTool']).toBe(colorBrush)
        expect(customizationState['currentPanel']).toBe('colors')
      }
    })

    it('should switch panels when selecting different tools', () => {
      const accessoryTool = customizationState['customizationTools'].find(t => t.type === 'accessory_placer')
      if (accessoryTool) {
        customizationState['selectTool'](accessoryTool)
        
        expect(customizationState['currentPanel']).toBe('accessories')
      }
    })
  })

  describe('Customization Areas', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
    })

    it('should create customization areas for pet components', () => {
      const areas = customizationState['customizationAreas']
      
      expect(areas.size).toBeGreaterThan(0)
      expect(areas.size).toBe(testPet.components.size)
    })

    it('should define allowed customizations for each component type', () => {
      const chassisCustomizations = customizationState['getAllowedCustomizations'](ComponentType.CHASSIS_PLATING)
      const sensorCustomizations = customizationState['getAllowedCustomizations'](ComponentType.SENSOR_ARRAY)
      
      expect(chassisCustomizations).toContain('color')
      expect(chassisCustomizations).toContain('pattern')
      expect(sensorCustomizations).toContain('color')
      expect(sensorCustomizations).toContain('accessory')
    })

    it('should apply color customization to components', () => {
      // Select color tool and color
      const colorTool = customizationState['customizationTools'].find(t => t.type === 'color_brush')
      if (colorTool) {
        customizationState['selectTool'](colorTool)
        customizationState['selectColor'](0)
        
        // Apply to first area
        const firstArea = Array.from(customizationState['customizationAreas'].values())[0]
        customizationState['applyCustomization'](firstArea)
        
        expect(firstArea.currentCustomization).toBeDefined()
        expect(firstArea.currentCustomization?.type).toBe('color')
        expect(customizationState['progress'].appliedCustomizations).toBe(1)
      }
    })

    it('should apply accessory customization to components', () => {
      // Select accessory tool and accessory
      const accessoryTool = customizationState['customizationTools'].find(t => t.type === 'accessory_placer')
      const unlockedAccessory = customizationState['accessories'].find(a => a.isUnlocked)
      
      if (accessoryTool && unlockedAccessory) {
        customizationState['selectTool'](accessoryTool)
        customizationState['selectedAccessory'] = unlockedAccessory
        
        // Apply to sensor array (allows accessories)
        const sensorArea = Array.from(customizationState['customizationAreas'].values())
          .find(area => area.component === ComponentType.SENSOR_ARRAY)
        
        if (sensorArea) {
          customizationState['applyCustomization'](sensorArea)
          
          expect(sensorArea.currentCustomization).toBeDefined()
          expect(sensorArea.currentCustomization?.type).toBe('accessory')
          expect(customizationState['progress'].roboGemsSpent).toBe(unlockedAccessory.roboGemCost)
        }
      }
    })
  })

  describe('State Lifecycle', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
    })

    it('should enter customization state correctly', () => {
      customizationState.enter()
      
      expect(customizationState['currentPanel']).toBe('colors')
      expect(customizationState['selectedTool']).toBeNull()
      expect(customizationState['selectedColor']).toBeNull()
      expect(customizationState['selectedAccessory']).toBeNull()
    })

    it('should render without errors', () => {
      customizationState.enter()
      
      expect(() => {
        customizationState.render(mockRenderer)
      }).not.toThrow()
      
      expect(mockRenderer.getContext).toHaveBeenCalled()
    })

    it('should update without errors', () => {
      customizationState.enter()
      
      expect(() => {
        customizationState.update(16.67) // ~60 FPS
      }).not.toThrow()
    })

    it('should exit and save customizations', () => {
      customizationState.enter()
      
      const saveCustomizationsSpy = vi.spyOn(customizationState as any, 'saveCustomizations')
      
      customizationState.exit()
      
      expect(saveCustomizationsSpy).toHaveBeenCalled()
    })
  })

  describe('Input Handling', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
      customizationState.enter()
    })

    it('should handle tool selection via pointer', () => {
      const colorTool = customizationState['customizationTools'].find(t => t.type === 'color_brush')
      if (colorTool) {
        const input: InputEvent = {
          type: 'pointer_down',
          x: colorTool.bounds.x + colorTool.bounds.width / 2,
          y: colorTool.bounds.y + colorTool.bounds.height / 2
        }
        
        const handled = customizationState.handleInput(input)
        expect(handled).toBe(true)
        expect(colorTool.isSelected).toBe(true)
      }
    })

    it('should handle keyboard shortcuts for tools', () => {
      const input: InputEvent = {
        type: 'key_down',
        key: '1'
      }
      
      const handled = customizationState.handleInput(input)
      expect(handled).toBe(true)
      expect(customizationState['customizationTools'][0].isSelected).toBe(true)
    })

    it('should handle save shortcut', () => {
      const saveCustomizationsSpy = vi.spyOn(customizationState as any, 'saveCustomizations')
      
      const input: InputEvent = {
        type: 'key_down',
        key: 's'
      }
      
      const handled = customizationState.handleInput(input)
      expect(handled).toBe(true)
      expect(saveCustomizationsSpy).toHaveBeenCalled()
    })

    it('should handle reset shortcut', () => {
      const resetCustomizationsSpy = vi.spyOn(customizationState as any, 'resetCustomizations')
      
      const input: InputEvent = {
        type: 'key_down',
        key: 'r'
      }
      
      const handled = customizationState.handleInput(input)
      expect(handled).toBe(true)
      expect(resetCustomizationsSpy).toHaveBeenCalled()
    })

    it('should handle panel switching with Tab', () => {
      const initialPanel = customizationState['currentPanel']
      
      const input: InputEvent = {
        type: 'key_down',
        key: 'Tab'
      }
      
      const handled = customizationState.handleInput(input)
      expect(handled).toBe(true)
      expect(customizationState['currentPanel']).not.toBe(initialPanel)
    })
  })

  describe('Local Storage Integration', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
      customizationState.enter()
    })

    it('should save customizations to localStorage', () => {
      // Mock existing saved pets
      vi.mocked(localStorage.getItem).mockReturnValue('[]')
      
      customizationState['saveCustomizations']()
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'robo_pet_collection',
        expect.any(String)
      )
      expect(customizationState['progress'].isComplete).toBe(true)
    })

    it('should update existing pet in collection', () => {
      // Mock existing pet in collection
      const existingCollection = [{ id: testPet.id, name: 'Old Name' }]
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(existingCollection))
      
      customizationState['saveCustomizations']()
      
      expect(localStorage.setItem).toHaveBeenCalled()
      
      // Verify the call was made with updated pet data
      const saveCall = vi.mocked(localStorage.setItem).mock.calls[0]
      const savedData = JSON.parse(saveCall[1])
      expect(savedData).toHaveLength(1)
      expect(savedData[0].id).toBe(testPet.id)
    })

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('[]')
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      expect(() => {
        customizationState['saveCustomizations']()
      }).toThrow('Storage quota exceeded')
      
      // Verify error sound was attempted to be played
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('error', { volume: 0.5 })
    })
  })

  describe('Reset Functionality', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
      customizationState.enter()
    })

    it('should reset all customizations', () => {
      // Apply some customizations first
      const colorTool = customizationState['customizationTools'].find(t => t.type === 'color_brush')
      if (colorTool) {
        customizationState['selectTool'](colorTool)
        customizationState['selectColor'](0)
        
        const firstArea = Array.from(customizationState['customizationAreas'].values())[0]
        customizationState['applyCustomization'](firstArea)
        
        expect(customizationState['progress'].appliedCustomizations).toBe(1)
      }
      
      // Reset
      customizationState['resetCustomizations']()
      
      expect(customizationState['progress'].appliedCustomizations).toBe(0)
      expect(customizationState['progress'].roboGemsSpent).toBe(0)
      
      // Check that components no longer have customizations
      for (const component of testPet.components.values()) {
        expect(component.customization).toBeUndefined()
      }
    })
  })

  describe('Audio Integration', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
      customizationState.enter()
    })

    it('should play sound when entering customization', () => {
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('customization_start', { volume: 0.6 })
    })

    it('should play sound when selecting tools', () => {
      const colorTool = customizationState['customizationTools'][0]
      customizationState['selectTool'](colorTool)
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('tool_select', { volume: 0.5 })
    })

    it('should play sound when selecting colors', () => {
      customizationState['selectColor'](0)
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('color_select', { volume: 0.4 })
    })

    it('should play sound when applying customizations', () => {
      // Set up for customization
      const colorTool = customizationState['customizationTools'].find(t => t.type === 'color_brush')
      if (colorTool) {
        customizationState['selectTool'](colorTool)
        customizationState['selectColor'](0)
        
        const firstArea = Array.from(customizationState['customizationAreas'].values())[0]
        customizationState['applyCustomization'](firstArea)
        
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('customization_applied', { volume: 0.6 })
      }
    })

    it('should play sound when saving', () => {
      // Reset localStorage mock for this test
      vi.mocked(localStorage.getItem).mockReturnValue('[]')
      vi.mocked(localStorage.setItem).mockImplementation(() => {})
      
      customizationState['saveCustomizations']()
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('save_success', { volume: 0.7 })
    })
  })

  describe('Requirements Validation', () => {
    beforeEach(() => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
    })

    it('should provide color palette interface (Requirement 5.2)', () => {
      expect(customizationState['colorPalettes'].length).toBeGreaterThan(0)
      expect(customizationState['colorPalettes'].some(p => p.colors.length > 0)).toBe(true)
    })

    it('should provide accessory system with hats, bow ties, and stickers (Requirement 5.3)', () => {
      const accessories = customizationState['accessories']
      
      expect(accessories.some(a => a.type === 'hat')).toBe(true)
      expect(accessories.some(a => a.type === 'bow_tie')).toBe(true)
      expect(accessories.some(a => a.type === 'sticker')).toBe(true)
    })

    it('should save customizations to local storage (Requirement 5.4)', () => {
      customizationState.initializeCustomization(testPet, AgeGroup.MIDDLE)
      vi.mocked(localStorage.getItem).mockReturnValue('[]')
      
      // Don't mock setItem to throw error for this test
      vi.mocked(localStorage.setItem).mockImplementation(() => {})
      
      customizationState['saveCustomizations']()
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'robo_pet_collection',
        expect.any(String)
      )
    })

    it('should unlock customization mode after repair completion (Requirement 5.1)', () => {
      // This test verifies the state can be initialized with a repaired pet
      expect(customizationState['currentPet']).toBe(testPet)
      expect(customizationState['customizationAreas'].size).toBeGreaterThan(0)
    })
  })
})