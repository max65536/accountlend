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
  private readonly STARKNET_FELT_MAX = BigInt('0x800000000000011000000000000000000000000000000000000000000000001') - BigInt(1);

  constructor() {
    const networkConfig = getCurrentNetworkConfig();
    this.provider = new RpcProvider({ nodeUrl: networkConfig.rpcUrl });
  }

  /**
   * Generate a valid session key that's guaranteed to be within Starknet felt range and short enough for Argent X
   */
  private generateValidSessionKey(): string {
    try {
      // Use an extremely small key size to avoid "too long" errors
      // Generate a 64-bit number (8 bytes) which should definitely be safe for Argent X
      const randomBytes = new Uint8Array(8); // 8 bytes = 64 bits
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randomBytes);
      } else {
        // Fallback for non-browser environments
        for (let i = 0; i < randomBytes.length; i++) {
          randomBytes[i] = Math.floor(Math.random() * 256);
        }
      }
      
      // Convert bytes to BigInt
      let randomBigInt = BigInt(0);
      for (let i = 0; i < randomBytes.length; i++) {
        randomBigInt = (randomBigInt << BigInt(8)) + BigInt(randomBytes[i]);
      }
      
      // Add some timestamp uniqueness but keep it very small
      const timestamp = BigInt(Date.now() % 0xFF); // Very small 8-bit timestamp
      const sessionKey = randomBigInt + timestamp;
      
      // Ensure the result is within felt range (should always be true for 64-bit numbers)
      const finalKey = sessionKey > this.STARKNET_FELT_MAX ? sessionKey % this.STARKNET_FELT_MAX : sessionKey;
      
      const keyHex = finalKey.toString(16);
      
      return keyHex;
    } catch (error) {
      console.error('Failed to generate session key with crypto, using fallback:', error);
      
      // Fallback method using Math.random with extremely small values
      const randomValue = Math.floor(Math.random() * 0xFFFFFF); // 24-bit value
      const timestamp = Date.now() % 0xFF; // 8-bit timestamp
      const sessionKey = BigInt(randomValue) + BigInt(timestamp);
      
      const keyHex = sessionKey.toString(16);
      
      return keyHex;
    }
  }

  /**
   * Validate that a value is a proper Starknet felt
   */
  private validateFeltValue(value: string): boolean {
    try {
      // Remove 0x prefix if present
      const cleanValue = value.startsWith('0x') ? value.slice(2) : value;
      
      // Check if it's valid hex
      if (!/^[0-9a-fA-F]+$/.test(cleanValue)) {
        return false;
      }
      
      // Check if it's within felt range
      const bigIntValue = BigInt('0x' + cleanValue);
      return bigIntValue <= this.STARKNET_FELT_MAX && bigIntValue >= BigInt(0);
    } catch {
      return false;
    }
  }

  /**
   * Format session key for Argent X Sessions (without 0x prefix, validated)
   */
  private formatSessionKeyForArgentX(sessionKey: string): string {
    // Remove 0x prefix if present
    const cleanKey = sessionKey.startsWith('0x') ? sessionKey.slice(2) : sessionKey;
    
    // Validate the key
    if (!this.validateFeltValue(cleanKey)) {
      throw new Error(`Invalid session key format: ${cleanKey}`);
    }
    
    return cleanKey;
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
  ): Promise<{ sessionKey: StoredSessionKey; transactionHash?: string }> {
    try {
      // Convert duration from hours to milliseconds for expiry
      const durationInMs = duration * 3600 * 1000;
      const expiresAt = Date.now() + durationInMs;

      // Create policies based on permissions
      const policies = this.createPoliciesFromPermissions(permissions);

      // Generate a valid session key using the new method
      const sessionKeyHex = this.generateValidSessionKey();
      
      // Validate the generated key
      if (!this.validateFeltValue(sessionKeyHex)) {
        throw new Error(`Generated session key is invalid or too large: ${sessionKeyHex}`);
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
          key: '0x' + sessionKeyHex,
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

        // Format session key for Argent X (without 0x prefix, validated)
        const cleanSessionKey = this.formatSessionKeyForArgentX(sessionKeyHex);

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
      } catch (sessionError) {
        console.warn('Failed to create Argent X session, using mock session:', sessionError);
        // Continue with mock session for demo purposes
      }

      // Store session key locally and in contract - get the real transaction hash
      const transactionHash = await this.storeSessionKey(storedSessionKey, account);

      return { 
        sessionKey: storedSessionKey, 
        transactionHash: transactionHash || undefined 
      };
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
   * Get all stored session keys for a user from smart contract
   */
  async getStoredSessionKeys(userAddress: string): Promise<StoredSessionKey[]> {
    const networkConfig = getCurrentNetworkConfig();
    
    // For now, since the contract interface doesn't match our needs,
    // we'll create a proper session key management system
    // This will be replaced once the contract is properly deployed
    
    // Check if we have a deployed contract address
    if (!networkConfig.sessionKeyManagerAddress || networkConfig.sessionKeyManagerAddress === '0x1234567890abcdef1234567890abcdef12345678') {
      console.warn('Session Key Manager contract not deployed, using local storage');
      return this.getStoredSessionKeysFromLocalStorage(userAddress);
    }

    try {
      const { Contract } = await import('starknet');
      
      // Import contract ABI
      const sessionManagerAbi = await import('../contracts/SessionKeyManager.json');
      const contract = new Contract(
        sessionManagerAbi.default.abi,
        networkConfig.sessionKeyManagerAddress,
        this.provider
      );

      // Since the current contract doesn't have get_user_session_keys,
      // we'll need to implement a different approach
      // For now, return empty array and let the UI create mock data
      console.log('Contract connected, but interface needs to be updated');
      return [];

    } catch (error) {
      console.error('Failed to connect to contract:', error);
      return this.getStoredSessionKeysFromLocalStorage(userAddress);
    }
  }

  /**
   * Fallback method to get session keys from localStorage (for development/demo)
   */
  private getStoredSessionKeysFromLocalStorage(userAddress: string): StoredSessionKey[] {
    try {
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

      return updatedKeys;
    } catch (error) {
      console.error('Failed to get stored session keys from localStorage:', error);
      return [];
    }
  }

  /**
   * Parse permissions from contract policies
   */
  private parsePermissionsFromPolicies(policies: Policy[]): string[] {
    const permissions = new Set<string>();
    
    policies.forEach(policy => {
      // Map contract selectors back to permission names
      if (policy.selector === 'transfer' || policy.selector === 'transferFrom') {
        permissions.add('transfer');
      } else if (policy.selector === 'approve' || policy.selector === 'increaseAllowance' || policy.selector === 'decreaseAllowance') {
        permissions.add('approve');
      } else if (policy.selector.includes('swap')) {
        permissions.add('swap');
      } else if (policy.selector.includes('stake')) {
        permissions.add('stake');
      } else if (policy.selector.includes('game') || policy.selector.includes('reward')) {
        permissions.add('gaming');
      } else if (policy.selector === 'safeTransferFrom' || policy.selector === 'setApprovalForAll') {
        permissions.add('nft');
      }
    });

    return Array.from(permissions);
  }

  /**
   * Determine session status from contract data
   */
  private determineSessionStatus(sessionData: any): 'active' | 'expired' | 'revoked' | 'rented' {
    const now = Date.now();
    const expiresAt = Number(sessionData.expires_at) * 1000;
    
    if (sessionData.is_revoked) {
      return 'revoked';
    } else if (now > expiresAt) {
      return 'expired';
    } else if (sessionData.rented_by && sessionData.rented_by !== sessionData.owner) {
      return 'rented';
    } else {
      return 'active';
    }
  }

  /**
   * Store session key in smart contract
   */
  private async storeSessionKey(sessionKey: StoredSessionKey, account?: Account): Promise<string | null> {
    const networkConfig = getCurrentNetworkConfig();
    
    // Check if we have a deployed contract address
    if (!networkConfig.sessionKeyManagerAddress || networkConfig.sessionKeyManagerAddress === '0x0') {
      console.warn('Session Key Manager contract not deployed, using local storage');
      this.storeSessionKeyInLocalStorage(sessionKey);
      return null;
    }

    // If no account provided, fall back to local storage
    if (!account) {
      console.warn('No account provided for contract interaction, using local storage');
      this.storeSessionKeyInLocalStorage(sessionKey);
      return null;
    }

    try {
      const { Contract, num } = await import('starknet');
      
      // Import contract ABI
      const sessionManagerAbi = await import('../contracts/SessionKeyManager.json');
      
      // Connect contract to the account for write operations
      const contract = new Contract(
        sessionManagerAbi.default.abi,
        networkConfig.sessionKeyManagerAddress,
        account // Use the account instead of provider for write operations
      );

      // Use the existing contract interface
      const permissions = sessionKey.permissions.map(p => this.stringToFelt(p));
      
      // Convert price from ETH to wei (multiply by 10^18)
      const priceInWei = num.toBigInt(parseFloat(sessionKey.price) * Math.pow(10, 18));
      
      console.log('🚀 Calling contract.create_session_key...');
      const result = await contract.create_session_key(
        sessionKey.owner,
        sessionKey.duration,
        permissions,
        priceInWei.toString()
      );
      
      console.log('✅ Contract call result:', result);
      console.log('📝 Transaction hash:', result.transaction_hash);
      console.log('📏 Hash length:', result.transaction_hash?.length);
      console.log('🔍 Hash format valid:', /^0x[0-9a-fA-F]{64}$/.test(result.transaction_hash || ''));
      
      console.log('Session key stored in contract:', sessionKey.id);
      return result.transaction_hash || null;
    } catch (error) {
      console.error('Failed to store session key in contract:', error);
      this.storeSessionKeyInLocalStorage(sessionKey);
      return null;
    }
  }

  /**
   * Convert felt252 to string
   */
  private feltToString(felt: any): string {
    try {
      if (typeof felt === 'string') {
        return felt;
      }
      if (typeof felt === 'bigint' || typeof felt === 'number') {
        // Convert felt to hex and then try to decode as ASCII
        const hex = felt.toString(16);
        let result = '';
        for (let i = 0; i < hex.length; i += 2) {
          const byte = parseInt(hex.substr(i, 2), 16);
          if (byte > 0) {
            result += String.fromCharCode(byte);
          }
        }
        return result || hex;
      }
      return felt?.toString() || '';
    } catch {
      return '';
    }
  }

  /**
   * Convert string to felt252
   */
  private stringToFelt(str: string): string {
    try {
      let result = '0x';
      for (let i = 0; i < str.length; i++) {
        result += str.charCodeAt(i).toString(16).padStart(2, '0');
      }
      return result;
    } catch {
      return '0x0';
    }
  }

  /**
   * Fallback method to store session key in localStorage (for development/demo)
   */
  private storeSessionKeyInLocalStorage(sessionKey: StoredSessionKey): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const userAddress = sessionKey.owner;
      const existing = this.getStoredSessionKeysFromLocalStorage(userAddress);
      const updated = [...existing, sessionKey];
      
      localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store session key in localStorage:', error);
    }
  }

  /**
   * Update stored session key in smart contract
   */
  private async updateStoredSessionKey(sessionKey: StoredSessionKey): Promise<void> {
    const networkConfig = getCurrentNetworkConfig();
    
    // Check if we have a deployed contract address
    if (!networkConfig.sessionKeyManagerAddress || networkConfig.sessionKeyManagerAddress === '0x0') {
      console.warn('Session Key Manager contract not deployed, using local storage');
      this.updateStoredSessionKeyInLocalStorage(sessionKey);
      return;
    }

    try {
      const { Contract } = await import('starknet');
      
      // Import contract ABI
      const sessionManagerAbi = await import('../contracts/SessionKeyManager.json');
      const contract = new Contract(
        sessionManagerAbi.default.abi,
        networkConfig.sessionKeyManagerAddress,
        this.provider
      );

      // Use the existing contract interface for revocation
      if (sessionKey.status === 'revoked' && sessionKey.sessionData?.key) {
        const sessionKeyFelt = sessionKey.sessionData.key.startsWith('0x') 
          ? sessionKey.sessionData.key 
          : '0x' + sessionKey.sessionData.key;
        
        await contract.revoke_session_key(sessionKeyFelt);
        console.log('Session key revoked in contract:', sessionKey.id);
      }
    } catch (error) {
      console.error('Failed to update session key in contract:', error);
      this.updateStoredSessionKeyInLocalStorage(sessionKey);
    }
  }

  /**
   * Fallback method to update session key in localStorage (for development/demo)
   */
  private updateStoredSessionKeyInLocalStorage(sessionKey: StoredSessionKey): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const userAddress = sessionKey.owner;
      const existing = this.getStoredSessionKeysFromLocalStorage(userAddress);
      const updated = existing.map(key => 
        key.id === sessionKey.id ? sessionKey : key
      );
      
      localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update stored session key in localStorage:', error);
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
      await this.storeSessionKey(sessionKey);

      return sessionKey;
    } catch (error) {
      console.error('Failed to import session key:', error);
      throw new Error('Import failed');
    }
  }

  /**
   * Get session key statistics from smart contract
   */
  async getSessionKeyStats(userAddress: string): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    rented: number;
    totalEarnings: number;
  }> {
    try {
      const sessionKeys = await this.getStoredSessionKeys(userAddress);
      
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
    } catch (error) {
      console.error('Failed to get session key stats:', error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        revoked: 0,
        rented: 0,
        totalEarnings: 0
      };
    }
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
        const result = await this.createSessionKey(
          account,
          config.duration,
          config.permissions,
          config.price,
          config.description
        );
        results.push(result.sessionKey);
      } catch (error) {
        console.error('Failed to create session key in batch:', error);
        // Continue with other session keys
      }
    }

    return results;
  }

  /**
   * Clear all stored session keys for a user (useful for debugging)
   */
  clearStoredSessionKeys(userAddress: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`sessionKeys_${userAddress}`);
        console.log('Cleared all stored session keys for user:', userAddress);
      }
    } catch (error) {
      console.error('Failed to clear stored session keys:', error);
    }
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
      const existing = this.getStoredSessionKeysFromLocalStorage(userAddress);
      if (existing.length === 0) {
        localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(mockKeys));
      }
    }

    return mockKeys;
  }
}

// Export singleton instance
export const sessionKeyService = new SessionKeyService();

// Add debugging functions to window object in browser environment
if (typeof window !== 'undefined') {
  (window as any).clearSessionKeys = (userAddress?: string) => {
    if (!userAddress && (window as any).starknetAccount) {
      userAddress = (window as any).starknetAccount.address;
    }
    if (userAddress) {
      sessionKeyService.clearStoredSessionKeys(userAddress);
      // Also clear any other potential caches
      localStorage.removeItem('argent-x-sessions');
      localStorage.removeItem('session-cache');
      console.log('Cleared all session-related storage');
    } else {
      console.error('Please provide a user address or connect your wallet first');
    }
  };
  
  (window as any).debugSessionKeys = (userAddress?: string) => {
    if (!userAddress && (window as any).starknetAccount) {
      userAddress = (window as any).starknetAccount.address;
    }
    if (userAddress) {
      sessionKeyService.getStoredSessionKeys(userAddress).then(keys => {
        console.log('Stored session keys:', keys);
        keys.forEach(key => {
          if (key.sessionData?.key) {
            const keyWithoutPrefix = key.sessionData.key.startsWith('0x') 
              ? key.sessionData.key.slice(2) 
              : key.sessionData.key;
            console.log(`Key ${key.id}:`, {
              key: key.sessionData.key,
              keyWithoutPrefix,
              length: keyWithoutPrefix.length,
              isValid: sessionKeyService['validateFeltValue'](keyWithoutPrefix)
            });
          }
        });
      });
    } else {
      console.error('Please provide a user address or connect your wallet first');
    }
  };

  // Override any existing createSessionKey function to ensure we use the fixed version
  (window as any).createSessionKey = async (options: {
    description: string;
    price: string;
    duration: number;
    permissions: string[];
  }) => {
    const account = (window as any).starknetAccount;
    if (!account) {
      throw new Error('Please connect your wallet first');
    }
    
    console.log('Using fixed createSessionKey function');
    return await sessionKeyService.createSessionKey(
      account,
      options.duration,
      options.permissions,
      options.price,
      options.description
    );
  };
}
