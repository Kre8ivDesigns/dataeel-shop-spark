import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Download, Loader2, TrendingUp, CreditCard, Receipt } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  filterLiveStripeRevenueTransactions,
  filterSince,
  sumByDayAmount,
  sumByPackage,
  exportTransactionsCsv,
} from "@/lib/adminCharts";

type Tx = {
  id: string;
  created_at: string;
  package_name: string;
  credits: number;
  amount: number;
  status: string;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  stripe_subscription_id: string | null;
  unlimited_credits: boolean;
  user_id: string;
  user_display_name?: string;
};

type Profile = {
  user_id: string;
  email: string;
  full_name: string | null;
};

const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "0", label: "All time" },
] as const;

function getTransactionDisplayId(tx: Tx): string {
  return tx.stripe_payment_intent_id ?? tx.stripe_session_id ?? tx.id;
}

function getTransactionTitle(tx: Tx): string {
  return [
    tx.stripe_payment_intent_id ? `Payment intent: ${tx.stripe_payment_intent_id}` : null,
    tx.stripe_session_id ? `Checkout session: ${tx.stripe_session_id}` : null,
    tx.stripe_subscription_id ? `Subscription: ${tx.stripe_subscription_id}` : null,
    `App transaction: ${tx.id}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

const AdminFinancials = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>("30");
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [creditsOutstanding, setCreditsOutstanding] = useState<number | null>(null);
  const [cancellingTransactionId, setCancellingTransactionId] = useState<string | null>(null);

  const days = period === "0" ? 0 : parseInt(period, 10);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setQueryError(null);
    try {
      const [txRes, balRes] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("credit_balances").select("credits"),
      ]);
      const txErr = txRes.error;
      const balErr = balRes.error;
      if (txErr || balErr) {
        setQueryError(txErr?.message ?? balErr?.message ?? "Failed to load financial data");
        setTransactions([]);
        setCreditsOutstanding(null);
      } else {
        const txRows = ((txRes.data as Tx[]) ?? []);
        const userIds = Array.from(new Set(txRows.map((row) => row.user_id)));
        const profilesRes =
          userIds.length > 0
            ? await supabase.from("profiles").select("user_id, email, full_name").in("user_id", userIds)
            : { data: [], error: null };

        if (profilesRes.error) {
          setQueryError(profilesRes.error.message);
          setTransactions([]);
          setCreditsOutstanding(null);
          return;
        }

        const profileByUserId = new Map(
          ((profilesRes.data as Profile[]) ?? []).map((profile) => [
            profile.user_id,
            profile.full_name?.trim() || profile.email,
          ]),
        );

        const transactionsWithUsers = txRows.map((row) => ({
          ...row,
          user_display_name: profileByUserId.get(row.user_id) ?? row.user_id,
        }));

        setTransactions(transactionsWithUsers);
        const balanceRows = balRes.data ?? [];
        setCreditsOutstanding(balanceRows.reduce((s, r) => s + (r.credits ?? 0), 0));
      }
      if (import.meta.env.DEV) {
        console.debug(
          "[AdminFinancials] transactions loaded:",
          ((txRes.data as Tx[]) ?? []).length,
          "balances rows:",
          balRes.data?.length ?? 0,
          txRes.error ?? balRes.error ?? "",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => filterSince(transactions, days), [transactions, days]);

  const completedInRange = useMemo(
    () => filterLiveStripeRevenueTransactions(filtered),
    [filtered],
  );

  const kpis = useMemo(() => {
    const revenue = completedInRange.reduce((s, t) => s + Number(t.amount), 0);
    const creditsSold = completedInRange.reduce((s, t) => s + t.credits, 0);
    const count = completedInRange.length;
    const aov = count > 0 ? revenue / count : 0;
    return { revenue, creditsSold, count, aov };
  }, [completedInRange]);

  const revenueByDay = useMemo(() => sumByDayAmount(filtered), [filtered]);
  const revenueByPackage = useMemo(() => sumByPackage(filtered), [filtered]);

  const handleExport = () => {
    const csv = exportTransactionsCsv(completedInRange);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${period}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancelSubscription = async (tx: Tx) => {
    const displayId = getTransactionDisplayId(tx);
    if (
      !confirm(
        `Cancel the active Stripe subscription tied to transaction ${displayId}? This keeps the Stripe customer record and removes unlimited DATAEEL access only if a subscription is cancelled.`,
      )
    ) {
      return;
    }

    setCancellingTransactionId(tx.id);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: {
        action: "cancel_stripe_subscription",
        userId: tx.user_id,
        transactionId: tx.id,
        stripeSessionId: tx.stripe_session_id,
        stripeSubscriptionId: tx.stripe_subscription_id,
        paymentIntentId: tx.stripe_payment_intent_id,
      },
    });
    setCancellingTransactionId(null);

    if (error || data?.error) {
      toast({
        title: "Subscription cancellation failed",
        description: typeof data?.error === "string" ? data.error : error?.message ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: data?.cancelled ? "Stripe subscription cancelled" : "No active Stripe subscription found",
      description:
        data?.cancelled && Number(data?.canceled_subscription_count ?? 0) > 1
          ? `${data.canceled_subscription_count} subscriptions were cancelled.`
          : data?.cancelled
            ? "Unlimited DATAEEL access was removed for this customer."
            : "The transaction resolved, but Stripe did not return a cancellable subscription.",
    });

    if (data?.cancelled) {
      void fetchAll();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16">
        <PageHero
          backTo="/admin"
          backLabel="Back to Admin"
          badge="Admin"
          title={<span className="text-neon">Financials</span>}
          subtitle="Revenue from completed checkouts, credits sold, and transaction export."
          align="left"
          aside={
            <div className="flex flex-wrap items-center justify-end gap-2 lg:mt-6">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px] bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="border-border"
                disabled={loading || completedInRange.length === 0}
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          }
          asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto px-4 pt-[25px] max-w-[1400px]">
          {queryError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not load data</AlertTitle>
              <AlertDescription>
                {queryError}. Check that you are signed in as an admin and that Row Level Security allows admin access to
                transactions and credit balances.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Revenue (range)
                    </CardDescription>
                    <CardTitle className="text-2xl font-mono-data text-foreground">
                      ${kpis.revenue.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Credits sold
                    </CardDescription>
                    <CardTitle className="text-2xl font-mono-data text-primary">
                      {kpis.creditsSold}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Orders
                    </CardDescription>
                    <CardTitle className="text-2xl font-mono-data text-foreground">
                      {kpis.count}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardDescription>Average order value</CardDescription>
                    <CardTitle className="text-2xl font-mono-data text-foreground">
                      ${kpis.aov.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {creditsOutstanding !== null && (
                <p className="text-sm text-muted-foreground mb-6">
                  Credits outstanding (all user balances):{" "}
                  <span className="font-mono-data text-foreground font-semibold">
                    {creditsOutstanding}
                  </span>
                </p>
              )}

              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">Revenue by day</CardTitle>
                    <CardDescription>Completed payments only</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    {revenueByDay.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueByDay}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                          />
                          <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">Revenue by package</CardTitle>
                    <CardDescription>Completed payments in range</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    {revenueByPackage.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByPackage} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                          />
                          <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Transactions</CardTitle>
                  <CardDescription>Filtered by the selected period</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Package</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedInRange.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {new Date(t.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell
                            className="font-mono text-xs text-muted-foreground max-w-[220px] truncate"
                            title={getTransactionTitle(t)}
                          >
                            {getTransactionDisplayId(t)}
                            {t.stripe_subscription_id && (
                              <span className="block text-[10px] text-muted-foreground/80">
                                Sub: {t.stripe_subscription_id}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{t.package_name}</TableCell>
                          <TableCell className="font-mono-data text-primary">{t.credits}</TableCell>
                          <TableCell className="font-mono-data">${Number(t.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                t.status === "completed"
                                  ? "bg-primary/20 text-primary"
                                  : "bg-warning/20 text-warning"
                              }`}
                            >
                              {t.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[220px] truncate" title={t.user_id}>
                            {t.user_display_name ?? t.user_id}
                          </TableCell>
                          <TableCell className="text-right">
                            {t.unlimited_credits ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={cancellingTransactionId === t.id}
                                onClick={() => void handleCancelSubscription(t)}
                              >
                                {cancellingTransactionId === t.id ? "Cancelling..." : "Cancel sub"}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">One-time</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {completedInRange.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                            No transactions in this range
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminFinancials;
