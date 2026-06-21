const UUID_STRING_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StripeSubscriptionLike = {
  id?: unknown;
  status?: unknown;
  customer?: unknown;
  metadata?: Record<string, string> | null;
};

export function stripeObjectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const maybeId = (value as { id?: unknown }).id;
  return typeof maybeId === "string" ? maybeId : null;
}

export function normalizeMetadataUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  return UUID_STRING_RE.test(s) ? s : null;
}

export function subscriptionCustomerId(subscription: StripeSubscriptionLike): string | null {
  return stripeObjectId(subscription.customer);
}

export function subscriptionMetadataUserId(subscription: StripeSubscriptionLike): string | null {
  return normalizeMetadataUuid(subscription.metadata?.user_id);
}

export function subscriptionMetadataMarksUnlimited(subscription: StripeSubscriptionLike): boolean {
  return subscription.metadata?.unlimited_credits === "true";
}

export function shouldRemoveUnlimitedForSubscription(subscription: StripeSubscriptionLike): boolean {
  return ["canceled", "unpaid", "incomplete_expired", "paused"].includes(String(subscription.status ?? ""));
}
