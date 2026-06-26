import { describe, test, expect, beforeEach } from 'vitest';

import { getAccessToken, setAccessToken, clearAccessToken } from '../token-store';

describe('token-store', () => {
  beforeEach(() => {
    clearAccessToken();
  });

  test('starts empty', () => {
    expect(getAccessToken()).toBeNull();
  });

  test('stores and returns the access token', () => {
    setAccessToken('jwt-abc');
    expect(getAccessToken()).toBe('jwt-abc');
  });

  test('clearing removes the token', () => {
    setAccessToken('jwt-abc');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  test('setting null clears the token', () => {
    setAccessToken('jwt-abc');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});
