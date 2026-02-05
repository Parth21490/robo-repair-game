/**
 * Unit tests for RepairState
 * Tests tool selection, repair mechanics, and cleaning stage functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RepairState } from '@/states/RepairState'
import { AudioManager } from '@/audio/AudioManager'
import { OverlayHandSystem } from '@/rendering/OverlayHandSystem'
import { RobotPet } from '@/pets/RobotPet'
import { RobotPetProblem } from '@/pets/Problem'
import { PowerCore, MotorSystem, SensorArray } from '@/pets/Component'
import { ComponentType, ProblemType, ToolType, AgeGroup } from '@/pets/types'

// Mock dependencies
vi.mock('@/audio/AudioManager')
vi.mock('@/rendering/OverlayHandSystem')

describe('RepairState', () => {
  let repairState: RepairState
  let mockAudioManager: AudioManager
  let mockOverlayHandSystem: OverlayHandSystem
  let mockPet: RobotPet
  let mockProblems: RobotPetProblem[]
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = document.createElement('canvas')
    mockContext = {
      canvas: mockCanvas,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      setLineDash: vi.fn(),
      getLineDash: vi.fn(() => []),
      lineDashOffset: 0
    } as any

    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext)

    // Create mock audio manager
    mockAudioManager = new AudioManager()
    vi.spyOn(mockAudioManager, 'playSound').mockImplementation(() => {})
    vi.spyOn(mockAudioManager, 'playRepairAudio').mockImplementation(() => {})
    vi.spyOn(mockAudioManager, 'playCleaningAudio').mockImplementation(() => {})
    vi.spyOn(mockAudioManager, 'playRepairStageAudio').mockImplementation(() => {})
    vi.spyOn(mockAudioManager, 'playContextualCleaningAudio').mockImplementation(() => {})
    vi.spyOn(mockAudioManager, 'playProgressiveRepairFeedback').mockImplementation(() => {})

    // Create mock overlay hand system
    mockOverlayHandSystem = new OverlayHandSystem(mockCanvas)
    vi.spyOn(mockOverlayHandSystem, 'showTapGesture').mockImplementation(() => 'test-id')
    vi.spyOn(mockOverlayHandSystem, 'hideAllGuidingHands').mockImplementation(() => {})

    // Create mock pet with components
    mockPet = new RobotPet('test-pet', 'dog')
    
    const powerCore = new PowerCore('power-1', { x: 100, y: 100 })
    const motorSystem = new MotorSystem('motor-1', { x: 200, y: 150 })
    const sensorArray = new SensorArray('sensor-1', { x: 150, y: 80 })
    
    // Set component types explicitly to match the problems
    powerCore.type = ComponentType.POWER_CORE
    motorSystem.type = ComponentType.MOTOR_SYSTEM
    sensorArray.type = ComponentType.SENSOR_ARRAY
    
    mockPet.addComponent(powerCore)
    mockPet.addComponent(motorSystem)
    mockPet.addComponent(sensorArray)

    // Create mock problems
    mockProblems = [
      new RobotPetProblem(
        'problem-1',
        ComponentType.POWER_CORE,
        ProblemType.LOW_POWER,
        2,
        ToolType.BATTERY,
        'Power core needs recharging'
      ),
      new RobotPetProblem(
        'problem-2',
        ComponentType.MOTOR_SYSTEM,
        ProblemType.DIRTY,
        1,
        ToolType.OIL_CAN,
        'Motor system is dirty'
      ),
      new RobotPetProblem(
        'problem-3',
        ComponentType.SENSOR_ARRAY,
        ProblemType.DISCONNECTED,
        3,
        ToolType.SCREWDRIVER,
        'Sensor array is disconnected'
      )
    ]

    // Create repair state
    repairState = new RepairState(mockAudioManager, mockOverlayHandSystem)
  })

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      expect(repairState.name).toBe('Repair')
      
      const progress = repairState.getRepairProgress()
      expect(progress.totalProblems).toBe(0)
      expect(progress.fixedProblems).toBe(0)
      expect(progress.isComplete).toBe(false)
    })

    it('should initialize repair session correctly', () => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
      
      const progress = repairState.getRepairProgress()
      expect(progress.totalProblems).toBe(3)
      expect(progress.fixedProblems).toBe(0)
      expect(progress.currentProblem).toBe(mockProblems[0])
      expect(progress.selectedTool).toBeNull()
    })

    it('should set up all required tools', () => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
      
      // Access private availableTools through reflection for testing
      const availableTools = (repairState as any).availableTools
      expect(availableTools).toHaveLength(5)
      
      const toolTypes = availableTools.map((tool: any) => tool.type)
      expect(toolTypes).toContain(ToolType.SCREWDRIVER)
      expect(toolTypes).toContain(ToolType.WRENCH)
      expect(toolTypes).toContain(ToolType.OIL_CAN)
      expect(toolTypes).toContain(ToolType.BATTERY)
      expect(toolTypes).toContain(ToolType.CIRCUIT_BOARD)
    })
  })

  describe('Tool Selection', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
    })

    it('should select tool correctly', () => {
      // Directly test tool selection method
      const selectTool = (repairState as any).selectTool.bind(repairState)
      selectTool(ToolType.SCREWDRIVER)
      
      const progress = repairState.getRepairProgress()
      expect(progress.selectedTool).toBe(ToolType.SCREWDRIVER)
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('tool_select', { volume: 0.5 })
      expect(mockAudioManager.playRepairAudio).toHaveBeenCalledWith('tool_select', 50)
    })

    it('should highlight compatible areas when tool is selected', () => {
      // Access private method for testing
      const selectTool = (repairState as any).selectTool.bind(repairState)
      selectTool(ToolType.BATTERY)
      
      const progress = repairState.getRepairProgress()
      expect(progress.selectedTool).toBe(ToolType.BATTERY)
      
      // Check that compatible areas are highlighted
      const repairAreas = (repairState as any).repairAreas
      const powerCoreArea = Array.from(repairAreas.values()).find((area: any) => 
        area.component === ComponentType.POWER_CORE
      )
      expect(powerCoreArea?.isHighlighted).toBe(true)
    })

    it('should handle keyboard tool selection', () => {
      // Directly test keyboard handling method
      const handleKeyDown = (repairState as any).handleKeyDown.bind(repairState)
      const handled = handleKeyDown('1')

      expect(handled).toBe(true)
      
      const progress = repairState.getRepairProgress()
      expect(progress.selectedTool).toBe(ToolType.SCREWDRIVER) // First tool
    })
  })

  describe('Repair Tools - Requirements 3.4', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
    })

    describe('Minimum Required Tools Availability', () => {
      it('should provide all minimum required tools', () => {
        const availableTools = (repairState as any).availableTools
        const toolTypes = availableTools.map((tool: any) => tool.type)
        
        // Verify all 5 minimum required tools are available (Requirements 3.4)
        expect(toolTypes).toContain(ToolType.SCREWDRIVER)
        expect(toolTypes).toContain(ToolType.WRENCH)
        expect(toolTypes).toContain(ToolType.OIL_CAN)
        expect(toolTypes).toContain(ToolType.BATTERY)
        expect(toolTypes).toContain(ToolType.CIRCUIT_BOARD)
        
        // Ensure exactly 5 tools are provided
        expect(availableTools).toHaveLength(5)
      })

      it('should have all tools unlocked and available for use', () => {
        const availableTools = (repairState as any).availableTools
        
        // All tools should be unlocked by default
        availableTools.forEach((tool: any) => {
          expect(tool.isUnlocked).toBe(true)
        })
      })

      it('should have proper tool metadata for each required tool', () => {
        const availableTools = (repairState as any).availableTools
        
        const screwdriver = availableTools.find((tool: any) => tool.type === ToolType.SCREWDRIVER)
        expect(screwdriver).toBeDefined()
        expect(screwdriver.name).toBe('Screwdriver')
        expect(screwdriver.icon).toBe('🪛')
        expect(screwdriver.description).toBe('Fix loose connections')
        
        const wrench = availableTools.find((tool: any) => tool.type === ToolType.WRENCH)
        expect(wrench).toBeDefined()
        expect(wrench.name).toBe('Wrench')
        expect(wrench.icon).toBe('🔧')
        expect(wrench.description).toBe('Tighten mechanical parts')
        
        const oilCan = availableTools.find((tool: any) => tool.type === ToolType.OIL_CAN)
        expect(oilCan).toBeDefined()
        expect(oilCan.name).toBe('Oil Can')
        expect(oilCan.icon).toBe('🛢️')
        expect(oilCan.description).toBe('Clean dirty components')
        
        const battery = availableTools.find((tool: any) => tool.type === ToolType.BATTERY)
        expect(battery).toBeDefined()
        expect(battery.name).toBe('Battery')
        expect(battery.icon).toBe('🔋')
        expect(battery.description).toBe('Restore power')
        
        const circuitBoard = availableTools.find((tool: any) => tool.type === ToolType.CIRCUIT_BOARD)
        expect(circuitBoard).toBeDefined()
        expect(circuitBoard.name).toBe('Circuit Board')
        expect(circuitBoard.icon).toBe('💾')
        expect(circuitBoard.description).toBe('Replace broken circuits')
      })

      it('should have proper bounds for tool interaction', () => {
        const availableTools = (repairState as any).availableTools
        
        availableTools.forEach((tool: any, index: number) => {
          expect(tool.bounds).toBeDefined()
          expect(tool.bounds.x).toBe(50 + index * 80) // Expected layout
          expect(tool.bounds.y).toBe(50)
          expect(tool.bounds.width).toBe(70)
          expect(tool.bounds.height).toBe(70)
        })
      })
    })

    describe('Tool-Component Compatibility', () => {
      it('should correctly match screwdriver with disconnected components', () => {
        const selectTool = (repairState as any).selectTool.bind(repairState)
        selectTool(ToolType.SCREWDRIVER)
        
        const repairAreas = (repairState as any).repairAreas
        const sensorArea = Array.from(repairAreas.values()).find((area: any) => 
          area.component === ComponentType.SENSOR_ARRAY && area.problem.type === ProblemType.DISCONNECTED
        )
        
        expect(sensorArea).toBeDefined()
        expect(sensorArea.requiredTool).toBe(ToolType.SCREWDRIVER)
        expect(sensorArea.isHighlighted).toBe(true) // Should be highlighted when compatible tool is selected
      })

      it('should correctly match battery with low power components', () => {
        const selectTool = (repairState as any).selectTool.bind(repairState)
        selectTool(ToolType.BATTERY)
        
        const repairAreas = (repairState as any).repairAreas
        const powerCoreArea = Array.from(repairAreas.values()).find((area: any) => 
          area.component === ComponentType.POWER_CORE && area.problem.type === ProblemType.LOW_POWER
        )
        
        expect(powerCoreArea).toBeDefined()
        expect(powerCoreArea.requiredTool).toBe(ToolType.BATTERY)
        expect(powerCoreArea.isHighlighted).toBe(true)
      })

      it('should correctly match oil can with dirty components', () => {
        const selectTool = (repairState as any).selectTool.bind(repairState)
        selectTool(ToolType.OIL_CAN)
        
        const repairAreas = (repairState as any).repairAreas
        const motorArea = Array.from(repairAreas.values()).find((area: any) => 
          area.component === ComponentType.MOTOR_SYSTEM && area.problem.type === ProblemType.DIRTY
        )
        
        expect(motorArea).toBeDefined()
        expect(motorArea.requiredTool).toBe(ToolType.OIL_CAN)
        expect(motorArea.isHighlighted).toBe(true)
      })

      it('should not highlight incompatible areas', () => {
        const selectTool = (repairState as any).selectTool.bind(repairState)
        selectTool(ToolType.SCREWDRIVER) // Select screwdriver
        
        const repairAreas = (repairState as any).repairAreas
        
        // Power core requires battery, not screwdriver
        const powerCoreArea = Array.from(repairAreas.values()).find((area: any) => 
          area.component === ComponentType.POWER_CORE
        )
        expect(powerCoreArea.isHighlighted).toBe(false)
        
        // Motor system requires oil can, not screwdriver
        const motorArea = Array.from(repairAreas.values()).find((area: any) => 
          area.component === ComponentType.MOTOR_SYSTEM
        )
        expect(motorArea.isHighlighted).toBe(false)
      })

      it('should handle tool compatibility validation correctly', () => {
        const repairAreas = (repairState as any).repairAreas
        
        // Test each problem-tool pairing
        for (const area of repairAreas.values()) {
          const problem = area.problem
          const requiredTool = area.requiredTool
          
          // Verify the tool-problem mapping is logical
          switch (problem.type) {
            case ProblemType.LOW_POWER:
              expect(requiredTool).toBe(ToolType.BATTERY)
              break
            case ProblemType.DIRTY:
              expect(requiredTool).toBe(ToolType.OIL_CAN)
              break
            case ProblemType.DISCONNECTED:
              expect(requiredTool).toBe(ToolType.SCREWDRIVER)
              break
            case ProblemType.BROKEN:
              // Broken components could require various tools depending on the component
              expect([ToolType.WRENCH, ToolType.CIRCUIT_BOARD, ToolType.SCREWDRIVER]).toContain(requiredTool)
              break
          }
        }
      })

      it('should allow tool selection only for unlocked tools', () => {
        const availableTools = (repairState as any).availableTools
        const selectTool = (repairState as any).selectTool.bind(repairState)
        
        // Temporarily lock a tool for testing
        const testTool = availableTools[0]
        testTool.isUnlocked = false
        
        const initialSelectedTool = repairState.getRepairProgress().selectedTool
        selectTool(testTool.type)
        
        // Tool selection should not change for locked tools
        const finalSelectedTool = repairState.getRepairProgress().selectedTool
        expect(finalSelectedTool).toBe(initialSelectedTool)
        
        // Restore tool state
        testTool.isUnlocked = true
      })

      it('should provide visual feedback for tool compatibility', () => {
        const highlightCompatibleAreas = (repairState as any).highlightCompatibleAreas.bind(repairState)
        const repairAreas = (repairState as any).repairAreas
        
        // Test highlighting with battery tool
        highlightCompatibleAreas(ToolType.BATTERY)
        
        for (const area of repairAreas.values()) {
          if (area.requiredTool === ToolType.BATTERY && !area.isFixed) {
            expect(area.isHighlighted).toBe(true)
          } else if (!area.isFixed) {
            expect(area.isHighlighted).toBe(false)
          }
        }
      })

      it('should handle multiple tools for the same component type correctly', () => {
        // Create additional problems to test multiple tool scenarios
        const additionalProblems = [
          new RobotPetProblem(
            'problem-4',
            ComponentType.CHASSIS_PLATING,
            ProblemType.BROKEN,
            2,
            ToolType.WRENCH,
            'Chassis plating is loose'
          ),
          new RobotPetProblem(
            'problem-5',
            ComponentType.PROCESSING_UNIT,
            ProblemType.BROKEN,
            3,
            ToolType.CIRCUIT_BOARD,
            'Processing unit is damaged'
          )
        ]
        
        const allProblems = [...mockProblems, ...additionalProblems]
        repairState.initializeRepair(mockPet, allProblems, AgeGroup.MIDDLE)
        
        const availableTools = (repairState as any).availableTools
        const toolTypes = availableTools.map((tool: any) => tool.type)
        
        // Should still have all 5 required tools
        expect(toolTypes).toContain(ToolType.WRENCH)
        expect(toolTypes).toContain(ToolType.CIRCUIT_BOARD)
        expect(availableTools).toHaveLength(5)
        
        // Test wrench compatibility
        const selectTool = (repairState as any).selectTool.bind(repairState)
        selectTool(ToolType.WRENCH)
        
        const repairAreas = (repairState as any).repairAreas
        const chassisArea = Array.from(repairAreas.values()).find((area: any) => 
          area.component === ComponentType.CHASSIS_PLATING
        )
        expect(chassisArea?.isHighlighted).toBe(true)
      })
    })

    describe('Tool Interaction Edge Cases', () => {
      it('should handle tool selection when no problems exist', () => {
        // Initialize with empty problems array
        repairState.initializeRepair(mockPet, [], AgeGroup.MIDDLE)
        
        const availableTools = (repairState as any).availableTools
        expect(availableTools).toHaveLength(5) // Should still provide all tools
        
        const selectTool = (repairState as any).selectTool.bind(repairState)
        selectTool(ToolType.SCREWDRIVER)
        
        const progress = repairState.getRepairProgress()
        expect(progress.selectedTool).toBe(ToolType.SCREWDRIVER)
      })

      it('should handle tool deselection correctly', () => {
        const selectTool = (repairState as any).selectTool.bind(repairState)
        const availableTools = (repairState as any).availableTools
        
        // Select a tool
        selectTool(ToolType.BATTERY)
        expect(availableTools.find((t: any) => t.type === ToolType.BATTERY).isSelected).toBe(true)
        
        // Select a different tool
        selectTool(ToolType.SCREWDRIVER)
        expect(availableTools.find((t: any) => t.type === ToolType.BATTERY).isSelected).toBe(false)
        expect(availableTools.find((t: any) => t.type === ToolType.SCREWDRIVER).isSelected).toBe(true)
      })

      it('should maintain tool availability across different age groups', () => {
        // Test with different age groups
        const ageGroups = [AgeGroup.YOUNG, AgeGroup.MIDDLE, AgeGroup.OLDER]
        
        ageGroups.forEach(ageGroup => {
          repairState.initializeRepair(mockPet, mockProblems, ageGroup)
          
          const availableTools = (repairState as any).availableTools
          const toolTypes = availableTools.map((tool: any) => tool.type)
          
          // All age groups should have access to all required tools
          expect(toolTypes).toContain(ToolType.SCREWDRIVER)
          expect(toolTypes).toContain(ToolType.WRENCH)
          expect(toolTypes).toContain(ToolType.OIL_CAN)
          expect(toolTypes).toContain(ToolType.BATTERY)
          expect(toolTypes).toContain(ToolType.CIRCUIT_BOARD)
          expect(availableTools).toHaveLength(5)
        })
      })
    })
  })

  describe('Repair Mechanics', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
    })

    it('should handle correct tool usage', () => {
      // Select correct tool for power core problem
      const selectTool = (repairState as any).selectTool.bind(repairState)
      const attemptRepair = (repairState as any).attemptRepair.bind(repairState)
      
      selectTool(ToolType.BATTERY)
      
      // Get power core area
      const powerCoreArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.POWER_CORE
      )
      
      attemptRepair(powerCoreArea)
      
      const progress = repairState.getRepairProgress()
      expect(progress.correctToolUsages).toBe(1)
      expect(progress.repairAttempts).toBe(1)
    })

    it('should handle incorrect tool usage', () => {
      // Select wrong tool for power core problem
      const selectTool = (repairState as any).selectTool.bind(repairState)
      const attemptRepair = (repairState as any).attemptRepair.bind(repairState)
      
      selectTool(ToolType.SCREWDRIVER) // Wrong tool for power core
      
      // Get power core area
      const powerCoreArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.POWER_CORE
      )
      
      attemptRepair(powerCoreArea)
      
      const progress = repairState.getRepairProgress()
      expect(progress.incorrectToolUsages).toBe(1)
      expect(progress.repairAttempts).toBe(1)
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('incorrect_tool', { volume: 0.4 })
    })

    it('should provide hints after multiple incorrect attempts', () => {
      const selectTool = (repairState as any).selectTool.bind(repairState)
      const handleIncorrectTool = (repairState as any).handleIncorrectTool.bind(repairState)
      
      selectTool(ToolType.SCREWDRIVER)
      
      const powerCoreArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.POWER_CORE
      )
      
      // First incorrect attempt
      handleIncorrectTool(powerCoreArea)
      expect(mockOverlayHandSystem.showTapGesture).not.toHaveBeenCalled()
      
      // Manually increment the counter since we're calling the method directly
      const progress = repairState.getRepairProgress()
      ;(repairState as any).progress.incorrectToolUsages = 2
      
      // Second incorrect attempt should trigger hint
      handleIncorrectTool(powerCoreArea)
      expect(mockOverlayHandSystem.showTapGesture).toHaveBeenCalled()
    })
  })

  describe('Cleaning Stage', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
    })

    it('should start cleaning stage for dirty components', () => {
      const selectTool = (repairState as any).selectTool.bind(repairState)
      const startCleaningStage = (repairState as any).startCleaningStage.bind(repairState)
      
      selectTool(ToolType.OIL_CAN)
      
      const motorArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.MOTOR_SYSTEM
      )
      
      startCleaningStage(motorArea)
      
      const cleaningStage = repairState.getCleaningStage()
      expect(cleaningStage.isActive).toBe(true)
      expect(cleaningStage.targetArea).toBe(motorArea)
      expect(cleaningStage.dirtLevel).toBeGreaterThan(0)
      expect(cleaningStage.textureType).toBe('soft') // Motor system texture
      
      expect(mockAudioManager.playRepairStageAudio).toHaveBeenCalledWith('cleaning', ComponentType.MOTOR_SYSTEM, 70)
      expect(mockAudioManager.playCleaningAudio).toHaveBeenCalledWith('scrub', cleaningStage.dirtLevel)
    })

    it('should progress cleaning over time', () => {
      const selectTool = (repairState as any).selectTool.bind(repairState)
      const startCleaningStage = (repairState as any).startCleaningStage.bind(repairState)
      const updateCleaningStage = (repairState as any).updateCleaningStage.bind(repairState)
      
      selectTool(ToolType.OIL_CAN)
      
      const motorArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.MOTOR_SYSTEM
      )
      
      startCleaningStage(motorArea)
      
      const initialProgress = repairState.getCleaningStage().cleaningProgress
      expect(initialProgress).toBe(0)
      
      // Simulate time passing
      updateCleaningStage(1000) // 1 second
      
      const updatedProgress = repairState.getCleaningStage().cleaningProgress
      expect(updatedProgress).toBeGreaterThan(initialProgress)
    })

    it('should complete cleaning stage when progress reaches 100%', () => {
      const selectTool = (repairState as any).selectTool.bind(repairState)
      const completeCleaningStage = (repairState as any).completeCleaningStage.bind(repairState)
      
      selectTool(ToolType.OIL_CAN)
      
      const motorArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.MOTOR_SYSTEM
      )
      
      // Set up cleaning stage
      const cleaningStage = (repairState as any).cleaningStage
      cleaningStage.isActive = true
      cleaningStage.targetArea = motorArea
      cleaningStage.cleaningProgress = 100
      
      completeCleaningStage()
      
      const progress = repairState.getRepairProgress()
      expect(progress.cleaningStagesCompleted).toBe(1)
      expect(progress.fixedProblems).toBe(1)
      
      const updatedCleaningStage = repairState.getCleaningStage()
      expect(updatedCleaningStage.isActive).toBe(false)
      expect(updatedCleaningStage.targetArea).toBeNull()
    })

    it('should use different textures for different components', () => {
      const getTextureType = (repairState as any).getTextureType.bind(repairState)
      
      expect(getTextureType(ComponentType.CHASSIS_PLATING)).toBe('soft')
      expect(getTextureType(ComponentType.POWER_CORE)).toBe('squishy')
      expect(getTextureType(ComponentType.SENSOR_ARRAY)).toBe('puffy')
    })
  })

  describe('Visual Feedback', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
    })

    it('should add visual effects during repair', () => {
      const addRepairEffects = (repairState as any).addRepairEffects.bind(repairState)
      
      const motorArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.MOTOR_SYSTEM
      )
      
      addRepairEffects(motorArea, 0.5)
      
      const visualEffects = (repairState as any).visualEffects
      expect(visualEffects.size).toBeGreaterThan(0)
      
      const effect = Array.from(visualEffects.values())[0]
      expect(effect.type).toBe('sparks')
      expect(effect.particles.length).toBeGreaterThan(0)
    })

    it('should add cleaning effects during cleaning stage', () => {
      const addCleaningEffects = (repairState as any).addCleaningEffects.bind(repairState)
      
      const motorArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.MOTOR_SYSTEM
      )
      
      addCleaningEffects(motorArea)
      
      const visualEffects = (repairState as any).visualEffects
      expect(visualEffects.size).toBeGreaterThan(0)
      
      const effect = Array.from(visualEffects.values())[0]
      expect(effect.type).toBe('cleaning_bubbles')
      expect(effect.particles.length).toBe(12) // Should create 12 bubble particles
    })

    it('should add success effects when repair is completed', () => {
      const addSuccessEffects = (repairState as any).addSuccessEffects.bind(repairState)
      
      const motorArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.MOTOR_SYSTEM
      )
      
      addSuccessEffects(motorArea)
      
      const visualEffects = (repairState as any).visualEffects
      expect(visualEffects.size).toBeGreaterThan(0)
      
      const effect = Array.from(visualEffects.values())[0]
      expect(effect.type).toBe('success_burst')
      expect(effect.particles.length).toBe(16) // Should create 16 success particles
    })
  })

  describe('Audio Feedback', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
    })

    it('should play contextual cleaning audio', () => {
      const selectTool = (repairState as any).selectTool.bind(repairState)
      const startCleaningStage = (repairState as any).startCleaningStage.bind(repairState)
      
      selectTool(ToolType.OIL_CAN)
      
      const motorArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.MOTOR_SYSTEM
      )
      
      startCleaningStage(motorArea)
      
      expect(mockAudioManager.playRepairStageAudio).toHaveBeenCalledWith('cleaning', ComponentType.MOTOR_SYSTEM, 70)
      expect(mockAudioManager.playCleaningAudio).toHaveBeenCalled()
    })

    it('should play progressive repair feedback', () => {
      const performStandardRepair = (repairState as any).performStandardRepair.bind(repairState)
      
      const powerCoreArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.POWER_CORE
      )
      
      // Mock the interval behavior for testing
      vi.useFakeTimers()
      
      performStandardRepair(powerCoreArea)
      
      // Fast-forward time to trigger progress updates
      vi.advanceTimersByTime(500)
      
      expect(mockAudioManager.playProgressiveRepairFeedback).toHaveBeenCalled()
      
      vi.useRealTimers()
    })

    it('should play success audio when repair is completed', () => {
      const completeAreaRepair = (repairState as any).completeAreaRepair.bind(repairState)
      
      const powerCoreArea = Array.from((repairState as any).repairAreas.values()).find((area: any) => 
        area.component === ComponentType.POWER_CORE
      )
      
      completeAreaRepair(powerCoreArea)
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('repair_success', { volume: 0.8 })
      expect(mockAudioManager.playRepairAudio).toHaveBeenCalledWith('repair_success', 100)
      expect(mockAudioManager.playRepairStageAudio).toHaveBeenCalledWith('success', ComponentType.POWER_CORE, 90)
    })
  })

  describe('Completion', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
    })

    it('should complete repair when all problems are fixed', () => {
      const completeAreaRepair = (repairState as any).completeAreaRepair.bind(repairState)
      const completeRepair = (repairState as any).completeRepair.bind(repairState)
      
      // Fix all problems
      const repairAreas = Array.from((repairState as any).repairAreas.values())
      repairAreas.forEach((area: any) => {
        completeAreaRepair(area)
      })
      
      // Manually trigger completion since we're not running the full update loop
      completeRepair()
      
      const progress = repairState.getRepairProgress()
      expect(progress.isComplete).toBe(true)
      expect(progress.fixedProblems).toBe(3)
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('repair_complete', { volume: 0.8 })
    })

    it('should handle skip functionality', () => {
      const skipRepair = (repairState as any).skipRepair.bind(repairState)
      
      skipRepair()
      
      const progress = repairState.getRepairProgress()
      expect(progress.fixedProblems).toBe(3) // All problems should be marked as fixed
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('button_click', { volume: 0.5 })
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
      repairState.enter()
    })

    it('should render without errors', () => {
      const mockRenderer = {
        getContext: () => mockContext
      }
      
      expect(() => {
        repairState.render(mockRenderer as any)
      }).not.toThrow()
      
      // Verify that drawing methods were called
      expect(mockContext.fillRect).toHaveBeenCalled()
      expect(mockContext.fillText).toHaveBeenCalled()
    })

    it('should render cleaning stage overlay when active', () => {
      // Activate cleaning stage
      const cleaningStage = (repairState as any).cleaningStage
      cleaningStage.isActive = true
      cleaningStage.targetArea = Array.from((repairState as any).repairAreas.values())[0]
      cleaningStage.cleaningProgress = 50
      
      const mockRenderer = {
        getContext: () => mockContext
      }
      
      expect(() => {
        repairState.render(mockRenderer as any)
      }).not.toThrow()
      
      // Should render cleaning overlay
      expect(mockContext.fillText).toHaveBeenCalledWith(
        expect.stringContaining('Cleaning'),
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  describe('State Management', () => {
    it('should handle enter state correctly', () => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
      
      repairState.enter()
      
      expect(mockAudioManager.playSound).toHaveBeenCalledWith('repair_start', { volume: 0.6 })
      expect(mockAudioManager.playRepairStageAudio).toHaveBeenCalledWith('repair', 'general', 60)
      expect(mockOverlayHandSystem.showTapGesture).toHaveBeenCalled()
    })

    it('should handle exit state correctly', () => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
      repairState.enter()
      
      repairState.exit()
      
      expect(mockOverlayHandSystem.hideAllGuidingHands).toHaveBeenCalled()
      
      // Visual effects should be cleared
      const visualEffects = (repairState as any).visualEffects
      expect(visualEffects.size).toBe(0)
      
      // Cleaning stage should be deactivated
      const cleaningStage = repairState.getCleaningStage()
      expect(cleaningStage.isActive).toBe(false)
    })

    it('should handle update correctly', () => {
      repairState.initializeRepair(mockPet, mockProblems, AgeGroup.MIDDLE)
      repairState.enter()
      
      const initialTime = repairState.getRepairProgress().timeElapsed
      
      repairState.update(100) // 100ms
      
      const updatedTime = repairState.getRepairProgress().timeElapsed
      expect(updatedTime).toBe(initialTime + 100)
    })
  })
})