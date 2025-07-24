// Contract configuration for different networks
export const CONTRACT_ADDRESSES = {
  // Starknet Testnet (Sepolia)
  testnet: {
    ACCOUNT_MARKET: "0x0511ad831feb72aecb3f6bb4d2207b323224ab8bd6cda7bfc66f03f1635a7630", // SessionKeyMarketplace deployed
    SESSION_KEY_MANAGER: "0x03c37451ad273e7afd30211ae7eaa14b01feafa239f2b9845b2f6f494aa56dcb", // SessionKeyManager deployed - Updated 2025-07-24
    ERC20_ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", // ETH on testnet
  },
  // Starknet Mainnet
  mainnet: {
    ACCOUNT_MARKET: "0x0", // To be updated when deployed
    SESSION_KEY_MANAGER: "0x0", // To be updated when deployed
    ERC20_ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", // ETH on mainnet
  }
};

// Get current network from localStorage or default to testnet
export const getCurrentNetwork = (): 'mainnet' | 'testnet' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('accountlend-network');
    return (saved as 'mainnet' | 'testnet') || 'testnet';
  }
  // Fallback for server-side rendering
  return (process.env.NEXT_PUBLIC_NETWORK as 'mainnet' | 'testnet') || 'testnet';
};

// Get contract address for current network
export const getContractAddress = (contractName: keyof typeof CONTRACT_ADDRESSES.testnet) => {
  const currentNetwork = getCurrentNetwork();
  return CONTRACT_ADDRESSES[currentNetwork][contractName];
};

// Legacy export for backward compatibility
export const CURRENT_NETWORK = getCurrentNetwork();

// Network configuration
export const NETWORK_CONFIG = {
  testnet: {
    name: 'Starknet Sepolia Testnet',
    chainId: '0x534e5f5345504f4c4941', // SN_SEPOLIA
    rpcUrl: 'https://starknet-sepolia.public.blastapi.io',
    explorerUrl: 'https://sepolia.starkscan.co',
    sessionKeyManagerAddress: CONTRACT_ADDRESSES.testnet.SESSION_KEY_MANAGER,
    marketplaceAddress: CONTRACT_ADDRESSES.testnet.ACCOUNT_MARKET,
  },
  mainnet: {
    name: 'Starknet Mainnet',
    chainId: '0x534e5f4d41494e', // SN_MAIN
    rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
    explorerUrl: 'https://starkscan.co',
    sessionKeyManagerAddress: CONTRACT_ADDRESSES.mainnet.SESSION_KEY_MANAGER,
    marketplaceAddress: CONTRACT_ADDRESSES.mainnet.ACCOUNT_MARKET,
  }
};

export const getCurrentNetworkConfig = () => {
  const currentNetwork = getCurrentNetwork();
  return NETWORK_CONFIG[currentNetwork];
};
