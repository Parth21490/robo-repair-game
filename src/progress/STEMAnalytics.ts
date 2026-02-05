/**
 * STEM Analytics System
 * Enhanced educational progress tracking for problem-solving skills, mechanical concepts, and creativity
 */

import { STEMAnalytics, AgeGroup, ActivityType } from './types.js';

export interface STEMSkillAssessment {
  skillName: string;
  currentLevel: number; // 0-100
  progressTrend: 'improving' | 'stable' | 'declining';
  lastAssessed: Date;
  milestones: STEMSkillMilestone[];
}

export interface STEMSkillMilestone {
  level: number;
  description: string;
  achievedAt?: Date;
  ageAppropriate: boolean;
}

export interface LearningPattern {
  preferredLearningStyle: 'visual' | 'hands-on' | 'analytical' | 'creative';
  attentionSpan: number; // average session time in minutes
  difficultyPreference: 'easy' | 'moderate' | 'challenging';
  helpSeekingBehavior: 'independent' | 'guided' | 'collaborative';
}

export interface EducationalInsight {
  category: 'strength' | 'improvement_area' | 'recommendation';
  title: string;
  description: string;
  suggestedActivities: string[];
  parentTeacherNote: string;
}

export class STEMAnalyticsEngine {
  private static instance: STEMAnalyticsEngine;
  
  private constructor() {}
  
  public static getInstance(): STEMAnalyticsEngine {
    if (!STEMAnalyticsEngine.instance) {
      STEMAnalyticsEngine.instance = new STEMAnalyticsEngine();
    }
    return STEMAnalyticsEngine.instance;
  }

  /**
   * Analyze problem-solving skills based on diagnostic performance
   */
  public analyzeProblemSolvingSkills(
    diagnosticHistory: Array<{
      accuracy: number;
      timeToComplete: number;
      hintsUsed: number;
      problemComplexity: number;
    }>,
    ageGroup: AgeGroup
  ): STEMSkillAssessment {
    if (diagnosticHistory.length === 0) {
      return this.createEmptySkillAssessment('Problem Solving');
    }

    // Calculate current skill level based on recent performance
    const recentPerformance = diagnosticHistory.slice(-10); // Last 10 diagnostics
    const averageAccuracy = recentPerformance.reduce((sum, d) => sum + d.accuracy, 0) / recentPerformance.length;
    const averageSpeed = this.calculateSpeedScore(recentPerformance, ageGroup);
    const independenceScore = this.calculateIndependenceScore(recentPerformance);
    
    // Weight accuracy more heavily and ensure poor performance gets low scores
    const accuracyScore = averageAccuracy * 100; // Convert to 0-100 scale
    const currentLevel = Math.round((accuracyScore * 0.5 + averageSpeed * 0.25 + independenceScore * 0.25));
    
    // Determine progress trend
    const progressTrend = this.calculateProgressTrend(diagnosticHistory.map(d => d.accuracy));
    
    // Generate age-appropriate milestones
    const milestones = this.generateProblemSolvingMilestones(ageGroup);
    
    return {
      skillName: 'Problem Solving',
      currentLevel: Math.min(100, Math.max(0, currentLevel)),
      progressTrend,
      lastAssessed: new Date(),
      milestones: milestones.map(milestone => ({
        ...milestone,
        achievedAt: currentLevel >= milestone.level ? new Date() : undefined
      }))
    };
  }

  /**
   * Analyze mechanical concept understanding
   */
  public analyzeMechanicalConcepts(
    repairHistory: Array<{
      problemsFixed: string[];
      toolsUsed: string[];
      timeToComplete: number;
      mistakesMade: number;
    }>,
    mechanicalConceptsLearned: string[]
  ): STEMSkillAssessment {
    if (repairHistory.length === 0) {
      return this.createEmptySkillAssessment('Mechanical Concepts');
    }

    // Analyze concept mastery
    const conceptMastery = this.calculateConceptMastery(repairHistory, mechanicalConceptsLearned);
    const toolProficiency = this.calculateToolProficiency(repairHistory);
    const systemsThinking = this.calculateSystemsThinking(repairHistory);
    
    const currentLevel = Math.round((conceptMastery * 40 + toolProficiency * 30 + systemsThinking * 30));
    
    const progressTrend = this.calculateProgressTrend(
      repairHistory.map(r => (r.problemsFixed.length - r.mistakesMade) / r.problemsFixed.length)
    );
    
    return {
      skillName: 'Mechanical Concepts',
      currentLevel: Math.min(100, Math.max(0, currentLevel)),
      progressTrend,
      lastAssessed: new Date(),
      milestones: this.generateMechanicalMilestones().map(milestone => ({
        ...milestone,
        achievedAt: currentLevel >= milestone.level ? new Date() : undefined
      }))
    };
  }

  /**
   * Analyze creativity and design thinking
   */
  public analyzeCreativity(
    customizationHistory: Array<{
      customizations: string[];
      timeSpent: number;
      uniquenessScore: number;
      colorChoices: string[];
      accessoryChoices: string[];
    }>,
    creativityMetrics: STEMAnalytics['creativityMetrics']
  ): STEMSkillAssessment {
    if (customizationHistory.length === 0) {
      return this.createEmptySkillAssessment('Creativity & Design');
    }

    // Calculate creativity dimensions
    const originalityScore = this.calculateOriginalityScore(customizationHistory);
    const diversityScore = this.calculateDiversityScore(creativityMetrics);
    const aestheticSense = this.calculateAestheticSense(customizationHistory);
    
    const currentLevel = Math.round((originalityScore * 40 + diversityScore * 30 + aestheticSense * 30));
    
    const progressTrend = this.calculateProgressTrend(
      customizationHistory.map(c => c.uniquenessScore)
    );
    
    return {
      skillName: 'Creativity & Design',
      currentLevel: Math.min(100, Math.max(0, currentLevel)),
      progressTrend,
      lastAssessed: new Date(),
      milestones: this.generateCreativityMilestones().map(milestone => ({
        ...milestone,
        achievedAt: currentLevel >= milestone.level ? new Date() : undefined
      }))
    };
  }

  /**
   * Identify learning patterns from player behavior
   */
  public identifyLearningPatterns(
    sessionHistory: Array<{
      duration: number;
      activitiesCompleted: ActivityType[];
      mistakesPerActivity: number;
      hintsRequested: number;
      timeDistribution: { [key in ActivityType]?: number };
    }>
  ): LearningPattern {
    if (sessionHistory.length === 0) {
      return {
        preferredLearningStyle: 'hands-on',
        attentionSpan: 5,
        difficultyPreference: 'moderate',
        helpSeekingBehavior: 'independent'
      };
    }

    // Analyze preferred learning style
    const preferredLearningStyle = this.identifyLearningStyle(sessionHistory);
    
    // Calculate average attention span
    const attentionSpan = sessionHistory.reduce((sum, s) => sum + s.duration, 0) / sessionHistory.length / 60000; // Convert to minutes
    
    // Determine difficulty preference
    const difficultyPreference = this.identifyDifficultyPreference(sessionHistory);
    
    // Analyze help-seeking behavior
    const helpSeekingBehavior = this.identifyHelpSeekingBehavior(sessionHistory);
    
    return {
      preferredLearningStyle,
      attentionSpan: Math.round(attentionSpan),
      difficultyPreference,
      helpSeekingBehavior
    };
  }

  /**
   * Generate educational insights for parents and teachers
   */
  public generateEducationalInsights(
    skillAssessments: STEMSkillAssessment[],
    learningPattern: LearningPattern,
    ageGroup: AgeGroup
  ): EducationalInsight[] {
    const insights: EducationalInsight[] = [];
    
    // Analyze strengths
    const strongestSkill = skillAssessments.reduce((prev, current) => 
      current.currentLevel > prev.currentLevel ? current : prev
    );
    
    if (strongestSkill.currentLevel >= 70) {
      insights.push({
        category: 'strength',
        title: `Excellent ${strongestSkill.skillName} Skills`,
        description: `Shows strong aptitude in ${strongestSkill.skillName.toLowerCase()} with a skill level of ${strongestSkill.currentLevel}%.`,
        suggestedActivities: this.getSuggestedActivitiesForStrength(strongestSkill.skillName, ageGroup),
        parentTeacherNote: `Consider providing more challenging activities in ${strongestSkill.skillName.toLowerCase()} to maintain engagement.`
      });
    }
    
    // Identify improvement areas
    const weakestSkill = skillAssessments.reduce((prev, current) => 
      current.currentLevel < prev.currentLevel ? current : prev
    );
    
    if (weakestSkill.currentLevel < 50) {
      insights.push({
        category: 'improvement_area',
        title: `Developing ${weakestSkill.skillName} Skills`,
        description: `Shows potential for growth in ${weakestSkill.skillName.toLowerCase()}. Current skill level: ${weakestSkill.currentLevel}%.`,
        suggestedActivities: this.getSuggestedActivitiesForImprovement(weakestSkill.skillName, ageGroup),
        parentTeacherNote: `Provide additional support and practice opportunities in ${weakestSkill.skillName.toLowerCase()}.`
      });
    }
    
    // Learning style recommendations
    insights.push({
      category: 'recommendation',
      title: `${this.capitalizeFirst(learningPattern.preferredLearningStyle)} Learning Style`,
      description: `Prefers ${learningPattern.preferredLearningStyle} learning approaches with an average attention span of ${learningPattern.attentionSpan} minutes.`,
      suggestedActivities: this.getSuggestedActivitiesForLearningStyle(learningPattern.preferredLearningStyle, ageGroup),
      parentTeacherNote: `Tailor activities to match the ${learningPattern.preferredLearningStyle} learning preference for optimal engagement.`
    });
    
    return insights;
  }

  /**
   * Generate a comprehensive STEM report
   */
  public generateSTEMReport(
    stemAnalytics: STEMAnalytics,
    skillAssessments: STEMSkillAssessment[],
    learningPattern: LearningPattern,
    insights: EducationalInsight[],
    ageGroup: AgeGroup
  ): string {
    const report = {
      reportDate: new Date().toISOString(),
      ageGroup,
      overallProgress: {
        totalPlayTime: Math.round(stemAnalytics.totalPlayTime / 60000), // Convert to minutes
        problemSolvingScore: stemAnalytics.problemSolvingScore,
        mechanicalConceptsCount: stemAnalytics.mechanicalConceptsLearned.length,
        creativityScore: this.calculateOverallCreativityScore(stemAnalytics.creativityMetrics)
      },
      skillAssessments,
      learningPattern,
      educationalInsights: insights,
      recommendations: this.generateRecommendations(skillAssessments, learningPattern, ageGroup),
      nextSteps: this.generateNextSteps(skillAssessments, ageGroup)
    };
    
    return JSON.stringify(report, null, 2);
  }

  // Private helper methods

  private createEmptySkillAssessment(skillName: string): STEMSkillAssessment {
    return {
      skillName,
      currentLevel: 0,
      progressTrend: 'stable',
      lastAssessed: new Date(),
      milestones: []
    };
  }

  private calculateSpeedScore(diagnostics: Array<{ timeToComplete: number; problemComplexity: number }>, ageGroup: AgeGroup): number {
    const ageMultipliers = {
      [AgeGroup.YOUNG]: 1.5,  // More time allowed for younger children
      [AgeGroup.MIDDLE]: 1.0,
      [AgeGroup.OLDER]: 0.8   // Higher expectations for older children
    };
    
    const multiplier = ageMultipliers[ageGroup];
    const averageTime = diagnostics.reduce((sum, d) => sum + d.timeToComplete, 0) / diagnostics.length;
    const expectedTime = 60000 * multiplier; // 1 minute base time adjusted for age
    
    // Ensure we don't get negative scores and cap at 100
    const speedScore = Math.max(0, Math.min(100, 100 - ((averageTime - expectedTime) / expectedTime) * 50));
    return speedScore;
  }

  private calculateIndependenceScore(diagnostics: Array<{ hintsUsed: number }>): number {
    const averageHints = diagnostics.reduce((sum, d) => sum + d.hintsUsed, 0) / diagnostics.length;
    return Math.max(0, 100 - (averageHints * 20)); // Lose 20 points per hint on average
  }

  private calculateProgressTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 3) return 'stable';
    
    const recent = values.slice(-5);
    const earlier = values.slice(-10, -5);
    
    if (earlier.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, v) => sum + v, 0) / earlier.length;
    
    const difference = recentAvg - earlierAvg;
    
    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  private generateProblemSolvingMilestones(ageGroup: AgeGroup): STEMSkillMilestone[] {
    const baseMilestones = [
      { level: 25, description: 'Can identify simple problems with guidance' },
      { level: 50, description: 'Independently identifies most problems' },
      { level: 75, description: 'Quickly diagnoses complex issues' },
      { level: 90, description: 'Expert problem solver with systematic approach' }
    ];
    
    return baseMilestones.map(milestone => ({
      ...milestone,
      ageAppropriate: this.isMilestoneAgeAppropriate(milestone.level, ageGroup, 'problem_solving')
    }));
  }

  private generateMechanicalMilestones(): STEMSkillMilestone[] {
    return [
      { level: 20, description: 'Understands basic tool functions', ageAppropriate: true },
      { level: 40, description: 'Recognizes component relationships', ageAppropriate: true },
      { level: 60, description: 'Applies mechanical principles correctly', ageAppropriate: true },
      { level: 80, description: 'Demonstrates systems thinking', ageAppropriate: true }
    ];
  }

  private generateCreativityMilestones(): STEMSkillMilestone[] {
    return [
      { level: 25, description: 'Experiments with different colors and styles', ageAppropriate: true },
      { level: 50, description: 'Creates unique and personal designs', ageAppropriate: true },
      { level: 75, description: 'Shows advanced aesthetic sense', ageAppropriate: true },
      { level: 90, description: 'Demonstrates innovative design thinking', ageAppropriate: true }
    ];
  }

  private calculateConceptMastery(repairHistory: Array<{ problemsFixed: string[]; mistakesMade: number }>, conceptsLearned: string[]): number {
    const totalConcepts = 10; // Maximum expected concepts
    const masteryScore = (conceptsLearned.length / totalConcepts) * 100;
    
    // Adjust based on repair accuracy
    const averageAccuracy = repairHistory.reduce((sum, r) => 
      sum + ((r.problemsFixed.length - r.mistakesMade) / r.problemsFixed.length), 0
    ) / repairHistory.length;
    
    return Math.min(100, masteryScore * averageAccuracy);
  }

  private calculateToolProficiency(repairHistory: Array<{ toolsUsed: string[]; mistakesMade: number }>): number {
    const uniqueTools = new Set(repairHistory.flatMap(r => r.toolsUsed));
    const toolDiversity = (uniqueTools.size / 9) * 100; // 9 total tools available
    
    const averageAccuracy = repairHistory.reduce((sum, r) => 
      sum + Math.max(0, 1 - (r.mistakesMade / r.toolsUsed.length)), 0
    ) / repairHistory.length;
    
    return Math.min(100, toolDiversity * 0.3 + averageAccuracy * 70);
  }

  private calculateSystemsThinking(repairHistory: Array<{ problemsFixed: string[] }>): number {
    // Measure ability to fix multiple related problems
    const complexRepairs = repairHistory.filter(r => r.problemsFixed.length >= 3);
    const systemsScore = (complexRepairs.length / repairHistory.length) * 100;
    
    return Math.min(100, systemsScore);
  }

  private calculateOriginalityScore(customizationHistory: Array<{ uniquenessScore: number }>): number {
    return customizationHistory.reduce((sum, c) => sum + c.uniquenessScore, 0) / customizationHistory.length;
  }

  private calculateDiversityScore(creativityMetrics: STEMAnalytics['creativityMetrics']): number {
    const colorDiversity = Math.min(100, (creativityMetrics.colorVariationsUsed / 20) * 100);
    const accessoryDiversity = Math.min(100, (creativityMetrics.accessoryCombinations / 15) * 100);
    
    return (colorDiversity + accessoryDiversity) / 2;
  }

  private calculateAestheticSense(customizationHistory: Array<{ colorChoices: string[]; accessoryChoices: string[] }>): number {
    // Simple heuristic for color harmony and accessory coordination
    let harmonicCombinations = 0;
    
    customizationHistory.forEach(c => {
      if (this.isHarmonicColorCombination(c.colorChoices)) {
        harmonicCombinations++;
      }
    });
    
    return (harmonicCombinations / customizationHistory.length) * 100;
  }

  private isHarmonicColorCombination(colors: string[]): boolean {
    // Simple color harmony rules (this could be more sophisticated)
    const harmonicPairs = [
      ['red', 'blue'], ['blue', 'yellow'], ['red', 'yellow'],
      ['green', 'orange'], ['purple', 'yellow'], ['blue', 'orange']
    ];
    
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const pair = [colors[i], colors[j]].sort();
        if (harmonicPairs.some(hp => hp[0] === pair[0] && hp[1] === pair[1])) {
          return true;
        }
      }
    }
    
    return colors.length <= 2; // Simple combinations are usually harmonic
  }

  private identifyLearningStyle(sessionHistory: Array<{ timeDistribution: { [key in ActivityType]?: number } }>): 'visual' | 'hands-on' | 'analytical' | 'creative' {
    const totalTime = { diagnostic: 0, repair: 0, customization: 0, photo_booth: 0 };
    
    sessionHistory.forEach(session => {
      Object.entries(session.timeDistribution).forEach(([activity, time]) => {
        if (activity in totalTime) {
          totalTime[activity as ActivityType] += time || 0;
        }
      });
    });
    
    const maxActivity = Object.entries(totalTime).reduce((max, [activity, time]) => 
      time > max.time ? { activity, time } : max, { activity: 'repair', time: 0 }
    );
    
    const styleMap: { [key: string]: 'visual' | 'hands-on' | 'analytical' | 'creative' } = {
      diagnostic: 'analytical',
      repair: 'hands-on',
      customization: 'creative',
      photo_booth: 'visual'
    };
    
    return styleMap[maxActivity.activity] || 'hands-on';
  }

  private identifyDifficultyPreference(sessionHistory: Array<{ mistakesPerActivity: number }>): 'easy' | 'moderate' | 'challenging' {
    const averageMistakes = sessionHistory.reduce((sum, s) => sum + s.mistakesPerActivity, 0) / sessionHistory.length;
    
    if (averageMistakes < 1) return 'challenging';
    if (averageMistakes < 3) return 'moderate';
    return 'easy';
  }

  private identifyHelpSeekingBehavior(sessionHistory: Array<{ hintsRequested: number }>): 'independent' | 'guided' | 'collaborative' {
    const averageHints = sessionHistory.reduce((sum, s) => sum + s.hintsRequested, 0) / sessionHistory.length;
    
    if (averageHints < 1) return 'independent';
    if (averageHints < 3) return 'guided';
    return 'collaborative';
  }

  private getSuggestedActivitiesForStrength(skillName: string, ageGroup: AgeGroup): string[] {
    const activities: { [key: string]: { [key in AgeGroup]: string[] } } = {
      'Problem Solving': {
        [AgeGroup.YOUNG]: ['Simple puzzle games', 'Pattern matching activities', 'Basic cause-and-effect experiments'],
        [AgeGroup.MIDDLE]: ['Logic puzzles', 'Building challenges', 'Science experiments'],
        [AgeGroup.OLDER]: ['Complex problem-solving games', 'Engineering challenges', 'Programming basics']
      },
      'Mechanical Concepts': {
        [AgeGroup.YOUNG]: ['Simple machines exploration', 'Building with blocks', 'Taking apart safe objects'],
        [AgeGroup.MIDDLE]: ['LEGO Technic sets', 'Simple robotics kits', 'Mechanical toy analysis'],
        [AgeGroup.OLDER]: ['Advanced robotics', 'Engineering design challenges', 'Physics experiments']
      },
      'Creativity & Design': {
        [AgeGroup.YOUNG]: ['Art and craft projects', 'Imaginative play', 'Story creation'],
        [AgeGroup.MIDDLE]: ['Design challenges', 'Digital art tools', 'Creative writing'],
        [AgeGroup.OLDER]: ['Advanced design software', 'Innovation projects', 'Creative problem solving']
      }
    };
    
    return activities[skillName]?.[ageGroup] || ['General enrichment activities'];
  }

  private getSuggestedActivitiesForImprovement(skillName: string, ageGroup: AgeGroup): string[] {
    const activities: { [key: string]: { [key in AgeGroup]: string[] } } = {
      'Problem Solving': {
        [AgeGroup.YOUNG]: ['Guided problem-solving games', 'Step-by-step puzzles', 'Adult-assisted challenges'],
        [AgeGroup.MIDDLE]: ['Structured logic activities', 'Collaborative problem solving', 'Scaffolded challenges'],
        [AgeGroup.OLDER]: ['Analytical thinking exercises', 'Systematic problem-solving methods', 'Peer collaboration']
      },
      'Mechanical Concepts': {
        [AgeGroup.YOUNG]: ['Hands-on exploration with guidance', 'Simple tool introduction', 'Basic machine concepts'],
        [AgeGroup.MIDDLE]: ['Structured building activities', 'Tool safety and usage', 'Mechanical principle games'],
        [AgeGroup.OLDER]: ['Engineering fundamentals', 'Advanced tool usage', 'System analysis practice']
      },
      'Creativity & Design': {
        [AgeGroup.YOUNG]: ['Guided art activities', 'Color and shape exploration', 'Imaginative play support'],
        [AgeGroup.MIDDLE]: ['Structured creative projects', 'Design thinking introduction', 'Artistic skill building'],
        [AgeGroup.OLDER]: ['Advanced creative techniques', 'Design methodology', 'Innovation workshops']
      }
    };
    
    return activities[skillName]?.[ageGroup] || ['Supportive practice activities'];
  }

  private getSuggestedActivitiesForLearningStyle(style: string, ageGroup: AgeGroup): string[] {
    const activities: { [key: string]: { [key in AgeGroup]: string[] } } = {
      visual: {
        [AgeGroup.YOUNG]: ['Picture books', 'Visual puzzles', 'Drawing activities'],
        [AgeGroup.MIDDLE]: ['Diagrams and charts', 'Visual learning games', 'Art projects'],
        [AgeGroup.OLDER]: ['Infographics', 'Visual programming', 'Design software']
      },
      'hands-on': {
        [AgeGroup.YOUNG]: ['Building blocks', 'Sensory play', 'Simple experiments'],
        [AgeGroup.MIDDLE]: ['Construction kits', 'Science experiments', 'Craft projects'],
        [AgeGroup.OLDER]: ['Robotics kits', 'Lab experiments', 'Engineering projects']
      },
      analytical: {
        [AgeGroup.YOUNG]: ['Sorting games', 'Pattern activities', 'Simple logic puzzles'],
        [AgeGroup.MIDDLE]: ['Math games', 'Logic puzzles', 'Strategy games'],
        [AgeGroup.OLDER]: ['Advanced mathematics', 'Programming', 'Scientific analysis']
      },
      creative: {
        [AgeGroup.YOUNG]: ['Art supplies', 'Imaginative play', 'Music activities'],
        [AgeGroup.MIDDLE]: ['Creative writing', 'Art projects', 'Drama activities'],
        [AgeGroup.OLDER]: ['Digital creativity tools', 'Innovation challenges', 'Artistic expression']
      }
    };
    
    return activities[style]?.[ageGroup] || ['Varied learning activities'];
  }

  private calculateOverallCreativityScore(creativityMetrics: STEMAnalytics['creativityMetrics']): number {
    const uniquenessScore = Math.min(100, creativityMetrics.uniqueCustomizations * 5);
    const diversityScore = Math.min(100, (creativityMetrics.colorVariationsUsed + creativityMetrics.accessoryCombinations) * 2);
    
    return Math.round((uniquenessScore + diversityScore) / 2);
  }

  private isMilestoneAgeAppropriate(level: number, ageGroup: AgeGroup, skillType: string): boolean {
    const ageExpectations = {
      [AgeGroup.YOUNG]: { max: 60, typical: 40 },
      [AgeGroup.MIDDLE]: { max: 80, typical: 60 },
      [AgeGroup.OLDER]: { max: 100, typical: 80 }
    };
    
    const expectations = ageExpectations[ageGroup];
    return level <= expectations.max;
  }

  private generateRecommendations(skillAssessments: STEMSkillAssessment[], learningPattern: LearningPattern, ageGroup: AgeGroup): string[] {
    const recommendations: string[] = [];
    
    // Based on attention span
    if (learningPattern.attentionSpan < 5) {
      recommendations.push('Consider shorter, more frequent learning sessions to match attention span.');
    } else if (learningPattern.attentionSpan > 15) {
      recommendations.push('Take advantage of extended attention span with more complex, multi-step activities.');
    }
    
    // Based on help-seeking behavior
    if (learningPattern.helpSeekingBehavior === 'independent') {
      recommendations.push('Provide self-directed learning opportunities and advanced challenges.');
    } else if (learningPattern.helpSeekingBehavior === 'collaborative') {
      recommendations.push('Encourage group activities and peer learning opportunities.');
    }
    
    // Based on skill levels
    const averageSkillLevel = skillAssessments.reduce((sum, skill) => sum + skill.currentLevel, 0) / skillAssessments.length;
    if (averageSkillLevel > 75) {
      recommendations.push('Consider advanced or accelerated learning opportunities.');
    } else if (averageSkillLevel < 40) {
      recommendations.push('Focus on building foundational skills with additional support.');
    }
    
    return recommendations;
  }

  private generateNextSteps(skillAssessments: STEMSkillAssessment[], ageGroup: AgeGroup): string[] {
    const nextSteps: string[] = [];
    
    skillAssessments.forEach(skill => {
      const nextMilestone = skill.milestones.find(m => !m.achievedAt);
      if (nextMilestone) {
        nextSteps.push(`Work towards: ${nextMilestone.description} (${skill.skillName})`);
      }
    });
    
    if (nextSteps.length === 0) {
      nextSteps.push('Continue practicing all skills to maintain proficiency.');
    }
    
    return nextSteps;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}