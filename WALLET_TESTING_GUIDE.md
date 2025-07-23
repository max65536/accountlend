# Wallet Connection and Session Key Testing Guide

## Overview
This guide explains how to connect wallets and test session key functionality in the AccountLend Session Key Marketplace.

## Prerequisites

### 1. Wallet Setup
- **Argent X Wallet**: Download from [Chrome Web Store](https://chrome.google.com/webstore/detail/argent-x/dlcobpjiigpikoobohmabehhmhfoodbb)
- **Braavos Wallet**: Download from [Chrome Web Store](https://chrome.google.com/webstore/detail/braavos-wallet/jnlgamecbpmbajjfhmmmlhejkemejdma)

### 2. Testnet Setup
- Switch your wallet to **Starknet Sepolia Testnet**
- Get testnet tokens from [Starknet Faucet](https://faucet.starknet.io/)
  - **STRK tokens**: For testing transactions (recommended)
  - **ETH tokens**: For transaction fees (required)
- Ensure you have at least 0.01 ETH for transaction fees and some STRK for testing
- **Note**: If you only have STRK and no ETH, you can still test most console functions except actual transactions

### 3. Application Setup
```bash
# Clone and setup the project
git clone https://github.com/max65536/accountlend.git
cd accountlend

# Install dependencies
yarn install

# Start the development server
yarn dev
```

## Wallet Connection Process

### Step 1: Launch the Application
1. Open your browser and navigate to `http://localhost:3000`
2. You should see the AccountLend homepage with a "Connect Wallet" button

### Step 2: Connect Your Wallet
1. Click the **"Connect Wallet"** button in the top-right corner
2. Select your preferred wallet (Argent X or Braavos)
3. Approve the connection in your wallet extension
4. Your wallet address should appear in the WalletBar component

### Step 3: Verify Connection
- The WalletBar should display:
  - Your wallet address (truncated)
  - Network indicator (Sepolia Testnet)
  - Copy address functionality
  - Disconnect option

## Testing Session Key Creation

### Method 1: Using the UI (Recommended)

#### Step 1: Navigate to Session Key Creator
1. After connecting your wallet, click on the **"Create Session"** tab
2. You'll see the SessionKeyCreator component with a form

#### Step 2: Fill Session Key Details
```
Description: "Test DeFi Session Key"
Price: 0.001 (ETH)
Duration: 24 hours
Permissions: Select "Transfer" and "Swap"
```

#### Step 3: Create Session Key
1. Click **"Create Session Key"** button
2. Your wallet will prompt you to sign the session creation
3. Approve the transaction in your wallet
4. Wait for transaction confirmation (usually 10-30 seconds)

#### Step 4: Verify Creation
1. Go to the **"Manage Keys"** tab
2. Your new session key should appear in the list
3. Check the status, expiration time, and permissions

### Method 2: Using the Browser Console

#### Step 1: Open Developer Tools
1. Press `F12` or right-click → "Inspect"
2. Go to the **Console** tab

#### Step 1.5: Check Connection Status
```javascript
// Run this first to check your connection status
console.log('=== Connection Status Check ===');
console.log('Starknet available:', !!window.starknet);
console.log('Account exposed:', !!window.starknetAccount);
console.log('Services exposed:', !!window.createSessionKey);

if (window.starknetAccount) {
  console.log('✅ Wallet connected:', window.starknetAccount.address);
  
  // Quick STRK balance check
  const STRK_CONTRACT = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
  window.starknetProvider.callContract({
    contractAddress: STRK_CONTRACT,
    entrypoint: 'balanceOf',
    calldata: [window.starknetAccount.address]
  }).then(result => {
    const balance = BigInt(result.result[0]) / BigInt(10**18);
    console.log('💰 STRK balance:', balance.toString(), 'STRK');
  }).catch(error => console.log('Balance check failed:', error.message));
  
} else if (window.starknet) {
  console.log('⚠️ Starknet available but account not exposed. Try refreshing the page.');
} else {
  console.log('❌ No Starknet wallet detected.');
}
```

#### Step 2: Test Session Key Service

**Method 1: Using Console-Friendly Wrapper (Recommended)**
```javascript
// Make sure wallet is connected first
if (!window.starknetAccount) {
  console.error('Please connect your wallet first!');
} else {
  // Use the console-friendly wrapper function
  window.createSessionKey({
    description: 'Console Test Session',
    price: '0.001',
    duration: 24, // hours
    permissions: ['transfer', 'approve']
  })
    .then(result => {
      console.log('Session key created:', result);
    })
    .catch(error => {
      console.error('Error creating session key:', error);
    });
}
```

**Method 2: Using Raw Service (Advanced)**
```javascript
// Make sure wallet is connected first
if (!window.starknetAccount) {
  console.error('Please connect your wallet first!');
} else {
  const account = window.starknetAccount;
  // Raw service requires 5 individual parameters in exact order
  window.sessionKeyService.createSessionKey(
    account,                    // 1st: Account object
    24,                        // 2nd: duration (hours)
    ['transfer', 'approve'],   // 3rd: permissions array
    '0.001',                   // 4th: price string
    'Console Test Session'     // 5th: description string
  )
    .then(result => {
      console.log('Session key created:', result);
    })
    .catch(error => {
      console.error('Error creating session key:', error);
    });
}
```

#### Step 3: Test Session Key Validation
```javascript
// Get all stored session keys using wrapper function
const allKeys = window.getAllStoredSessionKeys();
console.log('All session keys:', allKeys);

// Validate a specific session key
if (allKeys.length > 0) {
  const firstKey = allKeys[0];
  
  // Use wrapper functions for validation
  window.validateSessionKey(firstKey)
    .then(isValid => {
      console.log('Session key valid:', isValid);
    });
  
  // Check permissions
  const hasTransfer = window.hasPermission(firstKey, 'transfer');
  console.log('Has transfer permission:', hasTransfer);
  
  // Get session statistics
  const stats = window.getSessionKeyStats();
  console.log('Session key statistics:', stats);
}
```

## Testing Wallet Account Behaviors

### 1. Account Information Testing
```javascript
// Check connected account
const account = window.starknetAccount;
console.log('Connected account:', account?.address);

// Get account balance using provider
if (account && window.starknetProvider) {
  const provider = window.starknetProvider;
  
  // Get STRK balance (STRK contract address on Starknet)
  const STRK_CONTRACT = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
  
  provider.callContract({
    contractAddress: STRK_CONTRACT,
    entrypoint: 'balanceOf',
    calldata: [account.address]
  })
    .then(result => {
      // Convert from wei to STRK (divide by 10^18)
      const balance = BigInt(result.result[0]) / BigInt(10**18);
      console.log('Account STRK balance:', balance.toString(), 'STRK');
    })
    .catch(error => console.error('STRK balance error:', error));

  // Also get ETH balance for comparison
  const ETH_CONTRACT = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
  
  provider.callContract({
    contractAddress: ETH_CONTRACT,
    entrypoint: 'balanceOf',
    calldata: [account.address]
  })
    .then(result => {
      // Convert from wei to ETH (divide by 10^18)
      const balance = BigInt(result.result[0]) / BigInt(10**18);
      console.log('Account ETH balance:', balance.toString(), 'ETH');
    })
    .catch(error => console.error('ETH balance error:', error));
}

// Alternative: Check account properties
if (account) {
  console.log('Account object:', account);
  console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(account)));
}
```

### 2. Transaction Testing
```javascript
// Test transaction submission using correct Starknet React format
const testTransaction = {
  contractAddress: '0x038aad77e374b20f0ff285a3912b5d9ff75f1137c5cb624975a65ee9093a78f4', // SessionKeyManager contract
  entrypoint: 'create_session_key',
  calldata: ['0x123456789abcdef', '86400'] // publicKey, duration
};

// Submit transaction (account.execute expects an array of calls)
if (account) {
  account.execute([testTransaction])
    .then(result => {
      console.log('Transaction submitted:', result.transaction_hash);
      console.log('Transaction result:', result);
    })
    .catch(error => {
      console.error('Transaction error:', error);
    });
}

// STRK transfer test (recommended for testing accounts)
const strkTransfer = {
  contractAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK contract
  entrypoint: 'transfer',
  calldata: [
    '0x1234567890123456789012345678901234567890123456789012345678901234', // recipient address
    '1000000000000000000', // amount (1 STRK in wei)
    '0' // high part of uint256
  ]
};

// Execute STRK transfer
if (account) {
  account.execute([strkTransfer])
    .then(result => {
      console.log('STRK transfer submitted:', result.transaction_hash);
    })
    .catch(error => {
      console.error('STRK transfer error:', error);
    });
}

// Alternative: ETH transfer (if you have ETH)
const ethTransfer = {
  contractAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH contract
  entrypoint: 'transfer',
  calldata: [
    '0x1234567890123456789012345678901234567890123456789012345678901234', // recipient address
    '1000000000000000', // amount (0.001 ETH in wei)
    '0' // high part of uint256
  ]
};

// Execute ETH transfer
if (account) {
  account.execute([ethTransfer])
    .then(result => {
      console.log('ETH transfer submitted:', result.transaction_hash);
    })
    .catch(error => {
      console.error('Transfer error:', error);
    });
}
```

### 3. Session Key Execution Testing
```javascript
// Test executing a transaction with a session key
const sessionKey = allKeys[0]; // Use first available session key

const sessionTransaction = {
  to: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH contract
  selector: 'transfer',
  calldata: ['0xrecipient_address', '1000000000000000'] // 0.001 ETH
};

sessionService.executeWithSessionKey(sessionKey, sessionTransaction)
  .then(result => {
    console.log('Session transaction executed:', result);
  })
  .catch(error => {
    console.error('Session execution error:', error);
  });
```

## Testing Marketplace Functionality

### 1. List Session Key for Rent
```javascript
// Navigate to the marketplace
// Use the AccountMarket component to list your session key

const listingData = {
  sessionKeyId: 'your-session-key-id',
  price: '0.001', // ETH
  duration: 3600, // 1 hour
  permissions: ['transfer']
};

// This would typically be done through the UI
console.log('Listing data prepared:', listingData);
```

### 2. Rent a Session Key
1. Go to the **"Marketplace"** tab
2. Browse available session keys
3. Click **"Rent"** on a session key you want to use
4. Approve the payment transaction
5. The session key will be imported to your account

### 3. Test Rented Session Key
```javascript
// After renting, test the imported session key
const importedKeys = sessionService.getAllStoredSessionKeys()
  .filter(key => key.isRented);

if (importedKeys.length > 0) {
  const rentedKey = importedKeys[0];
  console.log('Rented session key:', rentedKey);
  
  // Test its permissions
  const canTransfer = sessionService.hasPermission(rentedKey, 'transfer');
  console.log('Rented key can transfer:', canTransfer);
}
```

## Troubleshooting Common Issues

### 1. Wallet Connection Issues
```javascript
// Check if wallet is installed
if (typeof window.starknet === 'undefined') {
  console.error('No Starknet wallet detected. Please install Argent X or Braavos.');
}

// Check wallet connection status
if (window.starknet) {
  window.starknet.isConnected()
    .then(connected => console.log('Wallet connected:', connected))
    .catch(error => console.error('Connection check failed:', error));
}
```

### 2. Network Issues
```javascript
// Verify network
const expectedChainId = '0x534e5f5345504f4c4941'; // Sepolia testnet
window.starknet.provider.getChainId()
  .then(chainId => {
    if (chainId !== expectedChainId) {
      console.error('Wrong network. Please switch to Starknet Sepolia testnet.');
    } else {
      console.log('Correct network detected.');
    }
  });
```

### 3. Transaction Failures
```javascript
// Check account balance before transactions
const minBalance = BigInt('1000000000000000'); // 0.001 ETH
account.getBalance()
  .then(balance => {
    if (BigInt(balance) < minBalance) {
      console.error('Insufficient balance. Please get testnet ETH from faucet.');
    }
  });
```

### 4. Session Key Issues
```javascript
// Debug session key problems
const debugSessionKey = (sessionKey) => {
  console.log('Session Key Debug Info:');
  console.log('- Public Key:', sessionKey.publicKey);
  console.log('- Permissions:', sessionKey.permissions);
  console.log('- Expires At:', new Date(sessionKey.expiresAt));
  console.log('- Is Valid:', sessionService.validateSessionKey(sessionKey));
  console.log('- Time Until Expiry:', sessionKey.expiresAt - Date.now(), 'ms');
};

// Use with any session key
const keys = sessionService.getAllStoredSessionKeys();
if (keys.length > 0) {
  debugSessionKey(keys[0]);
}
```

## Advanced Testing Scenarios

### 1. Batch Session Key Creation
```javascript
// Create multiple session keys at once
const batchData = [
  { permissions: ['transfer'], expiresAt: Date.now() + 3600000 },
  { permissions: ['approve'], expiresAt: Date.now() + 7200000 },
  { permissions: ['transfer', 'approve'], expiresAt: Date.now() + 10800000 }
];

sessionService.createBatchSessionKeys(batchData)
  .then(results => {
    console.log('Batch creation results:', results);
    const successful = results.filter(r => r !== null);
    console.log(`Created ${successful.length} out of ${batchData.length} session keys`);
  });
```

### 2. Session Key Export/Import Testing
```javascript
// Export a session key
const sessionKey = sessionService.getAllStoredSessionKeys()[0];
const exported = sessionService.exportSessionKey(sessionKey);
console.log('Exported session key:', exported);

// Import it back (simulating marketplace transfer)
const imported = sessionService.importSessionKey(exported, 'test-password');
console.log('Imported session key:', imported);
```

### 3. Performance Testing
```javascript
// Test session key creation performance
const startTime = Date.now();
const promises = Array(10).fill().map(() => 
  sessionService.createSessionKey({
    permissions: ['transfer'],
    expiresAt: Date.now() + 3600000
  })
);

Promise.all(promises)
  .then(results => {
    const endTime = Date.now();
    console.log(`Created 10 session keys in ${endTime - startTime}ms`);
    console.log('Average time per key:', (endTime - startTime) / 10, 'ms');
  });
```

## Monitoring and Debugging

### 1. Enable Debug Mode
```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');
localStorage.setItem('sessionKeyDebug', 'true');

// Reload the page to see debug logs
location.reload();
```

### 2. Monitor Real-time Events
```javascript
// Subscribe to session key events
sessionService.subscribeToUpdates((event) => {
  console.log('Session key event:', event);
});

// Subscribe to transaction events
window.transactionService.subscribeToUpdates((event) => {
  console.log('Transaction event:', event);
});
```

### 3. Check Application State
```javascript
// Get comprehensive application state
const appState = {
  wallet: {
    connected: !!window.starknetAccount,
    address: window.starknetAccount?.address,
    network: window.starknetProvider?.chainId
  },
  sessionKeys: {
    total: sessionService.getAllStoredSessionKeys().length,
    active: sessionService.getAllStoredSessionKeys().filter(k => 
      sessionService.validateSessionKey(k)).length
  },
  transactions: {
    total: window.transactionService.getAllStoredTransactions().length,
    pending: window.transactionService.getAllStoredTransactions()
      .filter(t => t.status === 'pending').length
  }
};

console.log('Application State:', appState);
```

## Security Testing

### 1. Test Session Key Validation
```javascript
// Test with expired session key
const expiredKey = {
  ...sessionKey,
  expiresAt: Date.now() - 1000 // 1 second ago
};

const isExpiredValid = sessionService.validateSessionKey(expiredKey);
console.log('Expired key should be invalid:', !isExpiredValid);
```

### 2. Test Permission Boundaries
```javascript
// Test permission enforcement
const limitedKey = {
  ...sessionKey,
  permissions: ['approve'] // No transfer permission
};

const hasTransfer = sessionService.hasPermission(limitedKey, 'transfer');
console.log('Limited key should not have transfer permission:', !hasTransfer);
```

## Conclusion

This guide covers comprehensive testing of wallet connection and session key functionality. Use the UI for normal user testing and the console methods for advanced debugging and development testing.

For automated testing, refer to the test files in the `tests/` directory, particularly:
- `tests/services/sessionKeyService.test.js`
- `tests/e2e/marketplace.spec.js`
- `tests/security/security-audit.test.js`

Remember to always test on Starknet Sepolia testnet before using real funds on mainnet.
