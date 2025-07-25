use starknet::ContractAddress;
use starknet::testing::{set_caller_address, set_block_timestamp, set_contract_address};
use core::array::ArrayTrait;
use core::num::traits::Zero;

// Import the contracts and utilities
use lendaccount::session_key_manager::{
    SessionKeyManager, ISessionKeyManagerDispatcher, ISessionKeyManagerDispatcherTrait,
    SessionKeyInfo
};
use lendaccount::marketplace::{
    SessionKeyMarketplace, ISessionKeyMarketplaceDispatcher, ISessionKeyMarketplaceDispatcherTrait,
    ListingInfo
};
use super::utils::test_utils::{
    setup_test_addresses, setup_test_time, advance_time, create_test_permissions,
    create_basic_session_data, create_premium_session_data, simulate_session_expiry,
    calculate_marketplace_fee, TestAddresses, TestSessionData
};
use super::utils::mock_contracts::{
    MockERC20, IMockERC20Dispatcher, IMockERC20DispatcherTrait,
    setup_test_environment
};

#[test]
fn test_end_to_end_session_creation_and_listing() {
    let addresses = setup_test_addresses();
    let test_time = setup_test_time();
    
    // Deploy SessionKeyManager
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    // Deploy Marketplace
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        addresses.erc20_token,
        250, // 2.5% fee
        addresses.owner
    );
    
    // User creates session key
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let session_data = create_basic_session_data();
    let session_key = session_manager_state.create_session_key(
        addresses.user1,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Verify session key was created
    let session_info = session_manager_state.get_session_key_info(session_key);
    assert(session_info.owner == addresses.user1, 'Wrong session owner');
    assert(session_info.is_active, 'Session should be active');
    
    // User lists session key on marketplace
    set_contract_address(marketplace_address);
    marketplace_state.list_session_key(session_key, session_data.price);
    
    // Verify listing was created
    let listing_info = marketplace_state.get_listing_info(session_key);
    assert(listing_info.session_key == session_key, 'Wrong session key in listing');
    assert(listing_info.owner == addresses.user1, 'Wrong listing owner');
    assert(listing_info.price == session_data.price, 'Wrong listing price');
    assert(listing_info.is_active, 'Listing should be active');
}

#[test]
fn test_end_to_end_rental_flow() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    // Setup mock ERC20
    let (erc20_address, _) = setup_test_environment();
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    
    // Deploy SessionKeyManager
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    // Deploy Marketplace
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    // User1 creates and lists session key
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let session_data = create_basic_session_data();
    let session_key = session_manager_state.create_session_key(
        addresses.user1,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    set_contract_address(marketplace_address);
    marketplace_state.list_session_key(session_key, session_data.price);
    
    // User2 rents the session key
    set_caller_address(addresses.user2);
    erc20_mock.set_balance(addresses.user2, session_data.price * 2);
    erc20_mock.approve(marketplace_address, session_data.price);
    
    let rental_success = marketplace_state.rent_session_key(session_key);
    assert(rental_success, 'Rental should succeed');
    
    // Verify rental in marketplace
    let listing_info = marketplace_state.get_listing_info(session_key);
    assert(listing_info.rented_by == addresses.user2, 'Should be rented by user2');
    
    // Verify earnings for user1
    let expected_earnings = session_data.price - calculate_marketplace_fee(session_data.price, 250);
    let actual_earnings = marketplace_state.get_user_earnings(addresses.user1);
    assert(actual_earnings == expected_earnings, 'Earnings should match expected amount');
    
    // Verify session key is still valid in session manager
    set_contract_address(session_manager_address);
    assert(session_manager_state.validate_session_key(session_key), 'Session should still be valid');
}

#[test]
fn test_session_expiration_affects_marketplace() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    // Deploy SessionKeyManager
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    // Deploy Marketplace
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    // Create session key with short duration
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let short_duration = 60; // 1 minute
    let session_key = session_manager_state.create_session_key(
        addresses.user1,
        short_duration,
        create_test_permissions(),
        1000000000000000
    );
    
    // List on marketplace
    set_contract_address(marketplace_address);
    marketplace_state.list_session_key(session_key, 1000000000000000);
    
    // Initially session should be valid
    set_contract_address(session_manager_address);
    assert(session_manager_state.validate_session_key(session_key), 'Session should be valid initially');
    
    // Advance time beyond expiration
    simulate_session_expiry(short_duration);
    
    // Session should now be expired
    assert(session_manager_state.is_session_expired(session_key), 'Session should be expired');
    assert(!session_manager_state.validate_session_key(session_key), 'Expired session should not be valid');
    
    // Marketplace listing should still exist but session is expired
    set_contract_address(marketplace_address);
    let listing_info = marketplace_state.get_listing_info(session_key);
    assert(listing_info.is_active, 'Listing should still be active');
    // Note: In a real implementation, marketplace might check session validity before allowing rentals
}

#[test]
fn test_session_revocation_affects_marketplace() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    // Deploy SessionKeyManager
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    // Deploy Marketplace
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    // Create and list session key
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let session_data = create_basic_session_data();
    let session_key = session_manager_state.create_session_key(
        addresses.user1,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    set_contract_address(marketplace_address);
    marketplace_state.list_session_key(session_key, session_data.price);
    
    // Revoke session key
    set_contract_address(session_manager_address);
    session_manager_state.revoke_session_key(session_key);
    
    // Verify session is revoked
    assert(!session_manager_state.validate_session_key(session_key), 'Revoked session should not be valid');
    let session_info = session_manager_state.get_session_key_info(session_key);
    assert(!session_info.is_active, 'Revoked session should not be active');
    
    // Cancel marketplace listing (owner should be able to cancel)
    set_contract_address(marketplace_address);
    marketplace_state.cancel_listing(session_key);
    
    let listing_info = marketplace_state.get_listing_info(session_key);
    assert(!listing_info.is_active, 'Listing should be cancelled');
}

#[test]
fn test_multiple_users_complex_scenario() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    // Setup mock ERC20
    let (erc20_address, _) = setup_test_environment();
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    
    // Deploy contracts
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    // User1 creates multiple session keys
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let basic_data = create_basic_session_data();
    let premium_data = create_premium_session_data();
    
    let session_key1 = session_manager_state.create_session_key(
        addresses.user1,
        basic_data.duration,
        basic_data.permissions,
        basic_data.price
    );
    
    let session_key2 = session_manager_state.create_session_key(
        addresses.user1,
        premium_data.duration,
        premium_data.permissions,
        premium_data.price
    );
    
    // User2 creates one session key
    set_caller_address(addresses.user2);
    let session_key3 = session_manager_state.create_session_key(
        addresses.user2,
        basic_data.duration,
        basic_data.permissions,
        basic_data.price
    );
    
    // List all session keys on marketplace
    set_contract_address(marketplace_address);
    
    set_caller_address(addresses.user1);
    marketplace_state.list_session_key(session_key1, basic_data.price);
    marketplace_state.list_session_key(session_key2, premium_data.price);
    
    set_caller_address(addresses.user2);
    marketplace_state.list_session_key(session_key3, basic_data.price);
    
    // Verify active listings
    let active_listings = marketplace_state.get_active_listings(0, 10);
    assert(active_listings.len() == 3, 'Should have 3 active listings');
    
    // Owner rents user1's premium session key
    set_caller_address(addresses.owner);
    erc20_mock.set_balance(addresses.owner, premium_data.price * 2);
    erc20_mock.approve(marketplace_address, premium_data.price);
    
    let rental_success = marketplace_state.rent_session_key(session_key2);
    assert(rental_success, 'Premium session rental should succeed');
    
    // Verify user1's earnings
    let expected_earnings = premium_data.price - calculate_marketplace_fee(premium_data.price, 250);
    let user1_earnings = marketplace_state.get_user_earnings(addresses.user1);
    assert(user1_earnings == expected_earnings, 'User1 earnings should match expected');
    
    // User2 cancels their listing
    set_caller_address(addresses.user2);
    marketplace_state.cancel_listing(session_key3);
    
    // Verify active listings count decreased
    let updated_active_listings = marketplace_state.get_active_listings(0, 10);
    assert(updated_active_listings.len() == 2, 'Should have 2 active listings after cancellation');
    
    // Verify session key counts in session manager
    set_contract_address(session_manager_address);
    assert(session_manager_state.get_user_session_count(addresses.user1) == 2, 'User1 should have 2 sessions');
    assert(session_manager_state.get_user_session_count(addresses.user2) == 1, 'User2 should have 1 session');
}

#[test]
fn test_earnings_withdrawal_integration() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    // Setup mock ERC20
    let (erc20_address, _) = setup_test_environment();
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    
    // Deploy contracts
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    // Create and list session key
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let session_data = create_premium_session_data();
    let session_key = session_manager_state.create_session_key(
        addresses.user1,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    set_contract_address(marketplace_address);
    marketplace_state.list_session_key(session_key, session_data.price);
    
    // Rent session key
    set_caller_address(addresses.user2);
    erc20_mock.set_balance(addresses.user2, session_data.price * 2);
    erc20_mock.approve(marketplace_address, session_data.price);
    marketplace_state.rent_session_key(session_key);
    
    // Calculate expected earnings
    let expected_earnings = session_data.price - calculate_marketplace_fee(session_data.price, 250);
    
    // Verify earnings
    let actual_earnings = marketplace_state.get_user_earnings(addresses.user1);
    assert(actual_earnings == expected_earnings, 'Earnings should match expected');
    
    // Setup marketplace contract with sufficient balance for withdrawal
    erc20_mock.set_balance(marketplace_address, expected_earnings);
    
    // Get initial balance of user1
    let initial_balance = erc20_mock.balance_of(addresses.user1);
    
    // Withdraw earnings
    set_caller_address(addresses.user1);
    marketplace_state.withdraw_earnings(expected_earnings);
    
    // Verify withdrawal
    let final_balance = erc20_mock.balance_of(addresses.user1);
    assert(final_balance == initial_balance + expected_earnings, 'Balance should increase by earnings amount');
    
    let remaining_earnings = marketplace_state.get_user_earnings(addresses.user1);
    assert(remaining_earnings == 0, 'Earnings should be zero after withdrawal');
}

#[test]
fn test_session_key_lifecycle_integration() {
    let addresses = setup_test_addresses();
    let test_time = setup_test_time();
    
    // Deploy contracts
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    // Phase 1: Creation
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let session_data = create_basic_session_data();
    let session_key = session_manager_state.create_session_key(
        addresses.user1,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // Verify creation
    let session_info = session_manager_state.get_session_key_info(session_key);
    assert(session_info.is_active, 'Session should be active after creation');
    assert(session_info.created_at == test_time, 'Creation time should match');
    
    // Phase 2: Listing
    set_contract_address(marketplace_address);
    marketplace_state.list_session_key(session_key, session_data.price);
    
    let listing_info = marketplace_state.get_listing_info(session_key);
    assert(listing_info.is_active, 'Listing should be active');
    assert(listing_info.rented_by == Zero::zero(), 'Should not be rented initially');
    
    // Phase 3: Rental (simulated with internal function)
    set_contract_address(session_manager_address);
    session_manager_state._rent_session_key(session_key, addresses.user2);
    
    let updated_session_info = session_manager_state.get_session_key_info(session_key);
    assert(updated_session_info.rented_by == addresses.user2, 'Should be rented by user2');
    
    // Phase 4: Expiration
    simulate_session_expiry(session_data.duration);
    
    assert(session_manager_state.is_session_expired(session_key), 'Session should be expired');
    assert(!session_manager_state.validate_session_key(session_key), 'Expired session should not be valid');
    
    // Phase 5: Cleanup (cancel listing)
    set_caller_address(addresses.user1);
    set_contract_address(marketplace_address);
    marketplace_state.cancel_listing(session_key);
    
    let final_listing_info = marketplace_state.get_listing_info(session_key);
    assert(!final_listing_info.is_active, 'Listing should be cancelled');
}

#[test]
fn test_cross_contract_validation() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    // Deploy contracts
    let session_manager_address = starknet::contract_address_const::<0x888>();
    set_contract_address(session_manager_address);
    let mut session_manager_state = SessionKeyManager::contract_state_for_testing();
    session_manager_state.constructor();
    
    let marketplace_address = starknet::contract_address_const::<0x999>();
    set_contract_address(marketplace_address);
    let mut marketplace_state = SessionKeyMarketplace::contract_state_for_testing();
    marketplace_state.constructor(
        session_manager_address,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    // Create session key
    set_caller_address(addresses.user1);
    set_contract_address(session_manager_address);
    
    let session_data = create_basic_session_data();
    let session_key = session_manager_state.create_session_key(
        addresses.user1,
        session_data.duration,
        session_data.permissions,
        session_data.price
    );
    
    // List on marketplace
    set_contract_address(marketplace_address);
    marketplace_state.list_session_key(session_key, session_data.price);
    
    // Verify consistency between contracts
    set_contract_address(session_manager_address);
    let session_info = session_manager_state.get_session_key_info(session_key);
    
    set_contract_address(marketplace_address);
    let listing_info = marketplace_state.get_listing_info(session_key);
    
    // Both should reference the same session key
    assert(session_info.owner == listing_info.owner, 'Owners should match across contracts');
    assert(session_info.price == listing_info.price, 'Prices should match across contracts');
    assert(session_info.is_active && listing_info.is_active, 'Both should be active');
    
    // Test with non-existent session key
    let fake_session_key = 'fake_session_key_123';
    
    set_contract_address(session_manager_address);
    assert(!session_manager_state.validate_session_key(fake_session_key), 'Fake session should not be valid');
    
    set_contract_address(marketplace_address);
    let fake_listing_info = marketplace_state.get_listing_info(fake_session_key);
    assert(!fake_listing_info.is_active, 'Fake listing should not be active');
    assert(fake_listing_info.owner == Zero::zero(), 'Fake listing should have zero owner');
}
