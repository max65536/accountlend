// Contract configuration for different networks
export const CONTRACT_ADDRESSES = {
  // Starknet Testnet (Goerli)
  testnet: {
    ACCOUNT_MARKET: "0x0", // To be updated when deployed
    SESSION_KEY_MANAGER: "0x0", // To be updated when deployed
    ERC20_ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", // ETH on testnet
  },
  // Starknet Mainnet
  mainnet: {
    ACCOUNT_MARKET: "0x0", // To be updated when deployed
    SESSION_KEY_MANAGER: "0x0", // To be updated when deployed
    ERC20_ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", // ETH on mainnet
  }
};

// Current network configuration
export const CURRENT_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet';

// Get contract address for current network
export const getContractAddress = (contractName: keyof typeof CONTRACT_ADDRESSES.testnet) => {
  return CONTRACT_ADDRESSES[CURRENT_NETWORK][contractName];
};

// Network configuration
export const NETWORK_CONFIG = {
  testnet: {
    name: 'Starknet Testnet',
    chainId: '0x534e5f474f45524c49', // SN_GOERLI
    rpcUrl: 'https://starknet-testnet.public.blastapi.io',
    explorerUrl: 'https://testnet.starkscan.co',
  },
  mainnet: {
    name: 'Starknet Mainnet',
    chainId: '0x534e5f4d41494e', // SN_MAIN
    rpcUrl: 'https://starknet-mainnet.public.blastapi.io',
    explorerUrl: 'https://starkscan.co',
  }
};

export const getCurrentNetworkConfig = () => {
  return NETWORK_CONFIG[CURRENT_NETWORK];
};
