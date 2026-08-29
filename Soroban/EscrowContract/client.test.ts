import {
  EscrowClient,
  EscrowStatus,
  CreateEscrowParams,
  DisputeResolutionParams,
} from './client';

describe('Soroban Escrow TypeScript SDK Client', () => {
  const contractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
  const rpcUrl = 'https://soroban-testnet.stellar.org';
  let client: EscrowClient;

  const depositor = 'GBZXN7PIRZGNMHGA7282KFG2GU2N8N8D7A8S9D9A8D7S6A5S4D3F2G1H';
  const beneficiary = 'GCL6OXAMLD75BMTINA6EMRUDWK5THQUSHMYNLSNBCJAPZJHNYJTUNIBC';
  const arbiter = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GIOVPXDUM25GLXFC5YLM';
  const token = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

  beforeEach(() => {
    client = new EscrowClient({
      contractId,
      rpcUrl,
    });
    client.setSimulatedTimestamp(BigInt(1000));
  });

  describe('Initialization & Configuration', () => {
    it('initializes client with valid configuration', () => {
      expect(client.getContractId()).toBe(contractId);
      expect(client.getRpcUrl()).toBe(rpcUrl);
      expect(client.getNetworkPassphrase()).toContain('September 2015');
    });

    it('throws error when contract ID is missing or empty', () => {
      expect(() => new EscrowClient({ contractId: '', rpcUrl })).toThrow(
        'Contract ID is required'
      );
    });
  });

  describe('Escrow Creation & Lifecycle', () => {
    const validParams: CreateEscrowParams = {
      engagementId: 'bounty_eng_001',
      depositor,
      beneficiary,
      arbiter,
      token,
      amount: BigInt(500000000), // 50 XLM
      deadline: BigInt(2000),
    };

    it('creates and funds an escrow successfully', async () => {
      const res = await client.createEscrow(validParams);
      expect(res.success).toBe(true);
      expect(res.transactionHash).toBeDefined();
      expect(res.data).toBeDefined();
      expect(res.data?.status).toBe(EscrowStatus.Funded);
      expect(res.data?.amount).toBe(BigInt(500000000));

      const fetched = await client.getEscrow('bounty_eng_001');
      expect(fetched).not.toBeNull();
      expect(fetched?.engagementId).toBe('bounty_eng_001');

      const status = await client.getStatus('bounty_eng_001');
      expect(status).toBe(EscrowStatus.Funded);
    });

    it('rejects duplicate escrow creation with same engagement ID', async () => {
      await client.createEscrow(validParams);
      const resDup = await client.createEscrow(validParams);
      expect(resDup.success).toBe(false);
      expect(resDup.error).toContain('already exists');
    });

    it('validates amount must be positive', async () => {
      const invalidParams = { ...validParams, amount: BigInt(0) };
      const res = await client.createEscrow(invalidParams);
      expect(res.success).toBe(false);
      expect(res.error).toContain('strictly greater than 0');
    });

    it('validates deadline must be strictly in the future', async () => {
      const pastDeadlineParams = { ...validParams, deadline: BigInt(500) };
      const res = await client.createEscrow(pastDeadlineParams);
      expect(res.success).toBe(false);
      expect(res.error).toContain('must be in the future');
    });

    it('disallows self-engagement where depositor is beneficiary', async () => {
      const selfParams = { ...validParams, beneficiary: depositor };
      const res = await client.createEscrow(selfParams);
      expect(res.success).toBe(false);
      expect(res.error).toContain('cannot be the same address');
    });
  });

  describe('Release & Completion', () => {
    beforeEach(async () => {
      await client.createEscrow({
        engagementId: 'bounty_eng_002',
        depositor,
        beneficiary,
        arbiter,
        token,
        amount: BigInt(1000),
        deadline: BigInt(3000),
      });
    });

    it('allows depositor to release funds to beneficiary', async () => {
      const res = await client.releaseFunds('bounty_eng_002', depositor);
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe(EscrowStatus.Completed);

      const status = await client.getStatus('bounty_eng_002');
      expect(status).toBe(EscrowStatus.Completed);
    });

    it('allows arbiter to release funds to beneficiary', async () => {
      const res = await client.releaseFunds('bounty_eng_002', arbiter);
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe(EscrowStatus.Completed);
    });

    it('rejects unauthorized third-party release', async () => {
      const hacker = 'GHACKER99999999999999999999999999999999999999999999999999';
      const res = await client.releaseFunds('bounty_eng_002', hacker);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
    });

    it('prevents double-release after completion', async () => {
      await client.releaseFunds('bounty_eng_002', depositor);
      const res = await client.releaseFunds('bounty_eng_002', depositor);
      expect(res.success).toBe(false);
      expect(res.error).toContain('already completed');
    });
  });

  describe('Refund Mechanism', () => {
    beforeEach(async () => {
      await client.createEscrow({
        engagementId: 'bounty_eng_003',
        depositor,
        beneficiary,
        arbiter,
        token,
        amount: BigInt(1000),
        deadline: BigInt(2000),
      });
    });

    it('prevents depositor refund before deadline expiration', async () => {
      client.setSimulatedTimestamp(BigInt(1500));
      const res = await client.refund('bounty_eng_003', depositor);
      expect(res.success).toBe(false);
      expect(res.error).toContain('DeadlineNotPassed');
    });

    it('allows depositor refund after deadline expiration', async () => {
      client.setSimulatedTimestamp(BigInt(2500));
      const res = await client.refund('bounty_eng_003', depositor);
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe(EscrowStatus.Refunded);

      const status = await client.getStatus('bounty_eng_003');
      expect(status).toBe(EscrowStatus.Refunded);
    });

    it('allows beneficiary to trigger voluntary refund at any time', async () => {
      client.setSimulatedTimestamp(BigInt(1200));
      const res = await client.refund('bounty_eng_003', beneficiary);
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe(EscrowStatus.Refunded);
    });
  });

  describe('Dispute & Arbiter Resolution', () => {
    beforeEach(async () => {
      await client.createEscrow({
        engagementId: 'bounty_eng_004',
        depositor,
        beneficiary,
        arbiter,
        token,
        amount: BigInt(1000),
        deadline: BigInt(5000),
      });
    });

    it('allows depositor or beneficiary to raise dispute', async () => {
      const res = await client.raiseDispute(
        'bounty_eng_004',
        depositor,
        'Scope delivered partially'
      );
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe(EscrowStatus.Disputed);
      expect(res.data?.disputeReason).toBe('Scope delivered partially');
    });

    it('allows arbiter to resolve dispute with split payout', async () => {
      await client.raiseDispute(
        'bounty_eng_004',
        beneficiary,
        'Milestone unpaid'
      );

      const resolution: DisputeResolutionParams = {
        arbiter,
        engagementId: 'bounty_eng_004',
        beneficiaryAmount: BigInt(700),
        depositorAmount: BigInt(300),
      };

      const res = await client.resolveDispute(resolution);
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe(EscrowStatus.Resolved);

      const status = await client.getStatus('bounty_eng_004');
      expect(status).toBe(EscrowStatus.Resolved);
    });

    it('rejects dispute resolution where split sum does not match escrow amount', async () => {
      await client.raiseDispute(
        'bounty_eng_004',
        beneficiary,
        'Milestone unpaid'
      );

      const invalidResolution: DisputeResolutionParams = {
        arbiter,
        engagementId: 'bounty_eng_004',
        beneficiaryAmount: BigInt(600),
        depositorAmount: BigInt(600), // sum = 1200 != 1000
      };

      const res = await client.resolveDispute(invalidResolution);
      expect(res.success).toBe(false);
      expect(res.error).toContain('must equal total escrow amount');
    });
  });
});
