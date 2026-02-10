import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, CreditCard, FileText, Upload, Trash2, Search } from "lucide-react";
import { sanitizeError } from "@/lib/errorHandler";
import { motion } from "framer-motion";

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [racecards, setRacecards] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [custRes, txRes, rcRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("racecards").select("*").order("race_date", { ascending: false }),
    ]);
    setCustomers(custRes.data || []);
    setTransactions(txRes.data || []);
    setRacecards(rcRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

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

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${crypto.randomUUID()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("racecards").upload(filePath, file);

      if (uploadError) {
        toast({ title: `Upload failed: ${file.name}`, description: sanitizeError(uploadError), variant: "destructive" });
        continue;
      }

      // Parse basic info from filename pattern: TRACKCODE_YYYY-MM-DD.pdf
      const nameWithoutExt = file.name.replace(".pdf", "");
      const parts = nameWithoutExt.split("_");
      const trackCode = parts[0] || "UNK";
      const raceDate = parts[1] || new Date().toISOString().split("T")[0];

      const { error: dbError } = await supabase.from("racecards").insert({
        file_name: file.name,
        file_url: filePath,
        track_code: trackCode.toUpperCase(),
        track_name: trackCode.toUpperCase(),
        race_date: raceDate,
        uploaded_by: user.id,
      });

      if (dbError) {
        toast({ title: `Upload failed: ${file.name}`, description: sanitizeError(dbError), variant: "destructive" });
      } else {
        successCount++;
      }
    }

    toast({ title: `Uploaded ${successCount} racecard(s)` });
    setUploading(false);
    fetchData();
    e.target.value = "";
  };

  const handleDeleteRacecard = async (id: string, fileUrl: string) => {
    await supabase.storage.from("racecards").remove([fileUrl]);
    await supabase.from("racecards").delete().eq("id", id);
    toast({ title: "Racecard deleted" });
    fetchData();
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !isAdmin) return null;

  const stats = [
    { label: "Total Customers", value: customers.length, icon: Users },
    { label: "Total Transactions", value: transactions.length, icon: CreditCard },
    { label: "Racecards Uploaded", value: racecards.length, icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold text-foreground font-heading">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage customers, transactions, and racecards.</p>
          </motion.div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="bg-card border-border">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold font-mono-data text-foreground">{s.value}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="customers">
            <TabsList className="mb-6">
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="racecards">RaceCards</TabsTrigger>
            </TabsList>

            <TabsContent value="customers">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground">Customers</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-foreground">{c.full_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{c.email}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-foreground">Transactions</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium text-foreground">{t.package_name}</TableCell>
                          <TableCell className="font-mono-data text-primary">{t.credits}</TableCell>
                          <TableCell className="font-mono-data text-foreground">${Number(t.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === "completed" ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"}`}>
                              {t.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="racecards">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground">RaceCards</CardTitle>
                    <div>
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        id="racecard-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Button
                        onClick={() => document.getElementById("racecard-upload")?.click()}
                        disabled={uploading}
                        className="bg-primary text-primary-foreground font-semibold"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload PDFs"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Name files as <code className="bg-muted px-1 rounded">TRACKCODE_YYYY-MM-DD.pdf</code> for auto-detection.
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Track</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Races</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {racecards.map((rc) => (
                        <TableRow key={rc.id}>
                          <TableCell className="font-medium text-foreground">{rc.file_name}</TableCell>
                          <TableCell className="text-foreground">{rc.track_name}</TableCell>
                          <TableCell className="text-muted-foreground">{rc.race_date}</TableCell>
                          <TableCell className="font-mono-data text-foreground">{rc.num_races ?? "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRacecard(rc.id, rc.file_url)} className="text-destructive hover:text-destructive/80">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {racecards.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No racecards uploaded yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
