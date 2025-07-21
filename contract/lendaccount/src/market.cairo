use starknet::ContractAddress;

#[starknet::interface]
trait ISessionKeyMarketplace<TContractState> {
    fn list_session_key(
        ref self: TContractState,
        session_key: felt252,
        price: u256
    );
    
    fn rent_session_key(
        ref self: TContractState,
        session_key: felt252
    ) -> bool;
    
    fn cancel_listing(
        ref self: TContractState,
        session_key: felt252
    );
    
    fn get_listing_info(
        self: @TContractState,
        session_key: felt252
    ) -> ListingInfo;
    
    fn get_active_listings(
        self: @TContractState,
        offset: u32,
        limit: u32
    ) -> Array<felt252>;
    
    fn withdraw_earnings(
        ref self: TContractState,
        amount: u256
    );
    
    fn get_user_earnings(
        self: @TContractState,
        user: ContractAddress
    ) -> u256;
}

#[derive(Drop, Serde, starknet::Store)]
struct ListingInfo {
    session_key: felt252,
    owner: ContractAddress,
    price: u256,
    is_active: bool,
    created_at: u64,
    rented_by: ContractAddress,
    rented_at: u64,
}

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

#[starknet::contract]
mod SessionKeyMarketplace {
    use super::{ISessionKeyMarketplace, ListingInfo, IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use core::array::ArrayTrait;

    #[storage]
    struct Storage {
        // Core marketplace data
        listings: LegacyMap<felt252, ListingInfo>,
        active_listings: LegacyMap<u32, felt252>,
        active_listings_count: u32,
        
        // User earnings tracking
        user_earnings: LegacyMap<ContractAddress, u256>,
        
        // Contract configuration
        session_key_manager: ContractAddress,
        payment_token: ContractAddress, // ETH token address
        marketplace_fee: u256, // Fee percentage (basis points, e.g., 250 = 2.5%)
        
        // Admin
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SessionKeyListed: SessionKeyListed,
        SessionKeyRented: SessionKeyRented,
        ListingCancelled: ListingCancelled,
        EarningsWithdrawn: EarningsWithdrawn,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionKeyListed {
        session_key: felt252,
        owner: ContractAddress,
        price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionKeyRented {
        session_key: felt252,
        owner: ContractAddress,
        renter: ContractAddress,
        price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct ListingCancelled {
        session_key: felt252,
        owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct EarningsWithdrawn {
        user: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        session_key_manager: ContractAddress,
        payment_token: ContractAddress,
        marketplace_fee: u256,
        owner: ContractAddress
    ) {
        self.session_key_manager.write(session_key_manager);
        self.payment_token.write(payment_token);
        self.marketplace_fee.write(marketplace_fee);
        self.owner.write(owner);
        self.active_listings_count.write(0);
    }

    #[abi(embed_v0)]
    impl SessionKeyMarketplaceImpl of ISessionKeyMarketplace<ContractState> {
        fn list_session_key(
            ref self: ContractState,
            session_key: felt252,
            price: u256
        ) {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            
            // Verify the caller owns the session key
            // This would require calling the session key manager contract
            // For now, we'll assume validation is done
            
            let listing = ListingInfo {
                session_key,
                owner: caller,
                price,
                is_active: true,
                created_at: current_time,
                rented_by: starknet::contract_address_const::<0>(),
                rented_at: 0,
            };
            
            self.listings.write(session_key, listing);
            
            // Add to active listings
            let count = self.active_listings_count.read();
            self.active_listings.write(count, session_key);
            self.active_listings_count.write(count + 1);
            
            self.emit(SessionKeyListed {
                session_key,
                owner: caller,
                price,
            });
        }

        fn rent_session_key(
            ref self: ContractState,
            session_key: felt252
        ) -> bool {
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            let mut listing = self.listings.read(session_key);
            
            assert(listing.is_active, 'Listing not active');
            assert(listing.owner != caller, 'Cannot rent own session key');
            assert(listing.rented_by.is_zero(), 'Already rented');
            
            let payment_token = IERC20Dispatcher { 
                contract_address: self.payment_token.read() 
            };
            
            // Calculate fees
            let marketplace_fee = self.marketplace_fee.read();
            let fee_amount = (listing.price * marketplace_fee) / 10000; // basis points
            let owner_amount = listing.price - fee_amount;
            
            // Transfer payment from renter to contract
            let success = payment_token.transfer_from(
                caller,
                get_contract_address(),
                listing.price
            );
            assert(success, 'Payment transfer failed');
            
            // Update listing
            listing.rented_by = caller;
            listing.rented_at = current_time;
            self.listings.write(session_key, listing);
            
            // Add to owner's earnings
            let current_earnings = self.user_earnings.read(listing.owner);
            self.user_earnings.write(listing.owner, current_earnings + owner_amount);
            
            self.emit(SessionKeyRented {
                session_key,
                owner: listing.owner,
                renter: caller,
                price: listing.price,
            });
            
            true
        }

        fn cancel_listing(
            ref self: ContractState,
            session_key: felt252
        ) {
            let caller = get_caller_address();
            let mut listing = self.listings.read(session_key);
            
            assert(listing.owner == caller, 'Not listing owner');
            assert(listing.is_active, 'Listing not active');
            assert(listing.rented_by.is_zero(), 'Cannot cancel rented session');
            
            listing.is_active = false;
            self.listings.write(session_key, listing);
            
            self.emit(ListingCancelled {
                session_key,
                owner: caller,
            });
        }

        fn get_listing_info(
            self: @ContractState,
            session_key: felt252
        ) -> ListingInfo {
            self.listings.read(session_key)
        }

        fn get_active_listings(
            self: @ContractState,
            offset: u32,
            limit: u32
        ) -> Array<felt252> {
            let mut listings = ArrayTrait::new();
            let total_count = self.active_listings_count.read();
            let end = if offset + limit > total_count { total_count } else { offset + limit };
            
            let mut i = offset;
            while i < end {
                let session_key = self.active_listings.read(i);
                let listing = self.listings.read(session_key);
                
                if listing.is_active && listing.rented_by.is_zero() {
                    listings.append(session_key);
                }
                
                i += 1;
            };
            
            listings
        }

        fn withdraw_earnings(
            ref self: ContractState,
            amount: u256
        ) {
            let caller = get_caller_address();
            let current_earnings = self.user_earnings.read(caller);
            
            assert(amount <= current_earnings, 'Insufficient earnings');
            
            let payment_token = IERC20Dispatcher { 
                contract_address: self.payment_token.read() 
            };
            
            // Update earnings
            self.user_earnings.write(caller, current_earnings - amount);
            
            // Transfer tokens
            let success = payment_token.transfer(caller, amount);
            assert(success, 'Withdrawal failed');
            
            self.emit(EarningsWithdrawn {
                user: caller,
                amount,
            });
        }

        fn get_user_earnings(
            self: @ContractState,
            user: ContractAddress
        ) -> u256 {
            self.user_earnings.read(user)
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _only_owner(self: @ContractState) {
            let caller = get_caller_address();
            let owner = self.owner.read();
            assert(caller == owner, 'Only owner');
        }

        fn _update_marketplace_fee(ref self: ContractState, new_fee: u256) {
            self._only_owner();
            assert(new_fee <= 1000, 'Fee too high'); // Max 10%
            self.marketplace_fee.write(new_fee);
        }
    }
}
