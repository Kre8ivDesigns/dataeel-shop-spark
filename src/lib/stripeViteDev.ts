/**
 * Optional Vite env for developer UX: checkout uses server-side Stripe keys;
 * this is only used to show a test-mode hint when the publishable key is a test key.
 */
export function parseStripePublishableMode(
  key: string | undefined,
): "test" | "live" | "unset" {
  const k = key?.trim();
  if (!k) return "unset";
  if (k.startsWith("pk_test_")) return "test";
  return "live";
}

export function getClientStripePublishableKey(): string | undefined {
  const k = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  return k || undefined;
}

export function hasClientStripePublishableKey(): boolean {
  return parseStripePublishableMode(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) !== "unset";
}

export function isClientStripeTestMode(): boolean {
  return parseStripePublishableMode(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) === "test";
}
