/**
 * Progress Manager
 * Handles player progress tracking, milestone detection, and Robo-Gems economy
 */

import {
  PlayerProgress,
  STEMAnalytics,
  Achievement,
  GameSession,
  Milestone,
  UnlockReward,
  AgeGroup,
  ToolType,
  CustomizationType,
  AchievementType,
  ActivityType,
  CelebrationLevel,
  UnlockType,
  ProgressEventData,
  ProgressEventType
} from './types.js';
import { STEMAnalyticsEngine } from './STEMAnalytics.js';
import { ParentTeacherReportGenerator } from './ParentTeacherReport.js';
import { LocalStorageManager } from '../privacy/LocalStorageManager.js';
import { PrivacyManager } from '../privacy/PrivacyManager.js';

export class ProgressManager {
  private static instance: ProgressManager;
  private progress: PlayerProgress;
  private currentSession: GameSession | null = null;
  private milestones: Milestone[];
  private eventListeners: Map<ProgressEventType, ((data: any) => void)[]> = new Map();
  private stemAnalytics: STEMAnalyticsEngine;
  private reportGenerator: ParentTeacherReportGenerator;
  private storageManager: LocalStorageManager;
  private privacyManager: PrivacyManager;

  private constructor() {
    this.storageManager = LocalStorageManager.getInstance();
    this.privacyManager = PrivacyManager.getInstance();
    this.milestones = this.initializeMilestones();
    this.progress = this.loadProgress();
    this.stemAnalytics = STEMAnalyticsEngine.getInstance();
    this.reportGenerator = new ParentTeacherReportGenerator();
  }

  public static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager();
      // Initialize privacy compliance
      ProgressManager.instance.initializePrivacyCompliance();
    }
    return ProgressManager.instance;
  }

  /**
   * Initialize privacy compliance features
   */
  private initializePrivacyCompliance(): void {
    // Initialize storage manager with privacy checks
    this.storageManager.initialize();
    
    // Initialize privacy manager
    this.privacyManager.initialize();
    
    // Perform initial privacy audit
    const audit = this.privacyManager.performPrivacyAudit();
    if (!audit.compliant) {
      console.warn('Initial privacy audit found issues:', audit.issues);
    }
    
    console.log('Progress Manager initialized with COPPA compliance');
  }

  /**
   * Initialize milestone definitions
   */
  private initializeMilestones(): Milestone[] {
    return [
      {
        id: 'first_repair',
        name: 'First Repair',
        description: 'Complete your first robot repair!',
        requiredRepairs: 1,
        gemsReward: 10,
        unlocks: [
          {
            type: UnlockType.CUSTOMIZATION,
            itemId: 'premium_color_red',
            name: 'Premium Red Paint',
            description: 'A shiny red color for your robots!'
          }
        ],
        celebrationLevel: CelebrationLevel.MEDIUM
      },
      {
        id: 'repair_apprentice',
        name: 'Repair Apprentice',
        description: 'Complete 5 robot repairs',
        requiredRepairs: 5,
        gemsReward: 25,
        unlocks: [
          {
            type: UnlockType.TOOL,
            itemId: 'cleaning_brush',
            name: 'Cleaning Brush',
            description: 'Perfect for cleaning dirty robot parts!'
          }
        ],
        celebrationLevel: CelebrationLevel.MEDIUM
      },
      {
        id: 'repair_expert',
        name: 'Repair Expert',
        description: 'Complete 10 robot repairs',
        requiredRepairs: 10,
        gemsReward: 50,
        unlocks: [
          {
            type: UnlockType.TOOL,
            itemId: 'diagnostic_scanner',
            name: 'Diagnostic Scanner',
            description: 'Helps identify problems faster!'
          },
          {
            type: UnlockType.CUSTOMIZATION,
            itemId: 'special_hat_wizard',
            name: 'Wizard Hat',
            description: 'A magical hat for your robots!'
          }
        ],
        celebrationLevel: CelebrationLevel.LARGE
      },
      {
        id: 'repair_master',
        name: 'Repair Master',
        description: 'Complete 25 robot repairs',
        requiredRepairs: 25,
        gemsReward: 100,
        unlocks: [
          {
            type: UnlockType.TOOL,
            itemId: 'premium_wrench',
            name: 'Premium Wrench',
            description: 'A high-quality wrench for tough repairs!'
          },
          {
            type: UnlockType.CUSTOMIZATION,
            itemId: 'animated_sticker_sparkle',
            name: 'Sparkle Sticker',
            description: 'An animated sticker that sparkles!'
          }
        ],
        celebrationLevel: CelebrationLevel.LARGE
      },
      {
        id: 'repair_legend',
        name: 'Repair Legend',
        description: 'Complete 50 robot repairs',
        requiredRepairs: 50,
        gemsReward: 200,
        unlocks: [
          {
            type: UnlockType.TOOL,
            itemId: 'super_battery',
            name: 'Super Battery',
            description: 'The ultimate power source for robots!'
          },
          {
            type: UnlockType.FEATURE,
            itemId: 'premium_photo_booth',
            name: 'Premium Photo Booth',
            description: 'Unlock special backgrounds and effects!'
          }
        ],
        celebrationLevel: CelebrationLevel.EPIC
      }
    ];
  }

  /**
   * Load progress from local storage with privacy compliance
   */
  private loadProgress(): PlayerProgress {
    try {
      const savedProgress = this.storageManager.getItem<PlayerProgress>('progress');
      if (savedProgress) {
        // Convert date strings back to Date objects
        savedProgress.createdAt = new Date(savedProgress.createdAt);
        savedProgress.lastModified = new Date(savedProgress.lastModified);
        savedProgress.achievements = savedProgress.achievements.map((achievement: any) => ({
          ...achievement,
          unlockedAt: new Date(achievement.unlockedAt)
        }));
        savedProgress.sessionHistory = savedProgress.sessionHistory.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined
        }));
        
        // Validate privacy compliance of loaded data
        if (this.privacyManager.validateDataForStorage(savedProgress)) {
          return savedProgress;
        } else {
          console.warn('Loaded progress data failed privacy validation, creating new progress');
        }
      }
    } catch (error) {
      console.warn('Failed to load progress from storage:', error);
    }

    // Create new progress if none exists or validation failed
    return this.createNewProgress();
  }

  /**
   * Create new player progress
   */
  private createNewProgress(): PlayerProgress {
    const now = new Date();
    return {
      playerId: this.generatePlayerId(),
      ageGroup: AgeGroup.MIDDLE, // Default, will be set by user
      totalRepairs: 0,
      roboGemsEarned: 0,
      roboGemsSpent: 0,
      unlockedTools: [
        ToolType.SCREWDRIVER,
        ToolType.WRENCH,
        ToolType.OIL_CAN,
        ToolType.BATTERY,
        ToolType.CIRCUIT_BOARD
      ],
      unlockedCustomizations: [
        CustomizationType.COLOR_PALETTE,
        CustomizationType.HAT,
        CustomizationType.BOW_TIE,
        CustomizationType.STICKER
      ],
      achievements: [],
      stemMetrics: {
        problemSolvingScore: 0,
        mechanicalConceptsLearned: [],
        creativityMetrics: {
          uniqueCustomizations: 0,
          colorVariationsUsed: 0,
          accessoryCombinations: 0
        },
        timeToCompletion: {
          averageDiagnostic: 0,
          averageRepair: 0,
          averageCustomization: 0
        },
        totalPlayTime: 0
      },
      sessionHistory: [],
      createdAt: now,
      lastModified: now
    };
  }

  /**
   * Generate a unique player ID (no PII, privacy compliant)
   */
  private generatePlayerId(): string {
    // Use privacy manager to generate anonymous ID
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Save progress to local storage with privacy compliance
   */
  private saveProgress(): void {
    try {
      this.progress.lastModified = new Date();
      
      // Validate data before saving
      if (!this.privacyManager.validateDataForStorage(this.progress)) {
        console.error('Progress data failed privacy validation, not saving');
        return;
      }

      // Use privacy-compliant storage manager
      const success = this.storageManager.setItem('progress', this.progress, {
        validatePrivacy: true,
        maxSize: 1024 * 1024 // 1MB limit for progress data
      });

      if (!success) {
        console.error('Failed to save progress data');
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  /**
   * Get current player progress
   */
  public getProgress(): PlayerProgress {
    return { ...this.progress };
  }

  /**
   * Set player age group
   */
  public setAgeGroup(ageGroup: AgeGroup): void {
    this.progress.ageGroup = ageGroup;
    this.saveProgress();
    this.emitEvent(ProgressEventType.SESSION_STARTED, { ageGroup });
  }

  /**
   * Start a new game session
   */
  public startSession(): void {
    this.currentSession = {
      id: 'session_' + Date.now(),
      startTime: new Date(),
      repairsCompleted: 0,
      gemsEarned: 0,
      activitiesCompleted: [],
      averageRepairTime: 0
    };
    this.emitEvent(ProgressEventType.SESSION_STARTED, this.currentSession);
  }

  /**
   * End current game session
   */
  public endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.progress.sessionHistory.push(this.currentSession);
      
      // Update total play time
      const sessionDuration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
      this.progress.stemMetrics.totalPlayTime += sessionDuration;
      
      this.emitEvent(ProgressEventType.SESSION_ENDED, this.currentSession);
      this.currentSession = null;
      this.saveProgress();
    }
  }

  /**
   * Record a completed repair
   */
  public recordRepairCompleted(repairTime: number, problemsFixed: string[]): void {
    this.progress.totalRepairs++;
    
    // Award gems for repair completion
    const gemsEarned = this.calculateRepairGems(repairTime, problemsFixed.length);
    this.progress.roboGemsEarned += gemsEarned;
    
    // Update session data
    if (this.currentSession) {
      this.currentSession.repairsCompleted++;
      this.currentSession.gemsEarned += gemsEarned;
      this.currentSession.activitiesCompleted.push(ActivityType.REPAIR);
      
      // Update average repair time
      const totalRepairTime = this.currentSession.averageRepairTime * (this.currentSession.repairsCompleted - 1) + repairTime;
      this.currentSession.averageRepairTime = totalRepairTime / this.currentSession.repairsCompleted;
    }
    
    // Update STEM metrics
    this.updateSTEMMetrics('repair', repairTime, problemsFixed);
    
    // Check for milestones
    this.checkMilestones();
    
    // Check for achievements
    this.checkAchievements(repairTime, problemsFixed);
    
    this.emitEvent(ProgressEventType.REPAIR_COMPLETED, {
      repairTime,
      problemsFixed,
      gemsEarned,
      totalRepairs: this.progress.totalRepairs
    });
    
    this.saveProgress();
  }

  /**
   * Record diagnostic completion
   */
  public recordDiagnosticCompleted(diagnosticTime: number, accuracy: number): void {
    // Update session data
    if (this.currentSession) {
      this.currentSession.activitiesCompleted.push(ActivityType.DIAGNOSTIC);
    }
    
    // Update STEM metrics
    this.updateSTEMMetrics('diagnostic', diagnosticTime, [], accuracy);
    
    // Award gems for perfect diagnostic
    if (accuracy >= 1.0) {
      const gemsEarned = 5;
      this.progress.roboGemsEarned += gemsEarned;
      this.emitEvent(ProgressEventType.GEMS_EARNED, { amount: gemsEarned, reason: 'Perfect Diagnostic' });
    }
    
    this.emitEvent(ProgressEventType.DIAGNOSTIC_COMPLETED, {
      diagnosticTime,
      accuracy
    });
    
    this.saveProgress();
  }

  /**
   * Record customization completion
   */
  public recordCustomizationCompleted(customizationTime: number, customizations: string[]): void {
    // Update session data
    if (this.currentSession) {
      this.currentSession.activitiesCompleted.push(ActivityType.CUSTOMIZATION);
    }
    
    // Update creativity metrics
    this.progress.stemMetrics.creativityMetrics.uniqueCustomizations++;
    customizations.forEach(customization => {
      if (customization.includes('color')) {
        this.progress.stemMetrics.creativityMetrics.colorVariationsUsed++;
      }
      if (customization.includes('accessory')) {
        this.progress.stemMetrics.creativityMetrics.accessoryCombinations++;
      }
    });
    
    // Update STEM metrics
    this.updateSTEMMetrics('customization', customizationTime, customizations);
    
    // Award gems for creative customization
    const gemsEarned = Math.min(customizations.length * 2, 10);
    this.progress.roboGemsEarned += gemsEarned;
    
    this.emitEvent(ProgressEventType.CUSTOMIZATION_COMPLETED, {
      customizationTime,
      customizations,
      gemsEarned
    });
    
    this.saveProgress();
  }

  /**
   * Calculate gems earned for repair completion
   */
  private calculateRepairGems(repairTime: number, problemCount: number): number {
    let baseGems = 10; // Base gems per repair
    
    // Bonus for speed (under 2 minutes)
    if (repairTime < 120000) {
      baseGems += 5;
    }
    
    // Bonus for complexity (more problems)
    baseGems += problemCount * 2;
    
    // Age group modifier
    switch (this.progress.ageGroup) {
      case AgeGroup.YOUNG:
        baseGems += 5; // Extra encouragement for younger players
        break;
      case AgeGroup.OLDER:
        baseGems = Math.floor(baseGems * 0.8); // Slightly less for older players
        break;
    }
    
    return Math.max(baseGems, 5); // Minimum 5 gems
  }

  /**
   * Update STEM analytics
   */
  private updateSTEMMetrics(activity: string, time: number, data: string[], accuracy?: number): void {
    const metrics = this.progress.stemMetrics;
    
    switch (activity) {
      case 'diagnostic':
        if (accuracy !== undefined) {
          // Update problem-solving score based on diagnostic accuracy
          metrics.problemSolvingScore = Math.min(100, metrics.problemSolvingScore + accuracy * 10);
        }
        // Update average diagnostic time
        const totalDiagnostics = this.progress.sessionHistory.reduce((sum, session) => 
          sum + session.activitiesCompleted.filter(a => a === ActivityType.DIAGNOSTIC).length, 0) + 1;
        metrics.timeToCompletion.averageDiagnostic = 
          (metrics.timeToCompletion.averageDiagnostic * (totalDiagnostics - 1) + time) / totalDiagnostics;
        break;
        
      case 'repair':
        // Add mechanical concepts learned
        data.forEach(problem => {
          const concept = this.problemToMechanicalConcept(problem);
          if (concept && !metrics.mechanicalConceptsLearned.includes(concept)) {
            metrics.mechanicalConceptsLearned.push(concept);
          }
        });
        // Update average repair time
        metrics.timeToCompletion.averageRepair = 
          (metrics.timeToCompletion.averageRepair * (this.progress.totalRepairs - 1) + time) / this.progress.totalRepairs;
        break;
        
      case 'customization':
        // Update average customization time
        const totalCustomizations = this.progress.sessionHistory.reduce((sum, session) => 
          sum + session.activitiesCompleted.filter(a => a === ActivityType.CUSTOMIZATION).length, 0) + 1;
        metrics.timeToCompletion.averageCustomization = 
          (metrics.timeToCompletion.averageCustomization * (totalCustomizations - 1) + time) / totalCustomizations;
        break;
    }
  }

  /**
   * Convert problem type to mechanical concept
   */
  private problemToMechanicalConcept(problem: string): string | null {
    const conceptMap: { [key: string]: string } = {
      'power_core': 'Electrical Systems',
      'motor_system': 'Mechanical Movement',
      'sensor_array': 'Input/Output Systems',
      'chassis_plating': 'Structural Engineering',
      'processing_unit': 'Logic Systems',
      'battery': 'Energy Storage',
      'circuit': 'Electronic Circuits',
      'gear': 'Mechanical Advantage',
      'wire': 'Electrical Connections'
    };
    
    for (const [key, concept] of Object.entries(conceptMap)) {
      if (problem.toLowerCase().includes(key)) {
        return concept;
      }
    }
    return null;
  }

  /**
   * Check for milestone achievements
   */
  private checkMilestones(): void {
    this.milestones.forEach(milestone => {
      if (this.progress.totalRepairs >= milestone.requiredRepairs) {
        // Check if milestone already achieved
        const alreadyAchieved = this.progress.achievements.some(
          achievement => achievement.id === milestone.id
        );
        
        if (!alreadyAchieved) {
          this.unlockMilestone(milestone);
        }
      }
    });
  }

  /**
   * Unlock a milestone
   */
  private unlockMilestone(milestone: Milestone): void {
    // Add achievement
    const achievement: Achievement = {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      type: AchievementType.REPAIR_MILESTONE,
      unlockedAt: new Date(),
      gemsRewarded: milestone.gemsReward,
      milestone: milestone.requiredRepairs
    };
    
    this.progress.achievements.push(achievement);
    this.progress.roboGemsEarned += milestone.gemsReward;
    
    // Unlock rewards
    milestone.unlocks.forEach(unlock => {
      this.unlockReward(unlock);
    });
    
    this.emitEvent(ProgressEventType.MILESTONE_REACHED, {
      milestone,
      achievement,
      celebrationLevel: milestone.celebrationLevel
    });
  }

  /**
   * Unlock a reward
   */
  private unlockReward(reward: UnlockReward): void {
    switch (reward.type) {
      case UnlockType.TOOL:
        const toolType = reward.itemId as ToolType;
        if (!this.progress.unlockedTools.includes(toolType)) {
          this.progress.unlockedTools.push(toolType);
        }
        break;
        
      case UnlockType.CUSTOMIZATION:
        const customizationType = reward.itemId as CustomizationType;
        if (!this.progress.unlockedCustomizations.includes(customizationType)) {
          this.progress.unlockedCustomizations.push(customizationType);
        }
        break;
    }
  }

  /**
   * Check for other achievements
   */
  private checkAchievements(repairTime: number, problemsFixed: string[]): void {
    // Speed repair achievement (under 1 minute)
    if (repairTime < 60000) {
      this.unlockAchievement({
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Complete a repair in under 1 minute!',
        type: AchievementType.SPEED_REPAIR,
        gemsRewarded: 15
      });
    }
    
    // Complex repair achievement (5+ problems)
    if (problemsFixed.length >= 5) {
      this.unlockAchievement({
        id: 'complex_repair',
        name: 'Complex Repair Master',
        description: 'Fix 5 or more problems in a single repair!',
        type: AchievementType.REPAIR_MILESTONE,
        gemsRewarded: 20
      });
    }
  }

  /**
   * Unlock an achievement
   */
  private unlockAchievement(achievementData: Omit<Achievement, 'unlockedAt'>): void {
    // Check if already unlocked
    const alreadyUnlocked = this.progress.achievements.some(
      achievement => achievement.id === achievementData.id
    );
    
    if (!alreadyUnlocked) {
      const achievement: Achievement = {
        ...achievementData,
        unlockedAt: new Date()
      };
      
      this.progress.achievements.push(achievement);
      this.progress.roboGemsEarned += achievement.gemsRewarded;
      
      this.emitEvent(ProgressEventType.ACHIEVEMENT_UNLOCKED, achievement);
    }
  }

  /**
   * Spend Robo-Gems
   */
  public spendGems(amount: number, itemId: string, itemName: string): boolean {
    if (this.progress.roboGemsEarned - this.progress.roboGemsSpent >= amount) {
      this.progress.roboGemsSpent += amount;
      
      this.emitEvent(ProgressEventType.GEMS_SPENT, {
        amount,
        itemId,
        itemName,
        remainingGems: this.getAvailableGems()
      });
      
      this.saveProgress();
      return true;
    }
    return false;
  }

  /**
   * Get available gems
   */
  public getAvailableGems(): number {
    return this.progress.roboGemsEarned - this.progress.roboGemsSpent;
  }

  /**
   * Get unlocked tools
   */
  public getUnlockedTools(): ToolType[] {
    return [...this.progress.unlockedTools];
  }

  /**
   * Get unlocked customizations
   */
  public getUnlockedCustomizations(): CustomizationType[] {
    return [...this.progress.unlockedCustomizations];
  }

  /**
   * Get achievements
   */
  public getAchievements(): Achievement[] {
    return [...this.progress.achievements];
  }

  /**
   * Get milestones
   */
  public getMilestones(): Milestone[] {
    return this.milestones.map(milestone => ({
      ...milestone,
      isUnlocked: this.progress.achievements.some(achievement => achievement.id === milestone.id),
      progress: Math.min(this.progress.totalRepairs / milestone.requiredRepairs, 1)
    }));
  }

  /**
   * Get STEM analytics
   */
  public getSTEMAnalytics(): STEMAnalytics {
    return { ...this.progress.stemMetrics };
  }

  /**
   * Add event listener
   */
  public addEventListener(eventType: ProgressEventType, callback: (data: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: ProgressEventType, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventType: ProgressEventType, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in progress event listener:', error);
        }
      });
    }
  }

  /**
   * Reset progress (for testing or new player) with privacy compliance
   */
  public resetProgress(): void {
    this.progress = this.createNewProgress();
    this.currentSession = null;
    
    // Use privacy-compliant storage manager to clear data
    this.storageManager.removeItem('progress');
    this.saveProgress();
    
    console.log('Progress reset with privacy compliance');
  }

  /**
   * Export progress data for parent-teacher reports (privacy compliant)
   */
  public exportProgressData(): string {
    const exportData = {
      ...this.progress,
      milestones: this.getMilestones(),
      availableGems: this.getAvailableGems(),
      exportedAt: new Date()
    };
    
    // Use privacy manager to ensure compliant export
    return this.privacyManager.generatePrivacyCompliantExport(exportData, {
      includePersonalData: false,
      includeProgressData: true,
      includeSTEMAnalytics: true,
      includeAchievements: true
    });
  }

  /**
   * Generate comprehensive STEM analytics report
   */
  public generateSTEMReport(startDate?: Date, endDate?: Date): string {
    const reportData = this.reportGenerator.generateReport(this, startDate, endDate);
    return this.reportGenerator.generatePrintableReport(reportData);
  }

  /**
   * Generate summary STEM report
   */
  public generateSummaryReport(): string {
    return this.reportGenerator.generateSummaryReport(this);
  }

  /**
   * Get detailed STEM skill assessments
   */
  public getSTEMSkillAssessments(): any[] {
    // Generate skill assessments based on current progress
    const sessions = this.progress.sessionHistory.slice(-10); // Last 10 sessions
    
    // Mock diagnostic history for demonstration
    const diagnosticHistory = sessions.map(session => ({
      accuracy: Math.random() * 0.4 + 0.6,
      timeToComplete: Math.random() * 60000 + 30000,
      hintsUsed: Math.floor(Math.random() * 3),
      problemComplexity: Math.floor(Math.random() * 3) + 1
    }));
    
    const problemSolvingAssessment = this.stemAnalytics.analyzeProblemSolvingSkills(
      diagnosticHistory,
      this.progress.ageGroup
    );
    
    // Mock repair history
    const repairHistory = sessions.map(session => ({
      problemsFixed: ['power_core', 'motor_system'].slice(0, Math.floor(Math.random() * 2) + 1),
      toolsUsed: ['screwdriver', 'wrench'].slice(0, Math.floor(Math.random() * 2) + 1),
      timeToComplete: Math.random() * 120000 + 60000,
      mistakesMade: Math.floor(Math.random() * 2)
    }));
    
    const mechanicalAssessment = this.stemAnalytics.analyzeMechanicalConcepts(
      repairHistory,
      this.progress.stemMetrics.mechanicalConceptsLearned
    );
    
    // Mock customization history
    const customizationHistory = sessions.map(session => ({
      customizations: ['color_red', 'accessory_hat'].slice(0, Math.floor(Math.random() * 2) + 1),
      timeSpent: Math.random() * 180000 + 30000,
      uniquenessScore: Math.random() * 40 + 60,
      colorChoices: ['red', 'blue'].slice(0, Math.floor(Math.random() * 2) + 1),
      accessoryChoices: ['hat', 'bow'].slice(0, Math.floor(Math.random() * 2) + 1)
    }));
    
    const creativityAssessment = this.stemAnalytics.analyzeCreativity(
      customizationHistory,
      this.progress.stemMetrics.creativityMetrics
    );
    
    return [problemSolvingAssessment, mechanicalAssessment, creativityAssessment];
  }

  /**
   * Get learning pattern analysis
   */
  public getLearningPattern(): any {
    const sessions = this.progress.sessionHistory.slice(-10);
    const sessionData = sessions.map(session => ({
      duration: session.endTime ? session.endTime.getTime() - session.startTime.getTime() : 300000,
      activitiesCompleted: session.activitiesCompleted || [],
      mistakesPerActivity: Math.random() * 2,
      hintsRequested: Math.floor(Math.random() * 3),
      timeDistribution: {
        diagnostic: Math.random() * 60000,
        repair: Math.random() * 120000,
        customization: Math.random() * 90000,
        photo_booth: Math.random() * 30000
      }
    }));
    
    return this.stemAnalytics.identifyLearningPatterns(sessionData);
  }

  /**
   * Get educational insights for parents and teachers
   */
  public getEducationalInsights(): any[] {
    const skillAssessments = this.getSTEMSkillAssessments();
    const learningPattern = this.getLearningPattern();
    
    return this.stemAnalytics.generateEducationalInsights(
      skillAssessments,
      learningPattern,
      this.progress.ageGroup
    );
  }

  /**
   * Record detailed diagnostic activity for enhanced analytics
   */
  public recordDetailedDiagnostic(
    diagnosticTime: number,
    accuracy: number,
    hintsUsed: number,
    problemsIdentified: string[],
    mistakesMade: number
  ): void {
    // Call existing method
    this.recordDiagnosticCompleted(diagnosticTime, accuracy);
    
    // Enhanced STEM tracking
    this.updateAdvancedSTEMMetrics('diagnostic', {
      time: diagnosticTime,
      accuracy,
      hintsUsed,
      problemsIdentified,
      mistakesMade
    });
  }

  /**
   * Record detailed repair activity for enhanced analytics
   */
  public recordDetailedRepair(
    repairTime: number,
    problemsFixed: string[],
    toolsUsed: string[],
    mistakesMade: number,
    creativeSolutions: string[]
  ): void {
    // Call existing method
    this.recordRepairCompleted(repairTime, problemsFixed);
    
    // Enhanced STEM tracking
    this.updateAdvancedSTEMMetrics('repair', {
      time: repairTime,
      problemsFixed,
      toolsUsed,
      mistakesMade,
      creativeSolutions
    });
  }

  /**
   * Record detailed customization activity for enhanced analytics
   */
  public recordDetailedCustomization(
    customizationTime: number,
    customizations: string[],
    colorChoices: string[],
    accessoryChoices: string[],
    uniquenessScore: number
  ): void {
    // Call existing method
    this.recordCustomizationCompleted(customizationTime, customizations);
    
    // Enhanced STEM tracking
    this.updateAdvancedSTEMMetrics('customization', {
      time: customizationTime,
      customizations,
      colorChoices,
      accessoryChoices,
      uniquenessScore
    });
  }

  /**
   * Update advanced STEM metrics for detailed analytics
   */
  private updateAdvancedSTEMMetrics(activity: string, data: any): void {
    const metrics = this.progress.stemMetrics;
    
    switch (activity) {
      case 'diagnostic':
        // Update problem-solving score with more sophisticated algorithm
        const accuracyBonus = data.accuracy * 10;
        const independenceBonus = Math.max(0, 5 - data.hintsUsed) * 2;
        const speedBonus = data.time < 60000 ? 5 : 0;
        
        metrics.problemSolvingScore = Math.min(100, 
          metrics.problemSolvingScore + (accuracyBonus + independenceBonus + speedBonus) / 10
        );
        break;
        
      case 'repair':
        // Track tool proficiency and mechanical understanding
        data.toolsUsed.forEach((tool: string) => {
          const concept = this.toolToMechanicalConcept(tool);
          if (concept && !metrics.mechanicalConceptsLearned.includes(concept)) {
            metrics.mechanicalConceptsLearned.push(concept);
          }
        });
        
        // Reward creative problem-solving approaches
        if (data.creativeSolutions && data.creativeSolutions.length > 0) {
          metrics.problemSolvingScore = Math.min(100, metrics.problemSolvingScore + 2);
        }
        break;
        
      case 'customization':
        // Enhanced creativity tracking
        if (data.uniquenessScore > 80) {
          metrics.creativityMetrics.uniqueCustomizations++;
        }
        
        // Track aesthetic development
        if (this.isAestheticallyPleasing(data.colorChoices, data.accessoryChoices)) {
          metrics.problemSolvingScore = Math.min(100, metrics.problemSolvingScore + 1);
        }
        break;
    }
    
    this.saveProgress();
  }

  /**
   * Convert tool usage to mechanical concept
   */
  private toolToMechanicalConcept(tool: string): string | null {
    const toolConceptMap: { [key: string]: string } = {
      'screwdriver': 'Fastening Systems',
      'wrench': 'Mechanical Advantage',
      'oil_can': 'Lubrication Systems',
      'battery': 'Energy Storage',
      'circuit_board': 'Electronic Systems',
      'cleaning_brush': 'Maintenance Procedures',
      'diagnostic_scanner': 'System Analysis'
    };
    
    return toolConceptMap[tool] || null;
  }

  /**
   * Determine if color and accessory combination is aesthetically pleasing
   */
  private isAestheticallyPleasing(colors: string[], accessories: string[]): boolean {
    // Simple aesthetic rules - could be more sophisticated
    const complementaryColors = [
      ['red', 'green'], ['blue', 'orange'], ['yellow', 'purple']
    ];
    
    const matchingAccessories = [
      ['hat', 'bow_tie'], ['sticker', 'hat']
    ];
    
    // Check for complementary colors
    for (const pair of complementaryColors) {
      if (colors.includes(pair[0]) && colors.includes(pair[1])) {
        return true;
      }
    }
    
    // Check for matching accessories
    for (const pair of matchingAccessories) {
      if (accessories.includes(pair[0]) && accessories.includes(pair[1])) {
        return true;
      }
    }
    
    // Simple combinations are usually pleasing
    return colors.length <= 2 && accessories.length <= 2;
  }
}