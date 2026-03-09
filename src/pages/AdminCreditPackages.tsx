import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Package } from "lucide-react";

const AdminCreditPackages = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from("credit_packages").select("*");
    setPackages(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Credit Packages</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-semibold">Create Package</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Credit Package</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">Form to create a new package will be here.</p>
              </DialogContent>
            </Dialog>
          </div>

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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium text-foreground">{pkg.name}</TableCell>
                        <TableCell className="font-mono-data text-primary">{pkg.credits}</TableCell>
                        <TableCell className="font-mono-data text-foreground">${pkg.price}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                          <Button variant="destructive" size="sm">Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {packages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center">
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
    </div>
  );
};

export default AdminCreditPackages;
