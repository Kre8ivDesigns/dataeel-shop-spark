import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, RefreshCw, Upload, Trash2, Pencil, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import type { AdminCustomer, AdminRacecard, AdminTransaction } from "@/lib/adminDashboardTypes";
import { racecardPublicKeys } from "@/lib/queryKeys";

type CustomersProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateUser: () => void;
  filteredCustomers: AdminCustomer[];
  onGiveCredits: (c: AdminCustomer) => void;
  onViewCustomer: (c: AdminCustomer) => void;
};

export function AdminCustomersTab({
  searchQuery,
  onSearchChange,
  onCreateUser,
  filteredCustomers,
  onGiveCredits,
  onViewCustomer,
}: CustomersProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-foreground">Customers</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={onCreateUser} className="shrink-0">
              Create User
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-foreground">{c.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.email}</TableCell>
                <TableCell className="text-right font-mono-data text-foreground">
                  {c.unlimitedCredits ? "Unlimited" : c.credits}
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => onViewCustomer(c)}>
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onGiveCredits(c)}>
                    Give Credits
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No customers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type TransactionsProps = {
  transactions: AdminTransaction[];
  emailByUserId: Record<string, string>;
};

export function AdminTransactionsTab({ transactions, emailByUserId }: TransactionsProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Transactions</CardTitle>
        <p className="text-xs text-muted-foreground">Stripe purchases and credit packages (newest first).</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Stripe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {new Date(t.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-foreground">{emailByUserId[t.user_id] || t.user_id.slice(0, 8)}</TableCell>
                <TableCell className="text-foreground">{t.package_name}</TableCell>
                <TableCell className="text-right font-mono-data">{t.credits}</TableCell>
                <TableCell className="text-right font-mono-data">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(t.amount))}
                </TableCell>
                <TableCell className="text-muted-foreground">{t.status}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono max-w-[140px] truncate">
                  {t.stripe_session_id || "—"}
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No transactions yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type RacecardsProps = {
  racecards: AdminRacecard[];
  uploading: boolean;
  syncing: boolean;
  onSync: () => void;
  onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
};

const METADATA_EXAMPLE = `{
  "first_post_display": "12:30 PM ET",
  "track_condition": "Fast",
  "surface": "Dirt",
  "weather": {
    "summary": "Partly cloudy",
    "temp_f": 72,
    "precip_chance_pct": 10,
    "wind": "SW 8 mph"
  },
  "listing_status": "available"
}`;

export function AdminRacecardsTab({
  racecards,
  uploading,
  syncing,
  onSync,
  onUploadChange,
  onDelete,
  onRefresh,
}: RacecardsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaRow, setMetaRow] = useState<AdminRacecard | null>(null);
  const [metaDraft, setMetaDraft] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);

  const openMetadata = (rc: AdminRacecard) => {
    setMetaRow(rc);
    const raw = rc.metadata;
    const hasKeys =
      raw && typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw as object).length > 0;
    setMetaDraft(hasKeys ? JSON.stringify(raw, null, 2) : "{}");
    setMetaOpen(true);
  };

  const saveMetadata = async () => {
    if (!metaRow) return;
    let parsed: Json;
    try {
      parsed = JSON.parse(metaDraft) as Json;
    } catch {
      toast({ title: "Invalid JSON", description: "Fix the JSON before saving.", variant: "destructive" });
      return;
    }
    if (parsed !== null && typeof parsed !== "object") {
      toast({ title: "Metadata must be a JSON object", variant: "destructive" });
      return;
    }
    setMetaSaving(true);
    const { error } = await supabase
      .from("racecards")
      .update({
        metadata: parsed,
        metadata_updated_at: new Date().toISOString(),
      })
      .eq("id", metaRow.id);
    setMetaSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Race metadata saved", description: "Homepage and listings read from the database cache." });
    setMetaOpen(false);
    setMetaRow(null);
    await queryClient.invalidateQueries({ queryKey: racecardPublicKeys.all });
    onRefresh();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <Alert className="mb-4 border-primary/25 bg-muted/40">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">S3 connection</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
            RaceCard PDFs are stored in <strong className="text-foreground font-medium">AWS S3</strong> and accessed through
            Supabase Edge Functions. Configure credentials under{" "}
            <strong className="text-foreground font-medium">Project Settings → Edge Functions → Secrets</strong>:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">AWS_S3_BUCKET</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">AWS_REGION</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">AWS_ACCESS_KEY_ID</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">AWS_SECRET_ACCESS_KEY</code>.
            Sync failures usually mean missing secrets, wrong region/bucket, or IAM permissions on{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">racecards/*</code>.
          </AlertDescription>
        </Alert>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-foreground">RaceCards</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync S3"}
            </Button>
            <input type="file" accept="application/pdf" multiple id="racecard-upload" className="hidden" onChange={onUploadChange} />
            <Button
              onClick={() => document.getElementById("racecard-upload")?.click()}
              disabled={uploading}
              className="bg-primary text-primary-foreground font-semibold"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading…" : "Upload PDFs"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Name files{" "}
          <code className="bg-muted px-1 rounded">TRACKCODE_YYYY-MM-DD.pdf</code> (ISO date),{" "}
          <code className="bg-muted px-1 rounded">XXXYYMMDD.pdf</code> (three letters + 6-digit date, no separator), or{" "}
          <code className="bg-muted px-1 rounded">XX^YYMMDD.pdf</code> (two letters, caret, date). Optional same-day
          index: <code className="bg-muted px-1 rounded">__N</code> before <code className="bg-muted px-1 rounded">.pdf</code>
          . Use <strong>Site metadata</strong> to cache weather, post times, and conditions — no live API calls on the
          public site.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Track</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Races</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {racecards.map((rc) => (
              <TableRow key={rc.id}>
                <TableCell className="font-medium text-foreground">{rc.file_name}</TableCell>
                <TableCell className="text-foreground">{rc.track_name}</TableCell>
                <TableCell className="text-muted-foreground">{rc.race_date}</TableCell>
                <TableCell className="font-mono-data text-foreground">{rc.num_races ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openMetadata(rc)}
                    className="text-foreground/80 hover:text-foreground"
                    title="Edit site metadata (JSON)"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(rc.id)}
                    className="text-destructive hover:text-destructive/80"
                    title="Delete racecard"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {racecards.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No racecards uploaded yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={metaOpen} onOpenChange={(o) => !metaSaving && !o && setMetaOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col bg-card border-border">
          <DialogHeader>
            <DialogTitle>Site metadata — {metaRow?.track_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <Label htmlFor="race-metadata-json">JSON (stored in database)</Label>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Example fields</summary>
              <pre className="mt-2 p-2 rounded bg-muted overflow-x-auto text-[10px] leading-relaxed max-h-32">
                {METADATA_EXAMPLE}
              </pre>
            </details>
            <Textarea
              id="race-metadata-json"
              value={metaDraft}
              onChange={(e) => setMetaDraft(e.target.value)}
              className="font-mono text-xs min-h-[240px] flex-1 bg-muted border-border"
              spellCheck={false}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setMetaOpen(false)} disabled={metaSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveMetadata()} disabled={metaSaving} className="bg-primary text-primary-foreground">
              {metaSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type MainTabsProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateUser: () => void;
  filteredCustomers: AdminCustomer[];
  onGiveCredits: (c: AdminCustomer) => void;
  onViewCustomer: (c: AdminCustomer) => void;
  transactions: AdminTransaction[];
  emailByUserId: Record<string, string>;
  racecards: AdminRacecard[];
  uploading: boolean;
  syncing: boolean;
  onSync: () => void;
  onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteRacecard: (id: string) => void;
  onRacecardsRefresh: () => void;
};

export function AdminDashboardMainTabs(props: MainTabsProps) {
  return (
    <Tabs defaultValue="customers">
      <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="racecards">RaceCards</TabsTrigger>
      </TabsList>
      <TabsContent value="customers">
        <AdminCustomersTab
          searchQuery={props.searchQuery}
          onSearchChange={props.onSearchChange}
          onCreateUser={props.onCreateUser}
          filteredCustomers={props.filteredCustomers}
          onGiveCredits={props.onGiveCredits}
          onViewCustomer={props.onViewCustomer}
        />
      </TabsContent>
      <TabsContent value="transactions">
        <AdminTransactionsTab transactions={props.transactions} emailByUserId={props.emailByUserId} />
      </TabsContent>
      <TabsContent value="racecards">
        <AdminRacecardsTab
          racecards={props.racecards}
          uploading={props.uploading}
          syncing={props.syncing}
          onSync={props.onSync}
          onUploadChange={props.onUploadChange}
          onDelete={props.onDeleteRacecard}
          onRefresh={props.onRacecardsRefresh}
        />
      </TabsContent>
    </Tabs>
  );
}
