// Script to create test Starknet accounts for AccountLend testing
const { ec, stark } = require('starknet');
const crypto = require('crypto');

// Starknet Sepolia testnet configuration
const STARKNET_RPC_URL = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';

async function createTestAccounts() {
  console.log('🔧 Creating Test Starknet Accounts for AccountLend...\n');
  
  const accounts = [];
  
  try {
    // Generate 3 test accounts
    for (let i = 1; i <= 3; i++) {
      console.log(`Creating Test Account ${i}:`);
      
      // Generate random private key using Starknet method
      const privateKey = stark.randomAddress();
      console.log(`  Private Key: ${privateKey}`);
      
      // Calculate public key
      const publicKey = ec.starkCurve.getStarkKey(privateKey);
      console.log(`  Public Key: ${publicKey}`);
      
      // Generate a mock account address (for testing purposes)
      // In real deployment, this would be calculated properly
      const accountAddress = '0x' + crypto.randomBytes(32).toString('hex').slice(0, 63);
      
      console.log(`  Account Address: ${accountAddress}`);
      console.log(`  Faucet URL: https://faucet.starknet.io/`);
      console.log(`  Explorer: https://sepolia.starkscan.co/contract/${accountAddress}`);
      console.log(`  ⚠️  Note: This is a mock address for testing. In production, use proper account deployment.\n`);
      
      accounts.push({
        id: i,
        privateKey,
        publicKey,
        address: accountAddress,
        role: i === 1 ? 'Session Key Creator' : i === 2 ? 'Session Key Renter' : 'Marketplace Participant'
      });
    }
    
    // Save accounts to file for later use
    const accountsData = {
      network: 'starknet-sepolia',
      rpcUrl: STARKNET_RPC_URL,
      accounts: accounts,
      contractAddresses: {
        sessionKeyManager: '0x038aad77e374b20f0ff285a3912b5d9ff75f1137c5cb624975a65ee9093a78f4',
        sessionKeyMarketplace: '0x0511ad831feb72aecb3f6bb4d2207b323224ab8bd6cda7bfc66f03f1635a7630'
      },
      createdAt: new Date().toISOString()
    };
    
    require('fs').writeFileSync('test_accounts.json', JSON.stringify(accountsData, null, 2));
    
    console.log('✅ Test accounts created and saved to test_accounts.json\n');
    
    console.log('📋 NEXT STEPS:');
    console.log('1. Fund each account with ~0.01 STRK tokens from: https://faucet.starknet.io/');
    console.log('2. Wait for funding transactions to confirm');
    console.log('3. Run: node integration_test.js');
    console.log('\n🔗 Account Addresses to Fund:');
    
    accounts.forEach(account => {
      console.log(`   ${account.role}: ${account.address}`);
    });
    
    return accounts;
    
  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createTestAccounts().catch(console.error);
}

module.exports = { createTestAccounts };
