# AccountLend Smart Contract Deployment Guide

This guide provides step-by-step instructions for deploying the AccountLend smart contracts to Starknet testnet.

## Prerequisites

### 1. Development Tools
All required tools have been installed:
- ✅ **Scarb** (Cairo package manager) - v2.11.4
- ✅ **Starknet Foundry** (sncast/snforge) - v0.46.0

### 2. Smart Contracts
All contracts have been compiled successfully:
- ✅ **SessionKeyManager** - Session key creation and management
- ✅ **SessionKeyMarketplace** - Trading and rental marketplace

### 3. Deployment Account
A Starknet testnet account has been created:
- **Account Name**: `accountlend_deployer`
- **Address**: `0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31`
- **Network**: Starknet Sepolia Testnet
- **Status**: Created but needs funding

## Deployment Process

### Step 1: Fund the Deployment Account

Before deploying, you need to fund the account with testnet STRK tokens:

1. **Visit the Starknet Faucet**: https://faucet.starknet.io/
2. **Enter the account address**: `0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31`
3. **Request STRK tokens** (minimum 0.003 STRK needed for deployment)
4. **Wait for confirmation** (usually takes 1-2 minutes)

### Step 2: Run the Deployment Script

We've created an automated deployment script that handles the entire process:

```bash
# Make sure you're in the project root directory
cd /home/liang/projects/accountlend

# Run the deployment script
./deploy.sh
```

The script will:
1. ✅ Check that all tools are available
2. ✅ Build the contracts using Scarb
3. ✅ Verify account funding and deploy if needed
4. ✅ Declare both contracts on Starknet
5. ✅ Deploy SessionKeyManager contract
6. ✅ Deploy SessionKeyMarketplace contract with proper parameters
7. ✅ Update frontend configuration automatically
8. ✅ Provide contract addresses and verification links

### Step 3: Manual Deployment (Alternative)

If you prefer to deploy manually, follow these commands:

```bash
# Set up environment
export PATH="$HOME/.local/bin:$PATH"

# Build contracts
cd contract/lendaccount
scarb build
cd ../..

# Deploy account (if not already deployed)
sncast account deploy --network sepolia --name accountlend_deployer

# Declare SessionKeyManager
sncast declare --contract-name SessionKeyManager --network sepolia --account accountlend_deployer

# Deploy SessionKeyManager (replace CLASS_HASH with output from declare)
sncast deploy --class-hash <SESSION_MANAGER_CLASS_HASH> --network sepolia --account accountlend_deployer

# Declare SessionKeyMarketplace
sncast declare --contract-name SessionKeyMarketplace --network sepolia --account accountlend_deployer

# Deploy SessionKeyMarketplace (replace CLASS_HASH and addresses)
sncast deploy \
  --class-hash <MARKETPLACE_CLASS_HASH> \
  --constructor-calldata <SESSION_MANAGER_ADDRESS> 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 250 0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31 \
  --network sepolia \
  --account accountlend_deployer
```

## Contract Configuration

### SessionKeyManager
- **Purpose**: Manages session key lifecycle (creation, validation, revocation)
- **Constructor**: No parameters required
- **Key Functions**:
  - `create_session_key()` - Create new session keys
  - `validate_session_key()` - Check if session key is valid
  - `revoke_session_key()` - Revoke existing session keys

### SessionKeyMarketplace
- **Purpose**: Handles marketplace operations for trading session keys
- **Constructor Parameters**:
  1. `session_key_manager` - Address of SessionKeyManager contract
  2. `payment_token` - ETH token address (`0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`)
  3. `marketplace_fee` - Fee in basis points (`250` = 2.5%)
  4. `owner` - Deployer address for admin functions
- **Key Functions**:
  - `list_session_key()` - List session keys for rent
  - `rent_session_key()` - Rent available session keys
  - `withdraw_earnings()` - Withdraw rental earnings

## Post-Deployment Steps

### 1. Update Frontend Configuration

After successful deployment, update `src/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  testnet: {
    ACCOUNT_MARKET: "0x<MARKETPLACE_CONTRACT_ADDRESS>",
    SESSION_KEY_MANAGER: "0x<SESSION_KEY_MANAGER_ADDRESS>",
    ERC20_ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  },
  // ...
};
```

### 2. Verify Deployment

Check that contracts are deployed correctly:

1. **Visit Starkscan**: https://sepolia.starkscan.co/
2. **Search for contract addresses**
3. **Verify contract code and transactions**
4. **Test basic contract calls**

### 3. Test Frontend Integration

1. **Start the development server**:
   ```bash
   yarn dev
   ```

2. **Connect a wallet** (Argent or Braavos)

3. **Test contract interactions**:
   - Create a session key
   - List it on the marketplace
   - Verify transactions on Starkscan

## Troubleshooting

### Common Issues

1. **"Account not funded"**
   - Solution: Visit faucet and request more STRK tokens
   - Wait a few minutes for tokens to arrive

2. **"Class hash not found"**
   - Solution: Make sure `declare` command completed successfully
   - Check the class hash in the output

3. **"RPC connection failed"**
   - Solution: Try different RPC endpoints
   - Check internet connection

4. **"Contract deployment failed"**
   - Solution: Verify account has sufficient balance
   - Check constructor parameters are correct

### Getting Help

- **Starknet Documentation**: https://docs.starknet.io/
- **Cairo Book**: https://book.cairo-lang.org/
- **Starknet Foundry**: https://foundry-rs.github.io/starknet-foundry/
- **Project Issues**: https://github.com/max65536/accountlend/issues

## Network Information

### Starknet Sepolia Testnet
- **Chain ID**: `0x534e5f5345504f4c4941` (SN_SEPOLIA)
- **RPC URL**: `https://starknet-sepolia.public.blastapi.io`
- **Explorer**: https://sepolia.starkscan.co/
- **Faucet**: https://faucet.starknet.io/

### Token Addresses
- **ETH**: `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`
- **STRK**: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`

## Security Considerations

### Before Mainnet Deployment
1. **Audit contracts** for security vulnerabilities
2. **Test thoroughly** on testnet with various scenarios
3. **Implement emergency pause** mechanisms if needed
4. **Set appropriate marketplace fees** and limits
5. **Consider multi-sig** for contract ownership

### Best Practices
- Always test on testnet first
- Keep private keys secure
- Use hardware wallets for mainnet
- Monitor contract interactions
- Have emergency procedures ready

---

**Last Updated**: January 21, 2025
**Status**: Ready for Deployment
**Next Step**: Fund account and run `./deploy.sh`
