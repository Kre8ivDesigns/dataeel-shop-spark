import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeError } from "@/lib/errorHandler";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck, ShieldOff, Copy, CheckCircle2, Mail, FlaskConical } from "lucide-react";
import { hasClientStripePublishableKey } from "@/lib/stripeViteDev";

type MfaStep = "idle" | "enrolling" | "verifying";

interface EnrollData {
  factorId: string;
  qrCode: string;
  secret: string;
}

interface TotpFactor {
  id: string;
  friendly_name?: string;
  status: string;
}

const AccountSettings = () => {
  const { user } = useAuth();

  // ── Email ──────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailLoading, setEmailLoading] = useState(false);

  // ── Password ───────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetEmailLoading, setResetEmailLoading] = useState(false);

  // ── MFA ────────────────────────────────────────────────────────────────
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState<MfaStep>("idle");
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────
  const loadFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as TotpFactor[]);
  };

  const totpFactor = factors.find((f) => f.status === "verified");
  const pendingFactor = factors.find((f) => f.status === "unverified");

  // ── Email handlers ─────────────────────────────────────────────────────
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Email cannot be empty."); return; }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailLoading(false);
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Confirmation email sent — check your inbox to verify the new address.");
    }
  };

  // ── Password handlers ──────────────────────────────────────────────────
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handlePasswordResetEmail = async () => {
    if (!user?.email) return;
    setResetEmailLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/account-settings`,
    });
    setResetEmailLoading(false);
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Password reset link sent — check your email.");
    }
  };

  // ── MFA handlers ───────────────────────────────────────────────────────
  const handleEnroll = async () => {
    setMfaLoading(true);
    // Clean up any leftover unverified factor first
    if (pendingFactor) {
      await supabase.auth.mfa.unenroll({ factorId: pendingFactor.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setMfaLoading(false);
    if (error || !data) { toast.error(sanitizeError(error)); return; }
    setEnrollData({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setMfaStep("enrolling");
  };

  const handleVerify = async () => {
    if (!enrollData || totpCode.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setMfaLoading(true);
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId: enrollData.factorId,
    });
    if (challengeErr || !challenge) {
      setMfaLoading(false);
      toast.error(sanitizeError(challengeErr));
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: challenge.id,
      code: totpCode,
    });
    setMfaLoading(false);
    if (verifyErr) {
      toast.error("Invalid code — please try again.");
      return;
    }
    toast.success("Two-factor authentication enabled!");
    setMfaStep("idle");
    setEnrollData(null);
    setTotpCode("");
    loadFactors();
  };

  const handleCancelEnroll = async () => {
    if (enrollData) {
      await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId });
    }
    setMfaStep("idle");
    setEnrollData(null);
    setTotpCode("");
  };

  const handleUnenroll = async (factorId: string) => {
    setMfaLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaLoading(false);
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Two-factor authentication disabled.");
      loadFactors();
    }
  };

  const copySecret = () => {
    if (!enrollData) return;
    navigator.clipboard.writeText(enrollData.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handlePurgeTestPurchases = async () => {
    setPurgeLoading(true);
    try {
      const { data, error, response } = await supabase.functions.invoke("purge-test-purchases", {
        body: {},
      });
      const payload = data as {
        ok?: boolean;
        removed?: number;
        credits_reversed?: number;
        message?: string;
        error?: string;
        detail?: string;
      } | null;
      if (error) {
        const msg = await getInvokeErrorMessage("purge-test-purchases", error, data, response);
        toast.error(msg);
        return;
      }
      if (payload?.error) {
        toast.error(payload.detail ? `${payload.error} — ${payload.detail}` : payload.error);
        return;
      }
      toast.success(
        payload?.message ??
          `Removed ${payload?.removed ?? 0} purchase record(s); reversed ${payload?.credits_reversed ?? 0} credits.`,
      );
      setPurgeOpen(false);
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-[var(--header-height)]">
      <Header />
      <main className="pb-16">
        <div className="container mx-auto px-4 sm:px-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          {import.meta.env.DEV && !hasClientStripePublishableKey() && (
            <p className="text-xs text-muted-foreground max-w-2xl">
              Dev: add{" "}
              <code className="bg-muted px-1 rounded text-[0.7rem]">VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…</code> to{" "}
              <code className="bg-muted px-1 rounded text-[0.7rem]">.env</code> to show the Stripe test-mode banner on Buy
              credits and Dashboard.
            </p>
          )}

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* ── Email ── */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Update Email</CardTitle>
              <CardDescription>
                A confirmation link will be sent to the new address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">New Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <Button type="submit" disabled={emailLoading}>
                  {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {emailLoading ? "Sending…" : "Update Email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ── Password ── */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Change Password</CardTitle>
              <CardDescription>
                Update your password directly, or send a reset link to your email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {passwordLoading ? "Updating…" : "Change Password"}
                </Button>
              </form>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Prefer a reset link? We'll send one to{" "}
                  <span className="text-foreground font-medium">{user?.email}</span>.
                </p>
                <Button
                  variant="outline"
                  onClick={handlePasswordResetEmail}
                  disabled={resetEmailLoading}
                >
                  {resetEmailLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {resetEmailLoading ? "Sending…" : "Send Reset Email"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Stripe test data cleanup (account-scoped) ── */}
          <Card className="bg-card border-border border-dashed md:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-muted-foreground" />
                Stripe test purchases
              </CardTitle>
              <CardDescription>
                Remove Stripe Checkout purchase rows for this account only and reverse credits still on your balance.
                Available only when the server uses Stripe{" "}
                <span className="font-medium text-foreground">test</span> keys (
                <code className="text-xs bg-muted px-1 rounded">sk_test_…</code>) unless your project enables an
                explicit admin escape hatch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" type="button" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                    Remove my test purchases…
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove test purchase data?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        This deletes your Stripe Checkout transaction records from our database for{" "}
                        <strong>your account only</strong> and subtracts matching credits from your current balance (up
                        to what you still have — credits you already spent are not recovered).
                      </span>
                      <span className="block text-destructive">
                        Do not use this against production / live Stripe keys unless your deployment explicitly allows it.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={purgeLoading}>Cancel</AlertDialogCancel>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={purgeLoading}
                      onClick={() => void handlePurgeTestPurchases()}
                    >
                      {purgeLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Working…
                        </>
                      ) : (
                        "Confirm removal"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* ── MFA ── */}
          <Card className="bg-card border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                {totpFactor ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                {totpFactor
                  ? "Your account is protected with an authenticator app."
                  : "Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.)."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* ── Idle: enabled ── */}
              {mfaStep === "idle" && totpFactor && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">2FA is enabled</p>
                      <p className="text-xs text-muted-foreground">Authenticator app</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    disabled={mfaLoading}
                    onClick={() => handleUnenroll(totpFactor.id)}
                  >
                    {mfaLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Disable
                  </Button>
                </div>
              )}

              {/* ── Idle: not enabled ── */}
              {mfaStep === "idle" && !totpFactor && (
                <Button onClick={handleEnroll} disabled={mfaLoading}>
                  {mfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mfaLoading ? "Setting up…" : "Enable 2FA"}
                </Button>
              )}

              {/* ── Enrolling: show QR code ── */}
              {mfaStep === "enrolling" && enrollData && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Step 1 — Scan this QR code
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Open your authenticator app and scan the code below.
                    </p>
                    <div className="inline-block p-3 rounded-xl bg-white">
                      <img
                        src={enrollData.qrCode}
                        alt="TOTP QR code"
                        className="w-44 h-44"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Can't scan? Enter this key manually
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs font-mono text-foreground break-all">
                        {enrollData.secret}
                      </code>
                      <Button variant="ghost" size="icon" onClick={copySecret} className="flex-shrink-0">
                        {secretCopied ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Step 2 — Enter the 6-digit code
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Enter the code shown in your authenticator app to confirm setup.
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="max-w-[160px] font-mono text-lg tracking-widest text-center"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleVerify} disabled={mfaLoading || totpCode.length !== 6}>
                      {mfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {mfaLoading ? "Verifying…" : "Verify & Enable"}
                    </Button>
                    <Button variant="ghost" onClick={handleCancelEnroll} disabled={mfaLoading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountSettings;
