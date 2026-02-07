/**
 * Privacy Manager
 * Ensures COPPA compliance and privacy-first data handling
 * Requirements: 7.1, 7.2, 7.3, 7.4, 11.5
 */

export interface PrivacySettings {
  dataCollection: boolean; // Always false for COPPA compliance
  localStorageOnly: boolean; // Always true
  analyticsEnabled: boolean; // Local analytics only
  exportEnabled: boolean; // For parent-teacher reports
}

export interface DataExportOptions {
  includePersonalData: boolean; // Always false
  includeProgressData: boolean;
  includeSTEMAnalytics: boolean;
  includeAchievements: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface PrivacyAuditResult {
  compliant: boolean;
  issues: string[];
  recommendations: string[];
  lastAuditDate: Date;
}

export class PrivacyManager {
  private static instance: PrivacyManager;
  private settings: PrivacySettings;
  private readonly STORAGE_KEY = 'robo_pet_privacy_settings';

  private constructor() {
    this.settings = this.loadPrivacySettings();
    this.enforcePrivacyDefaults();
  }

  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  /**
   * Load privacy settings from local storage
   */
  private loadPrivacySettings(): PrivacySettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...this.getDefaultSettings(),
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load privacy settings:', error);
    }
    
    return this.getDefaultSettings();
  }

  /**
   * Get default privacy settings (COPPA compliant)
   */
  private getDefaultSettings(): PrivacySettings {
    return {
      dataCollection: false, // Never collect PII
      localStorageOnly: true, // All data stays local
      analyticsEnabled: true, // Local analytics for educational value
      exportEnabled: true // Allow parent-teacher report exports
    };
  }

  /**
   * Enforce privacy defaults to ensure COPPA compliance
   */
  private enforcePrivacyDefaults(): void {
    // These settings cannot be changed for COPPA compliance
    this.settings.dataCollection = false;
    this.settings.localStorageOnly = true;
    this.saveSettings();
  }

  /**
   * Save privacy settings
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  /**
   * Get current privacy settings
   */
  public getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * Update privacy settings (with COPPA compliance enforcement)
   */
  public updateSettings(newSettings: Partial<PrivacySettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    
    // Enforce COPPA compliance
    this.enforcePrivacyDefaults();
  }

  /**
   * Validate that data is privacy compliant before storage
   */
  public validateDataForStorage(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return true; // Non-object data is generally safe
    }

    // Check for PII fields that should never be stored
    const piiFields = [
      'name', 'firstName', 'lastName', 'fullName',
      'email', 'emailAddress',
      'phone', 'phoneNumber', 'telephone',
      'address', 'streetAddress', 'homeAddress',
      'location', 'geoLocation', 'coordinates',
      'ip', 'ipAddress',
      'ssn', 'socialSecurityNumber',
      'birthDate', 'dateOfBirth', 'birthday',
      'school', 'schoolName',
      'parent', 'parentName', 'guardian',
      'realName', 'actualName'
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    
    for (const field of piiFields) {
      if (dataString.includes(field.toLowerCase())) {
        console.error(`Privacy violation: Data contains potential PII field: ${field}`);
        return false;
      }
    }

    // Check for patterns that might indicate PII
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone pattern
      /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/i // Address pattern
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(dataString)) {
        console.error('Privacy violation: Data contains potential PII pattern');
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize data to remove any potential PII
   */
  public sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove any fields that might contain PII
    const fieldsToRemove = [
      'name', 'firstName', 'lastName', 'fullName',
      'email', 'phone', 'address', 'location',
      'ip', 'userAgent', 'deviceId'
    ];

    const removePIIFields = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(removePIIFields);
      }
      
      if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (!fieldsToRemove.includes(key.toLowerCase())) {
            cleaned[key] = removePIIFields(value);
          }
        }
        return cleaned;
      }
      
      return obj;
    };

    return removePIIFields(sanitized);
  }

  /**
   * Generate privacy-compliant data export
   */
  public generatePrivacyCompliantExport(
    data: any,
    options: DataExportOptions = {
      includePersonalData: false,
      includeProgressData: true,
      includeSTEMAnalytics: true,
      includeAchievements: true
    }
  ): string {
    // Always ensure no personal data is included
    options.includePersonalData = false;

    let exportData: any = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        privacyCompliant: true,
        coppaCompliant: true,
        dataType: 'educational_progress',
        containsPII: false
      }
    };

    // Sanitize the input data
    const sanitizedData = this.sanitizeData(data);

    if (options.includeProgressData && sanitizedData.progress) {
      exportData.progress = {
        playerId: sanitizedData.progress.playerId, // Anonymous UUID
        ageGroup: sanitizedData.progress.ageGroup,
        totalRepairs: sanitizedData.progress.totalRepairs,
        roboGemsEarned: sanitizedData.progress.roboGemsEarned,
        roboGemsSpent: sanitizedData.progress.roboGemsSpent,
        unlockedTools: sanitizedData.progress.unlockedTools,
        unlockedCustomizations: sanitizedData.progress.unlockedCustomizations,
        createdAt: sanitizedData.progress.createdAt,
        lastModified: sanitizedData.progress.lastModified
      };
    }

    if (options.includeSTEMAnalytics && sanitizedData.stemMetrics) {
      exportData.stemAnalytics = {
        problemSolvingScore: sanitizedData.stemMetrics.problemSolvingScore,
        mechanicalConceptsLearned: sanitizedData.stemMetrics.mechanicalConceptsLearned,
        creativityMetrics: sanitizedData.stemMetrics.creativityMetrics,
        timeToCompletion: sanitizedData.stemMetrics.timeToCompletion,
        totalPlayTime: sanitizedData.stemMetrics.totalPlayTime
      };
    }

    if (options.includeAchievements && sanitizedData.achievements) {
      exportData.achievements = sanitizedData.achievements.map((achievement: any) => ({
        id: achievement.id,
        type: achievement.type,
        unlockedAt: achievement.unlockedAt,
        gemsRewarded: achievement.gemsRewarded,
        milestone: achievement.milestone
      }));
    }

    // Apply date range filter if specified
    if (options.dateRange) {
      exportData = this.filterByDateRange(exportData, options.dateRange);
    }

    // Final validation
    if (!this.validateDataForStorage(exportData)) {
      throw new Error('Export data failed privacy validation');
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Filter data by date range
   */
  private filterByDateRange(data: any, dateRange: { startDate: Date; endDate: Date }): any {
    const filtered = { ...data };
    
    // Filter session history if present
    if (filtered.progress?.sessionHistory) {
      filtered.progress.sessionHistory = filtered.progress.sessionHistory.filter((session: any) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= dateRange.startDate && sessionDate <= dateRange.endDate;
      });
    }

    // Filter achievements if present
    if (filtered.achievements) {
      filtered.achievements = filtered.achievements.filter((achievement: any) => {
        const achievementDate = new Date(achievement.unlockedAt);
        return achievementDate >= dateRange.startDate && achievementDate <= dateRange.endDate;
      });
    }

    return filtered;
  }

  /**
   * Perform privacy compliance audit
   */
  public performPrivacyAudit(): PrivacyAuditResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check localStorage for any potential PII
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('robo_pet_')) {
          const value = localStorage.getItem(key);
          if (value && !this.validateDataForStorage(JSON.parse(value))) {
            issues.push(`Potential PII found in localStorage key: ${key}`);
          }
        }
      }
    } catch (error) {
      issues.push('Failed to audit localStorage for PII');
    }

    // Check privacy settings compliance
    if (this.settings.dataCollection) {
      issues.push('Data collection is enabled (should be disabled for COPPA compliance)');
    }

    if (!this.settings.localStorageOnly) {
      issues.push('Local storage only is disabled (should be enabled for COPPA compliance)');
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('Privacy settings are COPPA compliant');
    } else {
      recommendations.push('Review and fix identified privacy issues');
      recommendations.push('Ensure all data collection is disabled');
      recommendations.push('Verify all data storage is local only');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
      lastAuditDate: new Date()
    };
  }

  /**
   * Clear all stored data (for privacy reset)
   */
  public clearAllData(): void {
    try {
      // Remove all robo-pet related data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('robo_pet_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('All user data cleared for privacy compliance');
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  /**
   * Get privacy policy text
   */
  public getPrivacyPolicy(): string {
    return `
ROBO-PET REPAIR SHOP PRIVACY POLICY

Data Collection:
• We do not collect any personally identifiable information (PII)
• All game progress is stored locally on your device
• No data is transmitted to external servers
• No account creation or login is required

Data Storage:
• All progress data is stored in your browser's local storage
• Data includes: game progress, achievements, and educational analytics
• No personal information is stored
• Data remains on your device and is not shared

Educational Analytics:
• We track educational progress for STEM learning insights
• Analytics are anonymous and contain no personal information
• Data is used only to generate parent-teacher reports
• All analytics remain local to your device

Data Export:
• Parents and teachers can export educational progress reports
• Exported data contains no personally identifiable information
• Reports include only educational metrics and achievements
• Export data is privacy-compliant and COPPA-safe

Children's Privacy (COPPA Compliance):
• This game is designed for children ages 3-12
• We do not collect personal information from children
• No registration or personal details are required
• All data processing complies with COPPA requirements

Data Control:
• You can clear all data at any time through the settings
• No data recovery is possible once cleared
• Data is automatically deleted when browser storage is cleared

Contact:
This is an educational game with local-only data storage.
No external data collection or transmission occurs.
    `.trim();
  }

  /**
   * Check if external network access is attempted (should never happen)
   */
  public monitorNetworkAccess(): void {
    // Override fetch to prevent external data transmission
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Only allow local audio file loading
      if (url.startsWith('data:') || url.startsWith('blob:') || 
          (url.startsWith('./') && url.includes('.mp3'))) {
        return originalFetch(input, init);
      }
      
      console.error('Privacy violation: Attempted external network access blocked:', url);
      throw new Error('External network access is not allowed for privacy compliance');
    };

    // Monitor and block other potential network access
    if (typeof XMLHttpRequest !== 'undefined') {
      const originalXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
        console.error('Privacy violation: XMLHttpRequest blocked for privacy compliance:', url);
        throw new Error('XMLHttpRequest is not allowed for privacy compliance');
      };
    }
  }

  /**
   * Initialize privacy monitoring
   */
  public initialize(): void {
    this.monitorNetworkAccess();
    
    // Perform initial privacy audit
    const audit = this.performPrivacyAudit();
    if (!audit.compliant) {
      console.warn('Privacy audit failed:', audit.issues);
    }

    console.log('Privacy Manager initialized - COPPA compliant mode active');
  }
}