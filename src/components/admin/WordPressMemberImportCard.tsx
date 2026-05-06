import { useState } from "react";
import { Loader2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";

type WpImportSummary = {
  createdAuthUsers: number;
  syncedExistingImportedUsers?: number;
  skippedExistingOriginalEmails: number;
  upsertedPublicMembers?: number;
  insertedCreditLedgerRows: number;
  errors: { email: string; error: string }[];
};

type WpImportResponse = {
  ok?: boolean;
  error?: string;
  summary?: WpImportSummary;
};

type WordPressMemberImportCardProps = {
  onImported: () => void;
};

export function WordPressMemberImportCard({ onImported }: WordPressMemberImportCardProps) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setConfirmOpen(false);
    setImporting(true);
    const { data, error, response: invokeResponse } = await supabase.functions.invoke("import-wp-members", {
      body: { dryRun: false },
    });
    setImporting(false);

    const payload = data as WpImportResponse | null;
    const summary = payload?.summary;

    if (error || payload?.error || !summary) {
      const firstError = summary?.errors?.[0];
      const description = firstError
        ? `${payload?.error ?? "Import failed"}: ${firstError.email} — ${firstError.error}`
        : await getInvokeErrorMessage("import-wp-members", error, data, invokeResponse);

      toast({
        title: summary ? "Import finished with errors" : "Import failed",
        description,
        variant: "destructive",
      });

      if (summary) onImported();
      return;
    }

    toast({
      title: "WordPress import complete",
      description: `${summary.createdAuthUsers} users created, ${summary.syncedExistingImportedUsers ?? 0} existing imports synced, ${summary.skippedExistingOriginalEmails} existing emails skipped, ${summary.insertedCreditLedgerRows} credit entries added.`,
    });
    onImported();
  };

  return (
    <>
      <Card className="bg-card border-border mb-8">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-foreground text-sm">WordPress member import</div>
            <div className="text-xs text-muted-foreground">
              Creates missing Auth users, skips existing emails, and syncs profiles, roles, credits, and ledger rows.
            </div>
          </div>
          <Button type="button" onClick={() => setConfirmOpen(true)} disabled={importing} className="shrink-0 gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {importing ? "Importing…" : "Import members"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !importing && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import WordPress members?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs the prepared WordPress member import through a Supabase Edge Function. Existing original
              Supabase emails are skipped. Imported users receive random passwords and can use password reset or magic
              link sign-in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <Button type="button" disabled={importing} onClick={() => void handleImport()}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                "Import members"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
