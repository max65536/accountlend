import { RpcProvider, Contract, CallData } from 'starknet';
import { getCurrentNetworkConfig, getContractAddress } from '../config/contracts';
import { transactionService } from './transactionService';

// Import contract ABIs
import SessionKeyManagerABI from '../contracts/SessionKeyManager.json';
import SessionKeyMarketplaceABI from '../contracts/SessionKeyMarketplace.json';

export interface SessionKeyCreatedEvent {
  sessionKeyId: string;
  owner: string;
  expiresAt: number;
  permissions: string[];
  price: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface SessionKeyRentedEvent {
  sessionKeyId: string;
  renter: string;
  owner: string;
  price: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface SessionKeyRevokedEvent {
  sessionKeyId: string;
  owner: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface MarketplaceListing {
  sessionKeyId: string;
  owner: string;
  price: string;
  isActive: boolean;
  createdAt: number;
  description: string;
  permissions: string[];
  duration: number;
  expiresAt: number;
}

export class BlockchainEventService {
  private provider: RpcProvider;
  private sessionKeyManagerContract: Contract;
  private sessionKeyMarketplaceContract: Contract;
  private eventListeners: Set<(event: any) => void> = new Set();
  private isListening: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedBlock: number = 0;

  constructor() {
    const networkConfig = getCurrentNetworkConfig();
    this.provider = new RpcProvider({ nodeUrl: networkConfig.rpcUrl });
    
    // Initialize contracts
    const sessionKeyManagerAddress = getContractAddress('SESSION_KEY_MANAGER');
    const sessionKeyMarketplaceAddress = getContractAddress('MARKETPLACE');
    
    this.sessionKeyManagerContract = new Contract(
      SessionKeyManagerABI.abi,
      sessionKeyManagerAddress,
      this.provider
    );
    
    this.sessionKeyMarketplaceContract = new Contract(
      SessionKeyMarketplaceABI.abi,
      sessionKeyMarketplaceAddress,
      this.provider
    );
  }

  /**
   * Start listening for blockchain events
   */
  async startEventListening(): Promise<void> {
    if (this.isListening) return;
    
    this.isListening = true;
    console.log('Starting blockchain event listening...');
    
    try {
      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = currentBlock - 100; // Start from 100 blocks ago
      
      // Start polling for events
      this.pollingInterval = setInterval(() => {
        this.pollForEvents();
      }, 10000); // Poll every 10 seconds
      
      // Initial poll
      await this.pollForEvents();
      
    } catch (error) {
      console.error('Failed to start event listening:', error);
      this.isListening = false;
    }
  }

  /**
   * Stop listening for blockchain events
   */
  stopEventListening(): void {
    if (!this.isListening) return;
    
    this.isListening = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    console.log('Stopped blockchain event listening');
  }

  /**
   * Subscribe to blockchain events
   */
  subscribe(listener: (event: any) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Poll for new events
   */
  private async pollForEvents(): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock <= this.lastProcessedBlock) {
        return; // No new blocks
      }
      
      // Process events from last processed block to current block
      await this.processEventsInRange(this.lastProcessedBlock + 1, currentBlock);
      
      this.lastProcessedBlock = currentBlock;
      
    } catch (error) {
      console.error('Error polling for events:', error);
    }
  }

  /**
   * Process events in a block range
   */
  private async processEventsInRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Note: Starknet event filtering is limited, so we'll simulate event processing
      // In a real implementation, you would use the provider's event filtering capabilities
      
      console.log(`Processing events from block ${fromBlock} to ${toBlock}`);
      
      // For demo purposes, we'll create some mock events based on recent transactions
      // In production, you would parse actual blockchain events
      
    } catch (error) {
      console.error('Error processing events:', error);
    }
  }

  /**
   * Get active marketplace listings from blockchain
   */
  async getActiveMarketplaceListings(): Promise<MarketplaceListing[]> {
    try {
      // For now, return mock data with blockchain-like structure
      // In production, this would query the actual contract state
      
      const mockListings: MarketplaceListing[] = [
        {
          sessionKeyId: '0x1a2b3c4d5e6f7890abcdef1234567890',
          owner: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
          price: '0.002',
          isActive: true,
          createdAt: Date.now() - 2 * 60 * 60 * 1000,
          description: 'Gaming account with DeFi permissions',
          permissions: ['transfer', 'swap', 'gaming'],
          duration: 24,
          expiresAt: Date.now() + 22 * 60 * 60 * 1000
        },
        {
          sessionKeyId: '0x2b3c4d5e6f7890abcdef1234567890ab',
          owner: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
          price: '0.001',
          isActive: true,
          createdAt: Date.now() - 6 * 60 * 60 * 1000,
          description: 'DeFi trading session key',
          permissions: ['swap', 'approve'],
          duration: 12,
          expiresAt: Date.now() + 6 * 60 * 60 * 1000
        },
        {
          sessionKeyId: '0x3c4d5e6f7890abcdef1234567890abcd',
          owner: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
          price: '0.005',
          isActive: true,
          createdAt: Date.now() - 1 * 60 * 60 * 1000,
          description: 'NFT trading permissions',
          permissions: ['nft', 'approve'],
          duration: 48,
          expiresAt: Date.now() + 47 * 60 * 60 * 1000
        }
      ];
      
      return mockListings;
      
    } catch (error) {
      console.error('Failed to get marketplace listings:', error);
      return [];
    }
  }

  /**
   * Get session key details from blockchain
   */
  async getSessionKeyDetails(sessionKeyId: string): Promise<any> {
    try {
      // In production, this would call the actual contract method
      // For now, return mock data
      
      return {
        id: sessionKeyId,
        owner: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
        isActive: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        permissions: ['transfer', 'swap'],
        createdAt: Date.now() - 2 * 60 * 60 * 1000
      };
      
    } catch (error) {
      console.error('Failed to get session key details:', error);
      return null;
    }
  }

  /**
   * Get user's session keys from blockchain
   */
  async getUserSessionKeys(userAddress: string): Promise<any[]> {
    try {
      // In production, this would query the contract for user's session keys
      // For now, return mock data
      
      const mockSessionKeys = [
        {
          id: '0x1a2b3c4d5e6f',
          description: 'Gaming account with DeFi permissions',
          permissions: ['transfer', 'swap', 'gaming'],
          duration: 24,
          price: '0.002',
          createdAt: Date.now() - 2 * 60 * 60 * 1000,
          expiresAt: Date.now() + 22 * 60 * 60 * 1000,
          status: 'rented',
          rentedBy: '0xabc123...def456',
          earnings: 0.002
        },
        {
          id: '0x2b3c4d5e6f7a',
          description: 'DeFi trading session key',
          permissions: ['swap', 'approve'],
          duration: 12,
          price: '0.001',
          createdAt: Date.now() - 6 * 60 * 60 * 1000,
          expiresAt: Date.now() + 6 * 60 * 60 * 1000,
          status: 'active'
        }
      ];
      
      return mockSessionKeys;
      
    } catch (error) {
      console.error('Failed to get user session keys:', error);
      return [];
    }
  }

  /**
   * Get marketplace statistics from blockchain
   */
  async getMarketplaceStats(): Promise<{
    totalListings: number;
    activeListings: number;
    totalVolume: string;
    totalUsers: number;
  }> {
    try {
      // In production, this would aggregate data from contract events
      // For now, return mock statistics
      
      return {
        totalListings: 156,
        activeListings: 23,
        totalVolume: '12.45',
        totalUsers: 89
      };
      
    } catch (error) {
      console.error('Failed to get marketplace stats:', error);
      return {
        totalListings: 0,
        activeListings: 0,
        totalVolume: '0',
        totalUsers: 0
      };
    }
  }

  /**
   * Rent a session key
   */
  async rentSessionKey(sessionKeyId: string, account: any): Promise<string> {
    try {
      // In production, this would call the marketplace contract
      console.log(`Renting session key ${sessionKeyId} with account ${account.address}`);
      
      // Simulate transaction
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // Add to transaction service
      transactionService.addTransaction({
        hash: mockTxHash,
        type: 'session_rent',
        description: `Rent session key ${sessionKeyId.slice(0, 10)}...`,
        sessionKeyId
      });
      
      return mockTxHash;
      
    } catch (error) {
      console.error('Failed to rent session key:', error);
      throw error;
    }
  }

  /**
   * List session key on marketplace
   */
  async listSessionKey(sessionKeyId: string, price: string, account: any): Promise<string> {
    try {
      // In production, this would call the marketplace contract
      console.log(`Listing session key ${sessionKeyId} for ${price} ETH`);
      
      // Simulate transaction
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // Add to transaction service
      transactionService.addTransaction({
        hash: mockTxHash,
        type: 'marketplace_list',
        description: `List session key ${sessionKeyId.slice(0, 10)}... for ${price} ETH`,
        amount: price,
        sessionKeyId
      });
      
      return mockTxHash;
      
    } catch (error) {
      console.error('Failed to list session key:', error);
      throw error;
    }
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Get contract addresses for reference
   */
  getContractAddresses(): {
    sessionKeyManager: string;
    sessionKeyMarketplace: string;
  } {
    return {
      sessionKeyManager: getContractAddress('SESSION_KEY_MANAGER'),
      sessionKeyMarketplace: getContractAddress('MARKETPLACE')
    };
  }

  /**
   * Check if contracts are deployed and accessible
   */
  async checkContractHealth(): Promise<{
    sessionKeyManager: boolean;
    sessionKeyMarketplace: boolean;
  }> {
    try {
      const sessionKeyManagerAddress = getContractAddress('SESSION_KEY_MANAGER');
      const sessionKeyMarketplaceAddress = getContractAddress('MARKETPLACE');
      
      // Check if contracts exist (simplified check)
      const sessionKeyManagerHealthy = sessionKeyManagerAddress !== '0x0';
      const sessionKeyMarketplaceHealthy = sessionKeyMarketplaceAddress !== '0x0';
      
      return {
        sessionKeyManager: sessionKeyManagerHealthy,
        sessionKeyMarketplace: sessionKeyMarketplaceHealthy
      };
      
    } catch (error) {
      console.error('Failed to check contract health:', error);
      return {
        sessionKeyManager: false,
        sessionKeyMarketplace: false
      };
    }
  }
}

// Export singleton instance
export const blockchainEventService = new BlockchainEventService();
