import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  CreditCard,
  FileText,
  RefreshCw,
  DollarSign,
  BarChart3,
  Settings,
  Package,
  FileEdit,
  TrendingUp,
  Inbox,
  Table2,
  LayoutList,
  Loader2,
} from "lucide-react";
import { sanitizeError } from "@/lib/errorHandler";
import {
  describeFunctionInvokeError,
  formatInvokeFailureMessage,
  getInvokeErrorMessage,
} from "@/lib/edgeFunctionErrors";
import { motion } from "framer-motion";
import type { AdminCustomer, AdminRacecard, AdminTransaction } from "@/lib/adminDashboardTypes";
import { mergeProfilesWithCredits } from "@/lib/adminDashboardTypes";
import { parseRacecardFilename } from "@/lib/parseRacecardFilename";
import { AdminDashboardMainTabs } from "@/components/admin/AdminDashboardTables";
import { AdminUserDetailSheet } from "@/components/admin/AdminUserDetailSheet";
import { getRacetrackLabel } from "@/lib/racetracks";
import { PageHero } from "@/components/PageHero";

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [racecards, setRacecards] = useState<AdminRacecard[]>([]);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [creditsToGive, setCreditsToGive] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [givingCredits, setGivingCredits] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<AdminCustomer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<AdminCustomer | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    supabase.rpc("is_admin", { _user_id: user.id }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) return;
      if (!data) navigate("/", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [custRes, balRes, txRes, rcRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("credit_balances").select("user_id, credits, unlimited_credits"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("racecards").select("*").order("race_date", { ascending: false }),
    ]);
    setCustomers(mergeProfilesWithCredits(custRes.data, balRes.data));
    setTransactions(txRes.data || []);
    setRacecards(rcRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const emailByUserId = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.user_id, c.email])),
    [customers],
  );

  const totalRevenue = useMemo(
    () => transactions.reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        toast({ title: `Skipped ${file.name}`, description: "Only PDF files accepted", variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `Skipped ${file.name}`, description: "Maximum file size is 10MB", variant: "destructive" });
        continue;
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { data: urlData, error: urlError } = await supabase.functions.invoke("generate-upload-url", {
        body: { fileName: sanitizedName },
      });

      if (urlError || !urlData?.uploadUrl) {
        toast({
          title: `Upload failed: ${file.name}`,
          description: formatInvokeFailureMessage("generate-upload-url", urlError, urlData),
          variant: "destructive",
        });
        continue;
      }

      const s3Res = await fetch(urlData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });
      if (!s3Res.ok) {
        toast({
          title: `Upload failed: ${file.name}`,
          description: `S3 error: ${s3Res.status} ${s3Res.statusText}`,
          variant: "destructive",
        });
        continue;
      }

      const { trackCode, raceDate } = parseRacecardFilename(file.name);

      const { error: dbError } = await supabase.from("racecards").insert({
        file_name: file.name,
        file_url: urlData.s3Key,
        track_code: trackCode,
        track_name: getRacetrackLabel(trackCode),
        race_date: raceDate,
        uploaded_by: user.id,
      });

      if (dbError) {
        toast({ title: `DB insert failed: ${file.name}`, description: sanitizeError(dbError), variant: "destructive" });
      } else {
        successCount++;
      }
    }

    toast({ title: `Uploaded ${successCount} racecard(s)` });
    setUploading(false);
    fetchData();
    e.target.value = "";
  };

  const handleSyncS3 = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sync-s3-racecards");
    setSyncing(false);

    const payload = data as { error?: unknown; added?: number; message?: string } | null;
    const hasErrorPayload =
      payload != null &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error != null &&
      payload.error !== "";

    if (error || hasErrorPayload) {
      const description = await getInvokeErrorMessage("sync-s3-racecards", error, data);
      toast({ title: "Sync failed", description, variant: "destructive" });
      return;
    }

    const added = typeof payload?.added === "number" ? payload.added : 0;
    const message = typeof payload?.message === "string" ? payload.message : undefined;
    if (added > 0) {
      toast({
        title: `Sync complete — ${added} new racecard(s) added`,
        description: message,
      });
      void fetchData();
    } else {
      toast({
        title: "Sync complete",
        description: message ?? "No new racecard PDFs found in S3.",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) return;
    setCreatingUser(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email: newUserEmail, password: newUserPassword },
    });
    setCreatingUser(false);
    if (error || data?.error) {
      toast({
        title: "Failed to create user",
        description: typeof data?.error === "string" ? data.error : describeFunctionInvokeError("admin-create-user", error),
        variant: "destructive",
      });
      return;
    }
    toast({ title: `User ${newUserEmail} created` });
    setCreateUserOpen(false);
    setNewUserEmail("");
    setNewUserPassword("");
    fetchData();
  };

  const handleGiveCredits = async () => {
    if (!selectedCustomer || creditsToGive <= 0) return;
    setGivingCredits(true);
    const { error } = await supabase.rpc("admin_add_credits", {
      _user_id: selectedCustomer.user_id,
      _amount: creditsToGive,
    });
    setGivingCredits(false);
    if (error) {
      toast({ title: "Failed to give credits", description: sanitizeError(error), variant: "destructive" });
    } else {
      toast({ title: `Gave ${creditsToGive} credits to ${selectedCustomer.full_name || selectedCustomer.email}` });
      setDialogOpen(false);
      setCreditsToGive(0);
      setSelectedCustomer(null);
      fetchData();
    }
  };

  const handleDeleteRacecard = async (id: string) => {
    const { error } = await supabase.from("racecards").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: sanitizeError(error), variant: "destructive" });
    } else {
      toast({ title: "Racecard deleted" });
      fetchData();
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteConfirmCustomer) return;
    setDeletingUser(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "delete_user", userId: deleteConfirmCustomer.user_id },
    });
    setDeletingUser(false);
    if (error || data?.error) {
      const description = await getInvokeErrorMessage("admin-manage-user", error, data);
      toast({
        title: "Delete failed",
        description,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "User deleted",
      description: `${deleteConfirmCustomer.email} was permanently removed from auth and related rows (cascaded).`,
    });
    if (detailCustomer?.user_id === deleteConfirmCustomer.user_id) {
      setDetailOpen(false);
      setDetailCustomer(null);
    }
    setDeleteConfirmCustomer(null);
    fetchData();
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (authLoading || !isAdmin) return null;

  const stats = [
    { label: "Customers", value: customers.length, icon: Users },
    { label: "Purchases", value: transactions.length, icon: CreditCard },
    { label: "Racecards", value: racecards.length, icon: FileText },
    {
      label: "Revenue",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalRevenue),
      icon: TrendingUp,
    },
  ];

  const adminLinks = [
    { to: "/admin/support", title: "Support inbox", subtitle: "Contact form submissions", icon: Inbox },
    { to: "/admin/reports", title: "Reports", subtitle: "Downloads, credit ledger", icon: Table2 },
    { to: "/admin/financials", title: "Financial dashboard", subtitle: "Revenue, charts, CSV", icon: DollarSign },
    { to: "/admin/analytics", title: "Site analytics", subtitle: "Signups, downloads, audit log", icon: BarChart3 },
    { to: "/admin/pages", title: "Pages", subtitle: "CMS list & publish", icon: LayoutList },
    { to: "/admin/settings", title: "Settings", subtitle: "Stripe, site, integrations", icon: Settings },
    { to: "/admin/credit-packages", title: "Credit packages", subtitle: "Pricing tiers", icon: Package },
    { to: "/admin/page-editor", title: "Page editor", subtitle: "Visual editor", icon: FileEdit },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
            <Input
              type="password"
              placeholder="Password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
            />
            <Button onClick={handleCreateUser} disabled={creatingUser || !newUserEmail || !newUserPassword} className="w-full">
              {creatingUser ? "Creating…" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="pb-16">
        <PageHero
          backTo="/"
          backLabel="Back to Site"
          badge="Admin"
          title={
            <>
              Admin <span className="text-neon">Dashboard</span>
            </>
          }
          subtitle="Customers, purchases, racecards, and operations."
          align="left"
          aside={
            <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading} className="shrink-0 gap-2 lg:mt-6">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh data
            </Button>
          }
          asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card border-border">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono-data text-foreground">{s.value}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
            {adminLinks.map((item) => (
              <Link key={item.to} to={item.to}>
                <Card className="bg-card border-border hover:border-primary/40 transition-colors h-full">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-sm truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Give Credits to {selectedCustomer?.full_name || selectedCustomer?.email}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  type="number"
                  min={1}
                  value={creditsToGive}
                  onChange={(e) => setCreditsToGive(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  placeholder="Number of credits"
                />
                <Button onClick={handleGiveCredits} disabled={givingCredits || creditsToGive <= 0} className="w-full">
                  {givingCredits ? "Adding…" : "Confirm"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AdminUserDetailSheet
            customer={detailCustomer}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            allTransactions={transactions}
            currentUserId={user?.id}
            onRequestDeleteUser={(c) => setDeleteConfirmCustomer(c)}
            onGiveCredits={(c) => {
              setDetailOpen(false);
              setSelectedCustomer(c);
              setCreditsToGive(1);
              setDialogOpen(true);
            }}
            onUpdated={fetchData}
          />

          <AlertDialog open={deleteConfirmCustomer !== null} onOpenChange={(open) => !open && !deletingUser && setDeleteConfirmCustomer(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    This removes <strong className="text-foreground">{deleteConfirmCustomer?.email}</strong> from Supabase
                    Auth. Profile, roles, credits, and related data with <code className="text-xs bg-muted px-1 rounded">ON DELETE CASCADE</code>{" "}
                    are removed. This cannot be undone.
                  </span>
                  <span className="block text-destructive">
                    You cannot delete your own account or the only remaining admin from here.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletingUser}
                  onClick={() => void handleConfirmDeleteUser()}
                >
                  {deletingUser ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete user"
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AdminDashboardMainTabs
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreateUser={() => setCreateUserOpen(true)}
            filteredCustomers={filteredCustomers}
            onGiveCredits={(c) => {
              setSelectedCustomer(c);
              setCreditsToGive(1);
              setDialogOpen(true);
            }}
            onViewCustomer={(c) => {
              setDetailCustomer(c);
              setDetailOpen(true);
            }}
            currentUserId={user?.id}
            onRequestDeleteUser={(c) => setDeleteConfirmCustomer(c)}
            transactions={transactions}
            emailByUserId={emailByUserId}
            racecards={racecards}
            uploading={uploading}
            syncing={syncing}
            onSync={handleSyncS3}
            onUploadChange={handleFileUpload}
            onDeleteRacecard={handleDeleteRacecard}
            onRacecardsRefresh={fetchData}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
