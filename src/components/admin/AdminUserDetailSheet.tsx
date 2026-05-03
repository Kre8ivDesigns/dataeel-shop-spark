import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeFunctionInvokeError } from "@/lib/edgeFunctionErrors";
import { sanitizeError } from "@/lib/errorHandler";
import type { AdminCustomer, AdminTransaction } from "@/lib/adminDashboardTypes";

type DownloadRow = {
  id: string;
  created_at: string;
  racecard_id: string;
  racecards: { file_name: string; track_name: string; race_date: string } | null;
};

type AdminUserDetailSheetProps = {
  customer: AdminCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTransactions: AdminTransaction[];
  currentUserId?: string;
  onRequestDeleteUser: (c: AdminCustomer) => void;
  onGiveCredits: (c: AdminCustomer) => void;
  onUpdated: () => void;
};

export function AdminUserDetailSheet({
  customer,
  open,
  onOpenChange,
  allTransactions,
  currentUserId,
  onRequestDeleteUser,
  onGiveCredits,
  onUpdated,
}: AdminUserDetailSheetProps) {
  const { toast } = useToast();
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [loadingDl, setLoadingDl] = useState(false);
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  /** Keeps UI in sync after admin_set_unlimited_credits when parent row cache is stale. */
  const [unlimitedPlan, setUnlimitedPlan] = useState(false);

  const userTx = customer
    ? allTransactions.filter((t) => t.user_id === customer.user_id)
    : [];

  const loadDownloads = useCallback(async () => {
    if (!customer) return;
    setLoadingDl(true);
    const { data, error } = await supabase
      .from("racecard_downloads")
      .select("id, created_at, racecard_id, racecards(file_name, track_name, race_date)")
      .eq("user_id", customer.user_id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLoadingDl(false);
    if (error) {
      toast({ title: "Could not load downloads", description: sanitizeError(error), variant: "destructive" });
      setDownloads([]);
      return;
    }
    setDownloads((data as DownloadRow[]) ?? []);
  }, [customer, toast]);

  useEffect(() => {
    if (open && customer) {
      setFullName(customer.full_name ?? "");
      setUnlimitedPlan(customer.unlimitedCredits);
      loadDownloads();
    }
  }, [open, customer, loadDownloads]);

  const invokeManage = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body });
    if (error || data?.error) {
      toast({
        title: "Action failed",
        description: typeof data?.error === "string" ? data.error : describeFunctionInvokeError("admin-manage-user", error),
        variant: "destructive",
      });
      return null;
    }
    return data as { ok?: boolean; recovery_link?: string | null };
  };

  const handleSaveProfile = async () => {
    if (!customer) return;
    setSavingProfile(true);
    const res = await invokeManage({
      action: "update_profile",
      userId: customer.user_id,
      full_name: fullName.trim(),
    });
    setSavingProfile(false);
    if (res?.ok) {
      toast({ title: "Profile updated" });
      onUpdated();
    }
  };

  const handleRecovery = async () => {
    if (!customer) return;
    setBusy("recovery");
    const res = await invokeManage({ action: "send_password_recovery", userId: customer.user_id });
    setBusy(null);
    if (res?.ok) {
      if (res.recovery_link) {
        await navigator.clipboard.writeText(res.recovery_link);
        toast({
          title: "Recovery link copied",
          description: "Paste it in a secure channel to the user. Link expires per your auth settings.",
        });
      } else {
        toast({
          title: "Recovery flow started",
          description: "No action link returned; ask the user to use Forgot password or check auth logs.",
        });
      }
    }
  };

  const handleBan = async () => {
    if (!customer || !confirm(`Ban ${customer.email}? They will not be able to sign in.`)) return;
    setBusy("ban");
    const res = await invokeManage({ action: "ban", userId: customer.user_id });
    setBusy(null);
    if (res?.ok) {
      toast({ title: "User banned" });
      onUpdated();
    }
  };

  const handleUnban = async () => {
    if (!customer) return;
    setBusy("unban");
    const res = await invokeManage({ action: "unban", userId: customer.user_id });
    setBusy(null);
    if (res?.ok) {
      toast({ title: "Ban removed" });
      onUpdated();
    }
  };

  const handleSetUnlimitedPlan = async (next: boolean) => {
    if (!customer) return;
    if (next) {
      if (
        !confirm(
          `Grant unlimited RaceCard credits to ${customer.email}? Downloads will not deduct credits while this is on.`,
        )
      ) {
        return;
      }
    } else {
      if (
        !confirm(
          `Remove unlimited access for ${customer.email}? They must have credits to download racecards they have not already downloaded.`,
        )
      ) {
        return;
      }
    }
    setBusy("unlimited");
    const { error } = await supabase.rpc("admin_set_unlimited_credits", {
      _user_id: customer.user_id,
      _unlimited: next,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Could not update plan", description: sanitizeError(error), variant: "destructive" });
      return;
    }
    setUnlimitedPlan(next);
    toast({ title: next ? "Unlimited credits enabled" : "Unlimited credits removed" });
    onUpdated();
  };

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Customer</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {customer.email} · {customer.user_id}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <Label className="text-foreground">Credits</Label>
            <p className="text-2xl font-mono-data text-foreground mt-1">
              {unlimitedPlan ? "Unlimited" : customer.credits}
            </p>
            {!unlimitedPlan && (
              <p className="text-xs text-muted-foreground mt-1">Stored balance when not on unlimited plan.</p>
            )}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Unlimited RaceCard credits</p>
              <p className="text-xs text-muted-foreground mt-1">
                Same capability as the unlimited credit package: downloads do not reduce the balance above.
              </p>
            </div>
            {unlimitedPlan ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void handleSetUnlimitedPlan(false)}
              >
                {busy === "unlimited" ? "…" : "Remove unlimited plan"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleSetUnlimitedPlan(true)}
              >
                {busy === "unlimited" ? "…" : "Assign unlimited plan"}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-full-name" className="text-foreground">
              Full name
            </Label>
            <div className="flex gap-2">
              <Input
                id="admin-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-muted border-border"
              />
              <Button type="button" variant="secondary" disabled={savingProfile} onClick={handleSaveProfile}>
                {savingProfile ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => onGiveCredits(customer)}>
              Give credits
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={handleRecovery}>
              {busy === "recovery" ? "…" : "Password recovery link"}
            </Button>
            <Button type="button" variant="destructive" disabled={busy !== null} onClick={handleBan}>
              {busy === "ban" ? "…" : "Ban user"}
            </Button>
            <Button type="button" variant="secondary" disabled={busy !== null} onClick={handleUnban}>
              {busy === "unban" ? "…" : "Remove ban"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={
                busy !== null || (currentUserId !== undefined && customer.user_id === currentUserId)
              }
              title={
                currentUserId !== undefined && customer.user_id === currentUserId
                  ? "You cannot delete your own account"
                  : "Delete this user permanently"
              }
              onClick={() => onRequestDeleteUser(customer)}
            >
              Delete account
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Purchases</h3>
            <div className="rounded-md border border-border max-h-40 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">$</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTx.slice(0, 20).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">{t.package_name}</TableCell>
                      <TableCell className="text-xs text-right font-mono-data">{Number(t.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {userTx.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">
                        No transactions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Downloads</h3>
            {loadingDl ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="rounded-md border border-border max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Racecard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downloads.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(d.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {d.racecards
                            ? `${d.racecards.track_name} · ${d.racecards.race_date}`
                            : d.racecard_id.slice(0, 8)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {downloads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground text-sm py-4">
                          No downloads
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
