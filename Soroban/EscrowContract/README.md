# Soroban Escrow Smart Contract & TypeScript SDK

Production-ready, strictly verified escrow smart contract implemented on **Stellar Soroban** with an accompanying **TypeScript SDK client**.

## Overview

The Soroban Escrow Contract allows two parties (a depositor and a beneficiary) to engage in trust-minimized transactions mediated by an optional arbiter.

### Key Features:
- **Strict Authorization**: Depositor, Beneficiary, and Arbiter operations are strictly authorized using Soroban's native `Address::require_auth()`.
- **Full Lifecycle Support**:
  - `create_escrow`: Securely locks tokens in escrow until delivery or dispute.
  - `release_funds`: Authorizes payout to beneficiary upon milestone completion (invoked by Depositor or Arbiter).
  - `refund`: Automatically permits depositor refunds after deadline expiration, or permits voluntary beneficiary/arbiter refunds anytime.
  - `raise_dispute`: Allows either party to initiate formal mediation.
  - `resolve_dispute`: Arbiter resolves disputes by distributing funds between parties according to determined settlement amounts.
- **Audited State Transitions**: Prevents double-spending, double-releasing, unauthenticated access, and invalid split amounts.
- **Event Logging**: Publishes native Soroban events for all state changes (`escrow created`, `released`, `refunded`, `disputed`, `resolved`).

---

## Directory Structure

```text
Soroban/EscrowContract/
├── Cargo.toml          # Rust package configuration with Soroban SDK v21
├── src/
│   ├── lib.rs          # Escrow smart contract implementation
│   └── test.rs         # Exhaustive Rust unit & integration test suite
├── client.ts           # Type-safe TypeScript SDK client
├── client.test.ts      # TypeScript test suite verifying client workflows
├── package.json        # Node.js dependencies & scripts
├── tsconfig.json       # TypeScript compiler configuration
└── jest.config.js      # Jest testing framework configuration
```

---

## Testing

### Rust Smart Contract Tests
Run the test suite using `cargo`:
```bash
cargo test
```

### TypeScript SDK Tests
Run the TypeScript unit tests:
```bash
npm install
npm test
```

---

## TypeScript SDK Usage

```typescript
import { EscrowClient, CreateEscrowParams } from './client';

const client = new EscrowClient({
  contractId: 'CA...',
  rpcUrl: 'https://soroban-testnet.stellar.org',
});

// Create and fund escrow
await client.createEscrow({
  engagementId: 'bounty_42',
  depositor: 'GB...',
  beneficiary: 'GC...',
  arbiter: 'GA...',
  token: 'CD...',
  amount: 100_000_0000000n, // 100 XLM (in stroops)
  deadline: BigInt(Date.now() / 1000 + 86400 * 7),
});

// Depositor releases funds upon completion
await client.releaseFunds('bounty_42', 'GB...');
```
