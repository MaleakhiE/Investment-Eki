jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/investment.service', () => ({ saveSnapshot: jest.fn() }));

import { getCurrentUserId } from '@/lib/auth';
import { saveSnapshot } from '@/services/investment.service';
import { POST } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedSave = jest.mocked(saveSnapshot);
const validBody = {
  type: 'GOLD', month: '2026-07', invested_amount: 100, current_value: 110,
  platform: 'vault', product_name: 'gold', units: '1', nav_per_unit: '110', create_transaction: false,
};

beforeEach(() => { jest.clearAllMocks(); mockedUserId.mockResolvedValue(BigInt(7)); });

it('keeps investment snapshot failures private and classifies unknown errors', async () => {
  mockedSave.mockRejectedValue(new Error('private snapshot amount and SQL details'));
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const response = await POST(new Request('http://localhost/api/investments/snapshot', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validBody),
  }) as never);

  expect(response.status).toBe(500);
  expect(errorLog).toHaveBeenCalledWith('Error saving investment snapshot:', { code: 'UNCLASSIFIED' });
  expect(errorLog.mock.calls.flat().join(' ')).not.toContain('private snapshot amount and SQL details');
  errorLog.mockRestore();
});
