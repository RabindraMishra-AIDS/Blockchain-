#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, Address, Env, Symbol, Map, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum EscrowError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    EscrowNotActive = 5,
    AlreadyReleased = 6,
    AlreadyCancelled = 7,
    InsufficientBalance = 8,
}

#[contract]
pub struct EscrowContract;

#[derive(Clone, Debug)]
#[soroban_sdk::contracttype]
pub struct EscrowRecord {
    pub depositor: Address,
    pub recipient: Address,
    pub amount: i128,
    pub release_time: u64,
    pub status: EscrowStatus,
}

#[derive(Clone, Debug, PartialEq)]
#[soroban_sdk::contracttype]
pub enum EscrowStatus {
    Active,
    Released,
    Cancelled,
}

#[contractimpl]
impl EscrowContract {
    pub const ESCROW_ID: Symbol = Symbol::new(env!("_"));

    pub fn init(env: Env, admin: Address) -> Vec<u8> {
        let key = env.storage().persistent().get::<_, Vec<u8>>(&"admin".try_into().unwrap()).unwrap_or_default();
        if !key.is_empty() {
            panic!(EscrowError::AlreadyInitialized);
        }
        env.storage().persistent().set("admin".try_into().unwrap(), &admin.to_contract_id());
        Vec::new(env)
    }

    pub fn get_admin(env: Env) -> Address {
        let admin_id: soroban_sdk::ContractId = env.storage().persistent().get(&"admin".try_into().unwrap()).unwrap();
        Address::from_contract_id(&admin_id)
    }

    fn is_admin(env: &Env, addr: &Address) -> bool {
        let admin_id: soroban_sdk::ContractId = env.storage().persistent().get(&"admin".try_into().unwrap()).unwrap();
        addr.to_contract_id() == admin_id
    }

    pub fn create_escrow(
        env: Env,
        depositor: Address,
        recipient: Address,
        amount: i128,
        release_time: u64,
    ) -> Symbol {
        if amount <= 0 {
            panic!(EscrowError::InvalidAmount);
        }

        let escrow_id_bytes: Vec<u8> = depositor.to_scval().to_vec().clone();
        let escrow_id: Symbol = escrow_id_bytes.try_into().unwrap();

        let existing = env.storage().persistent().get::<_, EscrowRecord>(&escrow_id.clone());
        if existing.is_some() {
            panic!(EscrowError::AlreadyInitialized);
        }

        let record = EscrowRecord {
            depositor: depositor.clone(),
            recipient: recipient.clone(),
            amount,
            release_time,
            status: EscrowStatus::Active,
        };

        env.storage().persistent().set(&escrow_id.clone(), &record);

        // Deposit tokens into contract
        soroban_sdk::token::Client::new(
            &env,
            &soroban_sdk::token::TokenId::Native
        ).transfer(&depositor, &env.current_contract_address(), &amount);

        escrow_id
    }

    pub fn get_escrow(env: Env, escrow_id: Symbol) -> EscrowRecord {
        env.storage().persistent().get(&escrow_id).unwrap_or_else(|| {
            panic!(EscrowError::NotInitialized);
        })
    }

    pub fn release(env: Env, escrow_id: Symbol) {
        let mut record: EscrowRecord = env.storage().persistent().get(&escrow_id).unwrap();

        if record.status != EscrowStatus::Active {
            panic!(EscrowError::EscrowNotActive);
        }

        let current_time = env.ledger().timestamp();
        if current_time < record.release_time {
            panic!(EscrowError::InvalidAmount);
        }

        if record.recipient.to_string() != env.current_contract_address().to_string() {
            // Transfer to recipient
            soroban_sdk::token::Client::new(&env, &soroban_sdk::token::TokenId::Native)
                .transfer(&env.current_contract_address(), &record.recipient, &record.amount);
        }

        record.status = EscrowStatus::Released;
        env.storage().persistent().set(&escrow_id, &record);
    }

    pub fn cancel(env: Env, escrow_id: Symbol, requester: Address) {
        let mut record: EscrowRecord = env.storage().persistent().get(&escrow_id).unwrap();

        if record.status != EscrowStatus::Active {
            panic!(EscrowError::EscrowNotActive);
        }

        if !record.depositor.equals(&requester) && !Self::is_admin(&env, &requester) {
            panic!(EscrowError::Unauthorized);
        }

        // Refund depositor
        soroban_sdk::token::Client::new(&env, &soroban_sdk::token::TokenId::Native)
            .transfer(&env.current_contract_address(), &record.depositor, &record.amount);

        record.status = EscrowStatus::Cancelled;
        env.storage().persistent().set(&escrow_id, &record);
    }

    pub fn list_escrows(env: Env) -> Vec<Symbol> {
        let mut keys: Vec<Symbol> = Vec::new(env);
        for entry in env.storage().persistent().iter() {
            if entry.0.len() > 0 && entry.0 != "admin" {
                keys.push(entry.0);
            }
        }
        keys
    }
}

use crate::EscrowContractClient as Client;
