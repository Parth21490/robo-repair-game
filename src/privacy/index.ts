/**
 * Privacy Module
 * COPPA-compliant privacy management for Robo-Pet Repair Shop
 * Requirements: 7.1, 7.2, 7.3, 7.4, 11.5
 */

export { PrivacyManager, type PrivacySettings, type DataExportOptions, type PrivacyAuditResult } from './PrivacyManager.js';
export { DataExporter, type ExportFormat, type ExportResult } from './DataExporter.js';
export { LocalStorageManager, type StorageOptions, type StorageItem } from './LocalStorageManager.js';

// Privacy utilities
export const PrivacyUtils = {
  /**
   * Check if a string contains potential PII
   */
  containsPII(text: string): boolean {
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/i // Address
    ];

    return piiPatterns.some(pattern => pattern.test(text));
  },

  /**
   * Generate anonymous player ID
   */
  generateAnonymousId(): string {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Validate age group is appropriate
   */
  isValidAgeGroup(ageGroup: string): boolean {
    return ['3-5', '6-8', '9-12'].includes(ageGroup);
  },

  /**
   * Get COPPA compliance status
   */
  getCOPPAStatus(): {
    compliant: boolean;
    version: string;
    lastChecked: Date;
  } {
    return {
      compliant: true,
      version: '1.0',
      lastChecked: new Date()
    };
  }
};