#!/bin/bash

# AccountLend Smart Contract Deployment Script
# This script deploys the SessionKeyManager and SessionKeyMarketplace contracts to Starknet testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="sepolia"
ACCOUNT_NAME="accountlend_deployer"
ACCOUNT_ADDRESS="0x0452183071ba5cb3fe2691ffa5541915262b15dc8cdbce3ac5175344f31f8b31"
ETH_TOKEN_ADDRESS="0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"  # ETH on Sepolia
MARKETPLACE_FEE="250"  # 2.5% in basis points

echo -e "${BLUE}=== AccountLend Smart Contract Deployment ===${NC}"
echo -e "${BLUE}Network: ${NETWORK}${NC}"
echo -e "${BLUE}Account: ${ACCOUNT_NAME} (${ACCOUNT_ADDRESS})${NC}"
echo ""

# Check if PATH includes local bin
export PATH="$HOME/.local/bin:$PATH"

# Check if tools are available
echo -e "${YELLOW}Checking deployment tools...${NC}"
if ! command -v scarb &> /dev/null; then
    echo -e "${RED}Error: scarb not found. Please install Scarb first.${NC}"
    exit 1
fi

if ! command -v sncast &> /dev/null; then
    echo -e "${RED}Error: sncast not found. Please install Starknet Foundry first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All tools available${NC}"

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
cd contract/lendaccount
scarb build
cd ../..
echo -e "${GREEN}✓ Contracts built successfully${NC}"

# Check account status
echo -e "${YELLOW}Checking account status...${NC}"
sncast account list

# Check if account is deployed
echo -e "${YELLOW}Checking if account is deployed...${NC}"
ACCOUNT_STATUS=$(sncast account list | grep $ACCOUNT_NAME | grep -o "deployed\|not deployed" || echo "not deployed")

if [ "$ACCOUNT_STATUS" = "not deployed" ]; then
    echo -e "${RED}Account is not deployed yet.${NC}"
    echo -e "${YELLOW}Please fund the account with testnet STRK tokens:${NC}"
    echo -e "${BLUE}Account Address: ${ACCOUNT_ADDRESS}${NC}"
    echo -e "${BLUE}Faucet: https://faucet.starknet.io/${NC}"
    echo -e "${BLUE}Required: ~0.003 STRK tokens${NC}"
    echo ""
    read -p "Press Enter after funding the account to continue deployment..."
    
    echo -e "${YELLOW}Deploying account...${NC}"
    sncast account deploy --network $NETWORK --name $ACCOUNT_NAME
    echo -e "${GREEN}✓ Account deployed successfully${NC}"
else
    echo -e "${GREEN}✓ Account already deployed${NC}"
fi

# Change to contract directory for sncast commands
cd contract/lendaccount

# Declare SessionKeyManager contract
echo -e "${YELLOW}Declaring SessionKeyManager contract...${NC}"
SESSION_MANAGER_DECLARE_RESULT=$(sncast declare \
    --contract-name SessionKeyManager \
    --network $NETWORK)

SESSION_MANAGER_CLASS_HASH=$(echo "$SESSION_MANAGER_DECLARE_RESULT" | grep -o "0x[0-9a-fA-F]*" | head -1)
echo -e "${GREEN}✓ SessionKeyManager declared with class hash: ${SESSION_MANAGER_CLASS_HASH}${NC}"

# Wait for declaration to be processed
echo -e "${YELLOW}Waiting for declaration to be processed...${NC}"
sleep 30

# Verify declaration was successful
echo -e "${YELLOW}Verifying SessionKeyManager declaration...${NC}"
sncast call \
    --contract-address 0x1 \
    --function get_class_hash_at \
    --calldata $SESSION_MANAGER_CLASS_HASH \
    --network $NETWORK || echo "Declaration still processing..."

# Deploy SessionKeyManager contract (with placeholder marketplace address)
echo -e "${YELLOW}Deploying SessionKeyManager contract...${NC}"
PLACEHOLDER_ADDRESS="0x0000000000000000000000000000000000000000000000000000000000000000"
SESSION_MANAGER_DEPLOY_RESULT=$(sncast deploy \
    --class-hash $SESSION_MANAGER_CLASS_HASH \
    --constructor-calldata $PLACEHOLDER_ADDRESS $ACCOUNT_ADDRESS \
    --network $NETWORK)

SESSION_MANAGER_ADDRESS=$(echo "$SESSION_MANAGER_DEPLOY_RESULT" | grep -o "0x[0-9a-fA-F]*" | head -1)
echo -e "${GREEN}✓ SessionKeyManager deployed at: ${SESSION_MANAGER_ADDRESS}${NC}"

# Declare SessionKeyMarketplace contract
echo -e "${YELLOW}Declaring SessionKeyMarketplace contract...${NC}"
MARKETPLACE_DECLARE_RESULT=$(sncast declare \
    --contract-name SessionKeyMarketplace \
    --network $NETWORK)

MARKETPLACE_CLASS_HASH=$(echo "$MARKETPLACE_DECLARE_RESULT" | grep -o "0x[0-9a-fA-F]*" | head -1)
echo -e "${GREEN}✓ SessionKeyMarketplace declared with class hash: ${MARKETPLACE_CLASS_HASH}${NC}"

# Deploy SessionKeyMarketplace contract with constructor parameters
echo -e "${YELLOW}Deploying SessionKeyMarketplace contract...${NC}"
MARKETPLACE_DEPLOY_RESULT=$(sncast deploy \
    --class-hash $MARKETPLACE_CLASS_HASH \
    --constructor-calldata $SESSION_MANAGER_ADDRESS $ETH_TOKEN_ADDRESS $MARKETPLACE_FEE $ACCOUNT_ADDRESS \
    --network $NETWORK)

MARKETPLACE_ADDRESS=$(echo "$MARKETPLACE_DEPLOY_RESULT" | grep -o "0x[0-9a-fA-F]*" | head -1)
echo -e "${GREEN}✓ SessionKeyMarketplace deployed at: ${MARKETPLACE_ADDRESS}${NC}"

# Update SessionKeyManager with the correct marketplace address
echo -e "${YELLOW}Updating SessionKeyManager with marketplace address...${NC}"
sncast invoke \
    --contract-address $SESSION_MANAGER_ADDRESS \
    --function set_marketplace_address \
    --calldata $MARKETPLACE_ADDRESS \
    --network $NETWORK

echo -e "${GREEN}✓ SessionKeyManager updated with marketplace address${NC}"

# Return to root directory
cd ../..

# Update frontend configuration
echo -e "${YELLOW}Updating frontend configuration...${NC}"
cat > src/config/deployed_contracts.ts << EOF
// Auto-generated deployment configuration
// Generated on: $(date)

export const DEPLOYED_CONTRACTS = {
  sepolia: {
    SESSION_KEY_MANAGER: "${SESSION_MANAGER_ADDRESS}",
    MARKETPLACE: "${MARKETPLACE_ADDRESS}",
    ETH_TOKEN: "${ETH_TOKEN_ADDRESS}",
  }
};

export const DEPLOYMENT_INFO = {
  network: "${NETWORK}",
  deployer: "${ACCOUNT_ADDRESS}",
  deployedAt: "$(date -Iseconds)",
  sessionManagerClassHash: "${SESSION_MANAGER_CLASS_HASH}",
  marketplaceClassHash: "${MARKETPLACE_CLASS_HASH}",
};
EOF

echo -e "${GREEN}✓ Frontend configuration updated${NC}"

# Summary
echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo -e "${GREEN}SessionKeyManager: ${SESSION_MANAGER_ADDRESS}${NC}"
echo -e "${GREEN}SessionKeyMarketplace: ${MARKETPLACE_ADDRESS}${NC}"
echo ""
echo -e "${BLUE}View contracts on Starkscan:${NC}"
echo -e "${BLUE}SessionKeyManager: https://sepolia.starkscan.co/contract/${SESSION_MANAGER_ADDRESS}${NC}"
echo -e "${BLUE}SessionKeyMarketplace: https://sepolia.starkscan.co/contract/${MARKETPLACE_ADDRESS}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update src/config/contracts.ts with the new addresses"
echo -e "2. Test contract interactions from the frontend"
echo -e "3. Verify contracts are working correctly"
echo ""
echo -e "${GREEN}Deployment script completed successfully!${NC}"
