import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { trackSiteEvent } from "@/lib/siteAnalytics";

const FIRST_SEEN_KEY = "dataeel.sampleOffer.firstSeenAt";
const DISMISSED_UNTIL_KEY = "dataeel.sampleOffer.dismissedUntil";
const CONVERTED_KEY = "dataeel.sampleOffer.converted";
const NEW_VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000;
const DISMISS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const TIME_TRIGGER_MS = 30_000;
const SCROLL_TRIGGER_DEPTH = 45;

function getNumberFromStorage(key: string): number | null {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setNumberInStorage(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Ignore private browsing and storage-denied modes.
  }
}

function isSuppressed(now: number): boolean {
  try {
    if (window.localStorage.getItem(CONVERTED_KEY) === "true") return true;
  } catch {
    return false;
  }

  const dismissedUntil = getNumberFromStorage(DISMISSED_UNTIL_KEY);
  return Boolean(dismissedUntil && dismissedUntil > now);
}

export function NewVisitorRacecardOffer() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const hasTrackedView = useRef(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    setOpen(false);
    hasTrackedView.current = false;
    hasTriggered.current = false;

    if (user) return;
    if (!["/", "/racecards", "/pricing"].includes(location.pathname)) return;
    if (typeof window === "undefined") return;

    const now = Date.now();
    if (isSuppressed(now)) return;

    let firstSeenAt = getNumberFromStorage(FIRST_SEEN_KEY);
    if (!firstSeenAt) {
      firstSeenAt = now;
      setNumberInStorage(FIRST_SEEN_KEY, firstSeenAt);
    }
    if (now - firstSeenAt > NEW_VISITOR_WINDOW_MS) return;

    const triggerOffer = (trigger: "time" | "scroll" | "exit_intent") => {
      if (hasTriggered.current || isSuppressed(Date.now())) return;
      hasTriggered.current = true;
      setOpen(true);
      if (!hasTrackedView.current) {
        hasTrackedView.current = true;
        void trackSiteEvent("popup_viewed", { popup: "feedback_credit", trigger, path: location.pathname }, user?.id);
      }
    };

    const timer = window.setTimeout(() => triggerOffer("time"), TIME_TRIGGER_MS);

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = Math.round((window.scrollY / scrollable) * 100);
      if (depth >= SCROLL_TRIGGER_DEPTH) triggerOffer("scroll");
    };

    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0) triggerOffer("exit_intent");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [location.pathname, user]);

  const dismiss = (reason: "dismiss_button" | "outside") => {
    setOpen(false);
    setNumberInStorage(DISMISSED_UNTIL_KEY, Date.now() + DISMISS_WINDOW_MS);
    void trackSiteEvent("popup_dismissed", { popup: "feedback_credit", reason, path: location.pathname }, user?.id);
  };

  const convert = () => {
    try {
      window.localStorage.setItem(CONVERTED_KEY, "true");
    } catch {
      // Ignore storage-denied modes.
    }
    void trackSiteEvent("popup_converted", { popup: "feedback_credit", path: location.pathname }, user?.id);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismiss("outside"))}>
      <DialogContent className="max-w-[calc(100vw-2rem)] border-primary/30 bg-card p-0 shadow-[0_0_48px_-18px_hsl(var(--primary)/0.8)] sm:max-w-lg">
        <div className="overflow-hidden rounded-lg">
          <div className="bg-gradient-to-br from-primary/20 via-card to-card px-6 pb-5 pt-7 sm:px-7">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="pr-10 font-heading text-2xl leading-tight text-foreground">
                Get 1 RaceCard credit for your feedback
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Register, tell us what would make DATAEEL easier to trust or use, and we&apos;ll add one RaceCard
                credit to your account before your first purchase.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 pb-6 pt-5 sm:px-7">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>One feedback credit per registered account.</span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Your feedback helps us improve before you spend money.</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 flex-1 bg-primary text-primary-foreground shadow-neon hover:brightness-110">
                <Link to="/feedback?source=popup" onClick={convert}>
                  Claim feedback credit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 border-border"
                onClick={() => dismiss("dismiss_button")}
              >
                No thanks
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
