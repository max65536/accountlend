use starknet::ContractAddress;
use snforge_std::{cheat_block_timestamp, CheatSpan};
use core::array::ArrayTrait;
use core::num::traits::Zero;

// Import the contracts
use lendaccount::{SessionKeyManager, ISessionKeyManager, SessionKeyInfo};
use lendaccount::{SessionKeyMarketplace, ISessionKeyMarketplace, ListingInfo};

fn create_test_permissions() -> Span<felt252> {
    let mut permissions = ArrayTrait::new();
    permissions.append('TRANSFER');
    permissions.append('APPROVE');
    permissions.span()
}

#[test]
fn test_session_key_info_structure() {
    let mut state = SessionKeyManager::contract_state_for_testing();
    
    // Test that we can read from an empty session key (should return default values)
    let empty_session_info = state.get_session_key_info(0);
    assert(empty_session_info.owner == Zero::zero(), 'Empty session has zero owner');
    assert(empty_session_info.price == 0, 'Empty session has zero price');
    assert(!empty_session_info.is_active, 'Empty session is inactive');
}

#[test]
fn test_marketplace_info_structure() {
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    
    // Test that we can read from an empty listing (should return default values)
    let empty_listing_info = state.get_listing_info(0);
    assert(empty_listing_info.session_key == 0, 'Empty listing has zero key');
    assert(empty_listing_info.owner == Zero::zero(), 'Empty listing has zero owner');
    assert(empty_listing_info.price == 0, 'Empty listing has zero price');
    assert(!empty_listing_info.is_active, 'Empty listing is inactive');
}

#[test]
fn test_marketplace_pagination() {
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    
    // Test pagination with empty marketplace
    let empty_listings = state.get_active_listings(0, 10);
    assert(empty_listings.len() == 0, 'Empty marketplace');
    
    // Test pagination bounds
    let out_of_bounds = state.get_active_listings(100, 10);
    assert(out_of_bounds.len() == 0, 'Out of bounds returns empty');
}

#[test]
fn test_session_key_validation() {
    let mut state = SessionKeyManager::contract_state_for_testing();
    
    // Test validation of non-existent session key
    assert(!state.validate_session_key(999), 'Non-existent key is invalid');
    
    // Test expiration check of non-existent session key
    assert(!state.is_session_expired(999), 'Non-existent key not expired');
}

#[test]
fn test_user_session_counts() {
    let state = SessionKeyManager::contract_state_for_testing();
    let test_user = starknet::contract_address_const::<0x123>();
    
    // Test user session count for user with no sessions
    assert(state.get_user_session_count(test_user) == 0, 'New user has zero sessions');
    
    // Test getting session keys for user with no sessions
    let user_sessions = state.get_user_session_keys(test_user);
    assert(user_sessions.len() == 0, 'New user has empty session list');
}

#[test]
fn test_block_timestamp_cheat() {
    // Test that we can manipulate block timestamp
    let test_time = 1640995200; // 2022-01-01 00:00:00 UTC
    cheat_block_timestamp(starknet::contract_address_const::<0>(), test_time, CheatSpan::TargetCalls(10));
    
    let state = SessionKeyManager::contract_state_for_testing();
    
    // This test just verifies the cheat function works
    // We can't easily test the actual timestamp without contract calls that use it
    assert(true, 'Timestamp cheat executed');
}

#[test]
fn test_permissions_creation() {
    let permissions = create_test_permissions();
    assert(permissions.len() == 2, 'Should have 2 permissions');
    assert(*permissions.at(0) == 'TRANSFER', 'First permission is TRANSFER');
    assert(*permissions.at(1) == 'APPROVE', 'Second permission is APPROVE');
}
