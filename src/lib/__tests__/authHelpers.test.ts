import { describe, test, expect } from 'vitest';

import {
  encode,
  decode,
  hash,
  sanitizeUser,
  requireAdmin,
  AUTH_COOKIE,
} from '../authHelpers';

describe('encode / decode', () => {
  test('round-trips an object back to its original value', () => {
    const obj = { id: '123', roles: ['User'], nested: { a: 1 } };
    expect(decode(encode(obj))).toEqual(obj);
  });

  test('encode produces a base64 string (no raw JSON braces)', () => {
    const encoded = encode({ hello: 'world' });
    expect(typeof encoded).toBe('string');
    expect(encoded).not.toContain('{');
  });
});

describe('hash', () => {
  test('is deterministic for the same input', () => {
    expect(hash('abc')).toBe(hash('abc'));
  });

  test('differs for different inputs', () => {
    expect(hash('abc')).not.toBe(hash('abd'));
  });

  test('returns an unsigned integer string', () => {
    expect(hash('anything')).toMatch(/^\d+$/);
  });
});

describe('sanitizeUser', () => {
  test('strips password and iat but keeps everything else', () => {
    const user = { id: '1', name: 'Kastriot', password: 'secret', iat: 123 };
    const result = sanitizeUser(user);
    expect(result).toEqual({ id: '1', name: 'Kastriot' });
    expect('password' in result).toBe(false);
    expect('iat' in result).toBe(false);
  });
});

describe('requireAdmin', () => {
  test('does not throw for an Admin', () => {
    expect(() => requireAdmin({ roles: ['Admin'] })).not.toThrow();
  });

  test('does not throw for a SuperAdmin', () => {
    expect(() => requireAdmin({ roles: ['SuperAdmin'] })).not.toThrow();
  });

  test('throws for a regular user', () => {
    expect(() => requireAdmin({ roles: ['User'] })).toThrow('Unauthorized');
  });

  test('throws when the user or roles are missing', () => {
    expect(() => requireAdmin(undefined)).toThrow('Unauthorized');
    expect(() => requireAdmin({})).toThrow('Unauthorized');
  });
});

describe('AUTH_COOKIE', () => {
  test('is the expected cookie name', () => {
    expect(AUTH_COOKIE).toBe('quiz_app_token');
  });
});
