/**
 * Pure helpers for admin credit ledger display and CSV export.
 */

import type { Json } from "@/integrations/supabase/types";

function metaRecord(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

export function emailByUserIdFromProfiles(
  profiles: readonly { user_id: string; email: string }[],
): Record<string, string> {
  return Object.fromEntries(profiles.map((p) => [p.user_id, p.email]));
}

/** Human-readable label for DB entry_type (snake_case → Title Case words). */
export function creditLedgerEntryTypeLabel(entryType: string): string {
  return entryType
    .split("_")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** Short note derived from ledger row meta (unlimited purchases/downloads). */
export function creditLedgerDetailFromMeta(meta: Json | null | undefined): string {
  const m = metaRecord(meta);
  if (m.unlimited_grant === true) return "Unlimited access granted";
  if (m.unlimited === true) return "No credits charged (unlimited)";
  if (m.unlimited_credits === true) return "Unlimited plan assigned by admin";
  if (m.unlimited_credits === false) return "Unlimited plan removed by admin";
  return "";
}

/** Δ column: emphasize zero-delta unlimited rows without hiding the number. */
export function formatLedgerDelta(delta: number, meta: Json | null | undefined): string {
  const m = metaRecord(meta);
  if (m.unlimited_grant === true && delta === 0) return "0 (∞)";
  if (m.unlimited === true && delta === 0) return "0 (∞)";
  if (typeof m.unlimited_credits === "boolean" && delta === 0) return "0 (∞)";
  return String(delta);
}

/** Balance column: suffix when this row reflects unlimited grant context. */
export function formatLedgerBalance(balanceAfter: number, meta: Json | null | undefined): string {
  const m = metaRecord(meta);
  if (m.unlimited_grant === true) return `${balanceAfter} (∞)`;
  if (m.unlimited_credits === true) return `${balanceAfter} (∞)`;
  return String(balanceAfter);
}

export function creditLedgerUserDisplay(
  userId: string,
  emailByUserId: Record<string, string>,
): string {
  const email = emailByUserId[userId];
  if (email) return email;
  return userId.length >= 8 ? userId.slice(0, 8) : userId;
}
