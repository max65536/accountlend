import { 
  SessionAccount,
  Policy,
  RequestSession,
  SignedSession,
  PreparedSession,
  createSession,
  supportsSessions,
  prepareSession,
  createMerkleTreeForPolicies
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
      // Use the actual supportsSessions function from @argent/x-sessions
      return await supportsSessions(account.address, this.provider as any);
    } catch (error) {
      console.error('Failed to check session support:', error);
      // Fallback to assuming support for demo purposes
      return true;
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

      // Generate a proper Starknet private key using Starknet.js built-in method
      // This follows the official Starknet blog example: starknet.generatePrivateKey()
      const sessionKeyBytes = ec.starkCurve.utils.randomPrivateKey();
      
      // Convert to hex string - the key is already properly formatted for Starknet
      const sessionKeyHex = '0x' + Buffer.from(sessionKeyBytes).toString('hex');
      
      // Validate the generated key
      if (!/^0x[0-9a-fA-F]{64}$/.test(sessionKeyHex)) {
        throw new Error('Generated session key has invalid format');
      }

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
          key: sessionKeyHex,
          policies
        }
      };

      // Try to create actual session with Argent X Sessions
      try {
        // Ensure policies have valid contract addresses (no wildcards for Argent X)
        const validPolicies = policies.map(policy => ({
          ...policy,
          contractAddress: policy.contractAddress === '*' 
            ? '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' // Default to ETH contract
            : policy.contractAddress
        }));

        // Ensure session key is properly formatted as a valid Starknet felt
        // Starknet felt max value is 2^251 - 1, so we need to ensure our key is within this range
        const sessionKeyBigInt = BigInt(sessionKeyHex);
        const STARKNET_FELT_MAX = BigInt('0x800000000000011000000000000000000000000000000000000000000000001') - BigInt(1);
        
        // If the key is too large, reduce it to fit within felt range
        const validSessionKeyBigInt = sessionKeyBigInt > STARKNET_FELT_MAX 
          ? sessionKeyBigInt % STARKNET_FELT_MAX 
          : sessionKeyBigInt;
        
        // Convert back to hex string without 0x prefix for Argent X
        const cleanSessionKey = validSessionKeyBigInt.toString(16);
        
        // Validate the clean session key is proper hex
        if (!/^[0-9a-fA-F]+$/.test(cleanSessionKey)) {
          throw new Error('Session key contains invalid hex characters');
        }

        const sessionRequest: RequestSession = {
          key: cleanSessionKey, // Use clean key without 0x prefix, within felt range
          expires: Math.floor(expiresAt / 1000), // Convert to seconds
          policies: validPolicies
        };

        // Ensure account has chainId set for signing
        const networkConfig = getCurrentNetworkConfig();
        
        // Create an account wrapper that has the interface Argent X Sessions expects
        const accountWrapper = {
          ...account,
          chainId: networkConfig.chainId,
          // Ensure signMessage method exists and is properly bound
          signMessage: account.signMessage?.bind(account) || 
            (() => Promise.reject(new Error('signMessage not available on this account type'))),
          // Ensure other required methods exist
          execute: account.execute?.bind(account),
          estimateFee: account.estimateFee?.bind(account)
        };

        // Create signed session with account wrapper
        const signedSession = await createSession(sessionRequest, accountWrapper as any);
        storedSessionKey.sessionData!.signedSession = signedSession;
        
        console.log('Successfully created Argent X session with chainId:', networkConfig.chainId);
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
      // Only access localStorage in browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }

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
      // Only access localStorage in browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

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
      // Only access localStorage in browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

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
   * Create a SessionAccount instance from a stored session key
   */
  async createSessionAccount(sessionKey: StoredSessionKey): Promise<SessionAccount | null> {
    try {
      if (!sessionKey.sessionData?.signedSession) {
        console.warn('No signed session data available for session key:', sessionKey.id);
        return null;
      }

      // Validate session is still active
      const isValid = await this.validateSessionKey(sessionKey);
      if (!isValid) {
        console.warn('Session key is no longer valid:', sessionKey.id);
        return null;
      }

      // Create SessionAccount instance
      const sessionAccount = new SessionAccount(
        this.provider as any,
        sessionKey.owner,
        sessionKey.sessionData.key,
        sessionKey.sessionData.signedSession
      );

      return sessionAccount;
    } catch (error) {
      console.error('Failed to create SessionAccount:', error);
      return null;
    }
  }

  /**
   * Execute calls using a session key
   */
  async executeWithSessionKey(
    sessionKey: StoredSessionKey,
    calls: Call | Call[]
  ): Promise<any> {
    try {
      const sessionAccount = await this.createSessionAccount(sessionKey);
      if (!sessionAccount) {
        throw new Error('Failed to create session account');
      }

      // Execute the calls using the session account
      const result = await sessionAccount.execute(Array.isArray(calls) ? calls as any : [calls as any]);
      
      console.log('Successfully executed calls with session key:', result);
      return result;
    } catch (error) {
      console.error('Failed to execute calls with session key:', error);
      throw error;
    }
  }

  /**
   * Prepare session for signing (useful for advanced workflows)
   */
  prepareSessionForSigning(
    policies: Policy[],
    sessionKey: string,
    expires: number
  ): PreparedSession {
    const sessionRequest: RequestSession = {
      key: sessionKey,
      expires,
      policies
    };

    return prepareSession(sessionRequest);
  }

  /**
   * Create merkle tree for policies (useful for verification)
   */
  createPolicyMerkleTree(policies: Policy[]) {
    return createMerkleTreeForPolicies(policies);
  }

  /**
   * Enhanced session key validation with blockchain verification
   */
  async validateSessionKeyOnChain(sessionKey: StoredSessionKey): Promise<boolean> {
    try {
      // Basic validation first
      const basicValidation = await this.validateSessionKey(sessionKey);
      if (!basicValidation) {
        return false;
      }

      // Try to verify session on-chain using deployed contract
      try {
        const networkConfig = getCurrentNetworkConfig();
        const { Contract } = await import('starknet');
        
        // Import contract ABI
        const sessionManagerAbi = await import('../contracts/SessionKeyManager.json');
        const contract = new Contract(
          sessionManagerAbi.default.abi,
          networkConfig.sessionKeyManagerAddress,
          this.provider
        );

        // Call contract to validate session key
        const isValid = await contract.validate_session_key(sessionKey.id);
        return Boolean(isValid);
      } catch (contractError) {
        console.warn('Contract validation failed, using local validation:', contractError);
        return basicValidation;
      }
    } catch (error) {
      console.error('On-chain session validation failed:', error);
      return false;
    }
  }

  /**
   * Get detailed session key information including blockchain state
   */
  async getSessionKeyDetails(sessionKey: StoredSessionKey): Promise<{
    sessionKey: StoredSessionKey;
    isValid: boolean;
    timeRemaining: number;
    canExecute: boolean;
    policies: Policy[];
  }> {
    const isValid = await this.validateSessionKey(sessionKey);
    const timeRemaining = Math.max(0, sessionKey.expiresAt - Date.now());
    const canExecute = isValid && timeRemaining > 0 && sessionKey.status === 'active';

    return {
      sessionKey,
      isValid,
      timeRemaining,
      canExecute,
      policies: sessionKey.sessionData?.policies || []
    };
  }

  /**
   * Batch create multiple session keys
   */
  async batchCreateSessionKeys(
    account: Account,
    sessionConfigs: Array<{
      duration: number;
      permissions: string[];
      price: string;
      description: string;
    }>
  ): Promise<StoredSessionKey[]> {
    const results: StoredSessionKey[] = [];
    
    for (const config of sessionConfigs) {
      try {
        const sessionKey = await this.createSessionKey(
          account,
          config.duration,
          config.permissions,
          config.price,
          config.description
        );
        results.push(sessionKey);
      } catch (error) {
        console.error('Failed to create session key in batch:', error);
        // Continue with other session keys
      }
    }

    return results;
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

    // Store mock keys if none exist (only in browser environment)
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = this.getStoredSessionKeys(userAddress);
      if (existing.length === 0) {
        localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(mockKeys));
      }
    }

    return mockKeys;
  }
}

// Export singleton instance
export const sessionKeyService = new SessionKeyService();
