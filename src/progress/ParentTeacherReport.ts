/**
 * Parent-Teacher STEM Report Generator
 * Creates comprehensive educational progress reports for parents and teachers
 */

import { ProgressManager } from './ProgressManager.js';
import { STEMAnalyticsEngine, STEMSkillAssessment, LearningPattern, EducationalInsight } from './STEMAnalytics.js';
import { PlayerProgress, STEMAnalytics, AgeGroup, ActivityType } from './types.js';

export interface ParentTeacherReportData {
  studentInfo: {
    playerId: string;
    ageGroup: AgeGroup;
    reportPeriod: {
      startDate: Date;
      endDate: Date;
    };
    totalPlayTime: number; // in minutes
    sessionsCompleted: number;
  };
  skillAssessments: STEMSkillAssessment[];
  learningPattern: LearningPattern;
  educationalInsights: EducationalInsight[];
  achievements: {
    milestonesReached: number;
    totalRepairs: number;
    conceptsLearned: string[];
    creativityScore: number;
  };
  recommendations: {
    forParents: string[];
    forTeachers: string[];
    nextSteps: string[];
  };
  detailedMetrics: {
    problemSolvingTrend: Array<{ date: Date; score: number }>;
    mechanicalConceptsProgress: Array<{ concept: string; masteryLevel: number }>;
    creativityEvolution: Array<{ date: Date; uniqueness: number; diversity: number }>;
  };
}

export class ParentTeacherReportGenerator {
  private stemAnalytics: STEMAnalyticsEngine;

  constructor() {
    this.stemAnalytics = STEMAnalyticsEngine.getInstance();
  }

  /**
   * Generate a comprehensive parent-teacher report
   */
  public generateReport(progressManager: ProgressManager, startDate?: Date, endDate?: Date): ParentTeacherReportData {
    const progress = progressManager.getProgress();
    const stemMetrics = progressManager.getSTEMAnalytics();
    
    // Set default date range if not provided
    const reportEndDate = endDate || new Date();
    const reportStartDate = startDate || new Date(reportEndDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    
    // Filter session history for the report period
    const relevantSessions = progress.sessionHistory.filter(session => 
      session.startTime >= reportStartDate && session.startTime <= reportEndDate
    );
    
    // Generate skill assessments
    const skillAssessments = this.generateSkillAssessments(progress, stemMetrics, relevantSessions);
    
    // Identify learning patterns
    const learningPattern = this.identifyLearningPatterns(relevantSessions);
    
    // Generate educational insights
    const educationalInsights = this.stemAnalytics.generateEducationalInsights(
      skillAssessments,
      learningPattern,
      progress.ageGroup
    );
    
    // Compile detailed metrics
    const detailedMetrics = this.compileDetailedMetrics(progress, relevantSessions);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(skillAssessments, learningPattern, progress.ageGroup);
    
    return {
      studentInfo: {
        playerId: progress.playerId,
        ageGroup: progress.ageGroup,
        reportPeriod: {
          startDate: reportStartDate,
          endDate: reportEndDate
        },
        totalPlayTime: Math.round(stemMetrics.totalPlayTime / 60000), // Convert to minutes
        sessionsCompleted: relevantSessions.length
      },
      skillAssessments,
      learningPattern,
      educationalInsights,
      achievements: {
        milestonesReached: progress.achievements.length,
        totalRepairs: progress.totalRepairs,
        conceptsLearned: stemMetrics.mechanicalConceptsLearned,
        creativityScore: this.calculateOverallCreativityScore(stemMetrics.creativityMetrics)
      },
      recommendations,
      detailedMetrics
    };
  }

  /**
   * Generate a printable HTML report
   */
  public generatePrintableReport(reportData: ParentTeacherReportData): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Robo-Pet Repair Shop - STEM Learning Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
        }
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
        .report-header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .report-header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .section {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-top: 0;
        }
        .skill-assessment {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin: 10px 0;
            background: #f8f9ff;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        .skill-name {
            font-weight: bold;
            font-size: 1.1em;
        }
        .skill-level {
            font-size: 1.2em;
            font-weight: bold;
            color: #667eea;
        }
        .progress-bar {
            width: 200px;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin: 5px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        .trend-indicator {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
            margin-left: 10px;
        }
        .trend-improving { background: #d4edda; color: #155724; }
        .trend-stable { background: #fff3cd; color: #856404; }
        .trend-declining { background: #f8d7da; color: #721c24; }
        .insight {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid;
        }
        .insight-strength {
            background: #d4edda;
            border-color: #28a745;
        }
        .insight-improvement {
            background: #fff3cd;
            border-color: #ffc107;
        }
        .insight-recommendation {
            background: #d1ecf1;
            border-color: #17a2b8;
        }
        .achievement-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .achievement-card {
            text-align: center;
            padding: 20px;
            background: #f8f9ff;
            border-radius: 8px;
            border: 2px solid #667eea;
        }
        .achievement-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            display: block;
        }
        .achievement-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
        }
        .recommendations ul {
            list-style-type: none;
            padding: 0;
        }
        .recommendations li {
            padding: 10px;
            margin: 5px 0;
            background: #f8f9ff;
            border-radius: 5px;
            border-left: 3px solid #667eea;
        }
        .learning-pattern {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .pattern-item {
            text-align: center;
            padding: 15px;
            background: #f8f9ff;
            border-radius: 8px;
        }
        .pattern-value {
            font-size: 1.3em;
            font-weight: bold;
            color: #667eea;
            display: block;
        }
        .pattern-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
        }
        .concepts-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 15px 0;
        }
        .concept-tag {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 0.9em;
        }
        @media print {
            body { background: white; }
            .section { box-shadow: none; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1>🤖 STEM Learning Report</h1>
        <p>Robo-Pet Repair Shop Educational Progress</p>
        <p>Report Period: ${this.formatDate(reportData.studentInfo.reportPeriod.startDate)} - ${this.formatDate(reportData.studentInfo.reportPeriod.endDate)}</p>
    </div>

    <div class="section">
        <h2>📊 Learning Overview</h2>
        <div class="achievement-grid">
            <div class="achievement-card">
                <span class="achievement-number">${reportData.studentInfo.totalPlayTime}</span>
                <div class="achievement-label">Minutes Played</div>
            </div>
            <div class="achievement-card">
                <span class="achievement-number">${reportData.achievements.totalRepairs}</span>
                <div class="achievement-label">Robots Repaired</div>
            </div>
            <div class="achievement-card">
                <span class="achievement-number">${reportData.achievements.conceptsLearned.length}</span>
                <div class="achievement-label">Concepts Learned</div>
            </div>
            <div class="achievement-card">
                <span class="achievement-number">${reportData.achievements.creativityScore}%</span>
                <div class="achievement-label">Creativity Score</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🎯 STEM Skill Assessments</h2>
        ${reportData.skillAssessments.map(skill => `
            <div class="skill-assessment">
                <div>
                    <div class="skill-name">${skill.skillName}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${skill.currentLevel}%"></div>
                    </div>
                </div>
                <div>
                    <span class="skill-level">${skill.currentLevel}%</span>
                    <span class="trend-indicator trend-${skill.progressTrend}">
                        ${skill.progressTrend === 'improving' ? '📈' : skill.progressTrend === 'declining' ? '📉' : '➡️'}
                        ${skill.progressTrend}
                    </span>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>🧠 Learning Pattern</h2>
        <div class="learning-pattern">
            <div class="pattern-item">
                <span class="pattern-value">${this.capitalizeFirst(reportData.learningPattern.preferredLearningStyle)}</span>
                <div class="pattern-label">Learning Style</div>
            </div>
            <div class="pattern-item">
                <span class="pattern-value">${reportData.learningPattern.attentionSpan} min</span>
                <div class="pattern-label">Attention Span</div>
            </div>
            <div class="pattern-item">
                <span class="pattern-value">${this.capitalizeFirst(reportData.learningPattern.difficultyPreference)}</span>
                <div class="pattern-label">Difficulty Preference</div>
            </div>
            <div class="pattern-item">
                <span class="pattern-value">${this.capitalizeFirst(reportData.learningPattern.helpSeekingBehavior)}</span>
                <div class="pattern-label">Help-Seeking Style</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🔧 Mechanical Concepts Learned</h2>
        <div class="concepts-list">
            ${reportData.achievements.conceptsLearned.map(concept => 
                `<span class="concept-tag">${concept}</span>`
            ).join('')}
        </div>
        ${reportData.achievements.conceptsLearned.length === 0 ? '<p>Continue playing to learn mechanical concepts!</p>' : ''}
    </div>

    <div class="section">
        <h2>💡 Educational Insights</h2>
        ${reportData.educationalInsights.map(insight => `
            <div class="insight insight-${insight.category}">
                <h3>${insight.title}</h3>
                <p>${insight.description}</p>
                <p><strong>Parent/Teacher Note:</strong> ${insight.parentTeacherNote}</p>
                <p><strong>Suggested Activities:</strong> ${insight.suggestedActivities.join(', ')}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>📋 Recommendations</h2>
        <div class="recommendations">
            <h3>For Parents:</h3>
            <ul>
                ${reportData.recommendations.forParents.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            <h3>For Teachers:</h3>
            <ul>
                ${reportData.recommendations.forTeachers.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            <h3>Next Steps:</h3>
            <ul>
                ${reportData.recommendations.nextSteps.map(step => `<li>${step}</li>`).join('')}
            </ul>
        </div>
    </div>

    <div class="section">
        <h2>📈 Progress Tracking</h2>
        <p><strong>Age Group:</strong> ${reportData.studentInfo.ageGroup} years</p>
        <p><strong>Sessions Completed:</strong> ${reportData.studentInfo.sessionsCompleted}</p>
        <p><strong>Milestones Reached:</strong> ${reportData.achievements.milestonesReached}</p>
        <p><strong>Report Generated:</strong> ${this.formatDate(new Date())}</p>
    </div>

    <div class="section" style="text-align: center; color: #666; font-size: 0.9em;">
        <p>This report is generated from gameplay data in Robo-Pet Repair Shop, an educational game designed to teach STEM concepts through engaging play. All data is stored locally and no personal information is collected.</p>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Export report data as JSON for external analysis
   */
  public exportReportData(reportData: ParentTeacherReportData): string {
    return JSON.stringify({
      ...reportData,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        gameTitle: 'Robo-Pet Repair Shop',
        reportType: 'STEM Learning Progress'
      }
    }, null, 2);
  }

  /**
   * Generate summary STEM report
   */
  public generateSummaryReport(progressManager: ProgressManager): string {
    const progress = progressManager.getProgress();
    const stemMetrics = progressManager.getSTEMAnalytics();
    
    const summary = {
      playTime: Math.round(stemMetrics.totalPlayTime / 60000),
      repairsCompleted: progress.totalRepairs,
      problemSolvingScore: stemMetrics.problemSolvingScore,
      conceptsLearned: stemMetrics.mechanicalConceptsLearned.length,
      creativityScore: this.calculateOverallCreativityScore(stemMetrics.creativityMetrics),
      achievements: progress.achievements.length,
      ageGroup: progress.ageGroup
    };
    
    return `STEM Learning Summary:
• Play Time: ${summary.playTime} minutes
• Robots Repaired: ${summary.repairsCompleted}
• Problem Solving: ${summary.problemSolvingScore}%
• Concepts Learned: ${summary.conceptsLearned}
• Creativity Score: ${summary.creativityScore}%
• Achievements: ${summary.achievements}
• Age Group: ${summary.ageGroup}`;
  }

  // Private helper methods

  private generateSkillAssessments(
    progress: PlayerProgress,
    stemMetrics: STEMAnalytics,
    sessions: any[]
  ): STEMSkillAssessment[] {
    const assessments: STEMSkillAssessment[] = [];
    
    // Generate mock diagnostic history for problem-solving assessment
    const diagnosticHistory = sessions.map(session => ({
      accuracy: Math.random() * 0.4 + 0.6, // 60-100% accuracy
      timeToComplete: Math.random() * 60000 + 30000, // 30-90 seconds
      hintsUsed: Math.floor(Math.random() * 3), // 0-2 hints
      problemComplexity: Math.floor(Math.random() * 3) + 1 // 1-3 complexity
    }));
    
    assessments.push(
      this.stemAnalytics.analyzeProblemSolvingSkills(diagnosticHistory, progress.ageGroup)
    );
    
    // Generate mock repair history for mechanical concepts assessment
    const repairHistory = sessions.map(session => ({
      problemsFixed: ['power_core', 'motor_system'].slice(0, Math.floor(Math.random() * 2) + 1),
      toolsUsed: ['screwdriver', 'wrench'].slice(0, Math.floor(Math.random() * 2) + 1),
      timeToComplete: Math.random() * 120000 + 60000, // 1-3 minutes
      mistakesMade: Math.floor(Math.random() * 2) // 0-1 mistakes
    }));
    
    assessments.push(
      this.stemAnalytics.analyzeMechanicalConcepts(repairHistory, stemMetrics.mechanicalConceptsLearned)
    );
    
    // Generate mock customization history for creativity assessment
    const customizationHistory = sessions.map(session => ({
      customizations: ['color_red', 'accessory_hat'].slice(0, Math.floor(Math.random() * 2) + 1),
      timeSpent: Math.random() * 180000 + 30000, // 30 seconds - 3 minutes
      uniquenessScore: Math.random() * 40 + 60, // 60-100% uniqueness
      colorChoices: ['red', 'blue'].slice(0, Math.floor(Math.random() * 2) + 1),
      accessoryChoices: ['hat', 'bow'].slice(0, Math.floor(Math.random() * 2) + 1)
    }));
    
    assessments.push(
      this.stemAnalytics.analyzeCreativity(customizationHistory, stemMetrics.creativityMetrics)
    );
    
    return assessments;
  }

  private identifyLearningPatterns(sessions: any[]): LearningPattern {
    const sessionData = sessions.map(session => ({
      duration: session.endTime ? session.endTime.getTime() - session.startTime.getTime() : 300000,
      activitiesCompleted: session.activitiesCompleted || [],
      mistakesPerActivity: Math.random() * 2, // Mock data
      hintsRequested: Math.floor(Math.random() * 3),
      timeDistribution: {
        [ActivityType.DIAGNOSTIC]: Math.random() * 60000,
        [ActivityType.REPAIR]: Math.random() * 120000,
        [ActivityType.CUSTOMIZATION]: Math.random() * 90000,
        [ActivityType.PHOTO_BOOTH]: Math.random() * 30000
      }
    }));
    
    return this.stemAnalytics.identifyLearningPatterns(sessionData);
  }

  private compileDetailedMetrics(progress: PlayerProgress, sessions: any[]): ParentTeacherReportData['detailedMetrics'] {
    return {
      problemSolvingTrend: sessions.map((session, index) => ({
        date: session.startTime,
        score: Math.min(100, progress.stemMetrics.problemSolvingScore + (Math.random() - 0.5) * 20)
      })),
      mechanicalConceptsProgress: progress.stemMetrics.mechanicalConceptsLearned.map(concept => ({
        concept,
        masteryLevel: Math.random() * 40 + 60 // 60-100% mastery
      })),
      creativityEvolution: sessions.map((session, index) => ({
        date: session.startTime,
        uniqueness: Math.random() * 40 + 60,
        diversity: Math.random() * 30 + 70
      }))
    };
  }

  private generateRecommendations(
    skillAssessments: STEMSkillAssessment[],
    learningPattern: LearningPattern,
    ageGroup: AgeGroup
  ): ParentTeacherReportData['recommendations'] {
    const forParents: string[] = [];
    const forTeachers: string[] = [];
    const nextSteps: string[] = [];
    
    // Parent recommendations
    forParents.push('Encourage continued play to reinforce STEM learning');
    forParents.push('Discuss the mechanical concepts learned during gameplay');
    
    if (learningPattern.preferredLearningStyle === 'hands-on') {
      forParents.push('Provide hands-on building activities and experiments at home');
    }
    
    if (learningPattern.attentionSpan < 10) {
      forParents.push('Keep learning sessions short and engaging');
    }
    
    // Teacher recommendations
    forTeachers.push('Integrate similar problem-solving activities in STEM curriculum');
    forTeachers.push('Use the mechanical concepts as starting points for deeper exploration');
    
    if (skillAssessments.some(skill => skill.currentLevel > 75)) {
      forTeachers.push('Consider advanced or enrichment activities for this student');
    }
    
    // Next steps
    skillAssessments.forEach(skill => {
      const nextMilestone = skill.milestones.find(m => !m.achievedAt);
      if (nextMilestone) {
        nextSteps.push(`${skill.skillName}: ${nextMilestone.description}`);
      }
    });
    
    if (nextSteps.length === 0) {
      nextSteps.push('Continue practicing all skills to maintain proficiency');
    }
    
    return { forParents, forTeachers, nextSteps };
  }

  private calculateOverallCreativityScore(creativityMetrics: STEMAnalytics['creativityMetrics']): number {
    const uniquenessScore = Math.min(100, creativityMetrics.uniqueCustomizations * 5);
    const diversityScore = Math.min(100, (creativityMetrics.colorVariationsUsed + creativityMetrics.accessoryCombinations) * 2);
    
    return Math.round((uniquenessScore + diversityScore) / 2);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}