use starknet::ContractAddress;

#[starknet::interface]
trait ISessionKeyManager<TContractState> {
    fn create_session_key(
        ref self: TContractState,
        owner: ContractAddress,
        duration: u64,
        permissions: Array<felt252>,
        price: u256
    ) -> felt252;
    
    fn validate_session_key(self: @TContractState, session_key: felt252) -> bool;
    
    fn revoke_session_key(ref self: TContractState, session_key: felt252);
    
    fn get_session_key_info(self: @TContractState, session_key: felt252) -> SessionKeyInfo;
    
    fn is_session_expired(self: @TContractState, session_key: felt252) -> bool;
    
    fn get_session_permissions(self: @TContractState, session_key: felt252) -> Array<felt252>;
}

#[derive(Drop, Serde, starknet::Store)]
struct SessionKeyInfo {
    owner: ContractAddress,
    created_at: u64,
    expires_at: u64,
    permissions: Array<felt252>,
    price: u256,
    is_active: bool,
    rented_by: ContractAddress,
}

#[starknet::contract]
mod SessionKeyManager {
    use super::{ISessionKeyManager, SessionKeyInfo};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use core::pedersen::pedersen;
    use core::array::ArrayTrait;

    #[storage]
    struct Storage {
        session_keys: LegacyMap<felt252, SessionKeyInfo>,
        owner_session_count: LegacyMap<ContractAddress, u32>,
        next_session_id: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SessionKeyCreated: SessionKeyCreated,
        SessionKeyRevoked: SessionKeyRevoked,
        SessionKeyRented: SessionKeyRented,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionKeyCreated {
        session_key: felt252,
        owner: ContractAddress,
        duration: u64,
        price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionKeyRevoked {
        session_key: felt252,
        owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct SessionKeyRented {
        session_key: felt252,
        renter: ContractAddress,
        owner: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.next_session_id.write(1);
    }

    #[abi(embed_v0)]
    impl SessionKeyManagerImpl of ISessionKeyManager<ContractState> {
        fn create_session_key(
            ref self: ContractState,
            owner: ContractAddress,
            duration: u64,
            permissions: Array<felt252>,
            price: u256
        ) -> felt252 {
            let caller = get_caller_address();
            assert(caller == owner, 'Only owner can create session key');
            
            let current_time = get_block_timestamp();
            let expires_at = current_time + duration;
            let session_id = self.next_session_id.read();
            
            // Generate unique session key using pedersen hash
            let session_key = pedersen(session_id, owner.into());
            
            let session_info = SessionKeyInfo {
                owner,
                created_at: current_time,
                expires_at,
                permissions,
                price,
                is_active: true,
                rented_by: starknet::contract_address_const::<0>(),
            };
            
            self.session_keys.write(session_key, session_info);
            self.next_session_id.write(session_id + 1);
            
            // Update owner's session count
            let current_count = self.owner_session_count.read(owner);
            self.owner_session_count.write(owner, current_count + 1);
            
            self.emit(SessionKeyCreated {
                session_key,
                owner,
                duration,
                price,
            });
            
            session_key
        }

        fn validate_session_key(self: @ContractState, session_key: felt252) -> bool {
            let session_info = self.session_keys.read(session_key);
            let current_time = get_block_timestamp();
            
            session_info.is_active && current_time <= session_info.expires_at
        }

        fn revoke_session_key(ref self: ContractState, session_key: felt252) {
            let caller = get_caller_address();
            let mut session_info = self.session_keys.read(session_key);
            
            assert(caller == session_info.owner, 'Only owner can revoke');
            assert(session_info.is_active, 'Session key not active');
            
            session_info.is_active = false;
            self.session_keys.write(session_key, session_info);
            
            self.emit(SessionKeyRevoked {
                session_key,
                owner: session_info.owner,
            });
        }

        fn get_session_key_info(self: @ContractState, session_key: felt252) -> SessionKeyInfo {
            self.session_keys.read(session_key)
        }

        fn is_session_expired(self: @ContractState, session_key: felt252) -> bool {
            let session_info = self.session_keys.read(session_key);
            let current_time = get_block_timestamp();
            
            current_time > session_info.expires_at
        }

        fn get_session_permissions(self: @ContractState, session_key: felt252) -> Array<felt252> {
            let session_info = self.session_keys.read(session_key);
            session_info.permissions
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _rent_session_key(ref self: ContractState, session_key: felt252, renter: ContractAddress) {
            let mut session_info = self.session_keys.read(session_key);
            assert(session_info.is_active, 'Session key not active');
            assert(self.validate_session_key(session_key), 'Session key expired');
            
            session_info.rented_by = renter;
            self.session_keys.write(session_key, session_info);
            
            self.emit(SessionKeyRented {
                session_key,
                renter,
                owner: session_info.owner,
            });
        }
    }
}
