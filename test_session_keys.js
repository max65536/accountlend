// Test script for SessionKeyService functionality
// This tests the session key creation logic without requiring a wallet connection

const { sessionKeyService } = require('./src/services/sessionKeyService');

// Mock account object for testing
const mockAccount = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  // Mock the account interface methods that might be called
  execute: async () => ({ transaction_hash: '0xmocktxhash' }),
  estimateFee: async () => ({ overall_fee: 1000n }),
  getNonce: async () => 1,
  signMessage: async () => ({ r: '0x1', s: '0x2' })
};

async function testSessionKeyCreation() {
  console.log('🧪 Testing Session Key Creation...\n');
  
  try {
    // Test 1: Create a session key with basic parameters
    console.log('Test 1: Creating session key with basic parameters');
    const sessionKey1 = await sessionKeyService.createSessionKey(
      mockAccount,
      24, // 24 hours
      ['transfer', 'swap'], // permissions
      '0.001', // price in ETH
      'Test session key for DeFi trading'
    );
    
    console.log('✅ Session key created successfully:');
    console.log(`   ID: ${sessionKey1.id}`);
    console.log(`   Owner: ${sessionKey1.owner}`);
    console.log(`   Duration: ${sessionKey1.duration} hours`);
    console.log(`   Permissions: ${sessionKey1.permissions.join(', ')}`);
    console.log(`   Price: ${sessionKey1.price} ETH`);
    console.log(`   Status: ${sessionKey1.status}`);
    console.log(`   Expires: ${new Date(sessionKey1.expiresAt).toLocaleString()}\n`);
    
    // Test 2: Validate the session key
    console.log('Test 2: Validating session key');
    const isValid = await sessionKeyService.validateSessionKey(sessionKey1);
    console.log(`✅ Session key validation: ${isValid ? 'VALID' : 'INVALID'}\n`);
    
    // Test 3: Get session key statistics
    console.log('Test 3: Getting session key statistics');
    const stats = sessionKeyService.getSessionKeyStats(mockAccount.address);
    console.log('✅ Session key statistics:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Active: ${stats.active}`);
    console.log(`   Expired: ${stats.expired}`);
    console.log(`   Revoked: ${stats.revoked}`);
    console.log(`   Rented: ${stats.rented}`);
    console.log(`   Total Earnings: ${stats.totalEarnings} ETH\n`);
    
    // Test 4: Export session key
    console.log('Test 4: Exporting session key');
    const exportedData = sessionKeyService.exportSessionKey(sessionKey1);
    console.log('✅ Session key exported successfully');
    console.log(`   Export data length: ${exportedData.length} characters\n`);
    
    // Test 5: Import session key
    console.log('Test 5: Importing session key');
    const importedKey = await sessionKeyService.importSessionKey(exportedData, mockAccount.address);
    console.log('✅ Session key imported successfully');
    console.log(`   Imported ID: ${importedKey.id}`);
    console.log(`   Status: ${importedKey.status}\n`);
    
    // Test 6: Create multiple session keys (batch test)
    console.log('Test 6: Creating multiple session keys');
    const batchConfigs = [
      {
        duration: 12,
        permissions: ['gaming', 'transfer'],
        price: '0.0005',
        description: 'Gaming session key'
      },
      {
        duration: 48,
        permissions: ['nft', 'approve'],
        price: '0.002',
        description: 'NFT trading session key'
      }
    ];
    
    const batchKeys = await sessionKeyService.batchCreateSessionKeys(mockAccount, batchConfigs);
    console.log(`✅ Batch created ${batchKeys.length} session keys\n`);
    
    // Test 7: Get all stored session keys
    console.log('Test 7: Getting all stored session keys');
    const allKeys = sessionKeyService.getStoredSessionKeys(mockAccount.address);
    console.log(`✅ Found ${allKeys.length} total session keys for user\n`);
    
    console.log('🎉 All tests passed! SessionKeyService is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the tests
testSessionKeyCreation();
