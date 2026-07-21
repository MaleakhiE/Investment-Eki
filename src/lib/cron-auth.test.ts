import { verifyCronBearer } from './cron-auth';

describe('verifyCronBearer', () => {
  const request = (authorization?: string) => new Request('https://fintrack.example/api/jobs', {
    headers: authorization ? { authorization } : undefined,
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('fails closed when the server secret is missing', () => {
    expect(verifyCronBearer(request('Bearer anything'))).toBe(false);
  });

  it.each([undefined, '', 'Token secret', 'Bearer', 'Bearer wrong'])(
    'rejects a missing or malformed credential: %s',
    (authorization) => {
      process.env.CRON_SECRET = 'correct-secret';
      expect(verifyCronBearer(request(authorization))).toBe(false);
    },
  );

  it('accepts exactly one valid bearer credential', () => {
    process.env.CRON_SECRET = 'correct-secret';
    expect(verifyCronBearer(request('Bearer correct-secret'))).toBe(true);
  });
});
