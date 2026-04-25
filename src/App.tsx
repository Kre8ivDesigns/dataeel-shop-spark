import { Component, lazy, ReactNode, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import BuyCredits from "./pages/BuyCredits";
import RaceCardsBrowse from "./pages/RaceCardsBrowse";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Invoices from "./pages/Invoices";
import AdminSettings from "./pages/AdminSettings";
import AdminCreditPackages from "./pages/AdminCreditPackages";
import AccountSettings from "./pages/AccountSettings";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Disclaimer from "./pages/Disclaimer";
import NotFound from "./pages/NotFound";
import BettingBasics from "./pages/BettingBasics";
import ProtectedRoute from "./components/ProtectedRoute";
import { HomeSectionHashRedirect } from "./components/HomeSectionHashRedirect";
import { DataeelAiAssistant } from "./components/DataeelAiAssistant";

const PageEditor = lazy(() => import("./pages/PageEditor"));
const AdminFinancials = lazy(() => import("./pages/AdminFinancials"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminSupport = lazy(() => import("./pages/AdminSupport"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminPages = lazy(() => import("./pages/AdminPages"));
const PublicPage = lazy(() => import("./pages/PublicPage"));

const adminChartFallback = (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("App render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">
            The application encountered an unexpected error. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:brightness-110"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <HomeSectionHashRedirect />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/betting-basics" element={<BettingBasics />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/buy-credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
              <Route path="/racecards" element={<ProtectedRoute><RaceCardsBrowse /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
              <Route
                path="/admin/financials"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={adminChartFallback}>
                      <AdminFinancials />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={adminChartFallback}>
                      <AdminAnalytics />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/credit-packages" element={<ProtectedRoute requireAdmin><AdminCreditPackages /></ProtectedRoute>} />
              <Route
                path="/admin/support"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={adminChartFallback}>
                      <AdminSupport />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={adminChartFallback}>
                      <AdminReports />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pages"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={adminChartFallback}>
                      <AdminPages />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
              <Route path="/admin/page-editor" element={
                <ProtectedRoute requireAdmin>
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
                    <PageEditor />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route
                path="/pages/:slug"
                element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
                    <PublicPage />
                  </Suspense>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <DataeelAiAssistant />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
