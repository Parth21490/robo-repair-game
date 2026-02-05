/**
 * Property-Based Tests for Progress Tracking System
 * **Feature: robo-pet-repair-shop, Property 8: Progress Tracking Accuracy**
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { ProgressManager } from '@/progress/ProgressManager'
import { AgeGroup, ProgressEventType } from '@/progress/types'

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

describe('Progress Tracking System Properties', () => {
  let progressManager: ProgressManager

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Reset singleton instance
    // @ts-ignore - accessing private static property for testing
    ProgressManager.instance = undefined
    
    progressManager = ProgressManager.getInstance()
  })

  /**
   * **Property 8: Progress Tracking Accuracy**
   * For any player action that should contribute to progress (repairs, milestones, gem earning/spending),
   * the progress system should accurately track and update all relevant metrics and unlock appropriate rewards.
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
   */
  describe('Property 8: Progress Tracking Accuracy', () => {
    it('should accurately track repair progress and award gems consistently', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            repairTime: fc.integer({ min: 30000, max: 300000 }), // 30 seconds to 5 minutes
            problemsFixed: fc.array(
              fc.constantFrom('power_core', 'motor_system', 'sensor_array', 'chassis_plating', 'processing_unit'),
              { minLength: 1, maxLength: 5 }
            )
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (repairs) => {
          // Reset progress for clean test
          progressManager.resetProgress()
          
          let expectedTotalRepairs = 0
          let expectedGemsEarned = 0
          const mechanicalConcepts = new Set<string>()
          
          // Process each repair
          for (const repair of repairs) {
            const initialGems = progressManager.getAvailableGems()
            
            progressManager.recordRepairCompleted(repair.repairTime, repair.problemsFixed)
            
            expectedTotalRepairs++
            const finalGems = progressManager.getAvailableGems()
            const gemsAwarded = finalGems - initialGems
            expectedGemsEarned += gemsAwarded
            
            // Track expected mechanical concepts
            repair.problemsFixed.forEach(problem => {
              if (problem.includes('power_core')) mechanicalConcepts.add('Electrical Systems')
              if (problem.includes('motor_system')) mechanicalConcepts.add('Mechanical Movement')
              if (problem.includes('sensor_array')) mechanicalConcepts.add('Input/Output Systems')
              if (problem.includes('chassis_plating')) mechanicalConcepts.add('Structural Engineering')
              if (problem.includes('processing_unit')) mechanicalConcepts.add('Logic Systems')
            })
          }
          
          const progress = progressManager.getProgress()
          const stemMetrics = progressManager.getSTEMAnalytics()
          
          // Verify repair count accuracy
          expect(progress.totalRepairs).toBe(expectedTotalRepairs)
          
          // Verify gems are awarded (should be positive for any repair)
          expect(progress.roboGemsEarned).toBeGreaterThan(0)
          
          // Verify mechanical concepts are tracked
          expect(stemMetrics.mechanicalConceptsLearned.length).toBeGreaterThan(0)
          
          // Verify milestones are unlocked appropriately
          const achievements = progressManager.getAchievements()
          if (expectedTotalRepairs >= 1) {
            expect(achievements.some(a => a.id === 'first_repair')).toBe(true)
          }
          if (expectedTotalRepairs >= 5) {
            expect(achievements.some(a => a.id === 'repair_apprentice')).toBe(true)
          }
          
          // Verify gems balance consistency
          expect(progressManager.getAvailableGems()).toBe(progress.roboGemsEarned - progress.roboGemsSpent)
        }
      ), { numRuns: 50 })
    })

    it('should maintain consistent gem economy across spending and earning', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            action: fc.constantFrom('repair', 'diagnostic', 'customization', 'spend'),
            repairTime: fc.integer({ min: 60000, max: 180000 }),
            problemsFixed: fc.array(fc.constantFrom('power_core', 'motor_system'), { minLength: 1, maxLength: 3 }),
            diagnosticAccuracy: fc.float({ min: Math.fround(0.5), max: Math.fround(1.0) }),
            customizations: fc.array(fc.constantFrom('color_red', 'accessory_hat'), { minLength: 1, maxLength: 4 }),
            spendAmount: fc.integer({ min: 1, max: 20 })
          }),
          { minLength: 5, maxLength: 15 }
        ),
        (actions) => {
          progressManager.resetProgress()
          
          let totalEarned = 0
          let totalSpent = 0
          
          for (const action of actions) {
            const initialGems = progressManager.getAvailableGems()
            
            switch (action.action) {
              case 'repair':
                progressManager.recordRepairCompleted(action.repairTime, action.problemsFixed)
                break
              case 'diagnostic':
                progressManager.recordDiagnosticCompleted(action.repairTime, action.diagnosticAccuracy)
                break
              case 'customization':
                progressManager.recordCustomizationCompleted(action.repairTime, action.customizations)
                break
              case 'spend':
                const availableGems = progressManager.getAvailableGems()
                if (availableGems >= action.spendAmount) {
                  const success = progressManager.spendGems(action.spendAmount, 'test_item', 'Test Item')
                  if (success) {
                    totalSpent += action.spendAmount
                  }
                }
                break
            }
            
            const finalGems = progressManager.getAvailableGems()
            if (action.action !== 'spend') {
              const gemsEarned = finalGems - initialGems
              totalEarned += gemsEarned
            }
          }
          
          const progress = progressManager.getProgress()
          
          // Verify gem balance consistency
          expect(progress.roboGemsEarned).toBe(totalEarned)
          expect(progress.roboGemsSpent).toBe(totalSpent)
          expect(progressManager.getAvailableGems()).toBe(totalEarned - totalSpent)
          
          // Verify no negative gems
          expect(progressManager.getAvailableGems()).toBeGreaterThanOrEqual(0)
        }
      ), { numRuns: 30 })
    })

    it('should track STEM analytics accurately across different activities', () => {
      fc.assert(fc.property(
        fc.record({
          repairs: fc.array(
            fc.record({
              time: fc.integer({ min: 60000, max: 240000 }),
              problems: fc.array(
                fc.constantFrom('power_core', 'motor_system', 'sensor_array', 'chassis_plating', 'processing_unit'),
                { minLength: 1, maxLength: 4 }
              )
            }),
            { minLength: 1, maxLength: 10 }
          ),
          diagnostics: fc.array(
            fc.record({
              time: fc.integer({ min: 15000, max: 120000 }),
              accuracy: fc.float({ min: Math.fround(0.3), max: Math.fround(1.0) })
            }),
            { minLength: 0, maxLength: 5 }
          ),
          customizations: fc.array(
            fc.record({
              time: fc.integer({ min: 30000, max: 180000 }),
              items: fc.array(
                fc.constantFrom('color_red', 'color_blue', 'accessory_hat', 'accessory_bow'),
                { minLength: 1, maxLength: 6 }
              )
            }),
            { minLength: 0, maxLength: 8 }
          )
        }),
        ({ repairs, diagnostics, customizations }) => {
          progressManager.resetProgress()
          
          // Process all activities
          repairs.forEach(repair => {
            progressManager.recordRepairCompleted(repair.time, repair.problems)
          })
          
          diagnostics.forEach(diagnostic => {
            progressManager.recordDiagnosticCompleted(diagnostic.time, diagnostic.accuracy)
          })
          
          customizations.forEach(customization => {
            progressManager.recordCustomizationCompleted(customization.time, customization.items)
          })
          
          const stemMetrics = progressManager.getSTEMAnalytics()
          
          // Verify repair time tracking
          if (repairs.length > 0) {
            const expectedAverageRepairTime = repairs.reduce((sum, r) => sum + r.time, 0) / repairs.length
            expect(stemMetrics.timeToCompletion.averageRepair).toBe(expectedAverageRepairTime)
          }
          
          // Verify mechanical concepts are tracked
          const allProblems = repairs.flatMap(r => r.problems)
          const uniqueProblems = new Set(allProblems)
          if (uniqueProblems.size > 0) {
            expect(stemMetrics.mechanicalConceptsLearned.length).toBeGreaterThan(0)
          }
          
          // Verify creativity metrics
          if (customizations.length > 0) {
            expect(stemMetrics.creativityMetrics.uniqueCustomizations).toBe(customizations.length)
            
            const colorCount = customizations.reduce((count, c) => 
              count + c.items.filter(item => item.includes('color')).length, 0
            )
            expect(stemMetrics.creativityMetrics.colorVariationsUsed).toBe(colorCount)
            
            const accessoryCount = customizations.reduce((count, c) => 
              count + c.items.filter(item => item.includes('accessory')).length, 0
            )
            expect(stemMetrics.creativityMetrics.accessoryCombinations).toBe(accessoryCount)
          }
          
          // Verify problem-solving score updates with diagnostics
          if (diagnostics.length > 0) {
            expect(stemMetrics.problemSolvingScore).toBeGreaterThanOrEqual(0)
            expect(stemMetrics.problemSolvingScore).toBeLessThanOrEqual(100)
          }
        }
      ), { numRuns: 25 })
    })

    it('should unlock rewards and milestones at correct thresholds', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 60 }), // Number of repairs to complete
        (repairCount) => {
          progressManager.resetProgress()
          
          // Complete the specified number of repairs
          for (let i = 0; i < repairCount; i++) {
            progressManager.recordRepairCompleted(120000, ['power_core'])
          }
          
          const achievements = progressManager.getAchievements()
          const unlockedTools = progressManager.getUnlockedTools()
          const unlockedCustomizations = progressManager.getUnlockedCustomizations()
          
          // Verify milestone unlocking
          if (repairCount >= 1) {
            expect(achievements.some(a => a.id === 'first_repair')).toBe(true)
            expect(unlockedCustomizations).toContain('premium_color_red')
          }
          
          if (repairCount >= 5) {
            expect(achievements.some(a => a.id === 'repair_apprentice')).toBe(true)
            expect(unlockedTools).toContain('cleaning_brush')
          }
          
          if (repairCount >= 10) {
            expect(achievements.some(a => a.id === 'repair_expert')).toBe(true)
            expect(unlockedTools).toContain('diagnostic_scanner')
            expect(unlockedCustomizations).toContain('special_hat_wizard')
          }
          
          if (repairCount >= 25) {
            expect(achievements.some(a => a.id === 'repair_master')).toBe(true)
            expect(unlockedTools).toContain('premium_wrench')
            expect(unlockedCustomizations).toContain('animated_sticker_sparkle')
          }
          
          if (repairCount >= 50) {
            expect(achievements.some(a => a.id === 'repair_legend')).toBe(true)
            expect(unlockedTools).toContain('super_battery')
          }
          
          // Verify progress tracking accuracy
          expect(progressManager.getProgress().totalRepairs).toBe(repairCount)
          
          // Verify gems are awarded for each repair
          expect(progressManager.getProgress().roboGemsEarned).toBeGreaterThan(0)
        }
      ), { numRuns: 20 })
    })

    it('should maintain data consistency across age groups', () => {
      fc.assert(fc.property(
        fc.constantFrom(AgeGroup.YOUNG, AgeGroup.MIDDLE, AgeGroup.OLDER),
        fc.array(
          fc.record({
            repairTime: fc.integer({ min: 60000, max: 180000 }),
            problems: fc.array(fc.constantFrom('power_core', 'motor_system'), { minLength: 1, maxLength: 3 })
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (ageGroup, repairs) => {
          progressManager.resetProgress()
          progressManager.setAgeGroup(ageGroup)
          
          let totalGemsEarned = 0
          
          repairs.forEach(repair => {
            const initialGems = progressManager.getAvailableGems()
            progressManager.recordRepairCompleted(repair.repairTime, repair.problems)
            const finalGems = progressManager.getAvailableGems()
            totalGemsEarned += (finalGems - initialGems)
          })
          
          const progress = progressManager.getProgress()
          
          // Verify age group is set correctly
          expect(progress.ageGroup).toBe(ageGroup)
          
          // Verify repair count is accurate regardless of age group
          expect(progress.totalRepairs).toBe(repairs.length)
          
          // Verify gems are awarded (amount may vary by age group)
          expect(progress.roboGemsEarned).toBe(totalGemsEarned)
          expect(progress.roboGemsEarned).toBeGreaterThan(0)
          
          // Verify younger players get more gems (encouragement)
          if (ageGroup === AgeGroup.YOUNG && repairs.length > 0) {
            // Young players should get at least base gems + age bonus
            const averageGemsPerRepair = totalGemsEarned / repairs.length
            expect(averageGemsPerRepair).toBeGreaterThanOrEqual(10) // Base + young bonus
          }
        }
      ), { numRuns: 15 })
    })

    it('should emit progress events consistently', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            action: fc.constantFrom('repair', 'diagnostic', 'customization'),
            repairTime: fc.integer({ min: 60000, max: 180000 }),
            problems: fc.array(fc.constantFrom('power_core', 'motor_system'), { minLength: 1, maxLength: 2 }),
            accuracy: fc.float({ min: Math.fround(0.7), max: Math.fround(1.0) }),
            customizations: fc.array(fc.constantFrom('color_red', 'accessory_hat'), { minLength: 1, maxLength: 3 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (actions) => {
          progressManager.resetProgress()
          
          const events: any[] = []
          
          // Set up event listeners
          progressManager.addEventListener(ProgressEventType.REPAIR_COMPLETED, (data) => {
            events.push({ type: 'repair', data })
          })
          progressManager.addEventListener(ProgressEventType.DIAGNOSTIC_COMPLETED, (data) => {
            events.push({ type: 'diagnostic', data })
          })
          progressManager.addEventListener(ProgressEventType.CUSTOMIZATION_COMPLETED, (data) => {
            events.push({ type: 'customization', data })
          })
          progressManager.addEventListener(ProgressEventType.MILESTONE_REACHED, (data) => {
            events.push({ type: 'milestone', data })
          })
          
          // Execute actions
          actions.forEach(action => {
            switch (action.action) {
              case 'repair':
                progressManager.recordRepairCompleted(action.repairTime, action.problems)
                break
              case 'diagnostic':
                progressManager.recordDiagnosticCompleted(action.repairTime, action.accuracy)
                break
              case 'customization':
                progressManager.recordCustomizationCompleted(action.repairTime, action.customizations)
                break
            }
          })
          
          // Verify events were emitted
          const repairEvents = events.filter(e => e.type === 'repair')
          const diagnosticEvents = events.filter(e => e.type === 'diagnostic')
          const customizationEvents = events.filter(e => e.type === 'customization')
          const milestoneEvents = events.filter(e => e.type === 'milestone')
          
          // Count expected events
          const expectedRepairs = actions.filter(a => a.action === 'repair').length
          const expectedDiagnostics = actions.filter(a => a.action === 'diagnostic').length
          const expectedCustomizations = actions.filter(a => a.action === 'customization').length
          
          expect(repairEvents).toHaveLength(expectedRepairs)
          expect(diagnosticEvents).toHaveLength(expectedDiagnostics)
          expect(customizationEvents).toHaveLength(expectedCustomizations)
          
          // Verify milestone events are emitted for first repair
          if (expectedRepairs > 0) {
            expect(milestoneEvents.length).toBeGreaterThan(0)
            expect(milestoneEvents[0].data.milestone.id).toBe('first_repair')
          }
        }
      ), { numRuns: 20 })
    })
  })
})