#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
    String, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AlreadyExists = 1,
    NotFound = 2,
    InvalidAmount = 3,
    InvalidDeadline = 4,
    NotFunded = 5,
    AlreadyCompleted = 6,
    AlreadyRefunded = 7,
    Unauthorized = 8,
    DeadlineNotPassed = 9,
    NotDisputed = 10,
    InvalidResolutionAmounts = 11,
    SelfEngagementDisallowed = 12,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EscrowStatus {
    Pending = 0,
    Funded = 1,
    Completed = 2,
    Refunded = 3,
    Disputed = 4,
    Resolved = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub engagement_id: Symbol,
    pub depositor: Address,
    pub beneficiary: Address,
    pub arbiter: Address,
    pub token: Address,
    pub amount: i128,
    pub deadline: u64,
    pub status: EscrowStatus,
    pub created_at: u64,
    pub dispute_reason: String,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Escrow(Symbol),
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initializes and funds an escrow instance for an engagement.
    pub fn create_escrow(
        env: Env,
        engagement_id: Symbol,
        depositor: Address,
        beneficiary: Address,
        arbiter: Address,
        token: Address,
        amount: i128,
        deadline: u64,
    ) -> Result<(), EscrowError> {
        depositor.require_auth();

        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(EscrowError::InvalidDeadline);
        }

        if depositor == beneficiary {
            return Err(EscrowError::SelfEngagementDisallowed);
        }

        let key = DataKey::Escrow(engagement_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(EscrowError::AlreadyExists);
        }

        // Transfer funds from depositor to the escrow contract
        let client = token::Client::new(&env, &token);
        client.transfer(&depositor, &env.current_contract_address(), &amount);

        let escrow = Escrow {
            engagement_id: engagement_id.clone(),
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            arbiter: arbiter.clone(),
            token: token.clone(),
            amount,
            deadline,
            status: EscrowStatus::Funded,
            created_at: now,
            dispute_reason: String::from_str(&env, ""),
        };

        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("created")),
            (engagement_id, depositor, beneficiary, amount),
        );

        Ok(())
    }

    /// Releases escrow funds to the beneficiary.
    /// Can be invoked by the depositor (happy path approval) or the arbiter.
    pub fn release_funds(
        env: Env,
        caller: Address,
        engagement_id: Symbol,
    ) -> Result<(), EscrowError> {
        caller.require_auth();

        let key = DataKey::Escrow(engagement_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::NotFound)?;

        if caller != escrow.depositor && caller != escrow.arbiter {
            return Err(EscrowError::Unauthorized);
        }

        if escrow.status == EscrowStatus::Completed {
            return Err(EscrowError::AlreadyCompleted);
        }
        if escrow.status == EscrowStatus::Refunded {
            return Err(EscrowError::AlreadyRefunded);
        }
        if escrow.status != EscrowStatus::Funded && escrow.status != EscrowStatus::Disputed {
            return Err(EscrowError::NotFunded);
        }

        let client = token::Client::new(&env, &escrow.token);
        client.transfer(&env.current_contract_address(), &escrow.beneficiary, &escrow.amount);

        escrow.status = EscrowStatus::Completed;
        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("released")),
            (engagement_id, escrow.beneficiary, escrow.amount),
        );

        Ok(())
    }

    /// Refunds escrow funds back to the depositor.
    /// - Depositor can refund after the deadline expires.
    /// - Arbiter can refund if in Funded or Disputed state.
    /// - Beneficiary can voluntarily refund back to depositor anytime.
    pub fn refund(env: Env, caller: Address, engagement_id: Symbol) -> Result<(), EscrowError> {
        caller.require_auth();

        let key = DataKey::Escrow(engagement_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::NotFound)?;

        if escrow.status == EscrowStatus::Completed {
            return Err(EscrowError::AlreadyCompleted);
        }
        if escrow.status == EscrowStatus::Refunded {
            return Err(EscrowError::AlreadyRefunded);
        }
        if escrow.status != EscrowStatus::Funded && escrow.status != EscrowStatus::Disputed {
            return Err(EscrowError::NotFunded);
        }

        let now = env.ledger().timestamp();

        if caller == escrow.depositor {
            if now < escrow.deadline {
                return Err(EscrowError::DeadlineNotPassed);
            }
        } else if caller == escrow.arbiter || caller == escrow.beneficiary {
            // Arbiter or Beneficiary voluntary refund allowed
        } else {
            return Err(EscrowError::Unauthorized);
        }

        let client = token::Client::new(&env, &escrow.token);
        client.transfer(&env.current_contract_address(), &escrow.depositor, &escrow.amount);

        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("refunded")),
            (engagement_id, escrow.depositor, escrow.amount),
        );

        Ok(())
    }

    /// Raises a dispute on a funded escrow.
    /// Can be initiated by either depositor or beneficiary.
    pub fn raise_dispute(
        env: Env,
        caller: Address,
        engagement_id: Symbol,
        reason: String,
    ) -> Result<(), EscrowError> {
        caller.require_auth();

        let key = DataKey::Escrow(engagement_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::NotFound)?;

        if caller != escrow.depositor && caller != escrow.beneficiary {
            return Err(EscrowError::Unauthorized);
        }

        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::NotFunded);
        }

        escrow.status = EscrowStatus::Disputed;
        escrow.dispute_reason = reason.clone();
        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("disputed")),
            (engagement_id, caller, reason),
        );

        Ok(())
    }

    /// Resolves an active dispute by the arbiter, distributing funds between parties.
    pub fn resolve_dispute(
        env: Env,
        arbiter: Address,
        engagement_id: Symbol,
        beneficiary_amount: i128,
        depositor_amount: i128,
    ) -> Result<(), EscrowError> {
        arbiter.require_auth();

        let key = DataKey::Escrow(engagement_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::NotFound)?;

        if arbiter != escrow.arbiter {
            return Err(EscrowError::Unauthorized);
        }

        if escrow.status != EscrowStatus::Disputed {
            return Err(EscrowError::NotDisputed);
        }

        if beneficiary_amount < 0 || depositor_amount < 0 {
            return Err(EscrowError::InvalidResolutionAmounts);
        }

        if beneficiary_amount + depositor_amount != escrow.amount {
            return Err(EscrowError::InvalidResolutionAmounts);
        }

        let client = token::Client::new(&env, &escrow.token);

        if beneficiary_amount > 0 {
            client.transfer(&env.current_contract_address(), &escrow.beneficiary, &beneficiary_amount);
        }

        if depositor_amount > 0 {
            client.transfer(&env.current_contract_address(), &escrow.depositor, &depositor_amount);
        }

        escrow.status = EscrowStatus::Resolved;
        env.storage().persistent().set(&key, &escrow);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("resolved")),
            (engagement_id, beneficiary_amount, depositor_amount),
        );

        Ok(())
    }

    /// Retrieves full escrow state by engagement ID.
    pub fn get_escrow(env: Env, engagement_id: Symbol) -> Result<Escrow, EscrowError> {
        let key = DataKey::Escrow(engagement_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::NotFound)
    }

    /// Retrieves only the status of the escrow.
    pub fn get_status(env: Env, engagement_id: Symbol) -> Result<EscrowStatus, EscrowError> {
        let escrow = Self::get_escrow(env, engagement_id)?;
        Ok(escrow.status)
    }
}

#[cfg(test)]
mod test;
