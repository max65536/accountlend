use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResult, cheat_caller_address, cheat_block_timestamp, CheatSpan};
use core::array::ArrayTrait;
use core::num::traits::Zero;

// Import the contracts
use lendaccount::{SessionKeyManager, ISessionKeyManager, SessionKeyInfo};
use lendaccount::{SessionKeyMarketplace, ISessionKeyMarketplace, ListingInfo};

// Basic test addresses
fn get_test_owner() -> ContractAddress {
    starknet::contract_address_const::<0x123>()
}

fn get_test_user1() -> ContractAddress {
    starknet::contract_address_const::<0x456>()
}

fn get_test_user2() -> ContractAddress {
    starknet::contract_address_const::<0x789>()
}

fn get_test_marketplace() -> ContractAddress {
    starknet::contract_address_const::<0xABC>()
}

fn get_test_token() -> ContractAddress {
    starknet::contract_address_const::<0xDEF>()
}

fn setup_test_time() -> u64 {
    let test_time = 1640995200; // 2022-01-01 00:00:00 UTC
    cheat_block_timestamp(starknet::contract_address_const::<0>(), test_time, CheatSpan::TargetCalls(1000));
    test_time
}

fn create_test_permissions() -> Span<felt252> {
    let mut permissions = ArrayTrait::new();
    permissions.append('TRANSFER');
    permissions.append('APPROVE');
    permissions.span()
}

#[test]
fn test_session_key_manager_basic() {
    let test_time = setup_test_time();
    let owner = get_test_owner();
    
    // Deploy SessionKeyManager contract
    let mut state = SessionKeyManager::contract_state_for_testing();
    
    // Set caller as owner
    cheat_caller_address(starknet::contract_address_const::<0>(), owner, CheatSpan::TargetCalls(10));
    
    let permissions = create_test_permissions();
    let duration = 3600_u64; // 1 hour
    let price = 1000000000000000_u256; // 0.001 ETH
    
    // Create session key
    let session_key = state.create_session_key(
        owner,
        duration,
        permissions,
        price
    );
    
    // Verify session key was created
    assert(session_key != 0, 'Session key should not be zero');
    
    // Verify session key info
    let session_info = state.get_session_key_info(session_key);
    assert(session_info.owner == owner, 'Wrong owner');
    assert(session_info.price == price, 'Wrong price');
    assert(session_info.is_active, 'Session should be active');
    assert(session_info.created_at == test_time, 'Wrong creation time');
    assert(session_info.expires_at == test_time + duration, 'Wrong expiry time');
    
    // Test validation
    assert(state.validate_session_key(session_key), 'Session should be valid');
    
    // Test user session count
    assert(state.get_user_session_count(owner) == 1, 'Should have 1 session');
}

#[test]
fn test_session_key_manager_revocation() {
    setup_test_time();
    let owner = get_test_owner();
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    
    cheat_caller_address(starknet::contract_address_const::<0>(), owner, CheatSpan::TargetCalls(10));
    
    let permissions = create_test_permissions();
    let session_key = state.create_session_key(
        owner,
        3600,
        permissions,
        1000000000000000
    );
    
    // Initially should be valid
    assert(state.validate_session_key(session_key), 'Session should be valid');
    
    // Revoke session key
    state.revoke_session_key(session_key);
    
    // Should no longer be valid
    assert(!state.validate_session_key(session_key), 'Revoked session invalid');
    
    // Check session info
    let session_info = state.get_session_key_info(session_key);
    assert(!session_info.is_active, 'Revoked session inactive');
}

#[test]
fn test_marketplace_basic() {
    let test_time = setup_test_time();
    let owner = get_test_owner();
    let user1 = get_test_user1();
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    
    // Initialize marketplace
    let session_manager = get_test_marketplace();
    let token = get_test_token();
    let fee = 250_u256; // 2.5%
    
    cheat_caller_address(starknet::contract_address_const::<0>(), user1, CheatSpan::TargetCalls(10));
    
    let session_key = 'test_session_key_123';
    let price = 2000000000000000_u256; // 0.002 ETH
    
    // List session key
    state.list_session_key(session_key, price);
    
    // Verify listing was created
    let listing_info = state.get_listing_info(session_key);
    assert(listing_info.session_key == session_key, 'Wrong session key');
    assert(listing_info.owner == user1, 'Wrong owner');
    assert(listing_info.price == price, 'Wrong price');
    assert(listing_info.is_active, 'Listing should be active');
    assert(listing_info.created_at == test_time, 'Wrong creation time');
    assert(listing_info.rented_by == Zero::zero(), 'Should not be rented initially');
}

#[test]
fn test_marketplace_cancel_listing() {
    setup_test_time();
    let user1 = get_test_user1();
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    
    cheat_caller_address(starknet::contract_address_const::<0>(), user1, CheatSpan::TargetCalls(10));
    
    let session_key = 'test_session_key_123';
    let price = 2000000000000000_u256;
    
    // List session key
    state.list_session_key(session_key, price);
    
    // Verify listing is active
    let initial_info = state.get_listing_info(session_key);
    assert(initial_info.is_active, 'Listing should be active');
    
    // Cancel listing
    state.cancel_listing(session_key);
    
    // Verify listing is cancelled
    let cancelled_info = state.get_listing_info(session_key);
    assert(!cancelled_info.is_active, 'Listing should be inactive');
}

#[test]
fn test_marketplace_get_active_listings() {
    setup_test_time();
    let user1 = get_test_user1();
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    
    cheat_caller_address(starknet::contract_address_const::<0>(), user1, CheatSpan::TargetCalls(10));
    
    // Create multiple listings
    state.list_session_key('session_key_1', 1000000000000000);
    state.list_session_key('session_key_2', 2000000000000000);
    state.list_session_key('session_key_3', 3000000000000000);
    
    // Get active listings
    let active_listings = state.get_active_listings(0, 10);
    assert(active_listings.len() == 3, 'Should have 3 active listings');
    
    // Test pagination
    let first_page = state.get_active_listings(0, 2);
    assert(first_page.len() == 2, 'First page has 2 listings');
    
    let second_page = state.get_active_listings(2, 2);
    assert(second_page.len() == 1, 'Second page has 1 listing');
}

#[test]
fn test_session_key_expiration() {
    setup_test_time();
    let owner = get_test_owner();
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    
    cheat_caller_address(starknet::contract_address_const::<0>(), owner, CheatSpan::TargetCalls(10));
    
    let permissions = create_test_permissions();
    let duration = 3600_u64; // 1 hour
    
    let session_key = state.create_session_key(
        owner,
        duration,
        permissions,
        1000000000000000
    );
    
    // Initially should not be expired
    assert(!state.is_session_expired(session_key), 'Session should not be expired');
    
    // Advance time beyond expiration
    cheat_block_timestamp(starknet::contract_address_const::<0>(), 1640995200 + duration + 1, CheatSpan::TargetCalls(10));
    
    // Now should be expired
    assert(state.is_session_expired(session_key), 'Session should be expired');
    
    // Validation should fail for expired session
    assert(!state.validate_session_key(session_key), 'Expired session invalid');
}

#[test]
fn test_multiple_users_session_keys() {
    setup_test_time();
    let user1 = get_test_user1();
    let user2 = get_test_user2();
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    
    let permissions = create_test_permissions();
    let duration = 3600_u64;
    let price = 1000000000000000_u256;
    
    // Create session key for user1
    cheat_caller_address(starknet::contract_address_const::<0>(), user1, CheatSpan::TargetCalls(1));
    let session_key1 = state.create_session_key(
        user1,
        duration,
        permissions,
        price
    );
    
    // Create session key for user2
    cheat_caller_address(starknet::contract_address_const::<0>(), user2, CheatSpan::TargetCalls(1));
    let session_key2 = state.create_session_key(
        user2,
        duration,
        permissions,
        price
    );
    
    // Verify each user has their own session keys
    assert(state.get_user_session_count(user1) == 1, 'User1 should have 1 session');
    assert(state.get_user_session_count(user2) == 1, 'User2 should have 1 session');
    
    let user1_sessions = state.get_user_session_keys(user1);
    let user2_sessions = state.get_user_session_keys(user2);
    
    assert(*user1_sessions.at(0) == session_key1, 'User1 session key mismatch');
    assert(*user2_sessions.at(0) == session_key2, 'User2 session key mismatch');
}
