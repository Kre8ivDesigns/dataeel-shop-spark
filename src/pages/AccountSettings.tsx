import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeError } from "@/lib/errorHandler";
import { useAuth } from "@/contexts/AuthContext";

const AccountSettings = () => {
  const { user } = useAuth();

  const [email, setEmail] = useState(user?.email ?? "");
  const [emailLoading, setEmailLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email cannot be empty.");
      return;
    }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailLoading(false);
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Confirmation email sent. Check your inbox to verify the new address.");
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>

          <Card>
            <CardHeader>
              <CardTitle>Update Email</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                  {emailLoading ? "Updating…" : "Update Email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
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
                  {passwordLoading ? "Updating…" : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground text-sm">
                Secure your account with two-factor authentication.
              </p>
              <Button
                variant="outline"
                onClick={() => toast.info("2FA setup coming soon.")}
              >
                Enable 2FA
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountSettings;
