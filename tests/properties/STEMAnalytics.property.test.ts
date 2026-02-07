/**
 * Property-Based Tests for STEM Analytics System
 * **Feature: robo-pet-repair-shop, Property 14: STEM Analytics Tracking**
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { ProgressManager } from '@/progress/ProgressManager'
import { STEMAnalyticsEngine } from '@/progress/STEMAnalytics'
import { ParentTeacherReportGenerator } from '@/progress/ParentTeacherReport'
import { AgeGroup, ActivityType } from '@/progress/types'

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

describe('STEM Analytics System Properties', () => {
  let progressManager: ProgressManager
  let stemAnalytics: STEMAnalyticsEngine
  let reportGenerator: ParentTeacherReportGenerator

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Reset singleton instances
    // @ts-ignore - accessing private static property for testing
    ProgressManager.instance = undefined
    // @ts-ignore - accessing private static property for testing
    STEMAnalyticsEngine.instance = undefined
    
    progressManager = ProgressManager.getInstance()
    stemAnalytics = STEMAnalyticsEngine.getInstance()
    reportGenerator = new ParentTeacherReportGenerator()
  })

  /**
   * **Property 14: STEM Analytics Tracking**
   * For any educational activity (diagnostic, repair, customization), the system should track
   * relevant STEM metrics and make them available in the parent-teacher report system.
   * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
   */
  describe('Property 14: STEM Analytics Tracking', () => {
    it('should accurately track problem-solving skills across diagnostic activities', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            accuracy: fc.float({ min: Math.fround(0.3), max: Math.fround(1.0), noNaN: true }),
            timeToComplete: fc.integer({ min: 15000, max: 180000 }), // 15 seconds to 3 minutes
            hintsUsed: fc.integer({ min: 0, max: 5 }),
            problemComplexity: fc.integer({ min: 1, max: 5 })
          }),
          { minLength: 3, maxLength: 20 }
        ),
        fc.constantFrom(AgeGroup.YOUNG, AgeGroup.MIDDLE, AgeGroup.OLDER),
        (diagnosticHistory, ageGroup) => {
          progressManager.resetProgress()
          progressManager.setAgeGroup(ageGroup)
          
          // Analyze problem-solving skills
          const skillAssessment = stemAnalytics.analyzeProblemSolvingSkills(diagnosticHistory, ageGroup)
          
          // Verify skill assessment structure
          expect(skillAssessment.skillName).toBe('Problem Solving')
          expect(skillAssessment.currentLevel).toBeGreaterThanOrEqual(0)
          expect(skillAssessment.currentLevel).toBeLessThanOrEqual(100)
          expect(['improving', 'stable', 'declining']).toContain(skillAssessment.progressTrend)
          expect(skillAssessment.lastAssessed).toBeInstanceOf(Date)
          expect(Array.isArray(skillAssessment.milestones)).toBe(true)
          
          // Verify skill level correlates with performance
          const averageAccuracy = diagnosticHistory.reduce((sum, d) => sum + d.accuracy, 0) / diagnosticHistory.length
          const averageHints = diagnosticHistory.reduce((sum, d) => sum + d.hintsUsed, 0) / diagnosticHistory.length
          
          // Higher accuracy and fewer hints should generally lead to higher skill levels
          if (averageAccuracy > 0.8 && averageHints < 1) {
            expect(skillAssessment.currentLevel).toBeGreaterThan(50)
          }
          
          // Verify age-appropriate milestones
          skillAssessment.milestones.forEach(milestone => {
            expect(milestone.level).toBeGreaterThan(0)
            expect(milestone.level).toBeLessThanOrEqual(100)
            expect(milestone.description).toBeTruthy()
            expect(typeof milestone.ageAppropriate).toBe('boolean')
          })
        }
      ), { numRuns: 2 })
    })

    it('should track mechanical concept learning through repair activities', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            problemsFixed: fc.array(
              fc.constantFrom('power_core', 'motor_system', 'sensor_array', 'chassis_plating', 'processing_unit'),
              { minLength: 1, maxLength: 4 }
            ),
            toolsUsed: fc.array(
              fc.constantFrom('screwdriver', 'wrench', 'oil_can', 'battery', 'circuit_board'),
              { minLength: 1, maxLength: 3 }
            ),
            timeToComplete: fc.integer({ min: 30000, max: 300000 }), // 30 seconds to 5 minutes
            mistakesMade: fc.integer({ min: 0, max: 3 })
          }),
          { minLength: 2, maxLength: 15 }
        ),
        fc.array(
          fc.constantFrom('Electrical Systems', 'Mechanical Movement', 'Input/Output Systems', 'Structural Engineering', 'Logic Systems'),
          { minLength: 0, maxLength: 8 }
        ),
        (repairHistory, existingConcepts) => {
          // Analyze mechanical concepts
          const skillAssessment = stemAnalytics.analyzeMechanicalConcepts(repairHistory, existingConcepts)
          
          // Verify skill assessment structure
          expect(skillAssessment.skillName).toBe('Mechanical Concepts')
          expect(skillAssessment.currentLevel).toBeGreaterThanOrEqual(0)
          expect(skillAssessment.currentLevel).toBeLessThanOrEqual(100)
          expect(['improving', 'stable', 'declining']).toContain(skillAssessment.progressTrend)
          
          // Verify skill level reflects repair performance
          const totalProblems = repairHistory.reduce((sum, r) => sum + r.problemsFixed.length, 0)
          const totalMistakes = repairHistory.reduce((sum, r) => sum + r.mistakesMade, 0)
          const successRate = totalProblems > 0 ? (totalProblems - totalMistakes) / totalProblems : 0
          
          // Better performance should correlate with higher skill levels
          if (successRate > 0.8 && existingConcepts.length > 3) {
            expect(skillAssessment.currentLevel).toBeGreaterThan(40)
          }
          
          // Verify milestones are reasonable
          skillAssessment.milestones.forEach(milestone => {
            expect(milestone.level).toBeGreaterThan(0)
            expect(milestone.level).toBeLessThanOrEqual(100)
            expect(milestone.description).toBeTruthy()
          })
        }
      ), { numRuns: 2 })
    })

    it('should measure creativity through customization activities', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            customizations: fc.array(
              fc.constantFrom('color_red', 'color_blue', 'color_green', 'accessory_hat', 'accessory_bow', 'sticker_star'),
              { minLength: 1, maxLength: 6 }
            ),
            timeSpent: fc.integer({ min: 15000, max: 300000 }), // 15 seconds to 5 minutes
            uniquenessScore: fc.float({ min: Math.fround(0.3), max: Math.fround(1.0), noNaN: true }),
            colorChoices: fc.array(
              fc.constantFrom('red', 'blue', 'green', 'yellow', 'purple', 'orange'),
              { minLength: 1, maxLength: 4 }
            ),
            accessoryChoices: fc.array(
              fc.constantFrom('hat', 'bow', 'sticker', 'glasses'),
              { minLength: 0, maxLength: 3 }
            )
          }),
          { minLength: 2, maxLength: 12 }
        ),
        fc.record({
          uniqueCustomizations: fc.integer({ min: 0, max: 20 }),
          colorVariationsUsed: fc.integer({ min: 0, max: 15 }),
          accessoryCombinations: fc.integer({ min: 0, max: 10 })
        }),
        (customizationHistory, creativityMetrics) => {
          // Analyze creativity
          const skillAssessment = stemAnalytics.analyzeCreativity(customizationHistory, creativityMetrics)
          
          // Verify skill assessment structure
          expect(skillAssessment.skillName).toBe('Creativity & Design')
          expect(skillAssessment.currentLevel).toBeGreaterThanOrEqual(0)
          expect(skillAssessment.currentLevel).toBeLessThanOrEqual(100)
          expect(['improving', 'stable', 'declining']).toContain(skillAssessment.progressTrend)
          
          // Verify creativity correlates with variety and uniqueness
          const averageUniqueness = customizationHistory.reduce((sum, c) => sum + c.uniquenessScore, 0) / customizationHistory.length
          const totalColors = new Set(customizationHistory.flatMap(c => c.colorChoices)).size
          const totalAccessories = new Set(customizationHistory.flatMap(c => c.accessoryChoices)).size
          
          // High uniqueness and variety should lead to higher creativity scores
          if (averageUniqueness > 0.8 && totalColors > 3 && totalAccessories > 2) {
            expect(skillAssessment.currentLevel).toBeGreaterThan(50)
          }
          
          // Verify milestones are creativity-focused
          skillAssessment.milestones.forEach(milestone => {
            expect(milestone.level).toBeGreaterThan(0)
            expect(milestone.level).toBeLessThanOrEqual(100)
            expect(milestone.description.toLowerCase()).toMatch(/creat|design|unique|aesthetic|color|style|experiment/)
          })
        }
      ), { numRuns: 5 })
    })

    it('should identify learning patterns from player behavior', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            duration: fc.integer({ min: 60000, max: 1800000 }), // 1 minute to 30 minutes
            activitiesCompleted: fc.array(
              fc.constantFrom(ActivityType.DIAGNOSTIC, ActivityType.REPAIR, ActivityType.CUSTOMIZATION, ActivityType.PHOTO_BOOTH),
              { minLength: 1, maxLength: 4 }
            ),
            mistakesPerActivity: fc.float({ min: Math.fround(0), max: Math.fround(5), noNaN: true }),
            hintsRequested: fc.integer({ min: 0, max: 8 }),
            timeDistribution: fc.record({
              [ActivityType.DIAGNOSTIC]: fc.integer({ min: 0, max: 300000 }),
              [ActivityType.REPAIR]: fc.integer({ min: 0, max: 600000 }),
              [ActivityType.CUSTOMIZATION]: fc.integer({ min: 0, max: 400000 }),
              [ActivityType.PHOTO_BOOTH]: fc.integer({ min: 0, max: 120000 })
            })
          }),
          { minLength: 3, maxLength: 15 }
        ),
        (sessionHistory) => {
          // Identify learning patterns
          const learningPattern = stemAnalytics.identifyLearningPatterns(sessionHistory)
          
          // Verify learning pattern structure
          expect(['visual', 'hands-on', 'analytical', 'creative']).toContain(learningPattern.preferredLearningStyle)
          expect(learningPattern.attentionSpan).toBeGreaterThan(0)
          expect(learningPattern.attentionSpan).toBeLessThan(60) // Reasonable attention span in minutes
          expect(['easy', 'moderate', 'challenging']).toContain(learningPattern.difficultyPreference)
          expect(['independent', 'guided', 'collaborative']).toContain(learningPattern.helpSeekingBehavior)
          
          // Verify patterns make sense based on behavior
          const averageHints = sessionHistory.reduce((sum, s) => sum + s.hintsRequested, 0) / sessionHistory.length
          const averageMistakes = sessionHistory.reduce((sum, s) => sum + s.mistakesPerActivity, 0) / sessionHistory.length
          
          // High hint usage should correlate with collaborative help-seeking
          if (averageHints > 4) {
            expect(learningPattern.helpSeekingBehavior).toBe('collaborative')
          }
          
          // Low mistakes should correlate with challenging difficulty preference
          if (averageMistakes < 1) {
            expect(learningPattern.difficultyPreference).toBe('challenging')
          }
          
          // Verify attention span calculation
          const averageDuration = sessionHistory.reduce((sum, s) => sum + s.duration, 0) / sessionHistory.length
          const expectedAttentionSpan = Math.round(averageDuration / 60000) // Convert to minutes
          expect(Math.abs(learningPattern.attentionSpan - expectedAttentionSpan)).toBeLessThanOrEqual(2) // Allow some variance
        }
      ), { numRuns: 2 })
    })

    it('should generate appropriate educational insights for different skill levels', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            skillName: fc.constantFrom('Problem Solving', 'Mechanical Concepts', 'Creativity & Design'),
            currentLevel: fc.integer({ min: 0, max: 100 }),
            progressTrend: fc.constantFrom('improving', 'stable', 'declining'),
            milestones: fc.array(
              fc.record({
                level: fc.integer({ min: 10, max: 100 }),
                description: fc.string({ minLength: 10, maxLength: 50 }),
                ageAppropriate: fc.boolean()
              }),
              { minLength: 2, maxLength: 5 }
            )
          }),
          { minLength: 2, maxLength: 4 }
        ),
        fc.record({
          preferredLearningStyle: fc.constantFrom('visual', 'hands-on', 'analytical', 'creative'),
          attentionSpan: fc.integer({ min: 3, max: 25 }),
          difficultyPreference: fc.constantFrom('easy', 'moderate', 'challenging'),
          helpSeekingBehavior: fc.constantFrom('independent', 'guided', 'collaborative')
        }),
        fc.constantFrom(AgeGroup.YOUNG, AgeGroup.MIDDLE, AgeGroup.OLDER),
        (skillAssessments, learningPattern, ageGroup) => {
          // Generate educational insights
          const insights = stemAnalytics.generateEducationalInsights(skillAssessments, learningPattern, ageGroup)
          
          // Verify insights structure
          expect(Array.isArray(insights)).toBe(true)
          expect(insights.length).toBeGreaterThan(0)
          
          insights.forEach(insight => {
            expect(['strength', 'improvement_area', 'recommendation']).toContain(insight.category)
            expect(insight.title).toBeTruthy()
            expect(insight.description).toBeTruthy()
            expect(Array.isArray(insight.suggestedActivities)).toBe(true)
            expect(insight.parentTeacherNote).toBeTruthy()
            
            // Verify suggested activities are not empty
            expect(insight.suggestedActivities.length).toBeGreaterThan(0)
            insight.suggestedActivities.forEach(activity => {
              expect(typeof activity).toBe('string')
              expect(activity.length).toBeGreaterThan(0)
            })
          })
          
          // Verify insights are appropriate for skill levels
          const highSkills = skillAssessments.filter(skill => skill.currentLevel >= 70)
          const lowSkills = skillAssessments.filter(skill => skill.currentLevel < 50)
          
          if (highSkills.length > 0) {
            const strengthInsights = insights.filter(insight => insight.category === 'strength')
            expect(strengthInsights.length).toBeGreaterThan(0)
          }
          
          if (lowSkills.length > 0) {
            const improvementInsights = insights.filter(insight => insight.category === 'improvement_area')
            expect(improvementInsights.length).toBeGreaterThan(0)
          }
          
          // Verify learning style recommendations are present
          const recommendationInsights = insights.filter(insight => insight.category === 'recommendation')
          expect(recommendationInsights.length).toBeGreaterThan(0)
          
          // Verify learning style is mentioned in recommendations
          const learningStyleMentioned = recommendationInsights.some(insight => 
            insight.title.toLowerCase().includes(learningPattern.preferredLearningStyle) ||
            insight.description.toLowerCase().includes(learningPattern.preferredLearningStyle)
          )
          expect(learningStyleMentioned).toBe(true)
        }
      ), { numRuns: 5 })
    })

    it('should generate comprehensive parent-teacher reports with all required sections', () => {
      fc.assert(fc.property(
        fc.constantFrom(AgeGroup.YOUNG, AgeGroup.MIDDLE, AgeGroup.OLDER),
        fc.integer({ min: 5, max: 50 }), // Number of repairs
        fc.integer({ min: 1, max: 10 }), // Number of sessions
        (ageGroup, repairCount, sessionCount) => {
          progressManager.resetProgress()
          progressManager.setAgeGroup(ageGroup)
          
          // Simulate some gameplay
          for (let i = 0; i < repairCount; i++) {
            progressManager.recordRepairCompleted(
              Math.random() * 120000 + 60000, // 1-3 minutes
              ['power_core', 'motor_system'].slice(0, Math.floor(Math.random() * 2) + 1)
            )
          }
          
          // Generate report
          const reportData = reportGenerator.generateReport(progressManager)
          
          // Verify report structure
          expect(reportData.studentInfo).toBeDefined()
          expect(reportData.studentInfo.ageGroup).toBe(ageGroup)
          expect(reportData.studentInfo.playerId).toBeTruthy()
          expect(reportData.studentInfo.reportPeriod.startDate).toBeInstanceOf(Date)
          expect(reportData.studentInfo.reportPeriod.endDate).toBeInstanceOf(Date)
          
          expect(Array.isArray(reportData.skillAssessments)).toBe(true)
          expect(reportData.skillAssessments.length).toBeGreaterThan(0)
          
          expect(reportData.learningPattern).toBeDefined()
          expect(['visual', 'hands-on', 'analytical', 'creative']).toContain(reportData.learningPattern.preferredLearningStyle)
          
          expect(Array.isArray(reportData.educationalInsights)).toBe(true)
          expect(reportData.educationalInsights.length).toBeGreaterThan(0)
          
          expect(reportData.achievements).toBeDefined()
          expect(reportData.achievements.totalRepairs).toBe(repairCount)
          expect(reportData.achievements.milestonesReached).toBeGreaterThanOrEqual(0)
          
          expect(reportData.recommendations).toBeDefined()
          expect(Array.isArray(reportData.recommendations.forParents)).toBe(true)
          expect(Array.isArray(reportData.recommendations.forTeachers)).toBe(true)
          expect(Array.isArray(reportData.recommendations.nextSteps)).toBe(true)
          
          expect(reportData.detailedMetrics).toBeDefined()
          expect(Array.isArray(reportData.detailedMetrics.problemSolvingTrend)).toBe(true)
          expect(Array.isArray(reportData.detailedMetrics.mechanicalConceptsProgress)).toBe(true)
          expect(Array.isArray(reportData.detailedMetrics.creativityEvolution)).toBe(true)
          
          // Verify printable report generation
          const printableReport = reportGenerator.generatePrintableReport(reportData)
          expect(typeof printableReport).toBe('string')
          expect(printableReport.length).toBeGreaterThan(1000) // Should be substantial HTML
          expect(printableReport).toContain('<!DOCTYPE html>')
          expect(printableReport).toContain('STEM Learning Report')
          expect(printableReport).toContain(ageGroup)
          
          // Verify JSON export
          const exportData = reportGenerator.exportReportData(reportData)
          expect(typeof exportData).toBe('string')
          const parsedExport = JSON.parse(exportData)
          expect(parsedExport.exportMetadata).toBeDefined()
          expect(parsedExport.exportMetadata.gameTitle).toBe('Robo-Pet Repair Shop')
        }
      ), { numRuns: 4 })
    })

    it('should maintain STEM analytics consistency across progress manager integration', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            activity: fc.constantFrom('diagnostic', 'repair', 'customization'),
            diagnosticTime: fc.integer({ min: 30000, max: 120000 }),
            diagnosticAccuracy: fc.float({ min: Math.fround(0.5), max: Math.fround(1.0), noNaN: true }),
            hintsUsed: fc.integer({ min: 0, max: 4 }),
            repairTime: fc.integer({ min: 60000, max: 240000 }),
            problemsFixed: fc.array(
              fc.constantFrom('power_core', 'motor_system', 'sensor_array'),
              { minLength: 1, maxLength: 3 }
            ),
            toolsUsed: fc.array(
              fc.constantFrom('screwdriver', 'wrench', 'oil_can'),
              { minLength: 1, maxLength: 2 }
            ),
            customizationTime: fc.integer({ min: 30000, max: 180000 }),
            customizations: fc.array(
              fc.constantFrom('color_red', 'accessory_hat', 'sticker_star'),
              { minLength: 1, maxLength: 4 }
            )
          }),
          { minLength: 5, maxLength: 15 }
        ),
        (activities) => {
          progressManager.resetProgress()
          
          let diagnosticCount = 0
          let repairCount = 0
          let customizationCount = 0
          
          // Execute activities
          activities.forEach(activity => {
            switch (activity.activity) {
              case 'diagnostic':
                progressManager.recordDetailedDiagnostic(
                  activity.diagnosticTime,
                  activity.diagnosticAccuracy,
                  activity.hintsUsed,
                  activity.problemsFixed,
                  Math.floor(Math.random() * 2)
                )
                diagnosticCount++
                break
              case 'repair':
                progressManager.recordDetailedRepair(
                  activity.repairTime,
                  activity.problemsFixed,
                  activity.toolsUsed,
                  Math.floor(Math.random() * 2),
                  []
                )
                repairCount++
                break
              case 'customization':
                progressManager.recordDetailedCustomization(
                  activity.customizationTime,
                  activity.customizations,
                  ['red', 'blue'],
                  ['hat'],
                  Math.random() * 40 + 60
                )
                customizationCount++
                break
            }
          })
          
          // Verify STEM analytics integration
          const stemMetrics = progressManager.getSTEMAnalytics()
          const skillAssessments = progressManager.getSTEMSkillAssessments()
          const learningPattern = progressManager.getLearningPattern()
          const insights = progressManager.getEducationalInsights()
          
          // Verify metrics are updated
          expect(stemMetrics.problemSolvingScore).toBeGreaterThanOrEqual(0)
          expect(stemMetrics.problemSolvingScore).toBeLessThanOrEqual(100)
          expect(Array.isArray(stemMetrics.mechanicalConceptsLearned)).toBe(true)
          expect(stemMetrics.creativityMetrics).toBeDefined()
          
          // Verify skill assessments
          expect(Array.isArray(skillAssessments)).toBe(true)
          expect(skillAssessments.length).toBe(3) // Problem solving, mechanical, creativity
          
          skillAssessments.forEach(assessment => {
            expect(assessment.skillName).toBeTruthy()
            expect(assessment.currentLevel).toBeGreaterThanOrEqual(0)
            expect(assessment.currentLevel).toBeLessThanOrEqual(100)
            expect(['improving', 'stable', 'declining']).toContain(assessment.progressTrend)
          })
          
          // Verify learning pattern
          expect(['visual', 'hands-on', 'analytical', 'creative']).toContain(learningPattern.preferredLearningStyle)
          expect(learningPattern.attentionSpan).toBeGreaterThan(0)
          
          // Verify insights
          expect(Array.isArray(insights)).toBe(true)
          expect(insights.length).toBeGreaterThan(0)
          
          // Verify report generation works
          const summaryReport = progressManager.generateSummaryReport()
          expect(typeof summaryReport).toBe('string')
          expect(summaryReport).toContain('STEM Learning Summary')
          expect(summaryReport).toContain(repairCount.toString())
          
          const fullReport = progressManager.generateSTEMReport()
          expect(typeof fullReport).toBe('string')
          expect(fullReport.length).toBeGreaterThan(1000)
          expect(fullReport).toContain('STEM Learning Report')
        }
      ), { numRuns: 3 })
    })
  })
})
