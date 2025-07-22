// Test setup configuration for AccountLend production readiness testing
import { jest } from '@jest/globals';

// Add TextEncoder and TextDecoder polyfills for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Starknet dependencies
jest.mock('starknet', () => ({
  RpcProvider: jest.fn().mockImplementation(() => ({
    getChainId: jest.fn().mockResolvedValue('0x534e5f5345504f4c4941'),
    getBlock: jest.fn().mockResolvedValue({ block_number: 123456 }),
    callContract: jest.fn().mockResolvedValue({ result: ['0x1'] }),
    getTransactionReceipt: jest.fn().mockResolvedValue({
      transaction_hash: '0x123',
      status: 'ACCEPTED_ON_L2',
      block_number: 123456
    }),
    waitForTransaction: jest.fn().mockResolvedValue({
      transaction_hash: '0x123',
      status: 'ACCEPTED_ON_L2'
    })
  })),
  Account: jest.fn().mockImplementation(() => ({
    address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
    signMessage: jest.fn().mockResolvedValue(['0x123', '0x456']),
    execute: jest.fn().mockResolvedValue({
      transaction_hash: '0x123456789abcdef'
    })
  })),
  Call: jest.fn(),
  ec: {
    starkCurve: {
      getStarkKey: jest.fn().mockReturnValue('0x123456789abcdef'),
      getPublicKey: jest.fn().mockReturnValue('0x987654321fedcba'),
      utils: {
        randomPrivateKey: jest.fn().mockReturnValue(new Uint8Array(32).fill(1))
      }
    }
  },
  num: {
    toHex: jest.fn((val) => `0x${val.toString(16)}`),
    toBigInt: jest.fn((val) => BigInt(val))
  },
  TransactionStatus: {
    ACCEPTED_ON_L2: 'ACCEPTED_ON_L2',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED'
  }
}));

// Mock @argent/x-sessions
jest.mock('@argent/x-sessions', () => ({
  createSession: jest.fn().mockResolvedValue({
    sessionRequest: {
      key: '0x123456789abcdef',
      expires: Date.now() + 86400000,
      policies: []
    },
    sessionAccount: {
      address: '0x987654321fedcba'
    }
  }),
  createSessionAccount: jest.fn().mockReturnValue({
    address: '0x987654321fedcba',
    execute: jest.fn().mockResolvedValue({
      transaction_hash: '0x123456789abcdef'
    })
  }),
  buildSessionAccount: jest.fn().mockReturnValue({
    address: '0x987654321fedcba'
  }),
  createMerkleTreeForPolicies: jest.fn().mockReturnValue({
    root: '0xmerkleroot123',
    proofs: []
  }),
  Policy: jest.fn(),
  SessionAccount: jest.fn()
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}));

// Mock Starknet React
jest.mock('@starknet-react/core', () => ({
  useAccount: jest.fn().mockReturnValue({
    account: {
      address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
      signMessage: jest.fn().mockResolvedValue(['0x123', '0x456'])
    },
    isConnected: true
  }),
  useProvider: jest.fn().mockReturnValue({
    provider: {
      getChainId: jest.fn().mockResolvedValue('0x534e5f5345504f4c4941'),
      callContract: jest.fn().mockResolvedValue({ result: ['0x1'] })
    }
  }),
  useContract: jest.fn().mockReturnValue({
    contract: {
      call: jest.fn().mockResolvedValue({ result: ['0x1'] }),
      invoke: jest.fn().mockResolvedValue({ transaction_hash: '0x123' })
    }
  })
}));

// Mock contract configurations
jest.mock('../src/config/contracts', () => ({
  getCurrentNetworkConfig: jest.fn().mockReturnValue({
    chainId: '0x534e5f5345504f4c4941',
    rpcUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
    explorerUrl: 'https://sepolia.starkscan.co'
  }),
  getContractAddress: jest.fn().mockReturnValue('0x038aad77e374b20f0ff285a3912b5d9ff75f1137c5cb624975a65ee9093a78f4')
}));

// Mock Starknet provider for testing
global.mockStarknetProvider = {
  account: {
    address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
    chainId: '0x534e5f5345504f4c4941', // Starknet Sepolia
    signMessage: jest.fn().mockResolvedValue(['0x123', '0x456'])
  },
  provider: {
    getChainId: jest.fn().mockResolvedValue('0x534e5f5345504f4c4941'),
    getBlock: jest.fn().mockResolvedValue({ block_number: 123456 }),
    callContract: jest.fn().mockResolvedValue({ result: ['0x1'] }),
    getTransactionReceipt: jest.fn().mockResolvedValue({
      transaction_hash: '0x123',
      status: 'ACCEPTED_ON_L2'
    })
  }
};

// Mock session key data structures
global.mockSessionKeyData = {
  validSessionKey: {
    id: 'test-session-1',
    description: 'Test DeFi Session',
    permissions: ['transfer', 'swap'],
    duration: 24,
    price: '0.001',
    expiresAt: Date.now() + 86400000,
    createdAt: Date.now(),
    sessionData: {
      key: '0x123456789abcdef',
      policies: [
        { contractAddress: '*', selector: 'transfer' },
        { contractAddress: '*', selector: 'swap' }
      ]
    },
    owner: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31'
  },
  expiredSessionKey: {
    id: 'expired-session',
    description: 'Expired Session',
    permissions: ['transfer'],
    duration: 1,
    price: '0.001',
    expiresAt: Date.now() - 1000,
    createdAt: Date.now() - 86400000,
    sessionData: {
      key: '0x987654321fedcba',
      policies: [{ contractAddress: '*', selector: 'transfer' }]
    },
    owner: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31'
  }
};

// Mock transaction data
global.mockTransactionData = {
  pendingTransaction: {
    hash: '0x123456789abcdef',
    type: 'session_creation',
    status: 'pending',
    timestamp: Date.now(),
    from: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
    to: '0x038aad77e374b20f0ff285a3912b5d9ff75f1137c5cb624975a65ee9093a78f4'
  },
  confirmedTransaction: {
    hash: '0x987654321fedcba',
    type: 'session_rental',
    status: 'confirmed',
    timestamp: Date.now() - 300000,
    from: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
    to: '0x0511ad831feb72aecb3f6bb4d2207b323224ab8bd6cda7bfc66f03f1635a7630'
  }
};

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage for testing
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock window.crypto for session key generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-1234'),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: jest.fn(),
      exportKey: jest.fn(),
      importKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    }
  }
});

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  localStorageMock.clear.mockClear();
  sessionStorageMock.clear.mockClear();
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});
