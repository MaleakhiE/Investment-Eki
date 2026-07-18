jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/account.service', () => ({
  getAccounts: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  archiveAccount: jest.fn(),
}));
jest.mock('@/services/transaction.service', () => ({ createTransfer: jest.fn() }));

import { getCurrentUserId } from '@/lib/auth';
import { createAccount, getAccounts } from '@/services/account.service';
import { createTransfer } from '@/services/transaction.service';
import { GET, POST } from './route';
import { POST as POST_TRANSFER } from './transfer/route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedGetAccounts = jest.mocked(getAccounts);
const mockedCreateAccount = jest.mocked(createAccount);
const mockedCreateTransfer = jest.mocked(createTransfer);

beforeEach(() => jest.clearAllMocks());

describe('/api/accounts', () => {
  it('rejects unauthenticated reads', async () => {
    mockedUserId.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('serializes account IDs for authenticated reads', async () => {
    mockedUserId.mockResolvedValue(BigInt(7));
    mockedGetAccounts.mockResolvedValue([{ id: BigInt(3), user_id: BigInt(7), name: 'BCA' }] as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.responseDetails[0]).toEqual(expect.objectContaining({ id: '3', user_id: '7', name: 'BCA' }));
  });

  it('creates an account through the domain service', async () => {
    mockedUserId.mockResolvedValue(BigInt(7));
    mockedCreateAccount.mockResolvedValue({
      success: true,
      account: { id: BigInt(4), user_id: BigInt(7), name: 'Mandiri' },
    } as never);

    const response = await POST(new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Mandiri', type: 'BANK', opening_balance: 100000 }),
    }) as never);

    expect(response.status).toBe(201);
    expect(mockedCreateAccount).toHaveBeenCalledWith(BigInt(7), expect.objectContaining({ name: 'Mandiri' }));
  });
});

describe('POST /api/accounts/transfer', () => {
  it('returns validation errors from the transfer service', async () => {
    mockedUserId.mockResolvedValue(BigInt(7));
    mockedCreateTransfer.mockResolvedValue({ success: false, error: 'Source and destination accounts must be different' });

    const response = await POST_TRANSFER(new Request('http://localhost/api/accounts/transfer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source_account_id: '1', destination_account_id: '1', amount: 10, date: '2026-07-17' }),
    }) as never);

    expect(response.status).toBe(400);
    expect((await response.json()).responseDetails.errors).toContain('Source and destination accounts must be different');
  });

  it('serializes a successful transfer', async () => {
    mockedUserId.mockResolvedValue(BigInt(7));
    mockedCreateTransfer.mockResolvedValue({
      success: true,
      transaction: { id: BigInt(9), user_id: BigInt(7), account_id: BigInt(1), destination_account_id: BigInt(2) },
    } as never);

    const response = await POST_TRANSFER(new Request('http://localhost/api/accounts/transfer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source_account_id: '1', destination_account_id: '2', amount: 10, date: '2026-07-17', description: '' }),
    }) as never);

    expect(response.status).toBe(201);
    expect((await response.json()).responseDetails).toEqual(expect.objectContaining({
      id: '9', account_id: '1', destination_account_id: '2',
    }));
  });
});
