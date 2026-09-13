import { describe, expect, it } from 'vitest';
import { generateTempPassword } from './temp-password';

describe('generateTempPassword', () => {
  it('is 16 characters without ambiguous characters', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTempPassword();
      expect(pw).toHaveLength(16);
      expect(pw).not.toMatch(/[0O1lI]/);
    }
  });

  it('is not repeated', () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });

  it('rejects lengths below 12', () => {
    expect(() => generateTempPassword(1)).toThrow(
      'Temporary password length must be at least 12 characters'
    );
  });

  it('accepts length 12', () => {
    const pw = generateTempPassword(12);
    expect(pw).toHaveLength(12);
    expect(pw).not.toMatch(/[0O1lI]/);
  });
});
