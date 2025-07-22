#!/usr/bin/env node

/**
 * Wallet Connection Test Script
 * 
 * This script helps test wallet connection and session key functionality
 * Run with: node test_wallet_connection.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔗 AccountLend Wallet Connection Test');
console.log('=====================================\n');

// Check if the project is properly set up
function checkProjectSetup() {
  console.log('📋 Checking project setup...');
  
  const requiredFiles = [
    'package.json',
    'src/components/WalletBar.tsx',
    'src/components/SessionKeyCreator.tsx',
    'src/services/sessionKeyService.ts',
    'src/config/contracts.ts'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles);
    return false;
  }
  
  console.log('✅ All required files present');
  return true;
}

// Check dependencies
function checkDependencies() {
  console.log('\n📦 Checking dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@starknet-react/core',
      'starknet',
      '@argent/x-sessions',
      'starknetkit'
    ];
    
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );
    
    if (missingDeps.length > 0) {
      console.error('❌ Missing dependencies:', missingDeps);
      console.log('💡 Run: yarn add', missingDeps.join(' '));
      return false;
    }
    
    console.log('✅ All required dependencies installed');
    return true;
  } catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    return false;
  }
}

// Check if development server is running
function checkDevServer() {
  console.log('\n🚀 Checking development server...');
  
  const ports = [3000, 3001, 3002, 3003, 3004];
  
  for (const port of ports) {
    try {
      execSync(`curl -s http://localhost:${port} > /dev/null`, { timeout: 2000 });
      console.log(`✅ Development server is running on http://localhost:${port}`);
      return port;
    } catch (error) {
      // Continue to next port
    }
  }
  
  console.log('⚠️  Development server not running');
  console.log('💡 Start with: yarn dev');
  return false;
}

// Generate wallet connection test instructions
function generateTestInstructions(port = 3003) {
  console.log('\n📝 Wallet Connection Test Instructions');
  console.log('=====================================');
  
  const instructions = `
1. 🦊 WALLET SETUP:
   - Install Argent X: https://chrome.google.com/webstore/detail/argent-x/dlcobpjiigpikoobohmabehhmhfoodbb
   - Or install Braavos: https://chrome.google.com/webstore/detail/braavos-wallet/jnlgamecbpmbajjfhmmmlhejkemejdma
   - Switch to Starknet Sepolia Testnet
   - Get testnet ETH: https://faucet.starknet.io/

2. 🌐 OPEN APPLICATION:
   - Navigate to: http://localhost:${port}
   - You should see the AccountLend homepage

3. 🔗 CONNECT WALLET:
   - Click "Connect Wallet" button (top-right)
   - Select your wallet (Argent X or Braavos)
   - Approve connection in wallet extension
   - Verify address appears in WalletBar

4. 🔑 TEST SESSION KEY CREATION:
   - Click "Create Session" tab
   - Fill form:
     * Description: "Test Session Key"
     * Price: 0.001
     * Duration: 24 hours
     * Permissions: Transfer, Swap
   - Click "Create Session Key"
   - Approve transaction in wallet
   - Wait for confirmation

5. ✅ VERIFY CREATION:
   - Go to "Manage Keys" tab
   - Check your session key appears
   - Verify status and permissions

6. 🧪 BROWSER CONSOLE TESTING:
   - Press F12 → Console tab
   - Test commands:
     
     // Check wallet connection
     console.log('Account:', window.starknetAccount?.address);
     
     // List session keys
     const keys = window.sessionKeyService?.getAllStoredSessionKeys();
     console.log('Session keys:', keys);
     
     // Test session key validation
     if (keys?.length > 0) {
       const isValid = window.sessionKeyService.validateSessionKey(keys[0]);
       console.log('First key valid:', isValid);
     }

7. 🛒 TEST MARKETPLACE:
   - Go to "Marketplace" tab
   - Browse available session keys
   - Try renting a session key
   - Check "History" tab for transactions

8. 🔍 DEBUGGING:
   - Enable debug mode: localStorage.setItem('debug', 'true')
   - Reload page to see debug logs
   - Check browser console for errors
   - Verify network is Sepolia testnet
`;

  console.log(instructions);
}

// Generate troubleshooting guide
function generateTroubleshooting() {
  console.log('\n🔧 Troubleshooting Guide');
  console.log('=======================');
  
  const troubleshooting = `
COMMON ISSUES:

1. ❌ "No wallet detected"
   → Install Argent X or Braavos wallet extension
   → Refresh the page after installation

2. ❌ "Wrong network"
   → Switch wallet to Starknet Sepolia testnet
   → Check network indicator in wallet

3. ❌ "Insufficient funds"
   → Get testnet ETH from https://faucet.starknet.io/
   → Wait for faucet transaction to confirm

4. ❌ "Transaction failed"
   → Check wallet has enough ETH for gas
   → Verify contract addresses are correct
   → Try again with higher gas limit

5. ❌ "Session key creation failed"
   → Check browser console for errors
   → Verify @argent/x-sessions is installed
   → Try creating with different parameters

6. ❌ "Page won't load"
   → Ensure development server is running (yarn dev)
   → Check for port conflicts (default: 3000)
   → Clear browser cache and reload

DEBUGGING COMMANDS:

// Check wallet status
window.starknet?.isConnected()

// Check network
window.starknet?.provider?.getChainId()

// Check account balance
window.starknetAccount?.getBalance?.()

// Check contract addresses
console.log(window.contractAddresses)

// Enable verbose logging
localStorage.setItem('debug', 'true')
localStorage.setItem('sessionKeyDebug', 'true')
`;

  console.log(troubleshooting);
}

// Main execution
function main() {
  const setupOk = checkProjectSetup();
  const depsOk = checkDependencies();
  const serverPort = checkDevServer();
  
  if (!setupOk || !depsOk) {
    console.log('\n❌ Setup issues detected. Please fix the above issues first.');
    return;
  }
  
  if (!serverPort) {
    console.log('\n⚠️  Development server not running. Starting it now...');
    console.log('💡 Run: yarn dev');
    generateTestInstructions();
  } else {
    generateTestInstructions(serverPort);
  }
  
  generateTroubleshooting();
  
  console.log('\n🎉 Setup complete! Follow the instructions above to test wallet connection.');
  console.log('📖 For detailed guide, see: WALLET_TESTING_GUIDE.md');
  
  if (serverPort) {
    console.log(`\n🌐 Application URL: http://localhost:${serverPort}`);
  }
}

// Run the script
main();
