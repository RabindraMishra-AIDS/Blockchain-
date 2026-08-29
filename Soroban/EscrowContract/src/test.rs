#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String, Symbol,
};

fn setup_test<'a>() -> (
    Env,
    Address,
    Address,
    Address,
    Address,
    TokenClient<'a>,
    StellarAssetClient<'a>,
    Address,
    EscrowContractClient<'a>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let token_client = TokenClient::new(&env, &token_address);
    let token_admin_client = StellarAssetClient::new(&env, &token_address);

    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);

    // Mint initial tokens for depositor
    token_admin_client.mint(&depositor, &10_000);

    let contract_id = env.register_contract(None, EscrowContract);
    let contract_client = EscrowContractClient::new(&env, &contract_id);

    (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        token_client,
        token_admin_client,
        contract_id,
        contract_client,
    )
}

#[test]
fn test_create_and_release_escrow_happy_path() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        token_client,
        _,
        contract_id,
        client,
    ) = setup_test();

    let engagement_id = Symbol::new(&env, "task_101");
    let amount = 1_000i128;
    let deadline = 100_000u64;

    assert_eq!(token_client.balance(&depositor), 10_000);
    assert_eq!(token_client.balance(&beneficiary), 0);
    assert_eq!(token_client.balance(&contract_id), 0);

    // 1. Depositor creates and funds escrow
    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    assert_eq!(token_client.balance(&depositor), 9_000);
    assert_eq!(token_client.balance(&contract_id), 1_000);

    let escrow = client.get_escrow(&engagement_id);
    assert_eq!(escrow.status, EscrowStatus::Funded);
    assert_eq!(escrow.amount, 1_000);
    assert_eq!(escrow.depositor, depositor);
    assert_eq!(escrow.beneficiary, beneficiary);
    assert_eq!(escrow.arbiter, arbiter);
    assert_eq!(escrow.deadline, deadline);

    // 2. Depositor releases funds upon satisfactory completion
    client.release_funds(&depositor, &engagement_id);

    assert_eq!(token_client.balance(&beneficiary), 1_000);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(client.get_status(&engagement_id), EscrowStatus::Completed);
}

#[test]
fn test_arbiter_release_funds() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        token_client,
        _,
        contract_id,
        client,
    ) = setup_test();

    let engagement_id = Symbol::new(&env, "task_102");
    let amount = 500i128;
    let deadline = 200_000u64;

    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    // Arbiter releases funds
    client.release_funds(&arbiter, &engagement_id);

    assert_eq!(token_client.balance(&beneficiary), 500);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(client.get_status(&engagement_id), EscrowStatus::Completed);
}

#[test]
fn test_refund_after_deadline_expired() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        token_client,
        _,
        contract_id,
        client,
    ) = setup_test();

    let engagement_id = Symbol::new(&env, "task_103");
    let amount = 2_000i128;
    let deadline = 10_000u64;

    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    assert_eq!(token_client.balance(&depositor), 8_000);

    // Fast forward ledger timestamp past deadline
    env.ledger().set_timestamp(15_000);

    // Depositor claims refund
    client.refund(&depositor, &engagement_id);

    assert_eq!(token_client.balance(&depositor), 10_000);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(client.get_status(&engagement_id), EscrowStatus::Refunded);
}

#[test]
fn test_refund_before_deadline_fails_for_depositor() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        _,
        _,
        _,
        client,
    ) = setup_test();

    let engagement_id = Symbol::new(&env, "task_104");
    let amount = 1_000i128;
    let deadline = 10_000u64;

    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    env.ledger().set_timestamp(5_000);

    let res = client.try_refund(&depositor, &engagement_id);
    assert_eq!(res, Err(Ok(EscrowError::DeadlineNotPassed)));
}

#[test]
fn test_beneficiary_voluntary_refund() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        token_client,
        _,
        contract_id,
        client,
    ) = setup_test();

    let engagement_id = Symbol::new(&env, "task_105");
    let amount = 1_500i128;
    let deadline = 100_000u64;

    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    // Beneficiary voluntarily refunds before deadline
    client.refund(&beneficiary, &engagement_id);

    assert_eq!(token_client.balance(&depositor), 10_000);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(client.get_status(&engagement_id), EscrowStatus::Refunded);
}

#[test]
fn test_dispute_and_resolution_split() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        token_client,
        _,
        contract_id,
        client,
    ) = setup_test();

    let engagement_id = Symbol::new(&env, "task_106");
    let amount = 1_000i128;
    let deadline = 50_000u64;

    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    // 1. Depositor raises dispute
    let reason = String::from_str(&env, "Deliverable only partially completed");
    client.raise_dispute(&depositor, &engagement_id, &reason);

    let escrow = client.get_escrow(&engagement_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);
    assert_eq!(escrow.dispute_reason, reason);

    // 2. Arbiter resolves dispute with 600 to beneficiary, 400 back to depositor
    client.resolve_dispute(&arbiter, &engagement_id, &600, &400);

    assert_eq!(token_client.balance(&beneficiary), 600);
    assert_eq!(token_client.balance(&depositor), 9_400);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(client.get_status(&engagement_id), EscrowStatus::Resolved);
}

#[test]
fn test_dispute_resolution_invalid_amounts() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        _,
        _,
        _,
        client,
    ) = setup_test();

    let engagement_id = Symbol::new(&env, "task_107");
    let amount = 1_000i128;
    let deadline = 50_000u64;

    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    client.raise_dispute(
        &beneficiary,
        &engagement_id,
        &String::from_str(&env, "Payment withholding"),
    );

    // Total does not equal escrow amount (700 + 400 = 1100 != 1000)
    let res = client.try_resolve_dispute(&arbiter, &engagement_id, &700, &400);
    assert_eq!(res, Err(Ok(EscrowError::InvalidResolutionAmounts)));

    // Negative amount
    let res2 = client.try_resolve_dispute(&arbiter, &engagement_id, &-100, &1100);
    assert_eq!(res2, Err(Ok(EscrowError::InvalidResolutionAmounts)));
}

#[test]
fn test_unauthorized_actions() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        _,
        _,
        _,
        client,
    ) = setup_test();

    let outsider = Address::generate(&env);
    let engagement_id = Symbol::new(&env, "task_108");
    let amount = 1_000i128;
    let deadline = 50_000u64;

    client.create_escrow(
        &engagement_id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &amount,
        &deadline,
    );

    // Outsider cannot release funds
    let res_rel = client.try_release_funds(&outsider, &engagement_id);
    assert_eq!(res_rel, Err(Ok(EscrowError::Unauthorized)));

    // Outsider cannot refund
    let res_ref = client.try_refund(&outsider, &engagement_id);
    assert_eq!(res_ref, Err(Ok(EscrowError::Unauthorized)));

    // Outsider cannot raise dispute
    let res_disp = client.try_raise_dispute(
        &outsider,
        &engagement_id,
        &String::from_str(&env, "Fake dispute"),
    );
    assert_eq!(res_disp, Err(Ok(EscrowError::Unauthorized)));

    // Raise dispute legitimately first
    client.raise_dispute(
        &depositor,
        &engagement_id,
        &String::from_str(&env, "Legit dispute"),
    );

    // Outsider cannot resolve dispute
    let res_res = client.try_resolve_dispute(&outsider, &engagement_id, &500, &500);
    assert_eq!(res_res, Err(Ok(EscrowError::Unauthorized)));
}

#[test]
fn test_validation_guards() {
    let (
        env,
        depositor,
        beneficiary,
        arbiter,
        token_address,
        _,
        _,
        _,
        client,
    ) = setup_test();

    let id = Symbol::new(&env, "task_109");

    // Invalid amount
    let res_amt = client.try_create_escrow(
        &id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &0,
        &10_000,
    );
    assert_eq!(res_amt, Err(Ok(EscrowError::InvalidAmount)));

    // Invalid past deadline
    env.ledger().set_timestamp(5_000);
    let res_dl = client.try_create_escrow(
        &id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &100,
        &4_000,
    );
    assert_eq!(res_dl, Err(Ok(EscrowError::InvalidDeadline)));

    // Self engagement (depositor == beneficiary)
    let res_self = client.try_create_escrow(
        &id,
        &depositor,
        &depositor,
        &arbiter,
        &token_address,
        &100,
        &10_000,
    );
    assert_eq!(res_self, Err(Ok(EscrowError::SelfEngagementDisallowed)));

    // Successful create
    client.create_escrow(
        &id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &500,
        &10_000,
    );

    // Duplicate create fails
    let res_dup = client.try_create_escrow(
        &id,
        &depositor,
        &beneficiary,
        &arbiter,
        &token_address,
        &500,
        &10_000,
    );
    assert_eq!(res_dup, Err(Ok(EscrowError::AlreadyExists)));

    // Double release prevention
    client.release_funds(&depositor, &id);
    let res_drel = client.try_release_funds(&depositor, &id);
    assert_eq!(res_drel, Err(Ok(EscrowError::AlreadyCompleted)));

    // Refund after completed fails
    let res_ref = client.try_refund(&depositor, &id);
    assert_eq!(res_ref, Err(Ok(EscrowError::AlreadyCompleted)));
}
