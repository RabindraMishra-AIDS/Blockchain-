/**
 * Soroban Escrow Smart Contract TypeScript SDK
 *
 * Provides a type-safe client interface for deploying, initializing,
 * funding, releasing, disputing, and refunding escrows on Stellar Soroban.
 */

export enum EscrowStatus {
  Pending = 0,
  Funded = 1,
  Completed = 2,
  Refunded = 3,
  Disputed = 4,
  Resolved = 5,
}

export interface Escrow {
  engagementId: string;
  depositor: string;
  beneficiary: string;
  arbiter: string;
  token: string;
  amount: bigint;
  deadline: bigint;
  status: EscrowStatus;
  createdAt: bigint;
  disputeReason: string;
}

export interface CreateEscrowParams {
  engagementId: string;
  depositor: string;
  beneficiary: string;
  arbiter: string;
  token: string;
  amount: bigint;
  deadline: bigint;
}

export interface DisputeResolutionParams {
  arbiter: string;
  engagementId: string;
  beneficiaryAmount: bigint;
  depositorAmount: bigint;
}

export interface TransactionResult<T = unknown> {
  success: boolean;
  transactionHash?: string;
  data?: T;
  error?: string;
}

export interface ClientConfig {
  rpcUrl: string;
  networkPassphrase?: string;
  contractId: string;
}

export interface Signer {
  publicKey: string;
  signTransaction: (txXdr: string) => Promise<string>;
}

export class EscrowClient {
  private rpcUrl: string;
  private networkPassphrase: string;
  private contractId: string;

  // In-memory simulation state for local testing and validation
  private mockLedgerState: Map<string, Escrow> = new Map();
  private simulatedTimestamp: bigint = BigInt(Math.floor(Date.now() / 1000));

  constructor(config: ClientConfig) {
    if (!config.contractId || config.contractId.trim().length === 0) {
      throw new Error('Contract ID is required');
    }
    this.rpcUrl = config.rpcUrl;
    this.networkPassphrase = config.networkPassphrase || 'Test SDF Network ; September 2015';
    this.contractId = config.contractId;
  }

  public getContractId(): string {
    return this.contractId;
  }

  public getRpcUrl(): string {
    return this.rpcUrl;
  }

  public getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  public setSimulatedTimestamp(ts: bigint): void {
    this.simulatedTimestamp = ts;
  }

  public getSimulatedTimestamp(): bigint {
    return this.simulatedTimestamp;
  }

  /**
   * Validates parameters for escrow creation.
   */
  public validateCreateEscrowParams(params: CreateEscrowParams): void {
    if (!params.engagementId || params.engagementId.trim().length === 0) {
      throw new Error('Engagement ID cannot be empty');
    }
    if (params.amount <= BigInt(0)) {
      throw new Error('Escrow amount must be strictly greater than 0');
    }
    if (params.deadline <= this.simulatedTimestamp) {
      throw new Error('Escrow deadline must be in the future');
    }
    if (params.depositor === params.beneficiary) {
      throw new Error('Depositor and Beneficiary cannot be the same address');
    }
    if (!params.depositor || !params.beneficiary || !params.arbiter || !params.token) {
      throw new Error('All participant and token addresses must be provided');
    }
  }

  /**
   * Creates and funds an escrow instance.
   */
  public async createEscrow(
    params: CreateEscrowParams,
    signer?: Signer
  ): Promise<TransactionResult<Escrow>> {
    try {
      this.validateCreateEscrowParams(params);

      if (this.mockLedgerState.has(params.engagementId)) {
        return {
          success: false,
          error: `Escrow with engagement ID '${params.engagementId}' already exists`,
        };
      }

      if (signer && signer.publicKey !== params.depositor) {
        return {
          success: false,
          error: `Unauthorized: Signer ${signer.publicKey} does not match depositor ${params.depositor}`,
        };
      }

      const escrow: Escrow = {
        engagementId: params.engagementId,
        depositor: params.depositor,
        beneficiary: params.beneficiary,
        arbiter: params.arbiter,
        token: params.token,
        amount: params.amount,
        deadline: params.deadline,
        status: EscrowStatus.Funded,
        createdAt: this.simulatedTimestamp,
        disputeReason: '',
      };

      this.mockLedgerState.set(params.engagementId, escrow);

      return {
        success: true,
        transactionHash: `tx_${Date.now()}_create_${params.engagementId}`,
        data: escrow,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Releases escrow funds to the beneficiary.
   * Can be initiated by Depositor or Arbiter.
   */
  public async releaseFunds(
    engagementId: string,
    caller: string,
    signer?: Signer
  ): Promise<TransactionResult<Escrow>> {
    const escrow = this.mockLedgerState.get(engagementId);
    if (!escrow) {
      return { success: false, error: `Escrow '${engagementId}' not found` };
    }

    if (caller !== escrow.depositor && caller !== escrow.arbiter) {
      return { success: false, error: 'Unauthorized: Caller is neither depositor nor arbiter' };
    }

    if (signer && signer.publicKey !== caller) {
      return { success: false, error: 'Unauthorized: Signer key mismatch' };
    }

    if (escrow.status === EscrowStatus.Completed) {
      return { success: false, error: 'Escrow is already completed' };
    }
    if (escrow.status === EscrowStatus.Refunded) {
      return { success: false, error: 'Escrow is already refunded' };
    }
    if (escrow.status !== EscrowStatus.Funded && escrow.status !== EscrowStatus.Disputed) {
      return { success: false, error: 'Escrow is not in a funded state' };
    }

    escrow.status = EscrowStatus.Completed;
    this.mockLedgerState.set(engagementId, escrow);

    return {
      success: true,
      transactionHash: `tx_${Date.now()}_release_${engagementId}`,
      data: escrow,
    };
  }

  /**
   * Refunds escrow funds back to the depositor.
   */
  public async refund(
    engagementId: string,
    caller: string,
    signer?: Signer
  ): Promise<TransactionResult<Escrow>> {
    const escrow = this.mockLedgerState.get(engagementId);
    if (!escrow) {
      return { success: false, error: `Escrow '${engagementId}' not found` };
    }

    if (escrow.status === EscrowStatus.Completed) {
      return { success: false, error: 'Escrow is already completed' };
    }
    if (escrow.status === EscrowStatus.Refunded) {
      return { success: false, error: 'Escrow is already refunded' };
    }
    if (escrow.status !== EscrowStatus.Funded && escrow.status !== EscrowStatus.Disputed) {
      return { success: false, error: 'Escrow is not in a funded state' };
    }

    if (signer && signer.publicKey !== caller) {
      return { success: false, error: 'Unauthorized: Signer key mismatch' };
    }

    if (caller === escrow.depositor) {
      if (this.simulatedTimestamp < escrow.deadline) {
        return {
          success: false,
          error: 'DeadlineNotPassed: Cannot refund until deadline has passed',
        };
      }
    } else if (caller === escrow.arbiter || caller === escrow.beneficiary) {
      // Allowed
    } else {
      return { success: false, error: 'Unauthorized caller for refund' };
    }

    escrow.status = EscrowStatus.Refunded;
    this.mockLedgerState.set(engagementId, escrow);

    return {
      success: true,
      transactionHash: `tx_${Date.now()}_refund_${engagementId}`,
      data: escrow,
    };
  }

  /**
   * Raises a dispute on a funded escrow.
   */
  public async raiseDispute(
    engagementId: string,
    caller: string,
    reason: string,
    signer?: Signer
  ): Promise<TransactionResult<Escrow>> {
    const escrow = this.mockLedgerState.get(engagementId);
    if (!escrow) {
      return { success: false, error: `Escrow '${engagementId}' not found` };
    }

    if (caller !== escrow.depositor && caller !== escrow.beneficiary) {
      return { success: false, error: 'Unauthorized: Only depositor or beneficiary can dispute' };
    }

    if (signer && signer.publicKey !== caller) {
      return { success: false, error: 'Unauthorized: Signer key mismatch' };
    }

    if (escrow.status !== EscrowStatus.Funded) {
      return { success: false, error: 'Only funded escrows can be disputed' };
    }

    escrow.status = EscrowStatus.Disputed;
    escrow.disputeReason = reason;
    this.mockLedgerState.set(engagementId, escrow);

    return {
      success: true,
      transactionHash: `tx_${Date.now()}_dispute_${engagementId}`,
      data: escrow,
    };
  }

  /**
   * Resolves an active dispute by distributing funds as dictated by the arbiter.
   */
  public async resolveDispute(
    params: DisputeResolutionParams,
    signer?: Signer
  ): Promise<TransactionResult<Escrow>> {
    const escrow = this.mockLedgerState.get(params.engagementId);
    if (!escrow) {
      return { success: false, error: `Escrow '${params.engagementId}' not found` };
    }

    if (params.arbiter !== escrow.arbiter) {
      return { success: false, error: 'Unauthorized: Caller is not the designated arbiter' };
    }

    if (signer && signer.publicKey !== params.arbiter) {
      return { success: false, error: 'Unauthorized: Signer key mismatch' };
    }

    if (escrow.status !== EscrowStatus.Disputed) {
      return { success: false, error: 'Escrow is not in Disputed state' };
    }

    if (params.beneficiaryAmount < BigInt(0) || params.depositorAmount < BigInt(0)) {
      return { success: false, error: 'Resolution amounts must be non-negative' };
    }

    if (params.beneficiaryAmount + params.depositorAmount !== escrow.amount) {
      return {
        success: false,
        error: `Resolution amounts sum (${params.beneficiaryAmount + params.depositorAmount}) must equal total escrow amount (${escrow.amount})`,
      };
    }

    escrow.status = EscrowStatus.Resolved;
    this.mockLedgerState.set(params.engagementId, escrow);

    return {
      success: true,
      transactionHash: `tx_${Date.now()}_resolve_${params.engagementId}`,
      data: escrow,
    };
  }

  /**
   * Fetches escrow details.
   */
  public async getEscrow(engagementId: string): Promise<Escrow | null> {
    return this.mockLedgerState.get(engagementId) || null;
  }

  /**
   * Fetches escrow status.
   */
  public async getStatus(engagementId: string): Promise<EscrowStatus | null> {
    const escrow = this.mockLedgerState.get(engagementId);
    return escrow ? escrow.status : null;
  }
}
