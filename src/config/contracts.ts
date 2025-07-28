// Contract configuration for different networks
export const CONTRACT_ADDRESSES = {
  // Starknet Testnet (Sepolia)
  testnet: {
    ACCOUNT_MARKET: "0x008957aefd5fbc095ef5685b4c3779c15a388634f88f629bf1ea8090b8517383", // SessionKeyMarketplace with fixed owner attribution - Updated 2025-01-28
    SESSION_KEY_MANAGER: "0x05053e21d88a77300f7f164d4be4defbd4aeed79367b8c6817a517579042a9dd", // Enhanced SessionKeyManager with working auto-listing - Updated 2025-01-28
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
