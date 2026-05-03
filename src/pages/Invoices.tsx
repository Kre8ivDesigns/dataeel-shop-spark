import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { describeFunctionInvokeError } from "@/lib/edgeFunctionErrors";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, CreditCard, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceList } from "@/lib/queries/invoices";

const Invoices = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    data: invoices = [],
    isLoading: loading,
    isError,
    error,
  } = useInvoiceList(user?.id);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?mode=login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isError || !error) return;
    toast({
      title: "Error loading invoices",
      description: error instanceof Error ? error.message : String(error),
      variant: "destructive",
    });
  }, [isError, error, toast]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setPortalLoading(false);
    if (error || data?.error) {
      toast({
        title: "Unable to open billing portal",
        description: data?.error || describeFunctionInvokeError("customer-portal", error),
        variant: "destructive",
      });
    } else if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const statusColor = (status: string | null) => {
    switch (status) {
      case "paid": return "text-success bg-success/10";
      case "open": return "text-primary bg-primary/10";
      case "void": return "text-muted-foreground bg-muted";
      case "uncollectible": return "text-destructive bg-destructive/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16">
        <PageHero
          backTo="/dashboard"
          backLabel="Back to Dashboard"
          badge="Billing"
          title={<span className="text-neon">Invoices</span>}
          subtitle="View your billing history and manage payment details."
          align="left"
          aside={
            <Button
              onClick={openCustomerPortal}
              disabled={portalLoading}
              variant="outline"
              className="gap-2 shrink-0 lg:mt-6"
            >
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage Billing
            </Button>
          }
          asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <FileText className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No purchases on record yet</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                This page lists credit purchases made through this site. Stripe Customer Portal may show invoices that were paid outside that flow (for example portal-only card charges); those are not in this list until a matching purchase is recorded.
              </p>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                If you already paid in checkout but do not see a row here, the payment webhook may not have reached the app (see deployment docs: webhook URL, test vs live mode, and required events).
              </p>
              <Link to="/buy-credits">
                <Button className="bg-primary text-primary-foreground font-semibold">
                  Buy Credits
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice, i) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="card-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {invoice.number || invoice.id.slice(0, 12)}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${statusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(invoice.created)} · {invoice.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-lg font-bold text-foreground font-mono-data">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </span>
                    <div className="flex gap-2">
                      {invoice.pdf_url && (
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                      )}
                      {invoice.hosted_url && (
                        <a href={invoice.hosted_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Invoices;
