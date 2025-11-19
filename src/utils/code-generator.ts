/**
 * Utility functions for generating secure codes and tokens
 */

/**
 * Generate a 6-digit alphanumeric code (uppercase letters and numbers)
 * Example: A5B9C2, X3Y7Z1, etc.
 */
export function generate6DigitCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Generate a secure random token for longer-term use
 */
export function generateSecureToken(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Check if a code matches the expected format (6 alphanumeric characters)
 */
export function isValidVerificationCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}
