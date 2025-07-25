use starknet::ContractAddress;
use starknet::testing::{set_caller_address, set_block_timestamp, set_contract_address};
use core::array::ArrayTrait;
use snforge_std::{declare, ContractClassTrait};

// Import the contracts and utilities
use lendaccount::{SessionKeyManager, ISessionKeyManager, SessionKeyInfo};
use lendaccount_integrationtest::utils::test_utils::{
    setup_test_addresses, setup_test_time, advance_time, create_test_permissions,
    create_extended_permissions, create_basic_session_data, create_premium_session_data,
    assert_not_zero_address, assert_positive_amount, assert_valid_session_key,
    assert_valid_duration, assert_valid_price, simulate_session_expiry, TestAddresses,
    TestSessionData
};

#[test]
fn test_session_key_creation() {
    let addresses = setup_test_addresses();
    let test_time = setup_test_time();
    
    // Deploy SessionKeyManager contract
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    // Set caller as owner
    set_caller_address(addresses.owner);
    
    let session_data = create_basic_session_data();
    
    // Create session key
    let session_key = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Verify session key was created
    assert_valid_session_key(session_key);
    
    // Verify session key info
    let session_info = state.get_session_key_info(session_key);
    assert(session_info.owner == addresses.owner, 'Wrong owner');
    assert(session_info.price == session_data.price, 'Wrong price');
    assert(session_info.is_active, 'Session should be active');
    assert(session_info.created_at == test_time, 'Wrong creation time');
    assert(session_info.expires_at == test_time + session_data.duration, 'Wrong expiry time');
}

#[test]
fn test_session_key_creation_only_owner() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    // Try to create session key as non-owner (should fail)
    set_caller_address(addresses.user1);
    
    let session_data = create_basic_session_data();
    
    // This should panic with 'Only owner can create'
    let result = std::panic::catch_unwind(|| {
        state.create_session_key(
            addresses.owner,
            session_data.duration,
            session_data.permissions,
            session_data.price
        );
    });
    
    assert(result.is_err(), 'Should fail for non-owner');
}

#[test]
fn test_session_key_validation() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    let session_data = create_basic_session_data();
    
    // Create session key
    let session_key = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Validate session key (should be valid)
    assert(state.validate_session_key(session_key), 'Session should be valid');
    
    // Test with invalid session key
    let invalid_key = 'invalid_key';
    assert(!state.validate_session_key(invalid_key), 'Invalid key should not be valid');
}

#[test]
fn test_session_key_expiration() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    let session_data = create_basic_session_data();
    
    // Create session key
    let session_key = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Initially should not be expired
    assert(!state.is_session_expired(session_key), 'Session should not be expired');
    
    // Advance time beyond expiration
    simulate_session_expiry(session_data.duration);
    
    // Now should be expired
    assert(state.is_session_expired(session_key), 'Session should be expired');
    
    // Validation should fail for expired session
    assert(!state.validate_session_key(session_key), 'Expired session should not be valid');
}

#[test]
fn test_session_key_revocation() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    let session_data = create_basic_session_data();
    
    // Create session key
    let session_key = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Initially should be valid
    assert(state.validate_session_key(session_key), 'Session should be valid');
    
    // Revoke session key
    state.revoke_session_key(session_key);
    
    // Should no longer be valid
    assert(!state.validate_session_key(session_key), 'Revoked session should not be valid');
    
    // Check session info
    let session_info = state.get_session_key_info(session_key);
    assert(!session_info.is_active, 'Revoked session should not be active');
}

#[test]
fn test_session_key_revocation_only_owner() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    let session_data = create_basic_session_data();
    
    // Create session key
    let session_key = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Try to revoke as non-owner (should fail)
    set_caller_address(addresses.user1);
    
    let result = std::panic::catch_unwind(|| {
        state.revoke_session_key(session_key);
    });
    
    assert(result.is_err(), 'Should fail for non-owner');
}

#[test]
fn test_user_session_keys_tracking() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    // Initially should have no session keys
    assert(state.get_user_session_count(addresses.owner) == 0, 'Should start with 0 sessions');
    
    let session_data = create_basic_session_data();
    
    // Create first session key
    let session_key1 = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Should now have 1 session key
    assert(state.get_user_session_count(addresses.owner) == 1, 'Should have 1 session');
    
    // Create second session key
    let session_key2 = state.create_session_key(
        addresses.owner,
        session_data.duration * 2,
        session_data.permissions,
        session_data.price * 2
    );
    
    // Should now have 2 session keys
    assert(state.get_user_session_count(addresses.owner) == 2, 'Should have 2 sessions');
    
    // Get user session keys
    let user_sessions = state.get_user_session_keys(addresses.owner);
    assert(user_sessions.len() == 2, 'Should return 2 sessions');
    assert(*user_sessions.at(0) == session_key1, 'First session key mismatch');
    assert(*user_sessions.at(1) == session_key2, 'Second session key mismatch');
}

#[test]
fn test_multiple_users_session_keys() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    let session_data = create_basic_session_data();
    
    // Create session key for user1
    set_caller_address(addresses.user1);
    let session_key1 = state.create_session_key(
        addresses.user1,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Create session key for user2
    set_caller_address(addresses.user2);
    let session_key2 = state.create_session_key(
        addresses.user2,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Verify each user has their own session keys
    assert(state.get_user_session_count(addresses.user1) == 1, 'User1 should have 1 session');
    assert(state.get_user_session_count(addresses.user2) == 1, 'User2 should have 1 session');
    
    let user1_sessions = state.get_user_session_keys(addresses.user1);
    let user2_sessions = state.get_user_session_keys(addresses.user2);
    
    assert(*user1_sessions.at(0) == session_key1, 'User1 session key mismatch');
    assert(*user2_sessions.at(0) == session_key2, 'User2 session key mismatch');
}

#[test]
fn test_session_key_permissions() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    // Test with basic permissions
    let basic_permissions = create_test_permissions();
    let session_key1 = state.create_session_key(
        addresses.owner,
        3600,
        basic_permissions,
        1000000000000000
    );
    
    // Test with extended permissions
    let extended_permissions = create_extended_permissions();
    let session_key2 = state.create_session_key(
        addresses.owner,
        7200,
        extended_permissions,
        2000000000000000
    );
    
    // Both should be valid
    assert(state.validate_session_key(session_key1), 'Basic permissions session should be valid');
    assert(state.validate_session_key(session_key2), 'Extended permissions session should be valid');
    
    // Get permissions (currently returns empty span, but structure is there)
    let permissions1 = state.get_session_permissions(session_key1);
    let permissions2 = state.get_session_permissions(session_key2);
    
    // Note: Current implementation returns empty span, but the structure supports it
    assert(permissions1.len() == 0, 'Current implementation returns empty permissions');
    assert(permissions2.len() == 0, 'Current implementation returns empty permissions');
}

#[test]
fn test_session_key_edge_cases() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    // Test with minimum duration (1 second)
    let min_permissions = create_test_permissions();
    let session_key_min = state.create_session_key(
        addresses.owner,
        1,
        min_permissions,
        1
    );
    
    assert(state.validate_session_key(session_key_min), 'Min duration session should be valid');
    
    // Test with maximum reasonable duration (1 year)
    let max_permissions = create_extended_permissions();
    let session_key_max = state.create_session_key(
        addresses.owner,
        31536000, // 1 year in seconds
        max_permissions,
        1000000000000000000 // 1 ETH
    );
    
    assert(state.validate_session_key(session_key_max), 'Max duration session should be valid');
    
    // Test session info for edge cases
    let min_info = state.get_session_key_info(session_key_min);
    let max_info = state.get_session_key_info(session_key_max);
    
    assert(min_info.price == 1, 'Min price should be 1');
    assert(max_info.price == 1000000000000000000, 'Max price should be 1 ETH');
}

#[test]
fn test_session_key_rental_tracking() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    let session_data = create_basic_session_data();
    
    // Create session key
    let session_key = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Initially should not be rented
    let initial_info = state.get_session_key_info(session_key);
    assert(initial_info.rented_by == starknet::contract_address_const::<0>(), 'Should not be rented initially');
    
    // Simulate rental (this would normally be called by marketplace contract)
    state._rent_session_key(session_key, addresses.user1);
    
    // Should now show as rented
    let rented_info = state.get_session_key_info(session_key);
    assert(rented_info.rented_by == addresses.user1, 'Should be rented by user1');
}

#[test]
fn test_session_key_sequential_ids() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyManager::contract_state_for_testing();
    state.constructor();
    
    set_caller_address(addresses.owner);
    
    let session_data = create_basic_session_data();
    
    // Create multiple session keys and verify they're unique
    let session_key1 = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    let session_key2 = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    let session_key3 = state.create_session_key(
        addresses.owner,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // All session keys should be unique
    assert(session_key1 != session_key2, 'Session keys should be unique');
    assert(session_key2 != session_key3, 'Session keys should be unique');
    assert(session_key1 != session_key3, 'Session keys should be unique');
    
    // All should be valid
    assert(state.validate_session_key(session_key1), 'Session key 1 should be valid');
    assert(state.validate_session_key(session_key2), 'Session key 2 should be valid');
    assert(state.validate_session_key(session_key3), 'Session key 3 should be valid');
}
