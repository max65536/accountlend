# Session Key Creation Testing Guide

This guide explains how to test the session key creation functionality in the AccountLend project.

## 🧪 Testing Approaches

### 1. Manual Testing with Real Wallets (Recommended)

#### Prerequisites:
- Install Argent X or Braavos wallet browser extension
- Get testnet STRK tokens from [Starknet Faucet](https://faucet.starknet.io/)
- Connect to Starknet Sepolia testnet

#### Steps:
1. **Start the development server:**
   ```bash
   yarn dev
   ```

2. **Open the application:**
   - Navigate to http://localhost:3001
   - The application should load with the AccountLend homepage

3. **Connect your wallet:**
   - Click on "argentX" or "braavos" button in the top right
   - Follow the wallet connection prompts
   - Ensure you're on Starknet Sepolia testnet

4. **Navigate to Create Session:**
   - Click on the "Create Session" tab
   - You should see the SessionKeyCreator form

5. **Fill out the session key form:**
   - **Description**: Enter a description (e.g., "Test DeFi trading session")
   - **Price**: Set a price in ETH (e.g., "0.001")
   - **Duration**: Select duration (e.g., "24 Hours")
   - **Permissions**: Select permissions (e.g., "Transfer Tokens", "Token Swaps")

6. **Create the session key:**
   - Click "Create Session Key" button
   - The system will attempt to create a real session key using @argent/x-sessions
   - If successful, you'll see a success message
   - If it falls back to mock mode, you'll see a demo message

7. **Verify creation:**
   - Go to "Manage Keys" tab
   - You should see your created session key listed
   - Check the statistics (Total Keys, Active, etc.)

8. **Test session key management:**
   - Try copying the session key ID
   - Try exporting the session key
   - Try revoking the session key (if desired)

### 2. Browser Console Testing

#### Steps:
1. **Open browser developer tools** (F12)
2. **Navigate to the Console tab**
3. **Test SessionKeyService directly:**

```javascript
// Access the session key service (when wallet is connected)
const mockAccount = {
  address: '0x1234567890abcdef1234567890abcdef12345678'
};

// Test session key creation
async function testSessionKey() {
  try {
    // Import the service (this works in the browser context)
    const { sessionKeyService } = await import('./src/services/sessionKeyService.js');
    
    // Create a test session key
    const sessionKey = await sessionKeyService.createSessionKey(
      mockAccount,
      24, // 24 hours
      ['transfer', 'swap'], // permissions
      '0.001', // price
      'Browser console test session key'
    );
    
    console.log('✅ Session key created:', sessionKey);
    
    // Test validation
    const isValid = await sessionKeyService.validateSessionKey(sessionKey);
    console.log('✅ Session key valid:', isValid);
    
    // Get statistics
    const stats = sessionKeyService.getSessionKeyStats(mockAccount.address);
    console.log('✅ Statistics:', stats);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSessionKey();
```

### 3. Component Testing in Browser

#### Steps:
1. **Open the application** in browser
2. **Open browser developer tools**
3. **Go to React DevTools** (if installed)
4. **Find SessionKeyCreator component**
5. **Inspect component state and props**
6. **Test form interactions:**
   - Change duration selections
   - Toggle permission checkboxes
   - Modify price input
   - Enter description text

### 4. Network Testing

#### Monitor Network Requests:
1. **Open browser developer tools**
2. **Go to Network tab**
3. **Attempt to create a session key**
4. **Monitor for:**
   - Starknet RPC calls
   - Contract interactions
   - Transaction submissions

## 🔍 What to Look For

### ✅ Success Indicators:
- **Form Validation**: All form fields validate correctly
- **Session Creation**: Session key object is created with proper structure
- **Local Storage**: Session key is stored in browser localStorage
- **UI Updates**: Success messages and state updates work
- **Statistics**: Session key statistics update correctly
- **Export/Import**: Session key can be exported and imported

### ❌ Potential Issues:
- **Wallet Connection**: Wallet not connecting properly
- **Network Issues**: RPC calls failing
- **@argent/x-sessions**: Library integration issues
- **Form Validation**: Invalid inputs not caught
- **Storage Issues**: localStorage not working

## 🛠️ Debugging Tips

### 1. Check Console Logs:
```javascript
// Enable detailed logging
localStorage.setItem('debug', 'accountlend:*');
```

### 2. Inspect Session Key Structure:
```javascript
// Check stored session keys
const address = 'YOUR_WALLET_ADDRESS';
const keys = JSON.parse(localStorage.getItem(`sessionKeys_${address}`) || '[]');
console.log('Stored session keys:', keys);
```

### 3. Test Individual Functions:
```javascript
// Test policy creation
const { sessionKeyService } = await import('./src/services/sessionKeyService.js');
const policies = sessionKeyService.createPoliciesFromPermissions(['transfer', 'swap']);
console.log('Generated policies:', policies);
```

### 4. Monitor Service Health:
```javascript
// Check service initialization
console.log('SessionKeyService:', sessionKeyService);
console.log('Provider:', sessionKeyService.provider);
```

## 📋 Test Checklist

### Basic Functionality:
- [ ] Form loads correctly
- [ ] All input fields work
- [ ] Validation messages appear for invalid inputs
- [ ] Duration selection works
- [ ] Permission checkboxes work
- [ ] Price input accepts valid values

### Session Key Creation:
- [ ] Session key object is created
- [ ] Unique ID is generated
- [ ] Expiration time is calculated correctly
- [ ] Permissions are mapped to policies
- [ ] Session key is stored locally

### @argent/x-sessions Integration:
- [ ] Real session creation attempted
- [ ] Fallback to mock works if real creation fails
- [ ] Session validation works
- [ ] Session account creation works (if applicable)

### UI/UX:
- [ ] Loading states show during creation
- [ ] Success/error messages display
- [ ] Form resets after successful creation
- [ ] Statistics update correctly

### Advanced Features:
- [ ] Session key export works
- [ ] Session key import works
- [ ] Batch creation works
- [ ] Session key revocation works

## 🚀 Production Testing

### With Real Wallets:
1. **Test with Argent X wallet**
2. **Test with Braavos wallet**
3. **Test on Starknet Sepolia testnet**
4. **Test session key usage in transactions**
5. **Test session key expiration**
6. **Test session key revocation**

### Performance Testing:
1. **Create multiple session keys**
2. **Test with large numbers of stored keys**
3. **Test export/import with large data**
4. **Monitor memory usage**
5. **Test concurrent operations**

## 📝 Expected Results

### Successful Session Key Creation:
```json
{
  "id": "session_1642857600000_abc123def",
  "description": "Test DeFi trading session",
  "permissions": ["transfer", "swap"],
  "duration": 24,
  "price": "0.001",
  "createdAt": 1642857600000,
  "expiresAt": 1642944000000,
  "status": "active",
  "owner": "0x1234...5678",
  "sessionData": {
    "key": "0xabcd...ef01",
    "policies": [
      {
        "contractAddress": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        "selector": "transfer"
      }
    ],
    "signedSession": {
      // Argent X Sessions data (if real creation succeeds)
    }
  }
}
```

This comprehensive testing approach ensures that the session key creation functionality works correctly across all scenarios and integration points.
