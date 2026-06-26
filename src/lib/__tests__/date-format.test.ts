import { describe, test, expect } from 'vitest';

import formatDate from '../date-format';

describe('formatDate', () => {
  test('formats a valid ISO datetime as "MMMM d, yyyy"', () => {
    // Midday UTC keeps the calendar day stable across timezones.
    expect(formatDate('2025-01-15T12:00:00Z')).toBe('January 15, 2025');
  });

  test.each([null, undefined, ''])('returns a fallback for missing input (%s)', (input) => {
    expect(formatDate(input as string | null | undefined)).toBe('no date provided');
  });

  test('returns a fallback for an unparseable date', () => {
    expect(formatDate('not-a-date')).toBe('no date provided');
  });
});
