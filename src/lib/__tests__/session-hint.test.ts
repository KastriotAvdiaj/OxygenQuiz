import { describe, test, expect, afterEach } from 'vitest';

import { hasSessionHint } from '../session-hint';

// jsdom's document.cookie behaves like a browser's: writing appends one cookie, and an
// expiry in the past deletes it.
const setCookie = (pair: string) => {
  document.cookie = `${pair}; path=/`;
};
const clearCookie = (name: string) => {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

describe('hasSessionHint', () => {
  afterEach(() => {
    clearCookie('has_session');
    clearCookie('other');
    clearCookie('not_has_session');
  });

  test('is false with no cookies at all', () => {
    expect(hasSessionHint()).toBe(false);
  });

  test('is true when the backend has set has_session=1', () => {
    setCookie('has_session=1');
    expect(hasSessionHint()).toBe(true);
  });

  test('finds the hint among other cookies', () => {
    setCookie('other=abc');
    setCookie('has_session=1');
    expect(hasSessionHint()).toBe(true);
  });

  test('does not match a cookie whose name merely ends in has_session', () => {
    setCookie('not_has_session=1');
    expect(hasSessionHint()).toBe(false);
  });

  test('is false once the cookie has been cleared', () => {
    setCookie('has_session=1');
    clearCookie('has_session');
    expect(hasSessionHint()).toBe(false);
  });
});
