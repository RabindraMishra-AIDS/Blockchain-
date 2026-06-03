# Soroban Escrow Smart Contract

A secure escrow contract on Stellar's Soroban platform with TypeScript client.

## Features
- Initialize escrow with buyer, seller, amount, token, timeout
- Deposit funds
- Release to seller
- Refund to buyer after timeout
- TypeScript client SDK

## Structure
- `src/lib.rs` - Rust smart contract
- `client.ts` - TypeScript SDK
- `client.test.ts` - Tests

## Usage
```typescript
import { EscrowClient } from './client';
const client = new EscrowClient('CONTRACT_ID');
const id = await client.initialize(config);
License
MIT
