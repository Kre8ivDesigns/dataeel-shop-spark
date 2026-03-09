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
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/buy-credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
            <Route path="/racecards" element={<ProtectedRoute><RaceCardsBrowse /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/credit-packages" element={<ProtectedRoute requireAdmin><AdminCreditPackages /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
