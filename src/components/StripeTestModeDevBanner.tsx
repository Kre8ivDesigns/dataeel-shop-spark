import { isClientStripeTestMode } from "@/lib/stripeViteDev";

/**
 * Shown on Buy credits / Dashboard when `VITE_STRIPE_PUBLISHABLE_KEY` is set to a test key.
 */
export function StripeTestModeDevBanner() {
  if (!isClientStripeTestMode()) return null;
  return (
    <div
      role="status"
      className="text-xs sm:text-sm text-muted-foreground border border-border/80 bg-muted/35 rounded-md px-3 py-2 mb-4 max-w-3xl"
    >
      <span className="font-medium text-foreground/90">Test mode:</span> use card{" "}
      <span className="font-mono-data">4242 4242 4242 4242</span>; webhooks must reach your deployed{" "}
      <code className="text-[0.7rem] sm:text-xs bg-muted px-1 rounded">stripe-webhook</code> function.
    </div>
  );
}
