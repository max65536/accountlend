# Contract Enhancement Proposal: Multi-Currency Support

## Current Issue
The current contracts only support a single payment token (ETH) and don't store currency information per listing.

## Required Changes

### 1. SessionKeyManager Contract Changes

Add currency field to SessionKeyInfo:
```cairo
#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct SessionKeyInfo {
    pub owner: ContractAddress,
    pub created_at: u64,
    pub expires_at: u64,
    pub permissions_hash: felt252,
    pub price: u256,
    pub currency_token: ContractAddress, // NEW: Token contract address (ETH or STRK)
    pub is_active: bool,
    pub rented_by: ContractAddress,
}
```

Update create_session_key functions:
```cairo
fn create_session_key_with_listing(
    ref self: TContractState,
    owner: ContractAddress,
    duration: u64,
    permissions: Span<felt252>,
    price: u256,
    currency_token: ContractAddress, // NEW: ETH or STRK token address
    list_immediately: bool
) -> felt252;
```

### 2. SessionKeyMarketplace Contract Changes

Add currency field to ListingInfo:
```cairo
#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct ListingInfo {
    pub session_key: felt252,
    pub owner: ContractAddress,
    pub price: u256,
    pub currency_token: ContractAddress, // NEW: Token contract address
    pub is_active: bool,
    pub created_at: u64,
    pub rented_by: ContractAddress,
    pub rented_at: u64,
}
```

Add supported tokens storage:
```cairo
#[storage]
struct Storage {
    // ... existing fields ...
    supported_tokens: Map<ContractAddress, bool>, // ETH and STRK addresses
    token_symbols: Map<ContractAddress, felt252>, // 'ETH' or 'STRK'
}
```

Update listing functions:
```cairo
fn list_session_key_for_owner(
    ref self: TContractState,
    session_key: felt252,
    owner: ContractAddress,
    price: u256,
    currency_token: ContractAddress // NEW: Currency token address
);
```

## Implementation Flow

1. **Lender creates session key**: Specifies price and currency (ETH or STRK token address)
2. **Contract stores**: Both price and currency token address
3. **Marketplace lists**: Records both price and currency information
4. **Frontend reads**: Gets currency from contract and displays appropriately
5. **Renter pays**: Uses the specified currency token for payment

## Frontend Changes Required

1. Update interfaces to include `currency_token: ContractAddress`
2. Map token addresses to currency symbols ('ETH' | 'STRK')
3. Read currency information from contract instead of detecting it
4. Update UI to show correct currency based on contract data
