import { FargoRateClient, parseFargoSearchPayload } from './fargo-rate.client';

describe('FargoRateClient', () => {
  it('returns empty for short queries without calling fetch', async () => {
    const fetchMock = jest.fn() as unknown as typeof fetch;
    const client = new FargoRateClient(fetchMock);
    await expect(client.search('x')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses a bare array search payload', () => {
    const rows = parseFargoSearchPayload([
      { firstName: 'Pat', lastName: 'Lee', rating: 501, robustness: 12, readableId: '9' },
    ]);
    expect(rows[0].rating).toBe(501);
    expect(rows[0].name).toBe('Pat Lee');
  });
});
