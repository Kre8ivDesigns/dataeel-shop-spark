import { useState } from "react";
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
import logo from "@/assets/dataeel-logo.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

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
      redirectTo: `${window.location.origin}/account-settings`,
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
      toast({ title: "Signup failed", description: sanitizeError(error), variant: "destructive" });
      return;
    }
    if (data.session) {
      toast({ title: "Welcome!", description: "Your account is ready." });
      const next = searchParams.get("redirect");
      const safe = next && next.startsWith("/") && !next.startsWith("//");
      navigate(safe ? next : "/dashboard");
      return;
    }
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
      <main className="pb-16 flex items-start justify-center px-4 -mt-2">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center pb-2">
            <img src={logo} alt="DATAEEL" className="h-10 mx-auto mb-2" />
            <CardTitle className="text-lg text-foreground">Sign in or create an account</CardTitle>
            <CardDescription>Use your email below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={searchParams.get("mode") === "signup" ? "signup" : "login"}>
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
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
