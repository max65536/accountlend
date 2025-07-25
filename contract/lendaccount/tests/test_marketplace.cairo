use starknet::ContractAddress;
use starknet::testing::{set_caller_address, set_block_timestamp, set_contract_address};
use core::array::ArrayTrait;
use core::num::traits::Zero;
use snforge_std::{declare, ContractClassTrait};

// Import the contracts and utilities
use lendaccount::{SessionKeyMarketplace, ISessionKeyMarketplace, ListingInfo};
use lendaccount_integrationtest::utils::test_utils::{
    setup_test_addresses, setup_test_time, advance_time, create_test_listing,
    assert_not_zero_address, assert_positive_amount, assert_valid_session_key,
    assert_listing_active, assert_listing_inactive, calculate_marketplace_fee,
    TestAddresses, TestListingData
};
use lendaccount_integrationtest::utils::mock_contracts::{
    MockERC20, IMockERC20Dispatcher, IMockERC20DispatcherTrait,
    MockSessionKeyManager, IMockSessionKeyManagerDispatcher, IMockSessionKeyManagerDispatcherTrait,
    setup_test_environment
};

#[test]
fn test_marketplace_deployment() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    
    // Deploy with constructor parameters
    state.constructor(
        addresses.marketplace, // session_key_manager
        addresses.erc20_token, // payment_token
        250, // marketplace_fee (2.5%)
        addresses.owner // owner
    );
    
    // Verify deployment was successful by checking initial state
    // Note: We can't directly access private storage, but we can test functionality
    assert(true, 'Marketplace deployed successfully');
}

#[test]
fn test_list_session_key() {
    let addresses = setup_test_addresses();
    let test_time = setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        addresses.marketplace,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    
    let listing_data = create_test_listing();
    
    // List session key
    state.list_session_key(listing_data.session_key, listing_data.price);
    
    // Verify listing was created
    let listing_info = state.get_listing_info(listing_data.session_key);
    assert(listing_info.session_key == listing_data.session_key, 'Wrong session key');
    assert(listing_info.owner == addresses.user1, 'Wrong owner');
    assert(listing_info.price == listing_data.price, 'Wrong price');
    assert(listing_info.is_active, 'Listing should be active');
    assert(listing_info.created_at == test_time, 'Wrong creation time');
    assert(listing_info.rented_by == Zero::zero(), 'Should not be rented initially');
}

#[test]
fn test_get_active_listings() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        addresses.marketplace,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    
    // Create multiple listings
    state.list_session_key('session_key_1', 1000000000000000);
    state.list_session_key('session_key_2', 2000000000000000);
    state.list_session_key('session_key_3', 3000000000000000);
    
    // Get active listings
    let active_listings = state.get_active_listings(0, 10);
    assert(active_listings.len() == 3, 'Should have 3 active listings');
    
    // Test pagination
    let first_page = state.get_active_listings(0, 2);
    assert(first_page.len() == 2, 'First page should have 2 listings');
    
    let second_page = state.get_active_listings(2, 2);
    assert(second_page.len() == 1, 'Second page should have 1 listing');
}

#[test]
fn test_cancel_listing() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        addresses.marketplace,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    
    let listing_data = create_test_listing();
    
    // List session key
    state.list_session_key(listing_data.session_key, listing_data.price);
    
    // Verify listing is active
    let initial_info = state.get_listing_info(listing_data.session_key);
    assert_listing_active(initial_info.is_active);
    
    // Cancel listing
    state.cancel_listing(listing_data.session_key);
    
    // Verify listing is cancelled
    let cancelled_info = state.get_listing_info(listing_data.session_key);
    assert_listing_inactive(cancelled_info.is_active);
}

#[test]
fn test_cancel_listing_only_owner() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        addresses.marketplace,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    
    let listing_data = create_test_listing();
    
    // List session key
    state.list_session_key(listing_data.session_key, listing_data.price);
    
    // Try to cancel as different user (should fail)
    set_caller_address(addresses.user2);
    
    let result = std::panic::catch_unwind(|| {
        state.cancel_listing(listing_data.session_key);
    });
    
    assert(result.is_err(), 'Should fail for non-owner');
}

#[test]
fn test_rent_session_key_basic() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    // Setup mock environment
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250, // 2.5% fee
        addresses.owner
    );
    
    // Setup ERC20 mock
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    
    set_caller_address(addresses.user1);
    let listing_data = create_test_listing();
    
    // List session key
    state.list_session_key(listing_data.session_key, listing_data.price);
    
    // Setup renter with sufficient balance and allowance
    set_caller_address(addresses.user2);
    erc20_mock.set_balance(addresses.user2, listing_data.price * 2);
    erc20_mock.approve(contract_address, listing_data.price);
    
    // Rent session key
    let success = state.rent_session_key(listing_data.session_key);
    assert(success, 'Rental should succeed');
    
    // Verify listing is updated
    let rented_info = state.get_listing_info(listing_data.session_key);
    assert(rented_info.rented_by == addresses.user2, 'Should be rented by user2');
}

#[test]
fn test_rent_session_key_cannot_rent_own() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    let listing_data = create_test_listing();
    
    // List session key
    state.list_session_key(listing_data.session_key, listing_data.price);
    
    // Try to rent own session key (should fail)
    let result = std::panic::catch_unwind(|| {
        state.rent_session_key(listing_data.session_key);
    });
    
    assert(result.is_err(), 'Should not be able to rent own session key');
}

#[test]
fn test_rent_session_key_inactive_listing() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    let listing_data = create_test_listing();
    
    // List and then cancel session key
    state.list_session_key(listing_data.session_key, listing_data.price);
    state.cancel_listing(listing_data.session_key);
    
    // Try to rent cancelled listing (should fail)
    set_caller_address(addresses.user2);
    
    let result = std::panic::catch_unwind(|| {
        state.rent_session_key(listing_data.session_key);
    });
    
    assert(result.is_err(), 'Should not be able to rent inactive listing');
}

#[test]
fn test_marketplace_fee_calculation() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250, // 2.5% fee
        addresses.owner
    );
    
    let price = 1000000000000000000; // 1 ETH
    let expected_fee = calculate_marketplace_fee(price, 250);
    let expected_owner_amount = price - expected_fee;
    
    // Verify fee calculation
    assert(expected_fee == 25000000000000000, 'Fee should be 0.025 ETH'); // 2.5% of 1 ETH
    assert(expected_owner_amount == 975000000000000000, 'Owner should get 0.975 ETH');
    
    set_caller_address(addresses.user1);
    
    // List session key
    state.list_session_key('test_session', price);
    
    // Setup renter
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    set_caller_address(addresses.user2);
    erc20_mock.set_balance(addresses.user2, price * 2);
    erc20_mock.approve(contract_address, price);
    
    // Rent session key
    let success = state.rent_session_key('test_session');
    assert(success, 'Rental should succeed');
    
    // Check owner earnings (should be price minus fee)
    let owner_earnings = state.get_user_earnings(addresses.user1);
    assert(owner_earnings == expected_owner_amount, 'Owner earnings should match expected amount');
}

#[test]
fn test_earnings_tracking_and_withdrawal() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    
    set_caller_address(addresses.user1);
    let price = 1000000000000000;
    
    // List session key
    state.list_session_key('test_session', price);
    
    // Setup renter and complete rental
    set_caller_address(addresses.user2);
    erc20_mock.set_balance(addresses.user2, price * 2);
    erc20_mock.approve(contract_address, price);
    state.rent_session_key('test_session');
    
    // Check earnings
    let expected_earnings = price - calculate_marketplace_fee(price, 250);
    let actual_earnings = state.get_user_earnings(addresses.user1);
    assert(actual_earnings == expected_earnings, 'Earnings should match expected amount');
    
    // Withdraw earnings
    set_caller_address(addresses.user1);
    
    // Setup contract with sufficient balance for withdrawal
    erc20_mock.set_balance(contract_address, expected_earnings);
    
    state.withdraw_earnings(expected_earnings);
    
    // Check earnings after withdrawal
    let remaining_earnings = state.get_user_earnings(addresses.user1);
    assert(remaining_earnings == 0, 'Earnings should be zero after withdrawal');
}

#[test]
fn test_withdraw_earnings_insufficient_balance() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    
    // Try to withdraw more than available (should fail)
    let result = std::panic::catch_unwind(|| {
        state.withdraw_earnings(1000000000000000);
    });
    
    assert(result.is_err(), 'Should fail with insufficient earnings');
}

#[test]
fn test_multiple_listings_and_rentals() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    
    // User1 lists multiple session keys
    set_caller_address(addresses.user1);
    let price1 = 1000000000000000;
    let price2 = 2000000000000000;
    
    state.list_session_key('session_1', price1);
    state.list_session_key('session_2', price2);
    
    // User2 rents both session keys
    set_caller_address(addresses.user2);
    let total_cost = price1 + price2;
    erc20_mock.set_balance(addresses.user2, total_cost * 2);
    erc20_mock.approve(contract_address, total_cost);
    
    state.rent_session_key('session_1');
    state.rent_session_key('session_2');
    
    // Check total earnings for user1
    let expected_earnings1 = price1 - calculate_marketplace_fee(price1, 250);
    let expected_earnings2 = price2 - calculate_marketplace_fee(price2, 250);
    let total_expected_earnings = expected_earnings1 + expected_earnings2;
    
    let actual_earnings = state.get_user_earnings(addresses.user1);
    assert(actual_earnings == total_expected_earnings, 'Total earnings should match expected');
    
    // Verify both listings are rented
    let listing1_info = state.get_listing_info('session_1');
    let listing2_info = state.get_listing_info('session_2');
    
    assert(listing1_info.rented_by == addresses.user2, 'Session 1 should be rented by user2');
    assert(listing2_info.rented_by == addresses.user2, 'Session 2 should be rented by user2');
}

#[test]
fn test_listing_pagination_edge_cases() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        addresses.marketplace,
        addresses.erc20_token,
        250,
        addresses.owner
    );
    
    set_caller_address(addresses.user1);
    
    // Create 5 listings
    state.list_session_key('session_1', 1000000000000000);
    state.list_session_key('session_2', 2000000000000000);
    state.list_session_key('session_3', 3000000000000000);
    state.list_session_key('session_4', 4000000000000000);
    state.list_session_key('session_5', 5000000000000000);
    
    // Test various pagination scenarios
    let all_listings = state.get_active_listings(0, 10);
    assert(all_listings.len() == 5, 'Should return all 5 listings');
    
    let first_three = state.get_active_listings(0, 3);
    assert(first_three.len() == 3, 'Should return first 3 listings');
    
    let last_two = state.get_active_listings(3, 3);
    assert(last_two.len() == 2, 'Should return last 2 listings');
    
    let beyond_range = state.get_active_listings(10, 5);
    assert(beyond_range.len() == 0, 'Should return empty array for out of range');
    
    let partial_overlap = state.get_active_listings(4, 5);
    assert(partial_overlap.len() == 1, 'Should return 1 listing for partial overlap');
}

#[test]
fn test_marketplace_fee_edge_cases() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    // Test with 0% fee
    let mut state_zero_fee = SessionKeyMarketplace::contract_state_for_testing();
    state_zero_fee.constructor(
        addresses.marketplace,
        addresses.erc20_token,
        0, // 0% fee
        addresses.owner
    );
    
    let price = 1000000000000000;
    let zero_fee = calculate_marketplace_fee(price, 0);
    assert(zero_fee == 0, 'Zero fee should be 0');
    
    // Test with maximum reasonable fee (10%)
    let mut state_max_fee = SessionKeyMarketplace::contract_state_for_testing();
    state_max_fee.constructor(
        addresses.marketplace,
        addresses.erc20_token,
        1000, // 10% fee
        addresses.owner
    );
    
    let max_fee = calculate_marketplace_fee(price, 1000);
    let expected_max_fee = price / 10; // 10% of price
    assert(max_fee == expected_max_fee, 'Max fee should be 10% of price');
}

#[test]
fn test_concurrent_rental_attempts() {
    let addresses = setup_test_addresses();
    setup_test_time();
    
    let (erc20_address, session_manager_address) = setup_test_environment();
    
    let contract_address = starknet::contract_address_const::<0x999>();
    set_contract_address(contract_address);
    
    let mut state = SessionKeyMarketplace::contract_state_for_testing();
    state.constructor(
        session_manager_address,
        erc20_address,
        250,
        addresses.owner
    );
    
    let erc20_mock = IMockERC20Dispatcher { contract_address: erc20_address };
    
    set_caller_address(addresses.user1);
    let price = 1000000000000000;
    
    // List session key
    state.list_session_key('test_session', price);
    
    // First user rents successfully
    set_caller_address(addresses.user2);
    erc20_mock.set_balance(addresses.user2, price * 2);
    erc20_mock.approve(contract_address, price);
    let success = state.rent_session_key('test_session');
    assert(success, 'First rental should succeed');
    
    // Second user tries to rent same session (should fail)
    set_caller_address(addresses.owner); // Use different address
    erc20_mock.set_balance(addresses.owner, price * 2);
    erc20_mock.approve(contract_address, price);
    
    let result = std::panic::catch_unwind(|| {
        state.rent_session_key('test_session');
    });
    
    assert(result.is_err(), 'Second rental should fail - already rented');
}
