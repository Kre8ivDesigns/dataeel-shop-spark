export function sanitizeError(error: any): string {
  const msg = error?.message || '';
  
  if (msg.includes('Invalid login')) return 'Invalid email or password';
  if (msg.includes('Email not confirmed')) return 'Please check your email and confirm your account';
  if (msg.includes('User already registered')) return 'Unable to complete registration. Please try logging in or contact support';
  if (msg.includes('Bucket') || msg.includes('storage')) return 'File operation failed. Please try again';
  if (msg.includes('violates') || msg.includes('constraint')) return 'Data validation failed. Please check your input';
  if (msg.includes('policy') || msg.includes('permission')) return 'You do not have permission to perform this action';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait and try again';
  
  return 'An error occurred. Please try again or contact support';
}
