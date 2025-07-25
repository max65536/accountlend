use starknet::ContractAddress;

#[starknet::interface]
pub trait ISessionKeyManager<TContractState> {
    fn create_session_key(
        ref self: TContractState,
        owner: ContractAddress,
        duration: u64,
        permissions: Span<felt252>,
        price: u256
    ) -> felt252;
    
    fn validate_session_key(self: @TContractState, session_key: felt252) -> bool;
    
    fn revoke_session_key(ref self: TContractState, session_key: felt252);
    
    fn get_session_key_info(self: @TContractState, session_key: felt252) -> SessionKeyInfo;
    
    fn is_session_expired(self: @TContractState, session_key: felt252) -> bool;
    
    fn get_session_permissions(self: @TContractState, session_key: felt252) -> Span<felt252>;
    
    fn get_user_session_keys(self: @TContractState, user: ContractAddress) -> Span<felt252>;
    
    fn get_user_session_count(self: @TContractState, user: ContractAddress) -> u32;
}

#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct SessionKeyInfo {
    pub owner: ContractAddress,
    pub created_at: u64,
    pub expires_at: u64,
    pub permissions_hash: felt252,
    pub price: u256,
    pub is_active: bool,
    pub rented_by: ContractAddress,
}

#[starknet::contract]
pub mod SessionKeyManager {
    use super::{ISessionKeyManager, SessionKeyInfo};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use core::pedersen::pedersen;
    use core::array::ArrayTrait;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        session_keys: Map<felt252, SessionKeyInfo>,
        owner_session_count: Map<ContractAddress, u32>,
        owner_sessions: Map<(ContractAddress, u32), felt252>,
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
            permissions: Span<felt252>,
            price: u256
        ) -> felt252 {
            let caller = get_caller_address();
            assert(caller == owner, 'Only owner can create');
            
            let current_time = get_block_timestamp();
            let expires_at = current_time + duration;
            let session_id = self.next_session_id.read();
            
            // Generate unique session key using pedersen hash
            let session_key = pedersen(session_id, owner.into());
            
            // Hash permissions for storage
            let permissions_hash = pedersen(session_key, permissions.len().into());
            
            let session_info = SessionKeyInfo {
                owner,
                created_at: current_time,
                expires_at,
                permissions_hash,
                price,
                is_active: true,
                rented_by: starknet::contract_address_const::<0>(),
            };
            
            self.session_keys.write(session_key, session_info);
            self.next_session_id.write(session_id + 1);
            
            // Update owner's session count and store session mapping
            let current_count = self.owner_session_count.read(owner);
            self.owner_sessions.write((owner, current_count), session_key);
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
            let session_info = self.session_keys.read(session_key);
            
            assert(caller == session_info.owner, 'Only owner can revoke');
            assert(session_info.is_active, 'Session key not active');
            
            let updated_info = SessionKeyInfo {
                owner: session_info.owner,
                created_at: session_info.created_at,
                expires_at: session_info.expires_at,
                permissions_hash: session_info.permissions_hash,
                price: session_info.price,
                is_active: false,
                rented_by: session_info.rented_by,
            };
            
            self.session_keys.write(session_key, updated_info);
            
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

        fn get_session_permissions(self: @ContractState, session_key: felt252) -> Span<felt252> {
            // For now, return empty span. In a real implementation, 
            // permissions would be stored differently or reconstructed
            array![].span()
        }

        fn get_user_session_keys(self: @ContractState, user: ContractAddress) -> Span<felt252> {
            let mut session_keys = ArrayTrait::new();
            let count = self.owner_session_count.read(user);
            
            let mut i = 0;
            loop {
                if i >= count {
                    break;
                }
                let session_key = self.owner_sessions.read((user, i));
                session_keys.append(session_key);
                i += 1;
            };
            
            session_keys.span()
        }

        fn get_user_session_count(self: @ContractState, user: ContractAddress) -> u32 {
            self.owner_session_count.read(user)
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _rent_session_key(ref self: ContractState, session_key: felt252, renter: ContractAddress) {
            let session_info = self.session_keys.read(session_key);
            assert(session_info.is_active, 'Session key not active');
            assert(self.validate_session_key(session_key), 'Session key expired');
            
            let updated_info = SessionKeyInfo {
                owner: session_info.owner,
                created_at: session_info.created_at,
                expires_at: session_info.expires_at,
                permissions_hash: session_info.permissions_hash,
                price: session_info.price,
                is_active: session_info.is_active,
                rented_by: renter,
            };
            
            self.session_keys.write(session_key, updated_info);
            
            self.emit(SessionKeyRented {
                session_key,
                renter,
                owner: session_info.owner,
            });
        }
    }
}
