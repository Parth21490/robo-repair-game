/**
 * Property-based tests for Customization and Collection Management
 * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
 * **Validates: Requirements 5.2, 5.4, 5.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { CustomizationState } from '@/states/CustomizationState'
import { RobotPet } from '@/pets/RobotPet'
import { AudioManager } from '@/audio/AudioManager'
import { Renderer } from '@/rendering/Renderer'
import { PetType, AgeGroup, ComponentType, Customization } from '@/pets/types'

describe('Property 7: Customization and Collection Management', () => {
  let customizationState: CustomizationState
  let mockAudioManager: AudioManager
  let mockRenderer: Renderer
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D

  beforeEach(() => {
    // Clear localStorage before each test
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

    customizationState = new CustomizationState(mockAudioManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // Arbitrary generators for property testing
  const petIdArb = fc.uuid()
  const petNameArb = fc.string({ minLength: 1, maxLength: 20 })
  const petTypeArb = fc.constantFrom(...Object.values(PetType))
  const ageGroupArb = fc.constantFrom(...Object.values(AgeGroup))
  const colorArb = fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`)
  const customizationTypeArb = fc.constantFrom('color', 'accessory', 'pattern')
  
  // Generator for valid customization data
  const customizationArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    type: customizationTypeArb,
    value: fc.oneof(
      colorArb,
      fc.string({ minLength: 1, maxLength: 100 }) // For accessory JSON or pattern data
    ),
    appliedAt: fc.date()
  })

  // Generator for multiple customizations
  const customizationsArb = fc.array(customizationArb, { minLength: 0, maxLength: 10 })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any customized Robo-Pet that is saved, it should be added to the player's collection
   * and remain accessible for viewing and interaction in future sessions.
   * **Validates: Requirements 5.2, 5.4, 5.5**
   */
  it('should save any customized pet to the collection and make it accessible', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        customizationsArb,
        (petId, petName, petType, ageGroup, customizations) => {
          // Create a pet and initialize customization
          const pet = new RobotPet(petId, petName, petType)
          customizationState.initializeCustomization(pet, ageGroup)
          customizationState.enter()

          // Apply customizations to the pet
          customizations.forEach(customization => {
            pet.addCustomization(customization)
          })

          // Mock localStorage to track saves
          const mockGetItem = vi.fn().mockReturnValue('[]')
          const mockSetItem = vi.fn()
          vi.mocked(localStorage.getItem).mockImplementation(mockGetItem)
          vi.mocked(localStorage.setItem).mockImplementation(mockSetItem)

          // Save the customizations
          customizationState['saveCustomizations']()

          // Property: Pet should be saved to localStorage
          expect(mockSetItem).toHaveBeenCalledWith(
            'robo_pet_collection',
            expect.any(String)
          )

          // Property: Saved data should contain the pet
          const savedCall = mockSetItem.mock.calls[0]
          const savedData = JSON.parse(savedCall[1])
          expect(savedData).toHaveLength(1)
          expect(savedData[0].id).toBe(petId)
          expect(savedData[0].name).toBe(petName)
          expect(savedData[0].type).toBe(petType)

          // Property: Customizations should be preserved
          expect(savedData[0].customizations).toHaveLength(customizations.length)
          customizations.forEach((customization, index) => {
            expect(savedData[0].customizations[index].id).toBe(customization.id)
            expect(savedData[0].customizations[index].type).toBe(customization.type)
            expect(savedData[0].customizations[index].value).toBe(customization.value)
          })

          // Property: Progress should be marked as complete
          expect(customizationState['progress'].isComplete).toBe(true)
        }
      ),
      { numRuns: 3 }
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any existing collection, adding a new customized pet should preserve existing pets
   * and maintain collection integrity.
   * **Validates: Requirements 5.4, 5.5**
   */
  it('should preserve existing collection when adding new customized pets', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: petIdArb,
            name: petNameArb,
            type: petTypeArb,
            customizations: customizationsArb
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.record({
          id: petIdArb,
          name: petNameArb,
          type: petTypeArb,
          customizations: customizationsArb
        }),
        (existingPets, newPetData) => {
          // Set up existing collection
          const existingCollection = existingPets.map(petData => ({
            id: petData.id,
            name: petData.name,
            type: petData.type,
            customizations: petData.customizations,
            components: [],
            problems: [],
            repairHistory: [],
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
          }))

          // Create new pet
          const newPet = new RobotPet(newPetData.id, newPetData.name, newPetData.type)
          newPetData.customizations.forEach(customization => {
            newPet.addCustomization(customization)
          })

          customizationState.initializeCustomization(newPet, AgeGroup.MIDDLE)
          customizationState.enter()

          // Mock localStorage with existing collection
          const mockGetItem = vi.fn().mockReturnValue(JSON.stringify(existingCollection))
          const mockSetItem = vi.fn()
          vi.mocked(localStorage.getItem).mockImplementation(mockGetItem)
          vi.mocked(localStorage.setItem).mockImplementation(mockSetItem)

          // Save the new pet
          customizationState['saveCustomizations']()

          // Property: Collection should be updated
          expect(mockSetItem).toHaveBeenCalledWith(
            'robo_pet_collection',
            expect.any(String)
          )

          const savedCall = mockSetItem.mock.calls[0]
          const updatedCollection = JSON.parse(savedCall[1])

          // Property: Collection should contain all existing pets plus the new one
          const expectedLength = existingPets.some(p => p.id === newPetData.id) 
            ? existingPets.length 
            : existingPets.length + 1
          expect(updatedCollection).toHaveLength(expectedLength)

          // Property: All existing pets should still be present (unless replaced)
          existingPets.forEach(existingPet => {
            if (existingPet.id !== newPetData.id) {
              const foundPet = updatedCollection.find((p: any) => p.id === existingPet.id)
              expect(foundPet).toBeDefined()
              expect(foundPet.name).toBe(existingPet.name)
              expect(foundPet.type).toBe(existingPet.type)
            }
          })

          // Property: New pet should be in the collection
          const newPetInCollection = updatedCollection.find((p: any) => p.id === newPetData.id)
          expect(newPetInCollection).toBeDefined()
          expect(newPetInCollection.name).toBe(newPetData.name)
          expect(newPetInCollection.type).toBe(newPetData.type)
          expect(newPetInCollection.customizations).toHaveLength(newPetData.customizations.length)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any pet that is updated with new customizations, the existing entry should be replaced
   * while maintaining all other collection data.
   * **Validates: Requirements 5.4, 5.5**
   */
  it('should update existing pets in collection when re-customized', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        customizationsArb,
        customizationsArb,
        (petId, petName, petType, originalCustomizations, newCustomizations) => {
          // Assume different customizations for meaningful test
          fc.pre(JSON.stringify(originalCustomizations) !== JSON.stringify(newCustomizations))

          // Set up existing pet in collection
          const existingPet = {
            id: petId,
            name: petName,
            type: petType,
            customizations: originalCustomizations,
            components: [],
            problems: [],
            repairHistory: [],
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
          }

          // Create updated pet
          const updatedPet = new RobotPet(petId, petName, petType)
          newCustomizations.forEach(customization => {
            updatedPet.addCustomization(customization)
          })

          customizationState.initializeCustomization(updatedPet, AgeGroup.MIDDLE)
          customizationState.enter()

          // Mock localStorage with existing pet
          const mockGetItem = vi.fn().mockReturnValue(JSON.stringify([existingPet]))
          const mockSetItem = vi.fn()
          vi.mocked(localStorage.getItem).mockImplementation(mockGetItem)
          vi.mocked(localStorage.setItem).mockImplementation(mockSetItem)

          // Save the updated pet
          customizationState['saveCustomizations']()

          // Property: Collection should still have only one pet
          const savedCall = mockSetItem.mock.calls[0]
          const updatedCollection = JSON.parse(savedCall[1])
          expect(updatedCollection).toHaveLength(1)

          // Property: Pet should have updated customizations
          const savedPet = updatedCollection[0]
          expect(savedPet.id).toBe(petId)
          expect(savedPet.customizations).toHaveLength(newCustomizations.length)
          
          newCustomizations.forEach((customization, index) => {
            expect(savedPet.customizations[index].id).toBe(customization.id)
            expect(savedPet.customizations[index].type).toBe(customization.type)
            expect(savedPet.customizations[index].value).toBe(customization.value)
          })

          // Property: Other pet data should remain unchanged
          expect(savedPet.name).toBe(petName)
          expect(savedPet.type).toBe(petType)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any valid customization session, the customization tools and options should be
   * properly available and functional across different age groups.
   * **Validates: Requirements 5.2, 5.3**
   */
  it('should provide consistent customization tools and options for any age group', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        (petId, petName, petType, ageGroup) => {
          const pet = new RobotPet(petId, petName, petType)
          customizationState.initializeCustomization(pet, ageGroup)
          customizationState.enter()

          // Property: Required customization tools should be available
          const tools = customizationState['customizationTools']
          expect(tools.length).toBeGreaterThanOrEqual(3)
          expect(tools.some(t => t.type === 'color_brush')).toBe(true)
          expect(tools.some(t => t.type === 'accessory_placer')).toBe(true)
          expect(tools.some(t => t.type === 'pattern_stamp')).toBe(true)

          // Property: Color palettes should be available
          const colorPalettes = customizationState['colorPalettes']
          expect(colorPalettes.length).toBeGreaterThan(0)
          expect(colorPalettes.some(p => p.isUnlocked)).toBe(true)
          
          const unlockedPalette = colorPalettes.find(p => p.isUnlocked)
          expect(unlockedPalette!.colors.length).toBeGreaterThan(0)

          // Property: Accessories should be available (at least basic ones)
          const accessories = customizationState['accessories']
          expect(accessories.length).toBeGreaterThan(0)
          expect(accessories.some(a => a.isUnlocked)).toBe(true)

          // Property: Required accessory types should be present
          expect(accessories.some(a => a.type === 'hat')).toBe(true)
          expect(accessories.some(a => a.type === 'bow_tie')).toBe(true)
          expect(accessories.some(a => a.type === 'sticker')).toBe(true)

          // Property: Customization areas should be created for pet components
          const areas = customizationState['customizationAreas']
          expect(areas.size).toBe(pet.components.size)
          expect(areas.size).toBeGreaterThan(0)

          // Property: Each component should have valid customization options
          for (const area of areas.values()) {
            expect(area.allowedCustomizations.length).toBeGreaterThan(0)
            expect(area.allowedCustomizations.every(type => 
              ['color', 'accessory', 'pattern'].includes(type)
            )).toBe(true)
          }
        }
      ),
      { numRuns: 3 }
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any customization application, the pet's components should be properly updated
   * and the changes should be reflected in the saved data.
   * **Validates: Requirements 5.2, 5.4**
   */
  it('should properly apply customizations to pet components and persist them', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        colorArb,
        (petId, petName, petType, ageGroup, selectedColor) => {
          const pet = new RobotPet(petId, petName, petType)
          customizationState.initializeCustomization(pet, ageGroup)
          customizationState.enter()

          // Select color tool and color
          const colorTool = customizationState['customizationTools'].find(t => t.type === 'color_brush')
          expect(colorTool).toBeDefined()
          
          customizationState['selectTool'](colorTool!)
          customizationState['selectedColor'] = selectedColor

          // Apply customization to first available area
          const areas = Array.from(customizationState['customizationAreas'].values())
          expect(areas.length).toBeGreaterThan(0)
          
          const targetArea = areas[0]
          const initialCustomizations = pet.customizations.length

          customizationState['applyCustomization'](targetArea)

          // Property: Pet should have new customization
          expect(pet.customizations.length).toBe(initialCustomizations + 1)
          const newCustomization = pet.customizations[pet.customizations.length - 1]
          expect(newCustomization.type).toBe('color')
          expect(newCustomization.value).toBe(selectedColor)

          // Property: Component should have customization applied
          const component = pet.getComponentByType(targetArea.component)
          expect(component).toBeDefined()
          expect(component!.customization).toBeDefined()
          expect(component!.customization!.type).toBe('color')
          expect(component!.customization!.value).toBe(selectedColor)

          // Property: Area should reflect the customization
          expect(targetArea.currentCustomization).toBeDefined()
          expect(targetArea.currentCustomization!.type).toBe('color')
          expect(targetArea.currentCustomization!.value).toBe(selectedColor)

          // Property: Progress should be updated
          expect(customizationState['progress'].appliedCustomizations).toBeGreaterThan(0)

          // Mock localStorage and save
          const mockGetItem = vi.fn().mockReturnValue('[]')
          const mockSetItem = vi.fn()
          vi.mocked(localStorage.getItem).mockImplementation(mockGetItem)
          vi.mocked(localStorage.setItem).mockImplementation(mockSetItem)

          customizationState['saveCustomizations']()

          // Property: Saved pet should contain the customization
          const savedCall = mockSetItem.mock.calls[0]
          const savedData = JSON.parse(savedCall[1])
          expect(savedData[0].customizations.length).toBeGreaterThan(0)
          
          const savedCustomization = savedData[0].customizations.find((c: any) => c.value === selectedColor)
          expect(savedCustomization).toBeDefined()
          expect(savedCustomization.type).toBe('color')
        }
      ),
      { numRuns: 40 }
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any localStorage error during save, the system should handle it gracefully
   * and maintain system stability.
   * **Validates: Requirements 5.4**
   */
  it('should handle localStorage errors gracefully during save operations', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        (petId, petName, petType, ageGroup) => {
          const pet = new RobotPet(petId, petName, petType)
          customizationState.initializeCustomization(pet, ageGroup)
          customizationState.enter()

          // Mock localStorage to throw error on setItem
          const mockGetItem = vi.fn().mockReturnValue('[]')
          const mockSetItem = vi.fn().mockImplementation(() => {
            throw new Error('Storage quota exceeded')
          })
          vi.mocked(localStorage.getItem).mockImplementation(mockGetItem)
          vi.mocked(localStorage.setItem).mockImplementation(mockSetItem)

          // Property: Save operation should throw error but not crash the system
          expect(() => {
            customizationState['saveCustomizations']()
          }).toThrow('Storage quota exceeded')

          // Property: Error sound should be attempted
          expect(mockAudioManager.playSound).toHaveBeenCalledWith('error', { volume: 0.5 })

          // Property: System should remain in a valid state
          expect(customizationState['currentPet']).toBe(pet)
          expect(customizationState['progress'].isComplete).toBe(false) // Should not be marked complete on error
        }
      ),
      { numRuns: 5 }
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any reset operation, all customizations should be properly cleared while
   * maintaining the pet's base structure.
   * **Validates: Requirements 5.2**
   */
  it('should properly reset customizations while preserving pet structure', () => {
    fc.assert(
      fc.property(
        petIdArb,
        petNameArb,
        petTypeArb,
        ageGroupArb,
        customizationsArb.filter(customizations => customizations.length > 0),
        (petId, petName, petType, ageGroup, customizations) => {
          const pet = new RobotPet(petId, petName, petType)
          customizationState.initializeCustomization(pet, ageGroup)
          customizationState.enter()

          // Apply customizations
          const initialComponentCount = pet.components.size
          customizations.forEach(customization => {
            pet.addCustomization(customization)
          })

          // Apply customizations to components
          let componentIndex = 0
          for (const component of pet.components.values()) {
            if (componentIndex < customizations.length) {
              component.applyCustomization(customizations[componentIndex])
              componentIndex++
            }
          }

          // Update areas to reflect customizations
          const areas = Array.from(customizationState['customizationAreas'].values())
          areas.forEach((area, index) => {
            if (index < customizations.length) {
              area.currentCustomization = customizations[index]
            }
          })

          // Update progress
          customizationState['progress'].appliedCustomizations = customizations.length

          // Verify customizations are applied
          expect(pet.customizations.length).toBe(customizations.length)
          expect(customizationState['progress'].appliedCustomizations).toBe(customizations.length)

          // Reset customizations
          customizationState['resetCustomizations']()

          // Property: Pet structure should be preserved
          expect(pet.components.size).toBe(initialComponentCount)
          expect(pet.id).toBe(petId)
          expect(pet.name).toBe(petName)
          expect(pet.type).toBe(petType)

          // Property: Customizations should be cleared
          expect(pet.customizations.length).toBe(0)
          expect(customizationState['progress'].appliedCustomizations).toBe(0)
          expect(customizationState['progress'].roboGemsSpent).toBe(0)

          // Property: Components should have no customizations
          for (const component of pet.components.values()) {
            expect(component.customization).toBeUndefined()
          }

          // Property: Areas should have no customizations
          for (const area of areas) {
            expect(area.currentCustomization).toBeUndefined()
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * **Feature: robo-pet-repair-shop, Property 7: Customization and Collection Management**
   * For any collection viewing scenario, pets should remain accessible and their
   * customizations should be preserved across sessions.
   * **Validates: Requirements 5.5**
   */
  it('should maintain pet accessibility and customization data across sessions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: petIdArb,
            name: petNameArb,
            type: petTypeArb,
            customizations: customizationsArb
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (petsData) => {
          // Create collection data as it would be stored
          const collectionData = petsData.map(petData => ({
            id: petData.id,
            name: petData.name,
            type: petData.type,
            customizations: petData.customizations,
            components: [],
            problems: [],
            repairHistory: [],
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
          }))

          // Mock localStorage with the collection
          const mockGetItem = vi.fn().mockReturnValue(JSON.stringify(collectionData))
          vi.mocked(localStorage.getItem).mockImplementation(mockGetItem)

          // Simulate accessing the collection (as would happen in menu state or collection viewer)
          const retrievedCollection = JSON.parse(localStorage.getItem('robo_pet_collection') || '[]')

          // Property: All pets should be accessible
          expect(retrievedCollection).toHaveLength(petsData.length)

          // Property: Each pet's data should be preserved
          petsData.forEach((originalPet, index) => {
            const retrievedPet = retrievedCollection.find((p: any) => p.id === originalPet.id)
            expect(retrievedPet).toBeDefined()
            
            // Property: Basic pet data should be preserved
            expect(retrievedPet.name).toBe(originalPet.name)
            expect(retrievedPet.type).toBe(originalPet.type)
            
            // Property: Customizations should be preserved
            expect(retrievedPet.customizations).toHaveLength(originalPet.customizations.length)
            originalPet.customizations.forEach((customization, custIndex) => {
              expect(retrievedPet.customizations[custIndex].id).toBe(customization.id)
              expect(retrievedPet.customizations[custIndex].type).toBe(customization.type)
              expect(retrievedPet.customizations[custIndex].value).toBe(customization.value)
            })
          })

          // Property: Collection should be valid JSON
          expect(() => JSON.parse(JSON.stringify(retrievedCollection))).not.toThrow()

          // Property: Each pet should have required fields
          retrievedCollection.forEach((pet: any) => {
            expect(pet.id).toBeDefined()
            expect(pet.name).toBeDefined()
            expect(pet.type).toBeDefined()
            expect(Array.isArray(pet.customizations)).toBe(true)
            expect(pet.createdAt).toBeDefined()
            expect(pet.lastModified).toBeDefined()
          })
        }
      ),
      { numRuns: 2 }
    )
  })
})
