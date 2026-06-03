import { EscrowClient, EscrowConfig } from './client';

describe('EscrowClient', () => {
  let client: EscrowClient;

  beforeEach(() => {
    client = new EscrowClient('TEST_CONTRACT_ID');
  });

  test('should initialize client', () => {
    expect(client).toBeDefined();
  });

  test('should create escrow config', () => {
    const config: EscrowConfig = {
      buyer: 'GBUYER123',
      seller: 'GSELLER456',
      amount: '10000000',
      token: 'CAS3J7GYLGXMF6TDJBBDEDNGKP4TIGV4G5HAW3A2HYMDHW7MYHGS7Y7',
      timeout: 3600,
    };
    expect(config.buyer).toBe('GBUYER123');
    expect(config.amount).toBe('10000000');
  });

  test('should initialize escrow', async () => {
    const config: EscrowConfig = {
      buyer: 'GBUYER123',
      seller: 'GSELLER456',
      amount: '5000000',
      token: 'CAS3J7GYLGXMF6TDJBBDEDNGKP4TIGV4G5HAW3A2HYMDHW7MYHGS7Y7',
      timeout: 7200,
    };
    const id = await client.initialize(config);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });
});
