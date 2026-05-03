import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Plus, Pencil, Trash2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { describeFunctionInvokeError } from "@/lib/edgeFunctionErrors";

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price: number;
  stripe_price_id: string | null;
  unlimited_credits: boolean;
}

interface PackageForm {
  name: string;
  description: string;
  credits: string;
  price: string;
  unlimitedCredits: boolean;
}

const emptyForm: PackageForm = { name: "", description: "", credits: "", price: "", unlimitedCredits: false };

const AdminCreditPackages = () => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("credit_packages")
      .select("*")
      .order("price", { ascending: true });
    setPackages(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingPackage(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      credits: String(pkg.credits),
      price: String(pkg.price),
      unlimitedCredits: pkg.unlimited_credits ?? false,
    });
    setDialogOpen(true);
  };

  const invokePackageAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-credit-package", { body });
    if (error || data?.error) {
      toast.error(typeof data?.error === "string" ? data.error : describeFunctionInvokeError("manage-credit-package", error));
      return null;
    }
    return data;
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    if (!form.unlimitedCredits) {
      const credits = parseInt(form.credits, 10);
      if (isNaN(credits) || credits <= 0) {
        toast.error("Credits must be a positive integer");
        return;
      }
    }

    setSaving(true);
    try {
      const action = editingPackage ? "update" : "create";
      const body: Record<string, unknown> = {
        action,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unlimitedCredits: form.unlimitedCredits,
        credits: form.unlimitedCredits ? 0 : parseInt(form.credits, 10),
        price,
      };
      if (editingPackage) body.packageId = editingPackage.id;

      const result = await invokePackageAction(body);
      if (result === null) return;

      toast.success(editingPackage ? "Package updated" : "Package created");
      setDialogOpen(false);
      fetchPackages();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: CreditPackage) => {
    if (!confirm(`Delete "${pkg.name}"? This cannot be undone.`)) return;
    setDeletingId(pkg.id);
    try {
      const result = await invokePackageAction({ action: "delete", packageId: pkg.id });
      if (result === null) return;
      toast.success("Package deleted");
      fetchPackages();
    } finally {
      setDeletingId(null);
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
          title={
            <>
              Credit <span className="text-neon">Packages</span>
            </>
          }
          subtitle="Pricing tiers and Stripe price links for the storefront."
          align="left"
          aside={
            <Button onClick={openCreate} className="bg-primary text-primary-foreground font-semibold lg:mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          }
          asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto px-4 max-w-[1400px]">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Packages</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="whitespace-nowrap">Stripe (auto)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{pkg.name}</div>
                          {pkg.description && (
                            <div className="text-xs text-muted-foreground">{pkg.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono-data text-primary">
                          {pkg.unlimited_credits ? "Unlimited" : pkg.credits}
                        </TableCell>
                        <TableCell className="font-mono-data text-foreground">${pkg.price}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {pkg.stripe_price_id ? (
                            <span title={pkg.stripe_price_id}>Linked</span>
                          ) : (
                            <span className="text-destructive">Not linked — save package with Stripe configured</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => openEdit(pkg)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === pkg.id}
                            onClick={() => handleDelete(pkg)}
                          >
                            {deletingId === pkg.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {packages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center">
                          <Package className="h-8 w-8 text-foreground/20 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">No credit packages yet.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit Package" : "Create New Package"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name">Name *</Label>
              <Input
                id="pkg-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Starter"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pkg-desc">Description</Label>
              <Textarea
                id="pkg-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description shown to customers"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="pkg-unlimited"
                checked={form.unlimitedCredits}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, unlimitedCredits: v === true, credits: v === true ? "0" : f.credits }))
                }
              />
              <Label htmlFor="pkg-unlimited" className="text-sm font-normal cursor-pointer">
                Unlimited RaceCard PDF downloads (no credit balance; fair-use policy applies)
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-credits">{form.unlimitedCredits ? "Credits (stored as 0)" : "Credits *"}</Label>
                <Input
                  id="pkg-credits"
                  type="number"
                  min={form.unlimitedCredits ? 0 : 1}
                  step={1}
                  disabled={form.unlimitedCredits}
                  value={form.credits}
                  onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
                  placeholder="e.g. 5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pkg-price">Price (USD) *</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 20.00"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {editingPackage
                ? "Saving updates Stripe automatically — you never paste a Stripe Price ID. If the USD amount changes, the previous Stripe price is archived and a new one is created."
                : "You only fill in name, credits, and price here. Stripe Product + Price are created in your Stripe account when you save — no Dashboard lookup."}
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {saving ? "Saving..." : editingPackage ? "Save Changes" : "Create Package"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCreditPackages;
