// Unit tests for TransactionService - Production Readiness Testing
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { transactionService } from '../../src/services/transactionService';

describe('TransactionService Production Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Transaction Submission', () => {
    test('should submit transaction and start monitoring', async () => {
      const mockProvider = {
        getTransactionReceipt: jest.fn()
          .mockResolvedValueOnce(null) // First call - pending
          .mockResolvedValueOnce({ // Second call - confirmed
            transaction_hash: '0x123',
            execution_status: 'SUCCEEDED',
            block_number: 123456
          })
      };

      const transactionData = {
        hash: '0x123',
        type: 'session_key_creation',
        description: 'Create DeFi Session Key',
        amount: '0.001'
      };

      const result = await transactionService.submitTransaction(
        transactionData,
        mockProvider
      );

      expect(result.id).toBeDefined();
      expect(result.hash).toBe('0x123');
      expect(result.status).toBe('pending');
      expect(result.type).toBe('session_key_creation');
    });

    test('should handle transaction submission failure', async () => {
      const mockProvider = {
        getTransactionReceipt: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      const transactionData = {
        hash: '0x123',
        type: 'session_key_creation',
        description: 'Create Session Key'
      };

      await expect(transactionService.submitTransaction(transactionData, mockProvider))
        .rejects.toThrow('Network error');
    });

    test('should validate transaction data before submission', async () => {
      const mockProvider = {
        getTransactionReceipt: jest.fn()
      };

      // Test missing hash
      await expect(transactionService.submitTransaction({
        type: 'session_key_creation',
        description: 'Test'
      }, mockProvider)).rejects.toThrow();

      // Test missing type
      await expect(transactionService.submitTransaction({
        hash: '0x123',
        description: 'Test'
      }, mockProvider)).rejects.toThrow();

      // Test invalid hash format
      await expect(transactionService.submitTransaction({
        hash: 'invalid-hash',
        type: 'session_key_creation',
        description: 'Test'
      }, mockProvider)).rejects.toThrow();
    });
  });

  describe('Transaction Monitoring', () => {
    test('should monitor transaction until confirmation', async () => {
      const mockProvider = {
        getTransactionReceipt: jest.fn()
          .mockResolvedValueOnce(null) // Pending
          .mockResolvedValueOnce(null) // Still pending
          .mockResolvedValueOnce({ // Confirmed
            transaction_hash: '0x123',
            execution_status: 'SUCCEEDED',
            block_number: 123456
          })
      };

      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        status: 'pending',
        type: 'session_key_creation'
      };

      transactionService.startMonitoring(transaction, mockProvider);

      // Fast-forward time to trigger monitoring checks
      jest.advanceTimersByTime(5000); // 5 seconds
      await Promise.resolve(); // Allow promises to resolve

      jest.advanceTimersByTime(5000); // Another 5 seconds
      await Promise.resolve();

      jest.advanceTimersByTime(5000); // Another 5 seconds
      await Promise.resolve();

      expect(mockProvider.getTransactionReceipt).toHaveBeenCalledTimes(3);
    });

    test('should handle transaction timeout', async () => {
      const mockProvider = {
        getTransactionReceipt: jest.fn().mockResolvedValue(null) // Always pending
      };

      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        status: 'pending',
        type: 'session_key_creation',
        submittedAt: Date.now() - (11 * 60 * 1000) // 11 minutes ago
      };

      transactionService.startMonitoring(transaction, mockProvider);

      // Fast-forward past timeout
      jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
      await Promise.resolve();

      const storedTx = transactionService.getTransaction(transaction.id);
      expect(storedTx.status).toBe('timeout');
    });

    test('should handle failed transactions', async () => {
      const mockProvider = {
        getTransactionReceipt: jest.fn().mockResolvedValue({
          transaction_hash: '0x123',
          execution_status: 'REVERTED',
          revert_reason: 'Insufficient balance'
        })
      };

      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        status: 'pending',
        type: 'session_key_creation'
      };

      transactionService.startMonitoring(transaction, mockProvider);

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      const storedTx = transactionService.getTransaction(transaction.id);
      expect(storedTx.status).toBe('failed');
      expect(storedTx.error).toBe('Insufficient balance');
    });
  });

  describe('Transaction Storage', () => {
    test('should store and retrieve transactions correctly', () => {
      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        type: 'session_key_creation',
        status: 'pending',
        submittedAt: Date.now()
      };

      transactionService.storeTransaction(transaction);

      const retrieved = transactionService.getTransaction('tx-1');
      expect(retrieved).toEqual(transaction);
    });

    test('should get transactions by status', () => {
      const transactions = [
        { id: 'tx-1', status: 'pending', submittedAt: Date.now() },
        { id: 'tx-2', status: 'confirmed', submittedAt: Date.now() },
        { id: 'tx-3', status: 'pending', submittedAt: Date.now() }
      ];

      transactions.forEach(tx => transactionService.storeTransaction(tx));

      const pendingTxs = transactionService.getTransactionsByStatus('pending');
      expect(pendingTxs).toHaveLength(2);
      expect(pendingTxs.map(tx => tx.id)).toEqual(['tx-1', 'tx-3']);
    });

    test('should get transactions by type', () => {
      const transactions = [
        { id: 'tx-1', type: 'session_key_creation', submittedAt: Date.now() },
        { id: 'tx-2', type: 'marketplace_listing', submittedAt: Date.now() },
        { id: 'tx-3', type: 'session_key_creation', submittedAt: Date.now() }
      ];

      transactions.forEach(tx => transactionService.storeTransaction(tx));

      const creationTxs = transactionService.getTransactionsByType('session_key_creation');
      expect(creationTxs).toHaveLength(2);
      expect(creationTxs.map(tx => tx.id)).toEqual(['tx-1', 'tx-3']);
    });

    test('should handle storage quota exceeded', () => {
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        type: 'session_key_creation',
        status: 'pending'
      };

      expect(() => {
        transactionService.storeTransaction(transaction);
      }).toThrow('QuotaExceededError');
    });
  });

  describe('Transaction Statistics', () => {
    test('should calculate transaction statistics correctly', () => {
      const transactions = [
        { id: 'tx-1', status: 'confirmed', type: 'session_key_creation', amount: '0.001' },
        { id: 'tx-2', status: 'confirmed', type: 'marketplace_listing', amount: '0.002' },
        { id: 'tx-3', status: 'pending', type: 'session_key_rental', amount: '0.003' },
        { id: 'tx-4', status: 'failed', type: 'session_key_creation', amount: '0.001' }
      ];

      transactions.forEach(tx => transactionService.storeTransaction(tx));

      const stats = transactionService.getTransactionStats();

      expect(stats.total).toBe(4);
      expect(stats.confirmed).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.totalVolume).toBe('0.006');
      expect(stats.successRate).toBe(50); // 2 confirmed out of 4 total
    });

    test('should handle empty transaction history', () => {
      const stats = transactionService.getTransactionStats();

      expect(stats.total).toBe(0);
      expect(stats.confirmed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.totalVolume).toBe('0');
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Transaction Cleanup', () => {
    test('should clean up old transactions', () => {
      const now = Date.now();
      const oldTransactions = [
        { id: 'tx-1', submittedAt: now - (8 * 24 * 60 * 60 * 1000), status: 'confirmed' }, // 8 days old
        { id: 'tx-2', submittedAt: now - (5 * 24 * 60 * 60 * 1000), status: 'confirmed' }, // 5 days old
        { id: 'tx-3', submittedAt: now - (1 * 24 * 60 * 60 * 1000), status: 'pending' }    // 1 day old
      ];

      oldTransactions.forEach(tx => transactionService.storeTransaction(tx));

      // Clean up transactions older than 7 days
      transactionService.cleanupOldTransactions(7);

      const remainingTxs = transactionService.getAllTransactions();
      expect(remainingTxs).toHaveLength(2);
      expect(remainingTxs.map(tx => tx.id)).toEqual(['tx-2', 'tx-3']);
    });

    test('should not clean up pending transactions regardless of age', () => {
      const now = Date.now();
      const oldPendingTx = {
        id: 'tx-1',
        submittedAt: now - (10 * 24 * 60 * 60 * 1000), // 10 days old
        status: 'pending'
      };

      transactionService.storeTransaction(oldPendingTx);
      transactionService.cleanupOldTransactions(7);

      const remainingTxs = transactionService.getAllTransactions();
      expect(remainingTxs).toHaveLength(1);
      expect(remainingTxs[0].id).toBe('tx-1');
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted transaction data', () => {
      localStorage.getItem = jest.fn().mockReturnValue('corrupted-json-data');

      const transactions = transactionService.getAllTransactions();
      expect(transactions).toEqual([]);
    });

    test('should handle provider errors during monitoring', async () => {
      const mockProvider = {
        getTransactionReceipt: jest.fn().mockRejectedValue(new Error('Provider error'))
      };

      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        status: 'pending',
        type: 'session_key_creation'
      };

      transactionService.startMonitoring(transaction, mockProvider);

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Should continue monitoring despite provider errors
      expect(mockProvider.getTransactionReceipt).toHaveBeenCalled();
    });

    test('should handle invalid transaction hash format', () => {
      const invalidTransaction = {
        id: 'tx-1',
        hash: 'invalid-hash-format',
        type: 'session_key_creation',
        status: 'pending'
      };

      expect(() => {
        transactionService.validateTransaction(invalidTransaction);
      }).toThrow('Invalid transaction hash format');
    });
  });

  describe('Event Notifications', () => {
    test('should emit events on transaction status changes', async () => {
      const mockCallback = jest.fn();
      transactionService.onTransactionUpdate(mockCallback);

      const mockProvider = {
        getTransactionReceipt: jest.fn().mockResolvedValue({
          transaction_hash: '0x123',
          execution_status: 'SUCCEEDED',
          block_number: 123456
        })
      };

      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        status: 'pending',
        type: 'session_key_creation'
      };

      transactionService.startMonitoring(transaction, mockProvider);

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tx-1',
          status: 'confirmed'
        })
      );
    });

    test('should handle multiple event listeners', async () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      transactionService.onTransactionUpdate(mockCallback1);
      transactionService.onTransactionUpdate(mockCallback2);

      const transaction = {
        id: 'tx-1',
        hash: '0x123',
        status: 'pending'
      };

      transactionService.updateTransactionStatus('tx-1', 'confirmed');

      expect(mockCallback1).toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
    });
  });
});
