import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { trackSiteEvent } from "@/lib/siteAnalytics";
import logo from "@/assets/dataeel-logo.png";

const RESET_PASSWORD_PATH = "/auth?mode=reset";

function getResetPasswordRedirect() {
  return `${window.location.origin}${RESET_PASSWORD_PATH}`;
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetReady, setResetReady] = useState(false);
  const [resetLinkChecked, setResetLinkChecked] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isPasswordResetMode = searchParams.get("mode") === "reset";
  const resetTokenHash = searchParams.get("token_hash");

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      void trackSiteEvent("signup_started", { source: "auth_route" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isPasswordResetMode) return;

    let cancelled = false;
    const prepareResetSession = async () => {
      setResetLinkChecked(false);
      setResetReady(false);
      setResetError(null);

      if (resetTokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: resetTokenHash,
          type: "recovery",
        });

        if (cancelled) return;
        if (error) {
          setResetError(sanitizeError(error));
        } else {
          setResetReady(true);
          window.history.replaceState(null, "", RESET_PASSWORD_PATH);
        }
        setResetLinkChecked(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setResetReady(true);
        if (window.location.hash) {
          window.history.replaceState(null, "", RESET_PASSWORD_PATH);
        }
      } else {
        setResetError("This password reset link is invalid or expired. Request a new link and try again.");
      }
      setResetLinkChecked(true);
    };

    void prepareResetSession();

    return () => {
      cancelled = true;
    };
  }, [isPasswordResetMode, resetTokenHash]);

  const resendConfirmationEmail = async (emailToResend: string) => {
    const trimmed = emailToResend.trim();
    if (!trimmed) {
      toast({
        title: "Email required",
        description: "Enter the address you used to sign up.",
        variant: "destructive",
      });
      return;
    }
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    });
    setResendLoading(false);
    if (error) {
      toast({ title: "Could not resend", description: sanitizeError(error), variant: "destructive" });
    } else {
      toast({
        title: "Confirmation sent",
        description: "Check your inbox and spam folder for the link.",
      });
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({
        title: "Email required",
        description: "Enter your email above and try again.",
        variant: "destructive",
      });
      return;
    }
    setForgotPasswordLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: getResetPasswordRedirect(),
    });
    setForgotPasswordLoading(false);
    if (error) {
      toast({ title: "Could not send reset email", description: sanitizeError(error), variant: "destructive" });
    } else {
      toast({
        title: "Check your email",
        description: "If an account exists for that address, we sent a link to reset your password.",
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetReady) {
      toast({ title: "Reset link required", description: "Request a new password reset email.", variant: "destructive" });
      return;
    }
    if (resetPassword.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setResetPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: resetPassword });
    setResetPasswordLoading(false);

    if (error) {
      toast({ title: "Could not update password", description: sanitizeError(error), variant: "destructive" });
      return;
    }

    setResetPassword("");
    setResetPasswordConfirm("");
    toast({ title: "Password updated", description: "You can now continue to your dashboard." });
    navigate("/dashboard", { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: sanitizeError(error), variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      const next = searchParams.get("redirect");
      const safe = next && next.startsWith("/") && !next.startsWith("//");
      navigate(safe ? next : "/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    void trackSiteEvent("signup_submitted", { mode: "email_password" });
    setLoading(true);
    setAwaitingEmailConfirm(false);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      void trackSiteEvent("signup_failed", { reason: sanitizeError(error) });
      toast({ title: "Signup failed", description: sanitizeError(error), variant: "destructive" });
      return;
    }
    if (data.session) {
      void trackSiteEvent("signup_completed", { status: "session_created" }, data.user?.id);
      toast({ title: "Welcome!", description: "Your account is ready." });
      const next = searchParams.get("redirect");
      const safe = next && next.startsWith("/") && !next.startsWith("//");
      navigate(safe ? next : "/dashboard");
      return;
    }
    void trackSiteEvent("signup_completed", { status: "email_confirmation_required" }, data.user?.id);
    setAwaitingEmailConfirm(true);
    toast({
      title: "Check your email",
      description: "We sent a confirmation link. Check spam if you do not see it.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero
        backTo="/"
        backLabel="Back to Home"
        badge="Account"
        title={
          <>
            Welcome to <span className="text-neon">DATAEEL</span>®
          </>
        }
        subtitle="Horse Racing Simplified®"
        align="center"
        sectionClassName="pb-6"
      />
      <main className="pb-16 pt-8 md:pt-10 flex items-start justify-center px-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center pb-2">
            <img src={logo} alt="DATAEEL" className="h-10 mx-auto mb-2" />
            <CardTitle className="text-lg text-foreground">Sign in or create an account</CardTitle>
            <CardDescription>Use your email below.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPasswordResetMode ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1 text-center">
                  <h2 className="text-base font-semibold text-foreground">Choose a new password</h2>
                  <p className="text-sm text-muted-foreground">
                    {!resetLinkChecked
                      ? "Checking your reset link..."
                      : resetError
                        ? resetError
                        : "Enter a new password for your DATAEEL account."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    disabled={!resetReady || resetPasswordLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-password-confirm">Confirm password</Label>
                  <Input
                    id="reset-password-confirm"
                    type="password"
                    value={resetPasswordConfirm}
                    onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Repeat new password"
                    disabled={!resetReady || resetPasswordLoading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!resetReady || resetPasswordLoading}
                  className="w-full bg-primary text-primary-foreground font-semibold"
                >
                  {resetPasswordLoading ? "Updating..." : "Update password"}
                </Button>
                {resetError ? (
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/auth?mode=login")}>
                    Back to sign in
                  </Button>
                ) : null}
              </form>
            ) : (
                <Tabs
                  defaultValue={searchParams.get("mode") === "signup" ? "signup" : "login"}
                  onValueChange={(value) => {
                    if (value === "signup") void trackSiteEvent("signup_started", { source: "auth_tab" });
                  }}
                >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="login-password">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-primary underline underline-offset-4 hover:text-primary/90 disabled:opacity-50 shrink-0"
                          disabled={forgotPasswordLoading || loading}
                          onClick={() => void handleForgotPassword()}
                        >
                          {forgotPasswordLoading ? "Sending…" : "Forgot password?"}
                        </button>
                      </div>
                      <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-semibold">
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      Didn&apos;t get the confirmation email?{" "}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-4 hover:text-primary/90 disabled:opacity-50"
                        disabled={resendLoading || loading}
                        onClick={() => void resendConfirmationEmail(email)}
                      >
                        {resendLoading ? "Sending…" : "Resend link"}
                      </button>
                    </p>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" minLength={6} />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-semibold">
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                    {awaitingEmailConfirm ? (
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        <p className="mb-2">Still waiting for the email? Check spam, or resend the confirmation link.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={resendLoading || loading}
                          onClick={() => void resendConfirmationEmail(email)}
                        >
                          {resendLoading ? "Sending…" : "Resend confirmation email"}
                        </Button>
                      </div>
                    ) : null}
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
