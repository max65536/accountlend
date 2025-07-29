import { Account, Contract, CallData, RpcProvider } from 'starknet';
import { getContractAddress, getCurrentNetworkConfig } from '../config/contracts';

// Import contract ABIs
import SessionKeyManagerABI from '../contracts/SessionKeyManager.json';
import SessionKeyMarketplaceABI from '../contracts/SessionKeyMarketplace.json';

export const SESSION_KEY_MANAGER_ABI = SessionKeyManagerABI.abi;
export const SESSION_KEY_MARKETPLACE_ABI = SessionKeyMarketplaceABI.abi;

// Create contract instances
export const createSessionKeyManagerContract = (account: Account) => {
  const contractAddress = getContractAddress('SESSION_KEY_MANAGER');
  if (contractAddress === '0x0') {
    throw new Error('Session Key Manager contract not deployed yet');
  }
  return new Contract(SESSION_KEY_MANAGER_ABI, contractAddress, account);
};

export const createSessionKeyMarketplaceContract = (account: Account) => {
  const contractAddress = getContractAddress('MARKETPLACE');
  if (contractAddress === '0x0') {
    throw new Error('Session Key Marketplace contract not deployed yet');
  }
  return new Contract(SESSION_KEY_MARKETPLACE_ABI, contractAddress, account);
};

// Permission mapping for frontend to contract
export const PERMISSION_MAPPING: { [key: string]: string } = {
  'transfer': '1',
  'swap': '2', 
  'approve': '3',
  'stake': '4',
  'gaming': '5',
  'nft': '6'
};

// Utility functions for contract interactions
export const formatPrice = (price: string): string => {
  // Convert ETH to wei (multiply by 10^18)
  const priceInWei = parseFloat(price) * Math.pow(10, 18);
  return priceInWei.toString();
};

export const formatDuration = (hours: number): number => {
  // Convert hours to seconds
  return hours * 3600;
};

export const formatPermissions = (permissions: string[]): string[] => {
  return permissions.map(perm => PERMISSION_MAPPING[perm] || '0');
};

export const parsePermissions = (permissions: string[]): string[] => {
  const reverseMapping: { [key: string]: string } = {};
  Object.entries(PERMISSION_MAPPING).forEach(([key, value]) => {
    reverseMapping[value] = key;
  });
  
  return permissions.map(perm => reverseMapping[perm] || 'unknown');
};

// Session key creation function
export const createSessionKey = async (
  account: Account,
  duration: number,
  permissions: string[],
  price: string
): Promise<string> => {
  try {
    const contract = createSessionKeyManagerContract(account);
    
    const formattedDuration = formatDuration(duration);
    const formattedPermissions = formatPermissions(permissions);
    const formattedPrice = formatPrice(price);
    
    const result = await contract.create_session_key(
      account.address,
      formattedDuration,
      formattedPermissions,
      formattedPrice
    );
    
    return result.transaction_hash;
  } catch (error) {
    console.error('Failed to create session key:', error);
    throw error;
  }
};

// List session key in marketplace
export const listSessionKey = async (
  account: Account,
  sessionKey: string,
  price: string
): Promise<string> => {
  try {
    const contract = createSessionKeyMarketplaceContract(account);
    const formattedPrice = formatPrice(price);
    
    const result = await contract.list_session_key(sessionKey, formattedPrice);
    return result.transaction_hash;
  } catch (error) {
    console.error('Failed to list session key:', error);
    throw error;
  }
};

// Rent session key from marketplace
export const rentSessionKey = async (
  account: Account,
  sessionKey: string
): Promise<string> => {
  try {
    const contract = createSessionKeyMarketplaceContract(account);
    
    const result = await contract.rent_session_key(sessionKey);
    return result.transaction_hash;
  } catch (error) {
    console.error('Failed to rent session key:', error);
    throw error;
  }
};

// Revoke session key
export const revokeSessionKey = async (
  account: Account,
  sessionKey: string
): Promise<string> => {
  try {
    const contract = createSessionKeyManagerContract(account);
    
    const result = await contract.revoke_session_key(sessionKey);
    return result.transaction_hash;
  } catch (error) {
    console.error('Failed to revoke session key:', error);
    throw error;
  }
};

// Get session key info
export const getSessionKeyInfo = async (
  account: Account,
  sessionKey: string
): Promise<any> => {
  try {
    const contract = createSessionKeyManagerContract(account);
    
    const result = await contract.get_session_key_info(sessionKey);
    return result;
  } catch (error) {
    console.error('Failed to get session key info:', error);
    throw error;
  }
};

// Get active marketplace listings
export const getActiveListings = async (
  account: Account,
  offset: number = 0,
  limit: number = 10
): Promise<string[]> => {
  try {
    const contract = createSessionKeyMarketplaceContract(account);
    
    const result = await contract.get_active_listings(offset, limit);
    return result;
  } catch (error) {
    console.error('Failed to get active listings:', error);
    throw error;
  }
};

// Get user earnings
export const getUserEarnings = async (
  account: Account,
  userAddress: string
): Promise<string> => {
  try {
    const contract = createSessionKeyMarketplaceContract(account);
    
    const result = await contract.get_user_earnings(userAddress);
    return result.toString();
  } catch (error) {
    console.error('Failed to get user earnings:', error);
    throw error;
  }
};

// Withdraw earnings
export const withdrawEarnings = async (
  account: Account,
  amount: string
): Promise<string> => {
  try {
    const contract = createSessionKeyMarketplaceContract(account);
    const formattedAmount = formatPrice(amount);
    
    const result = await contract.withdraw_earnings(formattedAmount);
    return result.transaction_hash;
  } catch (error) {
    console.error('Failed to withdraw earnings:', error);
    throw error;
  }
};

// Error handling utility
export const handleContractError = (error: any): string => {
  if (error.message) {
    // Parse common Starknet errors
    if (error.message.includes('insufficient balance')) {
      return 'Insufficient balance to complete transaction';
    }
    if (error.message.includes('unauthorized')) {
      return 'Unauthorized access - please check your permissions';
    }
    if (error.message.includes('expired')) {
      return 'Session key has expired';
    }
    if (error.message.includes('not found')) {
      return 'Resource not found';
    }
    if (error.message.includes('not deployed')) {
      return 'Smart contracts not deployed yet - using mock data';
    }
    return error.message;
  }
  return 'An unknown error occurred';
};

// Transaction status utility
export const waitForTransaction = async (txHash: string): Promise<boolean> => {
  const networkConfig = getCurrentNetworkConfig();
  const provider = new RpcProvider({ nodeUrl: networkConfig.rpcUrl });
  
  try {
    const receipt = await provider.waitForTransaction(txHash);
    return receipt.status === 'ACCEPTED_ON_L2' || receipt.status === 'ACCEPTED_ON_L1';
  } catch (error) {
    console.error('Transaction failed:', error);
    return false;
  }
};

// Format wei to ETH
export const formatWeiToEth = (wei: string): string => {
  const ethValue = parseFloat(wei) / Math.pow(10, 18);
  return ethValue.toFixed(6);
};

// Format timestamp to readable date
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};
