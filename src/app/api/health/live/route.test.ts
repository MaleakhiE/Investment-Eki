import { GET } from './route';

describe('GET /api/health/live', () => {
  it('reports the process as live without consulting external dependencies', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Live',
      responseDetails: { status: 'ok' },
    });
  });
});
