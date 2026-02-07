/**
 * Property-Based Tests for Privacy Compliance
 * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PrivacyManager } from '@/privacy/PrivacyManager';
import { LocalStorageManager } from '@/privacy/LocalStorageManager';
import { DataExporter } from '@/privacy/DataExporter';

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

// Mock URL.createObjectURL and related APIs for DataExporter
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
  writable: true
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true
});

// Mock document.createElement for download functionality
Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn(),
        remove: vi.fn()
      };
    }
    return {};
  }),
  writable: true
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn(),
  writable: true
});

describe('Privacy Compliance Property Tests', () => {
  let privacyManager: PrivacyManager;
  let storageManager: LocalStorageManager;
  let dataExporter: DataExporter;

  beforeEach(() => {
    // Clear mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.key.mockClear();

    // Reset singleton instances
    (PrivacyManager as any).instance = undefined;
    (LocalStorageManager as any).instance = undefined;
    
    privacyManager = PrivacyManager.getInstance();
    storageManager = LocalStorageManager.getInstance();
    dataExporter = new DataExporter();
  });

  // Generators for property testing
  const safeGameDataArb = fc.record({
    playerId: fc.string({ minLength: 10, maxLength: 50 }).filter(s => !s.includes('@')),
    totalRepairs: fc.integer({ min: 0, max: 1000 }),
    ageGroup: fc.constantFrom('3-5', '6-8', '9-12'),
    roboGemsEarned: fc.integer({ min: 0, max: 10000 }),
    achievements: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { maxLength: 20 }),
    stemMetrics: fc.record({
      problemSolvingScore: fc.integer({ min: 0, max: 100 }),
      mechanicalConceptsLearned: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { maxLength: 10 }),
      creativityMetrics: fc.record({
        uniqueCustomizations: fc.integer({ min: 0, max: 100 }),
        colorVariationsUsed: fc.integer({ min: 0, max: 50 }),
        accessoryCombinations: fc.integer({ min: 0, max: 50 })
      })
    })
  });

  const piiDataArb = fc.record({
    name: fc.string({ minLength: 2, maxLength: 50 }),
    email: fc.emailAddress(),
    phone: fc.string().filter(s => /\d{3}-\d{3}-\d{4}/.test(s)),
    address: fc.string({ minLength: 10, maxLength: 100 }),
    gameData: safeGameDataArb
  });

  /**
   * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
   * For any data storage operation, the system should maintain local-only storage,
   * avoid collecting PII, and operate without external connections.
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
   */
  it('should never store or validate PII data regardless of input', () => {
    fc.assert(
      fc.property(piiDataArb, (dataWithPII) => {
        // Property: PII data should always be rejected for storage
        const isValid = privacyManager.validateDataForStorage(dataWithPII);
        expect(isValid).toBe(false);

        // Property: Sanitized data should not contain PII
        const sanitized = privacyManager.sanitizeData(dataWithPII);
        expect(sanitized.name).toBeUndefined();
        expect(sanitized.email).toBeUndefined();
        expect(sanitized.phone).toBeUndefined();
        expect(sanitized.address).toBeUndefined();

        // Property: Game data should be preserved after sanitization
        expect(sanitized.gameData).toBeDefined();
        expect(sanitized.gameData.playerId).toBeDefined();
        expect(sanitized.gameData.totalRepairs).toBeDefined();
      }),
      { numRuns: 3 }
    );
  });

  /**
   * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
   * For any safe game data, the system should allow storage and maintain data integrity
   * while ensuring privacy compliance.
   * **Validates: Requirements 7.3, 7.4**
   */
  it('should successfully store and retrieve safe game data', () => {
    fc.assert(
      fc.property(safeGameDataArb, fc.string({ minLength: 1, maxLength: 20 }), (gameData, key) => {
        // Property: Safe game data should be accepted for storage
        const isValid = privacyManager.validateDataForStorage(gameData);
        expect(isValid).toBe(true);

        // Property: Storage operation should succeed for valid data
        const stored = storageManager.setItem(key, gameData);
        expect(stored).toBe(true);

        // Mock successful storage for retrieval test
        const storageItem = {
          data: gameData,
          timestamp: Date.now(),
          privacyValidated: true
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(storageItem));

        // Property: Retrieved data should match stored data
        const retrieved = storageManager.getItem(key);
        expect(retrieved).toEqual(gameData);
      }),
      { numRuns: 3 }
    );
  });

  /**
   * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
   * For any data export operation, the system should generate privacy-compliant exports
   * that contain no PII and include proper metadata.
   * **Validates: Requirements 7.1, 7.2, 7.4, 11.5**
   */
  it('should generate privacy-compliant exports for any game data', () => {
    fc.assert(
      fc.property(safeGameDataArb, (gameData) => {
        // Property: Export should always be privacy compliant
        const exported = privacyManager.generatePrivacyCompliantExport(gameData, {
          includePersonalData: false,
          includeProgressData: true,
          includeSTEMAnalytics: true,
          includeAchievements: true
        });

        const parsed = JSON.parse(exported);

        // Property: Export metadata should indicate privacy compliance
        expect(parsed.exportMetadata.privacyCompliant).toBe(true);
        expect(parsed.exportMetadata.coppaCompliant).toBe(true);
        expect(parsed.exportMetadata.containsPII).toBe(false);

        // Property: Export should contain game data but no PII
        expect(parsed.progress).toBeDefined();
        expect(parsed.stemAnalytics).toBeDefined();
        
        // Property: Exported data should pass privacy validation
        const exportedDataValid = privacyManager.validateDataForStorage(parsed);
        expect(exportedDataValid).toBe(true);
      }),
      { numRuns: 3 }
    );
  });

  /**
   * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
   * For any privacy settings update, the system should enforce COPPA compliance
   * by never allowing data collection or external transmission.
   * **Validates: Requirements 7.1, 7.2**
   */
  it('should enforce COPPA compliance regardless of settings input', () => {
    fc.assert(
      fc.property(
        fc.record({
          dataCollection: fc.boolean(),
          localStorageOnly: fc.boolean(),
          analyticsEnabled: fc.boolean(),
          exportEnabled: fc.boolean()
        }),
        (settingsInput) => {
          // Property: Update settings with any input
          privacyManager.updateSettings(settingsInput);
          const actualSettings = privacyManager.getSettings();

          // Property: Data collection should always be disabled
          expect(actualSettings.dataCollection).toBe(false);

          // Property: Local storage only should always be enabled
          expect(actualSettings.localStorageOnly).toBe(true);

          // Property: Analytics and export can be user-controlled but default to enabled
          expect(typeof actualSettings.analyticsEnabled).toBe('boolean');
          expect(typeof actualSettings.exportEnabled).toBe('boolean');
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
   * For any stored data audit, the system should correctly identify privacy issues
   * and provide appropriate recommendations.
   * **Validates: Requirements 7.1, 7.3, 7.4**
   */
  it('should correctly audit stored data for privacy compliance', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            data: fc.oneof(safeGameDataArb, piiDataArb)
          }),
          { maxLength: 10 }
        ),
        (storedItems) => {
          // Mock localStorage with the test data
          localStorageMock.length = storedItems.length;
          localStorageMock.key.mockImplementation((index) => {
            return index < storedItems.length ? `robo_pet_${storedItems[index].key}` : null;
          });
          
          localStorageMock.getItem.mockImplementation((key) => {
            const itemKey = key.replace('robo_pet_', '');
            const item = storedItems.find(item => item.key === itemKey);
            return item ? JSON.stringify(item.data) : null;
          });

          // Property: Audit should complete without errors
          const audit = privacyManager.performPrivacyAudit();
          expect(audit).toBeDefined();
          expect(audit.lastAuditDate).toBeInstanceOf(Date);

          // Property: Audit should detect PII issues
          const hasPIIData = storedItems.some(item => 
            typeof item.data === 'object' && 
            item.data !== null && 
            ('name' in item.data || 'email' in item.data)
          );

          if (hasPIIData) {
            expect(audit.compliant).toBe(false);
            expect(audit.issues.length).toBeGreaterThan(0);
          }

          // Property: Recommendations should always be provided
          expect(Array.isArray(audit.recommendations)).toBe(true);
          expect(audit.recommendations.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
   * For any data cleanup operation, the system should remove privacy non-compliant
   * and expired data while preserving valid data.
   * **Validates: Requirements 7.3, 7.4**
   */
  it('should properly clean up non-compliant and expired data', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            data: safeGameDataArb,
            isExpired: fc.boolean(),
            isCorrupted: fc.boolean()
          }),
          { maxLength: 10 }
        ),
        (testItems) => {
          // Mock localStorage with test items
          localStorageMock.length = testItems.length;
          localStorageMock.key.mockImplementation((index) => {
            return index < testItems.length ? `robo_pet_${testItems[index].key}` : null;
          });

          localStorageMock.getItem.mockImplementation((key) => {
            const itemKey = key.replace('robo_pet_', '');
            const item = testItems.find(item => item.key === itemKey);
            
            if (!item) return null;
            
            if (item.isCorrupted) {
              return 'invalid json';
            }

            const storageItem = {
              data: item.data,
              timestamp: item.isExpired ? Date.now() - 10000 : Date.now(),
              ttl: item.isExpired ? 5000 : undefined,
              privacyValidated: true
            };

            return JSON.stringify(storageItem);
          });

          // Property: Cleanup should complete without errors
          const cleanedCount = storageManager.cleanup();
          expect(typeof cleanedCount).toBe('number');
          expect(cleanedCount).toBeGreaterThanOrEqual(0);

          // Property: Expired and corrupted items should be cleaned
          const expectedCleanups = testItems.filter(item => item.isExpired || item.isCorrupted).length;
          if (expectedCleanups > 0) {
            expect(cleanedCount).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * **Feature: robo-pet-repair-shop, Property 9: Privacy and Safety Compliance**
   * For any data export format request, the system should generate valid exports
   * in the requested format while maintaining privacy compliance.
   * **Validates: Requirements 11.5**
   */
  it('should generate valid exports in all supported formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeGameDataArb,
        fc.constantFrom('json', 'html', 'csv', 'txt'),
        async (gameData, format) => {
          // Mock ProgressManager methods
          const mockProgressManager = {
            getProgress: () => gameData,
            getSTEMAnalytics: () => gameData.stemMetrics,
            getAchievements: () => gameData.achievements || [],
            getMilestones: () => [],
            getAvailableGems: () => 100,
            generateSummaryReport: () => 'Test summary'
          };

          // Replace the progress manager instance
          (dataExporter as any).progressManager = mockProgressManager;

          // Property: Export should complete successfully for all formats
          const result = await dataExporter.exportEducationalData(format as any);
          expect(result.success).toBe(true);
          expect(result.format).toBe(format);
          expect(result.filename).toContain('robo-pet');
          expect(result.size).toBeGreaterThan(0);
        }
      ),
      { numRuns: 3 }
    );
  });
});
