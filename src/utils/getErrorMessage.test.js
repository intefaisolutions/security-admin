import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './getErrorMessage';

describe('getErrorMessage', () => {
  it('extracts message from axios error response', () => {
    const error = {
      response: {
        data: {
          message: 'Validation failed'
        }
      }
    };
    expect(getErrorMessage(error)).toBe('Validation failed');
  });

  it('falls back to error message if response data message is missing', () => {
    const error = {
      message: 'Network error'
    };
    expect(getErrorMessage(error)).toBe('Network error');
  });

  it('uses fallback message when no error message is available', () => {
    const error = {};
    expect(getErrorMessage(error)).toBe('Something went wrong. Please try again.');
  });

  it('uses custom fallback message', () => {
    const error = {};
    expect(getErrorMessage(error, 'Custom error')).toBe('Custom error');
  });

  it('handles null error', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });

  it('handles undefined error', () => {
    expect(getErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
