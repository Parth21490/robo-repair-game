/**
 * Local Storage Manager Tests
 * Tests for privacy-compliant local storage management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageManager } from '@/privacy/LocalStorageManager';
import { PrivacyManager } from '@/privacy/PrivacyManager';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock PrivacyManager
vi.mock('@/privacy/PrivacyManager', () => ({
  PrivacyManager: {
    getInstance: vi.fn(() => ({
      validateDataForStorage: vi.fn((data) => {
        // Mock validation - reject data with 'name' field
        return !JSON.stringify(data).includes('"name"');
      }),
      sanitizeData: vi.fn((data) => {
        // Mock sanitization - remove 'name' field
        if (typeof data === 'object' && data !== null) {
          const { name, ...sanitized } = data as any;
          return sanitized;
        }
        return data;
      })
    }))
  }
}));

describe('LocalStorageManager', () => {
  let storageManager: LocalStorageManager;

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.key.mockClear();

    // Reset singleton instance
    (LocalStorageManager as any).instance = undefined;
    storageManager = LocalStorageManager.getInstance();
  });

  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = LocalStorageManager.getInstance();
      const instance2 = LocalStorageManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Data Storage', () => {
    it('should store privacy-compliant data successfully', () => {
      const safeData = {
        playerId: 'player_123',
        score: 100,
        level: 5
      };

      const result = storageManager.setItem('test_data', safeData);
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'robo_pet_test_data',
        expect.stringContaining('"privacyValidated":true')
      );
    });

    it('should reject data that fails privacy validation', () => {
      const unsafeData = {
        name: 'John Doe',
        score: 100
      };

      const result = storageManager.setItem('test_data', unsafeData);
      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should respect size limits', () => {
      const largeData = {
        data: 'x'.repeat(1000000) // 1MB of data
      };

      const result = storageManager.setItem('test_data', largeData, {
        maxSize: 500000 // 500KB limit
      });
      expect(result).toBe(false);
    });

    it('should handle storage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = storageManager.setItem('test_data', { safe: true });
      expect(result).toBe(false);
    });
  });

  describe('Data Retrieval', () => {
    it('should retrieve stored data successfully', () => {
      const testData = { score: 100 };
      const storageItem = {
        data: testData,
        timestamp: Date.now(),
        privacyValidated: true
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageItem));

      const result = storageManager.getItem('test_data');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent data', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = storageManager.getItem('non_existent');
      expect(result).toBeNull();
    });

    it('should handle expired data with TTL', () => {
      const expiredItem = {
        data: { score: 100 },
        timestamp: Date.now() - 10000, // 10 seconds ago
        ttl: 5000, // 5 second TTL
        privacyValidated: true
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredItem));

      const result = storageManager.getItem('expired_data');
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('robo_pet_expired_data');
    });

    it('should reject data that fails privacy validation on retrieval', () => {
      const unsafeItem = {
        data: { name: 'John Doe', score: 100 },
        timestamp: Date.now(),
        privacyValidated: false
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(unsafeItem));

      const result = storageManager.getItem('unsafe_data');
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('robo_pet_unsafe_data');
    });

    it('should handle corrupted data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = storageManager.getItem('corrupted_data');
      expect(result).toBeNull();
    });
  });

  describe('Data Management', () => {
    it('should check if item exists', () => {
      localStorageMock.getItem.mockReturnValue('some data');
      expect(storageManager.hasItem('test_data')).toBe(true);

      localStorageMock.getItem.mockReturnValue(null);
      expect(storageManager.hasItem('test_data')).toBe(false);
    });

    it('should remove items successfully', () => {
      const result = storageManager.removeItem('test_data');
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('robo_pet_test_data');
    });

    it('should get all keys with prefix', () => {
      localStorageMock.length = 3;
      localStorageMock.key
        .mockReturnValueOnce('robo_pet_progress')
        .mockReturnValueOnce('other_app_data')
        .mockReturnValueOnce('robo_pet_settings');

      const keys = storageManager.getAllKeys();
      expect(keys).toEqual(['progress', 'settings']);
    });

    it('should clear all game-related data', () => {
      localStorageMock.length = 3;
      localStorageMock.key
        .mockReturnValueOnce('robo_pet_progress')
        .mockReturnValueOnce('other_app_data')
        .mockReturnValueOnce('robo_pet_settings');

      const result = storageManager.clearAll();
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Storage Statistics', () => {
    it('should calculate storage statistics', () => {
      localStorageMock.length = 2;
      localStorageMock.key
        .mockReturnValueOnce('robo_pet_progress')
        .mockReturnValueOnce('robo_pet_settings');
      
      localStorageMock.getItem
        .mockReturnValueOnce('{"data":{"score":100},"privacyValidated":true}')
        .mockReturnValueOnce('{"data":{"volume":0.8},"privacyValidated":true}');

      const stats = storageManager.getStorageStats();
      expect(stats.totalItems).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.privacyCompliant).toBe(true);
      expect(stats.itemSizes).toHaveProperty('progress');
      expect(stats.itemSizes).toHaveProperty('settings');
    });

    it('should detect privacy non-compliance in statistics', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_unsafe');
      localStorageMock.getItem.mockReturnValueOnce('{"data":{"name":"John"},"privacyValidated":false}');

      const stats = storageManager.getStorageStats();
      expect(stats.privacyCompliant).toBe(false);
    });
  });

  describe('Privacy Audit', () => {
    it('should pass audit with compliant data', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_safe');
      
      const safeItem = {
        data: { score: 100 },
        timestamp: Date.now(),
        privacyValidated: true
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(safeItem));

      const audit = storageManager.auditStoredData();
      expect(audit.compliant).toBe(true);
      expect(audit.issues).toHaveLength(0);
    });

    it('should detect privacy issues in stored data', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_unsafe');
      
      const unsafeItem = {
        data: { name: 'John Doe' },
        timestamp: Date.now(),
        privacyValidated: true
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(unsafeItem));

      const audit = storageManager.auditStoredData();
      expect(audit.compliant).toBe(false);
      expect(audit.issues.length).toBeGreaterThan(0);
    });

    it('should detect expired data in audit', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_expired');
      
      const expiredItem = {
        data: { score: 100 },
        timestamp: Date.now() - 10000,
        ttl: 5000,
        privacyValidated: true
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredItem));

      const audit = storageManager.auditStoredData();
      expect(audit.recommendations).toContain('Remove expired data: expired');
    });
  });

  describe('Data Cleanup', () => {
    it('should clean up expired data', () => {
      localStorageMock.length = 2;
      localStorageMock.key
        .mockReturnValueOnce('robo_pet_valid')
        .mockReturnValueOnce('robo_pet_expired');
      
      const validItem = {
        data: { score: 100 },
        timestamp: Date.now(),
        privacyValidated: true
      };
      
      const expiredItem = {
        data: { score: 50 },
        timestamp: Date.now() - 10000,
        ttl: 5000,
        privacyValidated: true
      };

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(validItem))
        .mockReturnValueOnce(JSON.stringify(expiredItem));

      const cleanedCount = storageManager.cleanup();
      expect(cleanedCount).toBe(1);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('robo_pet_expired');
    });

    it('should clean up privacy non-compliant data', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_unsafe');
      
      const unsafeItem = {
        data: { name: 'John Doe' },
        timestamp: Date.now(),
        privacyValidated: false
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(unsafeItem));

      const cleanedCount = storageManager.cleanup();
      expect(cleanedCount).toBe(1);
    });

    it('should clean up corrupted data', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_corrupted');
      localStorageMock.getItem.mockReturnValue('invalid json');

      const cleanedCount = storageManager.cleanup();
      expect(cleanedCount).toBe(1);
    });
  });

  describe('Data Export', () => {
    it('should export all data in privacy-compliant format', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_progress');
      
      const safeItem = {
        data: { score: 100, level: 5 },
        timestamp: Date.now(),
        privacyValidated: true
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(safeItem));

      const exported = storageManager.exportAllData();
      const parsed = JSON.parse(exported);
      
      expect(parsed.exportMetadata.privacyCompliant).toBe(true);
      expect(parsed.progress).toEqual({ score: 100, level: 5 });
    });
  });

  describe('Storage Summary', () => {
    it('should generate privacy-safe storage summary', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('robo_pet_test');
      localStorageMock.getItem.mockReturnValue('{"data":{"score":100},"privacyValidated":true}');

      const summary = storageManager.getStorageSummary();
      expect(summary).toContain('Total Items: 1');
      expect(summary).toContain('Privacy Compliant: Yes');
      expect(summary).toContain('COPPA compliant');
    });
  });
});