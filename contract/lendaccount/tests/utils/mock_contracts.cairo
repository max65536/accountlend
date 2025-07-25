use starknet::ContractAddress;
use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

// Mock ERC20 contract for testing purposes
#[starknet::interface]
trait IMockERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn set_balance(ref self: TContractState, account: ContractAddress, amount: u256);
}

#[starknet::contract]
mod MockERC20 {
    use super::IMockERC20;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        total_supply: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.total_supply.write(1000000000000000000000); // 1000 tokens
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of IMockERC20<ContractState> {
        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            let caller_balance = self.balances.read(caller);
            
            assert(caller_balance >= amount, 'Insufficient balance');
            
            self.balances.write(caller, caller_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);
            
            true
        }

        fn transfer_from(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            let sender_balance = self.balances.read(sender);
            let allowance = self.allowances.read((sender, caller));
            
            assert(sender_balance >= amount, 'Insufficient balance');
            assert(allowance >= amount, 'Insufficient allowance');
            
            self.balances.write(sender, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);
            self.allowances.write((sender, caller), allowance - amount);
            
            true
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self.allowances.write((caller, spender), amount);
            true
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            let current_balance = self.balances.read(to);
            self.balances.write(to, current_balance + amount);
            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply + amount);
        }

        fn set_balance(ref self: ContractState, account: ContractAddress, amount: u256) {
            self.balances.write(account, amount);
        }
    }
}

// Mock Session Key Manager for marketplace testing
#[starknet::interface]
trait IMockSessionKeyManager<TContractState> {
    fn validate_session_key(self: @TContractState, session_key: felt252) -> bool;
    fn get_session_owner(self: @TContractState, session_key: felt252) -> ContractAddress;
    fn is_session_expired(self: @TContractState, session_key: felt252) -> bool;
    fn set_session_valid(ref self: TContractState, session_key: felt252, valid: bool);
    fn set_session_owner(ref self: TContractState, session_key: felt252, owner: ContractAddress);
}

#[starknet::contract]
mod MockSessionKeyManager {
    use super::IMockSessionKeyManager;
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        session_validity: Map<felt252, bool>,
        session_owners: Map<felt252, ContractAddress>,
        session_expiry: Map<felt252, bool>,
    }

    #[abi(embed_v0)]
    impl MockSessionKeyManagerImpl of IMockSessionKeyManager<ContractState> {
        fn validate_session_key(self: @ContractState, session_key: felt252) -> bool {
            self.session_validity.read(session_key)
        }

        fn get_session_owner(self: @ContractState, session_key: felt252) -> ContractAddress {
            self.session_owners.read(session_key)
        }

        fn is_session_expired(self: @ContractState, session_key: felt252) -> bool {
            self.session_expiry.read(session_key)
        }

        fn set_session_valid(ref self: ContractState, session_key: felt252, valid: bool) {
            self.session_validity.write(session_key, valid);
        }

        fn set_session_owner(ref self: ContractState, session_key: felt252, owner: ContractAddress) {
            self.session_owners.write(session_key, owner);
        }
    }
}

// Test deployment utilities
use starknet::testing::set_contract_address;
use starknet::deploy_syscall;
use starknet::class_hash::ClassHash;
use core::array::ArrayTrait;

fn deploy_mock_erc20() -> ContractAddress {
    let class_hash = starknet::class_hash_const::<0x1234>();
    let contract_address_salt = 0;
    let mut constructor_calldata = ArrayTrait::new();
    
    let (contract_address, _) = deploy_syscall(
        class_hash, contract_address_salt, constructor_calldata.span(), false
    ).unwrap();
    
    contract_address
}

fn deploy_mock_session_manager() -> ContractAddress {
    let class_hash = starknet::class_hash_const::<0x5678>();
    let contract_address_salt = 1;
    let mut constructor_calldata = ArrayTrait::new();
    
    let (contract_address, _) = deploy_syscall(
        class_hash, contract_address_salt, constructor_calldata.span(), false
    ).unwrap();
    
    contract_address
}

// Helper function to setup test environment with mock contracts
fn setup_test_environment() -> (ContractAddress, ContractAddress) {
    let erc20_address = deploy_mock_erc20();
    let session_manager_address = deploy_mock_session_manager();
    
    (erc20_address, session_manager_address)
}
