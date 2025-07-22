// Unit tests for SessionKeyService - Production Readiness Testing
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { sessionKeyService } from '../../src/services/sessionKeyService';

describe('SessionKeyService Production Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Session Key Creation', () => {
    test('should create session key with valid parameters', async () => {
      const mockAccount = {
        address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
        signMessage: jest.fn().mockResolvedValue(['0x123', '0x456'])
      };

      const sessionData = {
        description: 'Test DeFi Session',
        permissions: ['transfer', 'swap'],
        duration: 24,
        price: '0.001'
      };

      const result = await sessionKeyService.createSessionKey(mockAccount, sessionData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.description).toBe(sessionData.description);
      expect(result.permissions).toEqual(sessionData.permissions);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    test('should handle session key creation failure gracefully', async () => {
      const mockAccount = {
        address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
        signMessage: jest.fn().mockRejectedValue(new Error('User rejected'))
      };

      const sessionData = {
        description: 'Test Session',
        permissions: ['transfer'],
        duration: 24,
        price: '0.001'
      };

      await expect(sessionKeyService.createSessionKey(mockAccount, sessionData))
        .rejects.toThrow('User rejected');
    });

    test('should validate session key parameters', async () => {
      const mockAccount = {
        address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31'
      };

      // Test invalid duration
      await expect(sessionKeyService.createSessionKey(mockAccount, {
        description: 'Test',
        permissions: ['transfer'],
        duration: -1,
        price: '0.001'
      })).rejects.toThrow();

      // Test empty permissions
      await expect(sessionKeyService.createSessionKey(mockAccount, {
        description: 'Test',
        permissions: [],
        duration: 24,
        price: '0.001'
      })).rejects.toThrow();

      // Test invalid price
      await expect(sessionKeyService.createSessionKey(mockAccount, {
        description: 'Test',
        permissions: ['transfer'],
        duration: 24,
        price: '-0.001'
      })).rejects.toThrow();
    });
  });

  describe('Session Key Storage', () => {
    test('should store and retrieve session keys correctly', () => {
      const userAddress = '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31';
      const sessionKey = {
        id: 'test-session-1',
        description: 'Test Session',
        permissions: ['transfer'],
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now()
      };

      // Store session key
      sessionKeyService.storeSessionKey(userAddress, sessionKey);

      // Retrieve session keys
      const storedKeys = sessionKeyService.getStoredSessionKeys(userAddress);
      expect(storedKeys).toHaveLength(1);
      expect(storedKeys[0].id).toBe(sessionKey.id);
    });

    test('should handle storage quota exceeded', () => {
      const userAddress = '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31';
      
      // Mock localStorage to throw quota exceeded error
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const sessionKey = {
        id: 'test-session-1',
        description: 'Test Session',
        permissions: ['transfer'],
        expiresAt: Date.now() + 86400000
      };

      expect(() => {
        sessionKeyService.storeSessionKey(userAddress, sessionKey);
      }).toThrow('QuotaExceededError');
    });

    test('should clean up expired session keys', () => {
      const userAddress = '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31';
      const now = Date.now();
      
      const expiredKey = {
        id: 'expired-session',
        description: 'Expired Session',
        permissions: ['transfer'],
        expiresAt: now - 1000,
        createdAt: now - 86400000
      };

      const validKey = {
        id: 'valid-session',
        description: 'Valid Session',
        permissions: ['transfer'],
        expiresAt: now + 86400000,
        createdAt: now
      };

      // Store both keys
      sessionKeyService.storeSessionKey(userAddress, expiredKey);
      sessionKeyService.storeSessionKey(userAddress, validKey);

      // Clean up expired keys
      sessionKeyService.cleanupExpiredSessions(userAddress);

      // Should only have valid key
      const storedKeys = sessionKeyService.getStoredSessionKeys(userAddress);
      expect(storedKeys).toHaveLength(1);
      expect(storedKeys[0].id).toBe(validKey.id);
    });
  });

  describe('Session Key Validation', () => {
    test('should validate active session keys', async () => {
      const sessionKey = {
        id: 'test-session-1',
        description: 'Test Session',
        permissions: ['transfer'],
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now(),
        sessionData: {
          key: '0x123',
          policies: [{ contractAddress: '*', selector: 'transfer' }]
        }
      };

      const isValid = await sessionKeyService.validateSessionKey(sessionKey);
      expect(isValid).toBe(true);
    });

    test('should reject expired session keys', async () => {
      const sessionKey = {
        id: 'expired-session',
        description: 'Expired Session',
        permissions: ['transfer'],
        expiresAt: Date.now() - 1000,
        createdAt: Date.now() - 86400000,
        sessionData: {
          key: '0x123',
          policies: [{ contractAddress: '*', selector: 'transfer' }]
        }
      };

      const isValid = await sessionKeyService.validateSessionKey(sessionKey);
      expect(isValid).toBe(false);
    });

    test('should validate session key permissions', () => {
      const sessionKey = {
        id: 'test-session-1',
        permissions: ['transfer', 'swap'],
        sessionData: {
          policies: [
            { contractAddress: '*', selector: 'transfer' },
            { contractAddress: '*', selector: 'swap' }
          ]
        }
      };

      expect(sessionKeyService.hasPermission(sessionKey, 'transfer')).toBe(true);
      expect(sessionKeyService.hasPermission(sessionKey, 'swap')).toBe(true);
      expect(sessionKeyService.hasPermission(sessionKey, 'approve')).toBe(false);
    });
  });

  describe('Session Key Export/Import', () => {
    test('should export session key correctly', () => {
      const sessionKey = {
        id: 'test-session-1',
        description: 'Test Session',
        permissions: ['transfer'],
        duration: 24,
        price: '0.001',
        expiresAt: Date.now() + 86400000,
        sessionData: {
          key: '0x123',
          policies: [{ contractAddress: '*', selector: 'transfer' }]
        }
      };

      const exportData = sessionKeyService.exportSessionKey(sessionKey);
      expect(exportData).toBeDefined();
      
      const parsed = JSON.parse(exportData);
      expect(parsed.id).toBe(sessionKey.id);
      expect(parsed.description).toBe(sessionKey.description);
      expect(parsed.permissions).toEqual(sessionKey.permissions);
    });

    test('should import session key correctly', async () => {
      const userAddress = '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31';
      const exportData = JSON.stringify({
        id: 'imported-session',
        description: 'Imported Session',
        permissions: ['transfer'],
        duration: 24,
        price: '0.001',
        expiresAt: Date.now() + 86400000,
        sessionData: {
          key: '0x123',
          policies: [{ contractAddress: '*', selector: 'transfer' }]
        }
      });

      await sessionKeyService.importSessionKey(exportData, userAddress);

      const storedKeys = sessionKeyService.getStoredSessionKeys(userAddress);
      expect(storedKeys).toHaveLength(1);
      expect(storedKeys[0].id).toBe('imported-session');
    });

    test('should handle invalid import data', async () => {
      const userAddress = '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31';
      
      // Test invalid JSON
      await expect(sessionKeyService.importSessionKey('invalid-json', userAddress))
        .rejects.toThrow();

      // Test missing required fields
      const invalidData = JSON.stringify({ id: 'test' });
      await expect(sessionKeyService.importSessionKey(invalidData, userAddress))
        .rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const mockAccount = {
        address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
        signMessage: jest.fn().mockResolvedValue(['0x123', '0x456'])
      };

      const sessionData = {
        description: 'Test Session',
        permissions: ['transfer'],
        duration: 24,
        price: '0.001'
      };

      // Should fallback to local session creation
      const result = await sessionKeyService.createSessionKey(mockAccount, sessionData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    test('should handle corrupted localStorage data', () => {
      const userAddress = '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31';
      
      // Mock corrupted data in localStorage
      localStorage.getItem = jest.fn().mockReturnValue('corrupted-json-data');

      const storedKeys = sessionKeyService.getStoredSessionKeys(userAddress);
      expect(storedKeys).toEqual([]); // Should return empty array for corrupted data
    });
  });
});
