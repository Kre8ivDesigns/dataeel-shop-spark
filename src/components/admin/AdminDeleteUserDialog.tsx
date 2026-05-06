import { Loader2 } from "lucide-react";
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
import type { AdminCustomer } from "@/lib/adminDashboardTypes";

type AdminDeleteUserDialogProps = {
  customer: AdminCustomer | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function AdminDeleteUserDialog({ customer, deleting, onOpenChange, onConfirm }: AdminDeleteUserDialogProps) {
  return (
    <AlertDialog open={customer !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This removes <strong className="text-foreground">{customer?.email}</strong> from Supabase Auth. Profile,
              roles, credits, and related data with{" "}
              <code className="text-xs bg-muted px-1 rounded">ON DELETE CASCADE</code> are removed. This cannot be undone.
            </span>
            <span className="block text-destructive">
              You cannot delete your own account or the only remaining admin from here.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={deleting} onClick={onConfirm}>
            {deleting ? (
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
  );
}
