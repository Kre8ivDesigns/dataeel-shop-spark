import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Gift, Loader2, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeError } from "@/lib/errorHandler";
import { toast } from "sonner";

type ClaimFeedbackCreditResult = {
  credited: boolean;
  new_balance: number;
  already_claimed: boolean;
};

function parseOfferToken(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

const Feedback = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimFeedbackCreditResult | null>(null);
  const offerToken = parseOfferToken(searchParams.get("offer"));

  const signupHref = useMemo(() => {
    const redirect = encodeURIComponent(`/feedback${window.location.search || "?source=popup"}`);
    return `/auth?mode=signup&redirect=${redirect}`;
  }, []);

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      toast.error("Please share at least 10 characters of feedback.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("claim_feedback_credit", {
      p_offer_token: offerToken,
      p_message: trimmed,
    });
    setSubmitting(false);

    if (error) {
      toast.error(sanitizeError(error));
      return;
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      toast.error("We could not confirm the credit. Please contact support.");
      return;
    }

    setResult(row as ClaimFeedbackCreditResult);
    setMessage("");
    if (row.already_claimed) {
      toast.info("This feedback credit was already claimed.");
    } else {
      toast.success("Thanks for the feedback. We added 1 RaceCard credit to your account.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16">
        <PageHero
          backTo="/"
          backLabel="Back to Home"
          badge="Feedback"
          title={
            <>
              Tell us what would make <span className="text-neon">DATAEEL</span> better
            </>
          }
          subtitle="Share honest feedback and get one RaceCard credit added to your account before your first purchase."
          align="left"
          containerClassName="max-w-[1100px]"
          sectionClassName="pb-8"
        />

        <div className="container mx-auto max-w-[1100px] px-4 pt-6 md:pt-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Feedback credit
                </CardTitle>
                <CardDescription>
                  Tell us what brought you here, what confused you, or what would make you more likely to use a RaceCard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="space-y-5">
                    <div className="rounded-md border border-primary/30 bg-primary/10 p-4">
                      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                        <Gift className="h-5 w-5 text-primary" />
                        Register to claim the credit
                      </div>
                      <p className="text-sm text-muted-foreground">
                        The RaceCard credit is tied to your DATAEEL account, so registration is required before we can add it.
                      </p>
                    </div>
                    <Button asChild className="w-full bg-primary text-primary-foreground">
                      <Link to={signupHref}>Create account and give feedback</Link>
                    </Button>
                  </div>
                ) : result ? (
                  <div className="rounded-md border border-success/30 bg-success/10 p-5">
                    <div className="mb-2 flex items-center gap-2 font-semibold text-success">
                      <ShieldCheck className="h-5 w-5" />
                      {result.already_claimed ? "Credit already claimed" : "Credit added"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your current RaceCard credit balance is {result.new_balance}. Thanks for helping us improve DATAEEL.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submitFeedback} className="space-y-4">
                    <Textarea
                      required
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={8}
                      maxLength={5000}
                      placeholder="What made you register? What would make the product easier to trust, understand, or use?"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        One feedback credit per account. Available before your first purchase.
                      </p>
                      <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Submit feedback
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">What you get</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>One RaceCard credit after you submit feedback on this page.</span>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>The credit is applied directly to your registered account.</span>
                </div>
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Your feedback goes into the admin support inbox for review.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Feedback;
