import { Account, Contract, Call, CallData } from 'starknet';
import { cacheService } from './cacheService';

export interface BatchCall {
  id: string;
  contractAddress: string;
  method: string;
  params: any[];
  priority: 'high' | 'medium' | 'low';
  callback?: (result: any, error?: Error) => void;
}

export interface BatchResult {
  id: string;
  result?: any;
  error?: Error;
}

export class BatchService {
  private pendingCalls: BatchCall[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 100; // milliseconds

  /**
   * Add a call to the batch queue
   */
  addCall(call: BatchCall): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check cache first
      const cachedResult = cacheService.getCachedContractCall(
        call.contractAddress,
        call.method,
        call.params
      );

      if (cachedResult !== null) {
        resolve(cachedResult);
        return;
      }

      // Add callback to resolve/reject promise
      const callWithCallback: BatchCall = {
        ...call,
        callback: (result, error) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
          // Call original callback if provided
          if (call.callback) {
            call.callback(result, error);
          }
        }
      };

      this.pendingCalls.push(callWithCallback);
      this.scheduleBatch();
    });
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Execute immediately if batch is full or has high priority calls
    const hasHighPriority = this.pendingCalls.some(call => call.priority === 'high');
    const shouldExecuteImmediately = this.pendingCalls.length >= this.BATCH_SIZE || hasHighPriority;

    if (shouldExecuteImmediately) {
      this.executeBatch();
    } else {
      this.batchTimeout = setTimeout(() => {
        this.executeBatch();
      }, this.BATCH_DELAY);
    }
  }

  /**
   * Execute the current batch of calls
   */
  private async executeBatch(): Promise<void> {
    if (this.pendingCalls.length === 0) return;

    // Clear timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Take calls to process
    const callsToProcess = this.pendingCalls.splice(0, this.BATCH_SIZE);
    
    // Sort by priority (high first)
    callsToProcess.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`Executing batch of ${callsToProcess.length} calls`);

    // Group calls by contract for efficiency
    const callsByContract = new Map<string, BatchCall[]>();
    
    callsToProcess.forEach(call => {
      if (!callsByContract.has(call.contractAddress)) {
        callsByContract.set(call.contractAddress, []);
      }
      callsByContract.get(call.contractAddress)!.push(call);
    });

    // Execute calls for each contract
    callsByContract.forEach(async (calls, contractAddress) => {
      await this.executeContractCalls(contractAddress, calls);
    });

    // Schedule next batch if there are more calls
    if (this.pendingCalls.length > 0) {
      this.scheduleBatch();
    }
  }

  /**
   * Execute calls for a specific contract
   */
  private async executeContractCalls(contractAddress: string, calls: BatchCall[]): Promise<void> {
    try {
      // Execute calls in parallel for the same contract
      const promises = calls.map(async (call) => {
        try {
          // For now, simulate contract call execution
          // In production, you would use the actual contract instance
          const result = await this.simulateContractCall(call);
          
          // Cache the result
          cacheService.cacheContractCall(
            call.contractAddress,
            call.method,
            call.params,
            result
          );

          if (call.callback) {
            call.callback(result);
          }

          return { id: call.id, result };
        } catch (error) {
          console.error(`Failed to execute call ${call.id}:`, error);
          
          if (call.callback) {
            call.callback(undefined, error as Error);
          }

          return { id: call.id, error: error as Error };
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error(`Failed to execute batch for contract ${contractAddress}:`, error);
      
      // Call error callbacks for all calls
      calls.forEach(call => {
        if (call.callback) {
          call.callback(undefined, error as Error);
        }
      });
    }
  }

  /**
   * Simulate contract call (replace with actual contract call in production)
   */
  private async simulateContractCall(call: BatchCall): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    // Return mock data based on method
    switch (call.method) {
      case 'get_session_key_info':
        return {
          owner: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
          is_active: true,
          expires_at: Math.floor(Date.now() / 1000) + 24 * 3600,
          permissions: ['transfer', 'swap'],
          price: '1000000000000000' // 0.001 ETH in wei
        };
      
      case 'get_active_listings':
        return [
          '0x1a2b3c4d5e6f7890abcdef1234567890',
          '0x2b3c4d5e6f7890abcdef1234567890ab',
          '0x3c4d5e6f7890abcdef1234567890abcd'
        ];
      
      case 'get_marketplace_stats':
        return {
          total_listings: 156,
          active_listings: 23,
          total_volume: '12450000000000000000', // 12.45 ETH in wei
          total_users: 89
        };
      
      default:
        return { success: true, data: `Mock result for ${call.method}` };
    }
  }

  /**
   * Get batch queue statistics
   */
  getStats(): {
    pendingCalls: number;
    batchSize: number;
    batchDelay: number;
    isProcessing: boolean;
  } {
    return {
      pendingCalls: this.pendingCalls.length,
      batchSize: this.BATCH_SIZE,
      batchDelay: this.BATCH_DELAY,
      isProcessing: this.batchTimeout !== null
    };
  }

  /**
   * Clear all pending calls
   */
  clearQueue(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // Call error callbacks for pending calls
    this.pendingCalls.forEach(call => {
      if (call.callback) {
        call.callback(undefined, new Error('Batch queue cleared'));
      }
    });
    
    this.pendingCalls = [];
  }

  /**
   * Execute high priority calls immediately
   */
  async executeHighPriorityCalls(): Promise<void> {
    const highPriorityCalls = this.pendingCalls.filter(call => call.priority === 'high');
    
    if (highPriorityCalls.length === 0) return;

    // Remove high priority calls from pending queue
    this.pendingCalls = this.pendingCalls.filter(call => call.priority !== 'high');

    // Execute high priority calls immediately
    const callsByContract = new Map<string, BatchCall[]>();
    
    highPriorityCalls.forEach(call => {
      if (!callsByContract.has(call.contractAddress)) {
        callsByContract.set(call.contractAddress, []);
      }
      callsByContract.get(call.contractAddress)!.push(call);
    });

    callsByContract.forEach(async (calls, contractAddress) => {
      await this.executeContractCalls(contractAddress, calls);
    });
  }
}

// Export singleton instance
export const batchService = new BatchService();

// Helper functions for common contract calls
export const batchContractCall = {
  /**
   * Get session key info with batching
   */
  getSessionKeyInfo: (contractAddress: string, sessionKeyId: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    return batchService.addCall({
      id: `session_key_info_${sessionKeyId}`,
      contractAddress,
      method: 'get_session_key_info',
      params: [sessionKeyId],
      priority
    });
  },

  /**
   * Get active listings with batching
   */
  getActiveListings: (contractAddress: string, offset: number = 0, limit: number = 20, priority: 'high' | 'medium' | 'low' = 'medium') => {
    return batchService.addCall({
      id: `active_listings_${offset}_${limit}`,
      contractAddress,
      method: 'get_active_listings',
      params: [offset, limit],
      priority
    });
  },

  /**
   * Get marketplace stats with batching
   */
  getMarketplaceStats: (contractAddress: string, priority: 'high' | 'medium' | 'low' = 'low') => {
    return batchService.addCall({
      id: 'marketplace_stats',
      contractAddress,
      method: 'get_marketplace_stats',
      params: [],
      priority
    });
  }
};
