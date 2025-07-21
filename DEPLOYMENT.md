# AccountLend Smart Contract Deployment Guide

This guide provides instructions for deploying the AccountLend smart contracts to Starknet.

## Prerequisites

1. **Install Scarb** (Cairo package manager)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
   ```

2. **Install Starknet Foundry** (for deployment)
   ```bash
   curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
   ```

3. **Set up wallet and account**
   - Create a Starknet account on testnet
   - Fund it with testnet ETH from [Starknet Faucet](https://faucet.goerli.starknet.io/)

## Contract Overview

The AccountLend project consists of two main smart contracts:

### 1. SessionKeyManager (`src/lib.cairo`)
- **Purpose**: Manages session key creation, validation, and lifecycle
- **Key Functions**:
  - `create_session_key()`: Creates new session keys with permissions and expiration
  - `validate_session_key()`: Checks if a session key is valid and not expired
  - `revoke_session_key()`: Allows owners to revoke their session keys
  - `get_session_key_info()`: Retrieves session key metadata

### 2. SessionKeyMarketplace (`src/market.cairo`)
- **Purpose**: Handles marketplace operations for trading session keys
- **Key Functions**:
  - `list_session_key()`: Lists a session key for rent
  - `rent_session_key()`: Allows users to rent session keys
  - `withdraw_earnings()`: Enables users to withdraw their earnings
  - `get_active_listings()`: Retrieves available session keys

## Deployment Steps

### Step 1: Build Contracts

```bash
cd contract/lendaccount
scarb build
```

This will generate:
- `target/dev/lendaccount_SessionKeyManager.sierra.json`
- `target/dev/lendaccount_SessionKeyMarketplace.sierra.json`

### Step 2: Declare Contracts

First, declare the SessionKeyManager contract:

```bash
sncast declare \
  --contract-name SessionKeyManager \
  --url https://starknet-testnet.public.blastapi.io \
  --account your_account_name \
  --keystore your_keystore_path
```

Then declare the SessionKeyMarketplace contract:

```bash
sncast declare \
  --contract-name SessionKeyMarketplace \
  --url https://starknet-testnet.public.blastapi.io \
  --account your_account_name \
  --keystore your_keystore_path
```

### Step 3: Deploy SessionKeyManager

```bash
sncast deploy \
  --class-hash <SESSION_KEY_MANAGER_CLASS_HASH> \
  --url https://starknet-testnet.public.blastapi.io \
  --account your_account_name \
  --keystore your_keystore_path
```

### Step 4: Deploy SessionKeyMarketplace

The marketplace contract requires constructor parameters:

```bash
sncast deploy \
  --class-hash <SESSION_KEY_MARKETPLACE_CLASS_HASH> \
  --constructor-calldata <SESSION_KEY_MANAGER_ADDRESS> <ETH_TOKEN_ADDRESS> <MARKETPLACE_FEE> <OWNER_ADDRESS> \
  --url https://starknet-testnet.public.blastapi.io \
  --account your_account_name \
  --keystore your_keystore_path
```

Where:
- `SESSION_KEY_MANAGER_ADDRESS`: Address of the deployed SessionKeyManager
- `ETH_TOKEN_ADDRESS`: `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` (testnet ETH)
- `MARKETPLACE_FEE`: Fee in basis points (e.g., `250` for 2.5%)
- `OWNER_ADDRESS`: Your account address

## Frontend Configuration

After deployment, update the contract addresses in `src/config/contracts.ts`:

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

## Verification

After deployment, verify the contracts are working:

1. **Check contract state**:
   ```bash
   sncast call \
     --contract-address <CONTRACT_ADDRESS> \
     --function get_session_key_info \
     --calldata <SESSION_KEY_ID> \
     --url https://starknet-testnet.public.blastapi.io
   ```

2. **Test frontend integration**:
   - Connect wallet to the application
   - Try creating a session key
   - Verify the transaction appears on [Starkscan Testnet](https://testnet.starkscan.co/)

## Environment Variables

Create a `.env.local` file for environment-specific configuration:

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_SESSION_KEY_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://starknet-testnet.public.blastapi.io
```

## Troubleshooting

### Common Issues

1. **"Scarb not found"**
   - Ensure Scarb is installed and in your PATH
   - Restart your terminal after installation

2. **"Class hash not found"**
   - Make sure you declared the contract before deploying
   - Check the class hash is correct

3. **"Insufficient balance"**
   - Ensure your account has enough testnet ETH
   - Get more from the faucet if needed

4. **"Contract not deployed"**
   - Verify the deployment transaction was successful
   - Check the contract address on Starkscan

### Getting Help

- [Starknet Documentation](https://docs.starknet.io/)
- [Cairo Book](https://book.cairo-lang.org/)
- [Starknet Foundry Book](https://foundry-rs.github.io/starknet-foundry/)

## Security Considerations

Before mainnet deployment:

1. **Audit the contracts** for security vulnerabilities
2. **Test thoroughly** on testnet with various scenarios
3. **Implement emergency pause** mechanisms if needed
4. **Set appropriate marketplace fees** and limits
5. **Consider multi-sig** for contract ownership

## Next Steps

After successful deployment:

1. Update frontend configuration with contract addresses
2. Test all functionality end-to-end
3. Monitor contract interactions and gas usage
4. Gather user feedback and iterate
5. Plan for mainnet deployment

---

*Last Updated: 2025-01-21*
*Status: Ready for Deployment*
