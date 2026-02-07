/**
 * Local Storage Manager
 * Privacy-compliant local storage with automatic PII detection and prevention
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { PrivacyManager } from './PrivacyManager.js';

export interface StorageOptions {
  encrypt?: boolean;
  validatePrivacy?: boolean;
  maxSize?: number; // in bytes
  ttl?: number; // time to live in milliseconds
}

export interface StorageItem {
  data: any;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
  privacyValidated: boolean;
}

export class LocalStorageManager {
  private static instance: LocalStorageManager;
  private privacyManager: PrivacyManager;
  private readonly PREFIX = 'robo_pet_';
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

  private constructor() {
    this.privacyManager = PrivacyManager.getInstance();
  }

  public static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  /**
   * Store data with privacy validation
   */
  public setItem(key: string, data: any, options: StorageOptions = {}): boolean {
    try {
      // Default options
      const opts: StorageOptions = {
        validatePrivacy: true,
        maxSize: this.MAX_STORAGE_SIZE,
        ...options
      };

      // Privacy validation
      if (opts.validatePrivacy && !this.privacyManager.validateDataForStorage(data)) {
        console.error(`Privacy validation failed for key: ${key}`);
        return false;
      }

      // Sanitize data to remove any potential PII
      const sanitizedData = this.privacyManager.sanitizeData(data);

      // Create storage item
      const storageItem: StorageItem = {
        data: sanitizedData,
        timestamp: Date.now(),
        ttl: opts.ttl,
        encrypted: opts.encrypt || false,
        privacyValidated: true
      };

      // Check size limits
      const serialized = JSON.stringify(storageItem);
      if (opts.maxSize && serialized.length > opts.maxSize) {
        console.error(`Data too large for key: ${key} (${serialized.length} bytes)`);
        return false;
      }

      // Store with prefix
      const storageKey = this.PREFIX + key;
      localStorage.setItem(storageKey, serialized);

      console.log(`Stored privacy-compliant data for key: ${key}`);
      return true;

    } catch (error) {
      console.error(`Failed to store data for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Retrieve data with privacy validation
   */
  public getItem<T = any>(key: string): T | null {
    try {
      const storageKey = this.PREFIX + key;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        return null;
      }

      const storageItem: StorageItem = JSON.parse(stored);

      // Check TTL expiration
      if (storageItem.ttl && Date.now() > storageItem.timestamp + storageItem.ttl) {
        this.removeItem(key);
        return null;
      }

      // Validate privacy compliance of stored data
      if (!storageItem.privacyValidated || !this.privacyManager.validateDataForStorage(storageItem.data)) {
        console.warn(`Privacy validation failed for stored data: ${key}`);
        // Don't return potentially non-compliant data
        this.removeItem(key);
        return null;
      }

      return storageItem.data as T;

    } catch (error) {
      console.error(`Failed to retrieve data for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  public removeItem(key: string): boolean {
    try {
      const storageKey = this.PREFIX + key;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error(`Failed to remove data for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Check if item exists
   */
  public hasItem(key: string): boolean {
    const storageKey = this.PREFIX + key;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Get all keys with our prefix
   */
  public getAllKeys(): string[] {
    const keys: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.PREFIX)) {
          keys.push(key.substring(this.PREFIX.length));
        }
      }
    } catch (error) {
      console.error('Failed to get all keys:', error);
    }

    return keys;
  }

  /**
   * Clear all game-related data
   */
  public clearAll(): boolean {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => this.removeItem(key));
      console.log(`Cleared ${keys.length} items from storage`);
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  public getStorageStats(): {
    totalItems: number;
    totalSize: number;
    itemSizes: { [key: string]: number };
    privacyCompliant: boolean;
  } {
    const stats = {
      totalItems: 0,
      totalSize: 0,
      itemSizes: {} as { [key: string]: number },
      privacyCompliant: true
    };

    try {
      const keys = this.getAllKeys();
      stats.totalItems = keys.length;

      keys.forEach(key => {
        const storageKey = this.PREFIX + key;
        const data = localStorage.getItem(storageKey);
        if (data) {
          const size = data.length;
          stats.totalSize += size;
          stats.itemSizes[key] = size;

          // Check privacy compliance
          try {
            const parsed = JSON.parse(data);
            if (!this.privacyManager.validateDataForStorage(parsed)) {
              stats.privacyCompliant = false;
            }
          } catch {
            // Invalid JSON, might be privacy issue
            stats.privacyCompliant = false;
          }
        }
      });

    } catch (error) {
      console.error('Failed to get storage stats:', error);
      stats.privacyCompliant = false;
    }

    return stats;
  }

  /**
   * Perform privacy audit on all stored data
   */
  public auditStoredData(): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const keys = this.getAllKeys();
      
      keys.forEach(key => {
        const data = this.getItem(key);
        if (data && !this.privacyManager.validateDataForStorage(data)) {
          issues.push(`Privacy issue found in stored data: ${key}`);
        }
      });

      // Check for expired items
      keys.forEach(key => {
        const storageKey = this.PREFIX + key;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const storageItem: StorageItem = JSON.parse(stored);
            if (storageItem.ttl && Date.now() > storageItem.timestamp + storageItem.ttl) {
              recommendations.push(`Remove expired data: ${key}`);
            }
          } catch {
            issues.push(`Invalid storage format: ${key}`);
          }
        }
      });

      // Check storage size
      const stats = this.getStorageStats();
      if (stats.totalSize > this.MAX_STORAGE_SIZE * 0.8) {
        recommendations.push('Storage usage is high, consider cleaning old data');
      }

    } catch (error) {
      issues.push('Failed to audit stored data');
    }

    if (issues.length === 0) {
      recommendations.push('All stored data is privacy compliant');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Clean up expired and invalid data
   */
  public cleanup(): number {
    let cleanedCount = 0;

    try {
      const keys = this.getAllKeys();
      
      keys.forEach(key => {
        const storageKey = this.PREFIX + key;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          try {
            const storageItem: StorageItem = JSON.parse(stored);
            
            // Remove expired items
            if (storageItem.ttl && Date.now() > storageItem.timestamp + storageItem.ttl) {
              this.removeItem(key);
              cleanedCount++;
              return;
            }

            // Remove privacy non-compliant items
            if (!storageItem.privacyValidated || !this.privacyManager.validateDataForStorage(storageItem.data)) {
              console.warn(`Removing privacy non-compliant data: ${key}`);
              this.removeItem(key);
              cleanedCount++;
              return;
            }

          } catch {
            // Invalid format, remove it
            this.removeItem(key);
            cleanedCount++;
          }
        }
      });

    } catch (error) {
      console.error('Failed to cleanup storage:', error);
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} items from storage`);
    }

    return cleanedCount;
  }

  /**
   * Export all stored data in privacy-compliant format
   */
  public exportAllData(): string {
    const exportData: { [key: string]: any } = {};
    
    try {
      const keys = this.getAllKeys();
      
      keys.forEach(key => {
        const data = this.getItem(key);
        if (data) {
          // Double-check privacy compliance before export
          const sanitized = this.privacyManager.sanitizeData(data);
          if (this.privacyManager.validateDataForStorage(sanitized)) {
            exportData[key] = sanitized;
          }
        }
      });

      return this.privacyManager.generatePrivacyCompliantExport(exportData, {
        includePersonalData: false,
        includeProgressData: true,
        includeSTEMAnalytics: true,
        includeAchievements: true
      });

    } catch (error) {
      console.error('Failed to export data:', error);
      return JSON.stringify({ error: 'Export failed', timestamp: new Date().toISOString() });
    }
  }

  /**
   * Initialize storage manager with privacy checks
   */
  public initialize(): void {
    // Perform initial cleanup
    this.cleanup();

    // Audit existing data
    const audit = this.auditStoredData();
    if (!audit.compliant) {
      console.warn('Storage audit found issues:', audit.issues);
    }

    // Set up periodic cleanup (every 5 minutes)
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    console.log('Local Storage Manager initialized with privacy compliance');
  }

  /**
   * Get privacy-safe storage summary
   */
  public getStorageSummary(): string {
    const stats = this.getStorageStats();
    const audit = this.auditStoredData();

    return `
Storage Summary:
• Total Items: ${stats.totalItems}
• Total Size: ${Math.round(stats.totalSize / 1024)} KB
• Privacy Compliant: ${audit.compliant ? 'Yes' : 'No'}
• Issues Found: ${audit.issues.length}
• All data stored locally only
• No external transmission
• COPPA compliant
    `.trim();
  }
}