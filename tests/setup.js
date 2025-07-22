// Test setup configuration for AccountLend production readiness testing
import { jest } from '@jest/globals';

// Mock Starknet provider for testing
global.mockStarknetProvider = {
  account: {
    address: '0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31',
    chainId: '0x534e5f5345504f4c4941', // Starknet Sepolia
  },
  provider: {
    getChainId: jest.fn().mockResolvedValue('0x534e5f5345504f4c4941'),
    getBlock: jest.fn().mockResolvedValue({ block_number: 123456 }),
    callContract: jest.fn().mockResolvedValue({ result: ['0x1'] }),
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
