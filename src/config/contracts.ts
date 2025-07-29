// Contract configuration for different networks
export const CONTRACT_ADDRESSES = {
  sepolia: {
    SESSION_KEY_MANAGER: '0x00f7dde35123f2c9cd5dda8835b307e79e753a6e444c7548811c4c96f24ff978', // Enhanced with marketplace integration - DEPLOYED
    MARKETPLACE: '0x04589affed03ebf898f3e4fe35c03de05d596384784495c0d4f37f2a77dddca7', // Enhanced with session key manager integration - DEPLOYED
    ETH_TOKEN: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    STRK_TOKEN: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  },
  mainnet: {
    SESSION_KEY_MANAGER: '',
    MARKETPLACE: '',
    ETH_TOKEN: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    STRK_TOKEN: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  }
};

// Get current network from localStorage or default to sepolia
export const getCurrentNetwork = (): 'mainnet' | 'sepolia' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('accountlend-network');
    
    // Migration: convert old 'testnet' value to 'sepolia'
    if (saved === 'testnet') {
      localStorage.setItem('accountlend-network', 'sepolia');
      return 'sepolia';
    }
    
    return (saved as 'mainnet' | 'sepolia') || 'sepolia';
  }
  // Fallback for server-side rendering
  const envNetwork = process.env.NEXT_PUBLIC_NETWORK;
  if (envNetwork === 'testnet') {
    return 'sepolia';
  }
  return (envNetwork as 'mainnet' | 'sepolia') || 'sepolia';
};

// Get contract address for current network
export const getContractAddress = (contractName: keyof typeof CONTRACT_ADDRESSES.sepolia) => {
  try {
    const currentNetwork = getCurrentNetwork();
    
    // Defensive check to ensure CONTRACT_ADDRESSES exists
    if (!CONTRACT_ADDRESSES || !CONTRACT_ADDRESSES[currentNetwork]) {
      console.error(`Contract addresses not found for network: ${currentNetwork}`);
      return '0x0';
    }
    
    const address = CONTRACT_ADDRESSES[currentNetwork][contractName];
    
    // Ensure we return a valid address or fallback
    if (!address || address === '') {
      console.warn(`Contract address not found for ${contractName} on ${currentNetwork}`);
      return '0x0';
    }
    
    return address;
  } catch (error) {
    console.error('Error getting contract address:', error);
    return '0x0';
  }
};

// Legacy export for backward compatibility
export const CURRENT_NETWORK = getCurrentNetwork();

// Network configuration
export const NETWORK_CONFIG = {
  sepolia: {
    name: 'Starknet Sepolia Testnet',
    chainId: '0x534e5f5345504f4c4941', // SN_SEPOLIA
    rpcUrl: 'https://starknet-sepolia.public.blastapi.io',
    explorerUrl: 'https://sepolia.starkscan.co',
    sessionKeyManagerAddress: CONTRACT_ADDRESSES.sepolia.SESSION_KEY_MANAGER,
    marketplaceAddress: CONTRACT_ADDRESSES.sepolia.MARKETPLACE,
    ethTokenAddress: CONTRACT_ADDRESSES.sepolia.ETH_TOKEN,
    strkTokenAddress: CONTRACT_ADDRESSES.sepolia.STRK_TOKEN,
  },
  mainnet: {
    name: 'Starknet Mainnet',
    chainId: '0x534e5f4d41494e', // SN_MAIN
    rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
    explorerUrl: 'https://starkscan.co',
    sessionKeyManagerAddress: CONTRACT_ADDRESSES.mainnet.SESSION_KEY_MANAGER,
    marketplaceAddress: CONTRACT_ADDRESSES.mainnet.MARKETPLACE,
    ethTokenAddress: CONTRACT_ADDRESSES.mainnet.ETH_TOKEN,
    strkTokenAddress: CONTRACT_ADDRESSES.mainnet.STRK_TOKEN,
  }
};

export const getCurrentNetworkConfig = () => {
  try {
    const currentNetwork = getCurrentNetwork();
    
    // Defensive check to ensure NETWORK_CONFIG exists
    if (!NETWORK_CONFIG || !NETWORK_CONFIG[currentNetwork]) {
      console.warn(`Network config not found for ${currentNetwork}, falling back to sepolia`);
      return NETWORK_CONFIG?.sepolia || {
        name: 'Starknet Sepolia Testnet',
        chainId: '0x534e5f5345504f4c4941',
        rpcUrl: 'https://starknet-sepolia.public.blastapi.io',
        explorerUrl: 'https://sepolia.starkscan.co',
        sessionKeyManagerAddress: '0x046e4b1a88557ae6f14f188d820befc1fde5d7dfdebea7ed82ffad6231b6599f',
        marketplaceAddress: '0x014ab4ede87cbed13344a47d79ab48a57309a844bd3585e6c71591e5880374f4',
        ethTokenAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        strkTokenAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      };
    }
    
    const config = NETWORK_CONFIG[currentNetwork];
    return config;
  } catch (error) {
    console.error('Error getting network config:', error);
    // Return hardcoded sepolia config as ultimate fallback
    return {
      name: 'Starknet Sepolia Testnet',
      chainId: '0x534e5f5345504f4c4941',
      rpcUrl: 'https://starknet-sepolia.public.blastapi.io',
      explorerUrl: 'https://sepolia.starkscan.co',
      sessionKeyManagerAddress: '0x046e4b1a88557ae6f14f188d820befc1fde5d7dfdebea7ed82ffad6231b6599f',
      marketplaceAddress: '0x014ab4ede87cbed13344a47d79ab48a57309a844bd3585e6c71591e5880374f4',
      ethTokenAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      strkTokenAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    };
  }
};
