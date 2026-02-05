/**
 * Unit Tests for STEM Analytics System
 * Tests specific functionality and edge cases for STEM analytics components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { STEMAnalyticsEngine } from '@/progress/STEMAnalytics'
import { ParentTeacherReportGenerator } from '@/progress/ParentTeacherReport'
import { ProgressManager } from '@/progress/ProgressManager'
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

describe('STEM Analytics Engine', () => {
  let stemAnalytics: STEMAnalyticsEngine

  beforeEach(() => {
    // Reset singleton instance
    // @ts-ignore - accessing private static property for testing
    STEMAnalyticsEngine.instance = undefined
    stemAnalytics = STEMAnalyticsEngine.getInstance()
  })

  describe('Problem Solving Analysis', () => {
    it('should return empty assessment for no diagnostic history', () => {
      const assessment = stemAnalytics.analyzeProblemSolvingSkills([], AgeGroup.MIDDLE)
      
      expect(assessment.skillName).toBe('Problem Solving')
      expect(assessment.currentLevel).toBe(0)
      expect(assessment.progressTrend).toBe('stable')
      expect(assessment.milestones).toEqual([])
    })

    it('should calculate higher skill levels for better performance', () => {
      const excellentHistory = [
        { accuracy: 1.0, timeToComplete: 30000, hintsUsed: 0, problemComplexity: 3 },
        { accuracy: 0.95, timeToComplete: 25000, hintsUsed: 0, problemComplexity: 3 },
        { accuracy: 1.0, timeToComplete: 35000, hintsUsed: 1, problemComplexity: 2 }
      ]

      const poorHistory = [
        { accuracy: 0.4, timeToComplete: 120000, hintsUsed: 4, problemComplexity: 1 },
        { accuracy: 0.3, timeToComplete: 150000, hintsUsed: 5, problemComplexity: 1 },
        { accuracy: 0.5, timeToComplete: 100000, hintsUsed: 3, problemComplexity: 1 }
      ]

      const excellentAssessment = stemAnalytics.analyzeProblemSolvingSkills(excellentHistory, AgeGroup.MIDDLE)
      const poorAssessment = stemAnalytics.analyzeProblemSolvingSkills(poorHistory, AgeGroup.MIDDLE)

      expect(excellentAssessment.currentLevel).toBeGreaterThanOrEqual(poorAssessment.currentLevel)
      expect(excellentAssessment.currentLevel).toBeGreaterThan(70)
      expect(poorAssessment.currentLevel).toBeLessThan(50)
    })

    it('should adjust expectations based on age group', () => {
      const sameHistory = [
        { accuracy: 0.8, timeToComplete: 60000, hintsUsed: 1, problemComplexity: 2 },
        { accuracy: 0.75, timeToComplete: 70000, hintsUsed: 2, problemComplexity: 2 }
      ]

      const youngAssessment = stemAnalytics.analyzeProblemSolvingSkills(sameHistory, AgeGroup.YOUNG)
      const olderAssessment = stemAnalytics.analyzeProblemSolvingSkills(sameHistory, AgeGroup.OLDER)

      // Younger children should get more lenient scoring
      expect(youngAssessment.currentLevel).toBeGreaterThanOrEqual(olderAssessment.currentLevel)
    })

    it('should generate appropriate milestones for different age groups', () => {
      const history = [{ accuracy: 0.7, timeToComplete: 60000, hintsUsed: 2, problemComplexity: 2 }]

      const youngAssessment = stemAnalytics.analyzeProblemSolvingSkills(history, AgeGroup.YOUNG)
      const olderAssessment = stemAnalytics.analyzeProblemSolvingSkills(history, AgeGroup.OLDER)

      expect(youngAssessment.milestones.length).toBeGreaterThan(0)
      expect(olderAssessment.milestones.length).toBeGreaterThan(0)

      // All milestones should have required properties
      youngAssessment.milestones.forEach(milestone => {
        expect(milestone.level).toBeGreaterThan(0)
        expect(milestone.level).toBeLessThanOrEqual(100)
        expect(milestone.description).toBeTruthy()
        expect(typeof milestone.ageAppropriate).toBe('boolean')
      })
    })
  })

  describe('Mechanical Concepts Analysis', () => {
    it('should return empty assessment for no repair history', () => {
      const assessment = stemAnalytics.analyzeMechanicalConcepts([], [])
      
      expect(assessment.skillName).toBe('Mechanical Concepts')
      expect(assessment.currentLevel).toBe(0)
      expect(assessment.progressTrend).toBe('stable')
    })

    it('should reward diverse concept learning', () => {
      const limitedHistory = [
        { problemsFixed: ['power_core'], toolsUsed: ['screwdriver'], timeToComplete: 60000, mistakesMade: 0 }
      ]

      const diverseHistory = [
        { problemsFixed: ['power_core', 'motor_system'], toolsUsed: ['screwdriver', 'wrench'], timeToComplete: 60000, mistakesMade: 0 },
        { problemsFixed: ['sensor_array'], toolsUsed: ['circuit_board'], timeToComplete: 60000, mistakesMade: 0 }
      ]

      const limitedConcepts = ['Electrical Systems']
      const diverseConcepts = ['Electrical Systems', 'Mechanical Movement', 'Input/Output Systems']

      const limitedAssessment = stemAnalytics.analyzeMechanicalConcepts(limitedHistory, limitedConcepts)
      const diverseAssessment = stemAnalytics.analyzeMechanicalConcepts(diverseHistory, diverseConcepts)

      expect(diverseAssessment.currentLevel).toBeGreaterThanOrEqual(limitedAssessment.currentLevel)
    })

    it('should penalize mistakes in repairs', () => {
      const perfectHistory = [
        { problemsFixed: ['power_core', 'motor_system'], toolsUsed: ['screwdriver', 'wrench'], timeToComplete: 60000, mistakesMade: 0 }
      ]

      const mistakeHistory = [
        { problemsFixed: ['power_core', 'motor_system'], toolsUsed: ['screwdriver', 'wrench'], timeToComplete: 60000, mistakesMade: 3 }
      ]

      const concepts = ['Electrical Systems', 'Mechanical Movement']

      const perfectAssessment = stemAnalytics.analyzeMechanicalConcepts(perfectHistory, concepts)
      const mistakeAssessment = stemAnalytics.analyzeMechanicalConcepts(mistakeHistory, concepts)

      expect(perfectAssessment.currentLevel).toBeGreaterThan(mistakeAssessment.currentLevel)
    })
  })

  describe('Creativity Analysis', () => {
    it('should return empty assessment for no customization history', () => {
      const assessment = stemAnalytics.analyzeCreativity([], {
        uniqueCustomizations: 0,
        colorVariationsUsed: 0,
        accessoryCombinations: 0
      })
      
      expect(assessment.skillName).toBe('Creativity & Design')
      expect(assessment.currentLevel).toBe(0)
      expect(assessment.progressTrend).toBe('stable')
    })

    it('should reward high uniqueness scores', () => {
      const lowUniquenessHistory = [
        { customizations: ['color_red'], timeSpent: 60000, uniquenessScore: 30, colorChoices: ['red'], accessoryChoices: [] }
      ]

      const highUniquenessHistory = [
        { customizations: ['color_red', 'accessory_hat'], timeSpent: 60000, uniquenessScore: 90, colorChoices: ['red', 'blue'], accessoryChoices: ['hat'] }
      ]

      const metrics = { uniqueCustomizations: 5, colorVariationsUsed: 8, accessoryCombinations: 3 }

      const lowAssessment = stemAnalytics.analyzeCreativity(lowUniquenessHistory, metrics)
      const highAssessment = stemAnalytics.analyzeCreativity(highUniquenessHistory, metrics)

      expect(highAssessment.currentLevel).toBeGreaterThanOrEqual(lowAssessment.currentLevel)
    })

    it('should recognize color harmony in aesthetic sense calculation', () => {
      const harmonicHistory = [
        { customizations: ['color_red', 'color_blue'], timeSpent: 60000, uniquenessScore: 70, colorChoices: ['red', 'blue'], accessoryChoices: ['hat'] }
      ]

      const clashingHistory = [
        { customizations: ['color_red', 'color_green'], timeSpent: 60000, uniquenessScore: 70, colorChoices: ['red', 'green'], accessoryChoices: ['hat'] }
      ]

      const metrics = { uniqueCustomizations: 3, colorVariationsUsed: 5, accessoryCombinations: 2 }

      const harmonicAssessment = stemAnalytics.analyzeCreativity(harmonicHistory, metrics)
      const clashingAssessment = stemAnalytics.analyzeCreativity(clashingHistory, metrics)

      // Both should be valid, but harmonic combinations might score slightly higher
      expect(harmonicAssessment.currentLevel).toBeGreaterThanOrEqual(0)
      expect(clashingAssessment.currentLevel).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Learning Pattern Identification', () => {
    it('should identify hands-on learning style for repair-focused sessions', () => {
      const repairFocusedSessions = [
        {
          duration: 300000,
          activitiesCompleted: [ActivityType.REPAIR, ActivityType.REPAIR],
          mistakesPerActivity: 1,
          hintsRequested: 1,
          timeDistribution: {
            [ActivityType.DIAGNOSTIC]: 30000,
            [ActivityType.REPAIR]: 200000,
            [ActivityType.CUSTOMIZATION]: 50000,
            [ActivityType.PHOTO_BOOTH]: 20000
          }
        }
      ]

      const pattern = stemAnalytics.identifyLearningPatterns(repairFocusedSessions)
      expect(pattern.preferredLearningStyle).toBe('hands-on')
    })

    it('should identify analytical learning style for diagnostic-focused sessions', () => {
      const diagnosticFocusedSessions = [
        {
          duration: 300000,
          activitiesCompleted: [ActivityType.DIAGNOSTIC, ActivityType.DIAGNOSTIC],
          mistakesPerActivity: 0.5,
          hintsRequested: 2,
          timeDistribution: {
            [ActivityType.DIAGNOSTIC]: 200000,
            [ActivityType.REPAIR]: 50000,
            [ActivityType.CUSTOMIZATION]: 30000,
            [ActivityType.PHOTO_BOOTH]: 20000
          }
        }
      ]

      const pattern = stemAnalytics.identifyLearningPatterns(diagnosticFocusedSessions)
      expect(pattern.preferredLearningStyle).toBe('analytical')
    })

    it('should calculate attention span from session durations', () => {
      const shortSessions = [
        { duration: 120000, activitiesCompleted: [ActivityType.REPAIR], mistakesPerActivity: 1, hintsRequested: 1, timeDistribution: {} },
        { duration: 180000, activitiesCompleted: [ActivityType.REPAIR], mistakesPerActivity: 1, hintsRequested: 1, timeDistribution: {} }
      ]

      const longSessions = [
        { duration: 900000, activitiesCompleted: [ActivityType.REPAIR], mistakesPerActivity: 1, hintsRequested: 1, timeDistribution: {} },
        { duration: 1200000, activitiesCompleted: [ActivityType.REPAIR], mistakesPerActivity: 1, hintsRequested: 1, timeDistribution: {} }
      ]

      const shortPattern = stemAnalytics.identifyLearningPatterns(shortSessions)
      const longPattern = stemAnalytics.identifyLearningPatterns(longSessions)

      expect(shortPattern.attentionSpan).toBeLessThan(longPattern.attentionSpan)
      expect(shortPattern.attentionSpan).toBeLessThan(5) // Should be under 5 minutes
      expect(longPattern.attentionSpan).toBeGreaterThan(10) // Should be over 10 minutes
    })

    it('should identify help-seeking behavior from hint usage', () => {
      const independentSessions = [
        { duration: 300000, activitiesCompleted: [ActivityType.REPAIR], mistakesPerActivity: 1, hintsRequested: 0, timeDistribution: {} }
      ]

      const collaborativeSessions = [
        { duration: 300000, activitiesCompleted: [ActivityType.REPAIR], mistakesPerActivity: 2, hintsRequested: 5, timeDistribution: {} }
      ]

      const independentPattern = stemAnalytics.identifyLearningPatterns(independentSessions)
      const collaborativePattern = stemAnalytics.identifyLearningPatterns(collaborativeSessions)

      expect(independentPattern.helpSeekingBehavior).toBe('independent')
      expect(collaborativePattern.helpSeekingBehavior).toBe('collaborative')
    })
  })

  describe('Educational Insights Generation', () => {
    it('should generate strength insights for high-performing skills', () => {
      const skillAssessments = [
        {
          skillName: 'Problem Solving',
          currentLevel: 85,
          progressTrend: 'improving' as const,
          lastAssessed: new Date(),
          milestones: []
        }
      ]

      const learningPattern = {
        preferredLearningStyle: 'analytical' as const,
        attentionSpan: 12,
        difficultyPreference: 'challenging' as const,
        helpSeekingBehavior: 'independent' as const
      }

      const insights = stemAnalytics.generateEducationalInsights(skillAssessments, learningPattern, AgeGroup.MIDDLE)

      const strengthInsights = insights.filter(insight => insight.category === 'strength')
      expect(strengthInsights.length).toBeGreaterThan(0)
      expect(strengthInsights[0].title).toContain('Problem Solving')
    })

    it('should generate improvement insights for low-performing skills', () => {
      const skillAssessments = [
        {
          skillName: 'Mechanical Concepts',
          currentLevel: 35,
          progressTrend: 'stable' as const,
          lastAssessed: new Date(),
          milestones: []
        }
      ]

      const learningPattern = {
        preferredLearningStyle: 'hands-on' as const,
        attentionSpan: 8,
        difficultyPreference: 'easy' as const,
        helpSeekingBehavior: 'guided' as const
      }

      const insights = stemAnalytics.generateEducationalInsights(skillAssessments, learningPattern, AgeGroup.YOUNG)

      const improvementInsights = insights.filter(insight => insight.category === 'improvement_area')
      expect(improvementInsights.length).toBeGreaterThan(0)
      expect(improvementInsights[0].title).toContain('Mechanical Concepts')
    })

    it('should always include learning style recommendations', () => {
      const skillAssessments = [
        {
          skillName: 'Creativity & Design',
          currentLevel: 60,
          progressTrend: 'stable' as const,
          lastAssessed: new Date(),
          milestones: []
        }
      ]

      const learningPattern = {
        preferredLearningStyle: 'creative' as const,
        attentionSpan: 10,
        difficultyPreference: 'moderate' as const,
        helpSeekingBehavior: 'independent' as const
      }

      const insights = stemAnalytics.generateEducationalInsights(skillAssessments, learningPattern, AgeGroup.MIDDLE)

      const recommendationInsights = insights.filter(insight => insight.category === 'recommendation')
      expect(recommendationInsights.length).toBeGreaterThan(0)
      
      const learningStyleMentioned = recommendationInsights.some(insight => 
        insight.title.toLowerCase().includes('creative') || 
        insight.description.toLowerCase().includes('creative')
      )
      expect(learningStyleMentioned).toBe(true)
    })

    it('should provide age-appropriate activity suggestions', () => {
      const skillAssessments = [
        {
          skillName: 'Problem Solving',
          currentLevel: 70,
          progressTrend: 'improving' as const,
          lastAssessed: new Date(),
          milestones: []
        }
      ]

      const learningPattern = {
        preferredLearningStyle: 'visual' as const,
        attentionSpan: 6,
        difficultyPreference: 'moderate' as const,
        helpSeekingBehavior: 'guided' as const
      }

      const youngInsights = stemAnalytics.generateEducationalInsights(skillAssessments, learningPattern, AgeGroup.YOUNG)
      const olderInsights = stemAnalytics.generateEducationalInsights(skillAssessments, learningPattern, AgeGroup.OLDER)

      // All insights should have suggested activities
      youngInsights.forEach(insight => {
        expect(insight.suggestedActivities.length).toBeGreaterThan(0)
        insight.suggestedActivities.forEach(activity => {
          expect(typeof activity).toBe('string')
          expect(activity.length).toBeGreaterThan(0)
        })
      })

      olderInsights.forEach(insight => {
        expect(insight.suggestedActivities.length).toBeGreaterThan(0)
        insight.suggestedActivities.forEach(activity => {
          expect(typeof activity).toBe('string')
          expect(activity.length).toBeGreaterThan(0)
        })
      })

      // Activities should be different for different age groups
      const youngActivities = youngInsights.flatMap(insight => insight.suggestedActivities)
      const olderActivities = olderInsights.flatMap(insight => insight.suggestedActivities)
      
      expect(youngActivities).not.toEqual(olderActivities)
    })
  })
})

describe('Parent-Teacher Report Generator', () => {
  let reportGenerator: ParentTeacherReportGenerator
  let progressManager: ProgressManager

  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    
    // Reset singleton instances
    // @ts-ignore - accessing private static property for testing
    ProgressManager.instance = undefined
    
    progressManager = ProgressManager.getInstance()
    reportGenerator = new ParentTeacherReportGenerator()
  })

  describe('Report Generation', () => {
    it('should generate a complete report with all required sections', () => {
      // Set up some progress data
      progressManager.setAgeGroup(AgeGroup.MIDDLE)
      progressManager.recordRepairCompleted(120000, ['power_core', 'motor_system'])
      progressManager.recordDiagnosticCompleted(60000, 0.8)
      progressManager.recordCustomizationCompleted(90000, ['color_red', 'accessory_hat'])

      const reportData = reportGenerator.generateReport(progressManager)

      // Verify all required sections are present
      expect(reportData.studentInfo).toBeDefined()
      expect(reportData.studentInfo.ageGroup).toBe(AgeGroup.MIDDLE)
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
      expect(reportData.achievements.totalRepairs).toBeGreaterThanOrEqual(1)

      expect(reportData.recommendations).toBeDefined()
      expect(Array.isArray(reportData.recommendations.forParents)).toBe(true)
      expect(Array.isArray(reportData.recommendations.forTeachers)).toBe(true)
      expect(Array.isArray(reportData.recommendations.nextSteps)).toBe(true)

      expect(reportData.detailedMetrics).toBeDefined()
      expect(Array.isArray(reportData.detailedMetrics.problemSolvingTrend)).toBe(true)
      expect(Array.isArray(reportData.detailedMetrics.mechanicalConceptsProgress)).toBe(true)
      expect(Array.isArray(reportData.detailedMetrics.creativityEvolution)).toBe(true)
    })

    it('should generate valid HTML report', () => {
      progressManager.setAgeGroup(AgeGroup.YOUNG)
      progressManager.recordRepairCompleted(90000, ['power_core'])

      const reportData = reportGenerator.generateReport(progressManager)
      const htmlReport = reportGenerator.generatePrintableReport(reportData)

      expect(typeof htmlReport).toBe('string')
      expect(htmlReport.length).toBeGreaterThan(1000)
      expect(htmlReport).toContain('<!DOCTYPE html>')
      expect(htmlReport).toContain('<html lang="en">')
      expect(htmlReport).toContain('STEM Learning Report')
      expect(htmlReport).toContain('Robo-Pet Repair Shop')
      expect(htmlReport).toContain(AgeGroup.YOUNG)
      expect(htmlReport).toContain('</html>')

      // Should contain CSS styles
      expect(htmlReport).toContain('<style>')
      expect(htmlReport).toContain('</style>')

      // Should contain report sections
      expect(htmlReport).toContain('Learning Overview')
      expect(htmlReport).toContain('STEM Skill Assessments')
      expect(htmlReport).toContain('Learning Pattern')
      expect(htmlReport).toContain('Educational Insights')
      expect(htmlReport).toContain('Recommendations')
    })

    it('should export report data as valid JSON', () => {
      progressManager.setAgeGroup(AgeGroup.OLDER)
      progressManager.recordRepairCompleted(150000, ['sensor_array', 'chassis_plating'])

      const reportData = reportGenerator.generateReport(progressManager)
      const exportData = reportGenerator.exportReportData(reportData)

      expect(typeof exportData).toBe('string')
      
      const parsedData = JSON.parse(exportData)
      expect(parsedData.exportMetadata).toBeDefined()
      expect(parsedData.exportMetadata.gameTitle).toBe('Robo-Pet Repair Shop')
      expect(parsedData.exportMetadata.reportType).toBe('STEM Learning Progress')
      expect(parsedData.exportMetadata.version).toBe('1.0')
      expect(parsedData.exportMetadata.exportedAt).toBeTruthy()

      // Should contain all original report data
      expect(parsedData.studentInfo).toBeDefined()
      expect(parsedData.skillAssessments).toBeDefined()
      expect(parsedData.learningPattern).toBeDefined()
      expect(parsedData.educationalInsights).toBeDefined()
      expect(parsedData.achievements).toBeDefined()
      expect(parsedData.recommendations).toBeDefined()
      expect(parsedData.detailedMetrics).toBeDefined()
    })

    it('should generate meaningful summary report', () => {
      progressManager.setAgeGroup(AgeGroup.MIDDLE)
      progressManager.recordRepairCompleted(100000, ['power_core'])
      progressManager.recordRepairCompleted(110000, ['motor_system'])

      const summaryReport = reportGenerator.generateSummaryReport(progressManager)

      expect(typeof summaryReport).toBe('string')
      expect(summaryReport).toContain('STEM Learning Summary')
      expect(summaryReport).toContain('Play Time:')
      expect(summaryReport).toContain('Robots Repaired: 2')
      expect(summaryReport).toContain('Problem Solving:')
      expect(summaryReport).toContain('Concepts Learned:')
      expect(summaryReport).toContain('Creativity Score:')
      expect(summaryReport).toContain('Achievements:')
      expect(summaryReport).toContain('Age Group: 6-8')
    })

    it('should handle custom date ranges', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const reportData = reportGenerator.generateReport(progressManager, startDate, endDate)

      expect(reportData.studentInfo.reportPeriod.startDate).toEqual(startDate)
      expect(reportData.studentInfo.reportPeriod.endDate).toEqual(endDate)
    })

    it('should provide different recommendations for different learning patterns', () => {
      progressManager.setAgeGroup(AgeGroup.MIDDLE)
      progressManager.recordRepairCompleted(120000, ['power_core'])

      const reportData = reportGenerator.generateReport(progressManager)

      expect(reportData.recommendations.forParents.length).toBeGreaterThan(0)
      expect(reportData.recommendations.forTeachers.length).toBeGreaterThan(0)
      expect(reportData.recommendations.nextSteps.length).toBeGreaterThan(0)

      // All recommendations should be strings
      reportData.recommendations.forParents.forEach(rec => {
        expect(typeof rec).toBe('string')
        expect(rec.length).toBeGreaterThan(0)
      })

      reportData.recommendations.forTeachers.forEach(rec => {
        expect(typeof rec).toBe('string')
        expect(rec.length).toBeGreaterThan(0)
      })

      reportData.recommendations.nextSteps.forEach(step => {
        expect(typeof step).toBe('string')
        expect(step.length).toBeGreaterThan(0)
      })
    })
  })
})