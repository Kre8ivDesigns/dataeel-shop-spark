export function sanitizeError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'An error occurred. Please try again or contact support';
  }

  const err = error as { message?: string; code?: string };
  const msg = (err.message || '').toLowerCase();

  if (msg.includes('invalid login')) return 'Invalid email or password';
  if (msg.includes('email not confirmed')) return 'Please check your email and confirm your account';
  if (msg.includes('user already registered')) return 'Unable to complete registration. Please try logging in or contact support';
  if (msg.includes('bucket') || msg.includes('storage') || msg.includes('s3')) return 'File operation failed. Please try again';
  if (msg.includes('violates') || msg.includes('constraint') || msg.includes('duplicate key')) return 'Data validation failed. Please check your input';
  if (msg.includes('policy') || msg.includes('permission') || msg.includes('denied')) return 'You do not have permission to perform this action';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait and try again';
  if (msg.includes('timeout') || msg.includes('timed out')) return 'The request timed out. Please try again';
  if (msg.includes('network') || msg.includes('fetch')) return 'A network error occurred. Please check your connection';

  return 'An error occurred. Please try again or contact support';
}
