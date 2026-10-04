#![cfg(test)]
use soroban_sdk::{testutils::Events, Address, Env};
use crate::{EscrowContract, EscrowContractClient, EscrowStatus};

#[test]
fn test_create_and_release_escrow() {
    let env = Env::default();
    let contract_id = env.deploy_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let depositor = Address::contract_instance(&contract_id, ());
    let recipient = Address::contract_instance(&contract_id, ());

    // Create escrow
    let escrow_id = client.create_escrow(&depositor, &recipient, &1000i128, &100u64);

    // Check escrow record
    let record = client.get_escrow(&escrow_id);
    assert_eq!(record.depositor, depositor);
    assert_eq!(record.recipient, recipient);
    assert_eq!(record.amount, 1000i128);
    assert_eq!(record.status, EscrowStatus::Active);
}

#[test]
#[should_panic(expected = "invalid input")]
fn test_release_before_time() {
    let env = Env::default();
    let contract_id = env.deploy_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let depositor = Address::contract_instance(&contract_id, ());
    let recipient = Address::contract_instance(&contract_id, ());

    let escrow_id = client.create_escrow(&depositor, &recipient, &1000i128, &100u64);

    // Try to release before release time
    client.release(&escrow_id);
}

#[test]
fn test_cancel_escrow() {
    let env = Env::default();
    let contract_id = env.deploy_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let depositor = Address::contract_instance(&contract_id, ());
    let recipient = Address::contract_instance(&contract_id, ());

    let escrow_id = client.create_escrow(&depositor, &recipient, &1000i128, &100u64);

    // Cancel as depositor
    client.cancel(&escrow_id, &depositor, &depositor);

    let record = client.get_escrow(&escrow_id);
    assert_eq!(record.status, EscrowStatus::Cancelled);
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_cancel_unauthorized() {
    let env = Env::default();
    let contract_id = env.deploy_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let depositor = Address::contract_instance(&contract_id, ());
    let recipient = Address::contract_instance(&contract_id, ());
    let attacker = Address::contract_instance(&contract_id, ());

    let escrow_id = client.create_escrow(&depositor, &recipient, &1000i128, &100u64);

    client.cancel(&escrow_id, &attacker, &attacker);
}

#[test]
#[should_panic(expected = "invalid amount")]
fn test_invalid_amount() {
    let env = Env::default();
    let contract_id = env.deploy_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let depositor = Address::contract_instance(&contract_id, ());
    let recipient = Address::contract_instance(&contract_id, ());

    client.create_escrow(&depositor, &recipient, &0i128, &100u64);
}
