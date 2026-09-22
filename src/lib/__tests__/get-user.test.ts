import { describe, test, expect, beforeEach, vi } from 'vitest';

// getUser's whole job is choosing how few round trips it can get away with on a page load
// (docs/auth/session-hint.md). These tests pin that choice: which endpoint it calls, and
// which answers mean "signed out" versus "something is actually broken".

const apiGet = vi.fn();
const refreshSession = vi.fn();
const hasSessionHint = vi.fn();

vi.mock('../Api-client', () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
  apiService: { get: vi.fn(), post: vi.fn() },
  refreshSession: () => refreshSession(),
}));

vi.mock('../session-hint', () => ({
  hasSessionHint: () => hasSessionHint(),
}));

import { getUser } from '../Auth';
import { setAccessToken, clearAccessToken } from '../token-store';

const user = { id: 'u1', username: 'kastriot', roles: ['User'], permissions: [] };
// Shaped like axios errors, which is what getUser inspects (via isAxiosError).
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });
// axios: no `response` when nothing answered.
const networkError = () => Object.assign(new Error('Network Error'), { isAxiosError: true });

describe('getUser', () => {
  beforeEach(() => {
    apiGet.mockReset();
    refreshSession.mockReset();
    hasSessionHint.mockReset();
    clearAccessToken();
  });

  describe('page load (no access token in memory)', () => {
    test('without the session hint: answers null and makes no request at all', async () => {
      hasSessionHint.mockReturnValue(false);

      await expect(getUser()).resolves.toBeNull();
      expect(refreshSession).not.toHaveBeenCalled();
      expect(apiGet).not.toHaveBeenCalled();
    });

    test('with the hint: resumes the session with /refresh alone, never /me', async () => {
      hasSessionHint.mockReturnValue(true);
      refreshSession.mockResolvedValue({ token: 'jwt', user });

      await expect(getUser()).resolves.toEqual(user);
      expect(refreshSession).toHaveBeenCalledTimes(1);
      expect(apiGet).not.toHaveBeenCalled();
    });

    test('with a stale hint: a 401 from /refresh means signed out, not an error', async () => {
      hasSessionHint.mockReturnValue(true);
      refreshSession.mockRejectedValue(httpError(401));

      await expect(getUser()).resolves.toBeNull();
    });

    test('a rate-limited /refresh (429) also degrades to signed out', async () => {
      hasSessionHint.mockReturnValue(true);
      refreshSession.mockRejectedValue(httpError(429));

      await expect(getUser()).resolves.toBeNull();
    });

    test('an unreachable API is a real failure and propagates', async () => {
      hasSessionHint.mockReturnValue(true);
      refreshSession.mockRejectedValue(networkError());

      await expect(getUser()).rejects.toThrow('Network Error');
    });
  });

  describe('mid-session (access token in memory)', () => {
    beforeEach(() => setAccessToken('jwt'));

    test('asks /me and ignores the hint', async () => {
      apiGet.mockResolvedValue({ data: user });

      await expect(getUser()).resolves.toEqual(user);
      expect(apiGet).toHaveBeenCalledWith('Authentication/me');
      expect(hasSessionHint).not.toHaveBeenCalled();
      expect(refreshSession).not.toHaveBeenCalled();
    });

    test('a 401 from /me means signed out', async () => {
      apiGet.mockRejectedValue(httpError(401));

      await expect(getUser()).resolves.toBeNull();
    });

    test('any other /me failure propagates', async () => {
      apiGet.mockRejectedValue(httpError(500));

      await expect(getUser()).rejects.toThrow('HTTP 500');
    });
  });
});
