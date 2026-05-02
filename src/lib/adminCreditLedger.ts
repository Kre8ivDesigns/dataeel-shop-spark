/**
 * Pure helpers for admin credit ledger display and CSV export.
 */

export function emailByUserIdFromProfiles(
  profiles: readonly { user_id: string; email: string }[],
): Record<string, string> {
  return Object.fromEntries(profiles.map((p) => [p.user_id, p.email]));
}

/** Human-readable label for DB entry_type (snake_case → words). */
export function creditLedgerEntryTypeLabel(entryType: string): string {
  return entryType.replace(/_/g, " ");
}

export function creditLedgerUserDisplay(
  userId: string,
  emailByUserId: Record<string, string>,
): string {
  const email = emailByUserId[userId];
  if (email) return email;
  return userId.length >= 8 ? userId.slice(0, 8) : userId;
}
