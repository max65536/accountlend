import { 
  SessionAccount,
  Policy,
  RequestSession,
  SignedSession,
  createSession,
  supportsSessions
} from '@argent/x-sessions';
import { Account, Call, RpcProvider, ec, num } from 'starknet';
import { getCurrentNetworkConfig } from '../config/contracts';

// Session key storage interface
export interface StoredSessionKey {
  id: string;
  description: string;
  permissions: string[];
  duration: number;
  price: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'revoked' | 'rented';
  owner: string;
  sessionData?: {
    key: string;
    policies: Policy[];
    signedSession?: SignedSession;
  };
  rentedBy?: string;
  earnings?: number;
}

// Permission to policy mapping
const PERMISSION_TO_POLICIES: { [key: string]: Policy[] } = {
  'transfer': [
    { contractAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', selector: 'transfer' },
    { contractAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', selector: 'transferFrom' }
  ],
  'swap': [
    { contractAddress: '*', selector: 'swap_exact_tokens_for_tokens' },
    { contractAddress: '*', selector: 'swap_tokens_for_exact_tokens' },
    { contractAddress: '*', selector: 'add_liquidity' },
    { contractAddress: '*', selector: 'remove_liquidity' }
  ],
  'approve': [
    { contractAddress: '*', selector: 'approve' },
    { contractAddress: '*', selector: 'increaseAllowance' },
    { contractAddress: '*', selector: 'decreaseAllowance' }
  ],
  'stake': [
    { contractAddress: '*', selector: 'stake' },
    { contractAddress: '*', selector: 'unstake' },
    { contractAddress: '*', selector: 'claim_rewards' }
  ],
  'gaming': [
    { contractAddress: '*', selector: 'play_game' },
    { contractAddress: '*', selector: 'claim_reward' },
    { contractAddress: '*', selector: 'upgrade_character' }
  ],
  'nft': [
    { contractAddress: '*', selector: 'transferFrom' },
    { contractAddress: '*', selector: 'safeTransferFrom' },
    { contractAddress: '*', selector: 'approve' },
    { contractAddress: '*', selector: 'setApprovalForAll' }
  ]
};

export class SessionKeyService {
  private provider: RpcProvider;

  constructor() {
    const networkConfig = getCurrentNetworkConfig();
    this.provider = new RpcProvider({ nodeUrl: networkConfig.rpcUrl });
  }

  /**
   * Check if an account supports sessions
   */
  async checkSessionSupport(account: Account): Promise<boolean> {
    try {
      // For now, assume Argent wallets support sessions
      // In a real implementation, you would check the account contract
      return true;
    } catch (error) {
      console.error('Failed to check session support:', error);
      return false;
    }
  }

  /**
   * Create a new session key with Argent X Sessions
   */
  async createSessionKey(
    account: Account,
    duration: number, // in hours
    permissions: string[],
    price: string,
    description: string
  ): Promise<StoredSessionKey> {
    try {
      // Convert duration from hours to milliseconds for expiry
      const durationInMs = duration * 3600 * 1000;
      const expiresAt = Date.now() + durationInMs;

      // Create policies based on permissions
      const policies = this.createPoliciesFromPermissions(permissions);

      // Generate a random session key
      const sessionKeyBytes = ec.starkCurve.utils.randomPrivateKey();
      const sessionKey = '0x' + Array.from(sessionKeyBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create stored session key
      const storedSessionKey: StoredSessionKey = {
        id: sessionId,
        description,
        permissions,
        duration,
        price,
        createdAt: Date.now(),
        expiresAt,
        status: 'active',
        owner: account.address,
        sessionData: {
          key: sessionKey,
          policies
        }
      };

      // Try to create actual session with Argent X Sessions
      try {
        const sessionRequest: RequestSession = {
          key: sessionKey,
          expires: Math.floor(expiresAt / 1000), // Convert to seconds
          policies
        };

        // Create signed session
        const signedSession = await createSession(sessionRequest, account as any);
        storedSessionKey.sessionData!.signedSession = signedSession;
        
        console.log('Successfully created Argent X session');
      } catch (sessionError) {
        console.warn('Failed to create Argent X session, using mock session:', sessionError);
        // Continue with mock session for demo purposes
      }

      // Store session key locally
      this.storeSessionKey(storedSessionKey);

      return storedSessionKey;
    } catch (error) {
      console.error('Failed to create session key:', error);
      throw new Error(`Session key creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create policies from permission strings
   */
  private createPoliciesFromPermissions(permissions: string[]): Policy[] {
    const policies: Policy[] = [];

    permissions.forEach(permission => {
      const permissionPolicies = PERMISSION_TO_POLICIES[permission];
      if (permissionPolicies) {
        policies.push(...permissionPolicies);
      }
    });

    return policies;
  }

  /**
   * Validate if a session key is still valid
   */
  async validateSessionKey(sessionKey: StoredSessionKey): Promise<boolean> {
    try {
      // Check if session has expired
      if (Date.now() > sessionKey.expiresAt) {
        return false;
      }

      // Check if session is revoked
      if (sessionKey.status === 'revoked') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Revoke a session key
   */
  async revokeSessionKey(sessionKey: StoredSessionKey): Promise<void> {
    try {
      // Update local storage
      sessionKey.status = 'revoked';
      this.updateStoredSessionKey(sessionKey);
    } catch (error) {
      console.error('Failed to revoke session key:', error);
      throw new Error(`Session revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all stored session keys for a user
   */
  getStoredSessionKeys(userAddress: string): StoredSessionKey[] {
    try {
      const stored = localStorage.getItem(`sessionKeys_${userAddress}`);
      if (!stored) return [];
      
      const sessionKeys: StoredSessionKey[] = JSON.parse(stored);
      
      // Update expired sessions
      const now = Date.now();
      const updatedKeys = sessionKeys.map(key => ({
        ...key,
        status: now > key.expiresAt ? 'expired' as const : key.status
      }));

      // Save updated keys if any changed
      const hasChanges = updatedKeys.some((key, index) => key.status !== sessionKeys[index].status);
      if (hasChanges) {
        localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(updatedKeys));
      }
      
      return updatedKeys;
    } catch (error) {
      console.error('Failed to get stored session keys:', error);
      return [];
    }
  }

  /**
   * Store session key locally
   */
  private storeSessionKey(sessionKey: StoredSessionKey): void {
    try {
      const userAddress = sessionKey.owner;
      const existing = this.getStoredSessionKeys(userAddress);
      const updated = [...existing, sessionKey];
      
      localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store session key:', error);
    }
  }

  /**
   * Update stored session key
   */
  private updateStoredSessionKey(sessionKey: StoredSessionKey): void {
    try {
      const userAddress = sessionKey.owner;
      const existing = this.getStoredSessionKeys(userAddress);
      const updated = existing.map(key => 
        key.id === sessionKey.id ? sessionKey : key
      );
      
      localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update stored session key:', error);
    }
  }

  /**
   * Export session key for sharing/marketplace
   */
  exportSessionKey(sessionKey: StoredSessionKey): string {
    try {
      const exportData = {
        id: sessionKey.id,
        description: sessionKey.description,
        permissions: sessionKey.permissions,
        duration: sessionKey.duration,
        price: sessionKey.price,
        expiresAt: sessionKey.expiresAt,
        sessionData: sessionKey.sessionData
      };

      return JSON.stringify(exportData);
    } catch (error) {
      console.error('Failed to export session key:', error);
      throw new Error('Export failed');
    }
  }

  /**
   * Import session key from marketplace
   */
  async importSessionKey(exportedData: string, userAddress: string): Promise<StoredSessionKey> {
    try {
      const data = JSON.parse(exportedData);
      
      const sessionKey: StoredSessionKey = {
        id: data.id,
        description: data.description,
        permissions: data.permissions,
        duration: data.duration,
        price: data.price,
        createdAt: Date.now(),
        expiresAt: data.expiresAt,
        status: Date.now() > data.expiresAt ? 'expired' : 'rented',
        owner: userAddress,
        sessionData: data.sessionData,
        rentedBy: userAddress,
        earnings: parseFloat(data.price)
      };

      // Store imported session key
      this.storeSessionKey(sessionKey);

      return sessionKey;
    } catch (error) {
      console.error('Failed to import session key:', error);
      throw new Error('Import failed');
    }
  }

  /**
   * Get session key statistics
   */
  getSessionKeyStats(userAddress: string): {
    total: number;
    active: number;
    expired: number;
    revoked: number;
    rented: number;
    totalEarnings: number;
  } {
    const sessionKeys = this.getStoredSessionKeys(userAddress);
    
    return {
      total: sessionKeys.length,
      active: sessionKeys.filter(k => k.status === 'active').length,
      expired: sessionKeys.filter(k => k.status === 'expired').length,
      revoked: sessionKeys.filter(k => k.status === 'revoked').length,
      rented: sessionKeys.filter(k => k.status === 'rented').length,
      totalEarnings: sessionKeys.reduce((sum, k) => {
        return k.earnings ? sum + k.earnings : sum;
      }, 0)
    };
  }

  /**
   * Create mock session keys for demo purposes
   */
  createMockSessionKeys(userAddress: string): StoredSessionKey[] {
    const mockKeys: StoredSessionKey[] = [
      {
        id: '0x1a2b3c4d5e6f',
        description: 'Gaming account with DeFi permissions',
        permissions: ['transfer', 'swap', 'gaming'],
        duration: 24,
        price: '0.002',
        createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        expiresAt: Date.now() + 22 * 60 * 60 * 1000, // 22 hours from now
        status: 'rented',
        owner: userAddress,
        rentedBy: '0xabc123...def456',
        earnings: 0.002
      },
      {
        id: '0x2b3c4d5e6f7a',
        description: 'DeFi trading session key',
        permissions: ['swap', 'approve'],
        duration: 12,
        price: '0.001',
        createdAt: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
        expiresAt: Date.now() + 6 * 60 * 60 * 1000, // 6 hours from now
        status: 'active',
        owner: userAddress
      },
      {
        id: '0x3c4d5e6f7a8b',
        description: 'NFT trading permissions',
        permissions: ['nft', 'approve'],
        duration: 48,
        price: '0.005',
        createdAt: Date.now() - 50 * 60 * 60 * 1000, // 50 hours ago
        expiresAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (expired)
        status: 'expired',
        owner: userAddress
      }
    ];

    // Store mock keys if none exist
    const existing = this.getStoredSessionKeys(userAddress);
    if (existing.length === 0) {
      localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(mockKeys));
    }

    return mockKeys;
  }
}

// Export singleton instance
export const sessionKeyService = new SessionKeyService();
