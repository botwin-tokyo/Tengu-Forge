import { afterEach, expect, it, vi } from 'vitest';
import { sendHTTPAction } from '@/lib/sendHTTPAction';

afterEach(() => vi.unstubAllGlobals());

it('sends only the action ID to the configured backend', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({status: 201, preview: 'created', truncated: false}));
  vi.stubGlobal('fetch', fetcher);
  expect(await sendHTTPAction('/api', {}, 'one/two')).toBe('HTTP 201\ncreated');
  expect(fetcher.mock.calls[0][0]).toBe('/api/http-actions/one%2Ftwo/send');
});

it('displays destination approval errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({detail: 'Destination not approved'}, {status: 403})));
  await expect(sendHTTPAction('/api', {}, 'one')).rejects.toThrow('Destination not approved');
});
