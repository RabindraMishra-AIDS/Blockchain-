#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Pending = 0,
    Funded = 1,
    Released = 2,
    Refunded = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub buyer: Address,
    pub seller: Address,
    pub amount: i128,
    pub token: Address,
    pub status: EscrowStatus,
    pub created_at: u64,
    pub timeout: u64,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, buyer: Address, seller: Address, amount: i128, token: Address, timeout: u64) -> u64 {
        buyer.require_auth();
        let escrow_id = env.ledger().sequence();
        let created_at = env.ledger().timestamp();
        let escrow = Escrow {
            buyer: buyer.clone(),
            seller: seller.clone(),
            amount,
            token: token.clone(),
            status: EscrowStatus::Pending,
            created_at,
            timeout: created_at + timeout,
        };
        env.storage().instance().set(&escrow_id, &escrow);
        env.events().publish((Symbol::new(&env, "escrow_init"), escrow_id), (buyer, seller, amount));
        escrow_id
    }

    pub fn deposit(env: Env, escrow_id: u64) {
        let mut escrow: Escrow = env.storage().instance().get(&escrow_id).unwrap();
        escrow.buyer.require_auth();
        if escrow.status != EscrowStatus::Pending {
            panic!("not pending");
        }
        let client = soroban_sdk::token::Client::new(&env, &escrow.token);
        client.transfer(&escrow.buyer, &env.current_contract_address(), &escrow.amount);
        escrow.status = EscrowStatus::Funded;
        env.storage().instance().set(&escrow_id, &escrow);
        env.events().publish((Symbol::new(&env, "escrow_funded"), escrow_id), escrow.amount);
    }

    pub fn release(env: Env, escrow_id: u64) {
        let mut escrow: Escrow = env.storage().instance().get(&escrow_id).unwrap();
        escrow.buyer.require_auth();
        if escrow.status != EscrowStatus::Funded {
            panic!("not funded");
        }
        let client = soroban_sdk::token::Client::new(&env, &escrow.token);
        client.transfer(&env.current_contract_address(), &escrow.seller, &escrow.amount);
        escrow.status = EscrowStatus::Released;
        env.storage().instance().set(&escrow_id, &escrow);
        env.events().publish((Symbol::new(&env, "escrow_released"), escrow_id), escrow.amount);
    }

    pub fn refund(env: Env, escrow_id: u64) {
        let mut escrow: Escrow = env.storage().instance().get(&escrow_id).unwrap();
        let current_time = env.ledger().timestamp();
        escrow.buyer.require_auth();
        if escrow.status != EscrowStatus::Funded {
            panic!("not funded");
        }
        if current_time < escrow.timeout {
            panic!("timeout not reached");
        }
        let client = soroban_sdk::token::Client::new(&env, &escrow.token);
        client.transfer(&env.current_contract_address(), &escrow.buyer, &escrow.amount);
        escrow.status = EscrowStatus::Refunded;
        env.storage().instance().set(&escrow_id, &escrow);
        env.events().publish((Symbol::new(&env, "escrow_refunded"), escrow_id), escrow.amount);
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        env.storage().instance().get(&escrow_id).unwrap()
    }
}
