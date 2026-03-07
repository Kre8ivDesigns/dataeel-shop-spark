import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, ChevronDown, LogOut, LayoutDashboard, FileText } from "lucide-react";
import logo from "@/assets/dataeel-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
  { label: "RaceCards", href: "/racecards" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "/contact" },
];

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    await signOut();
    navigate("/");
  };

  const renderNavLink = (item: { label: string; href: string }, mobile = false) => {
    const cls = mobile
      ? "block text-foreground font-medium py-2 hover:text-primary transition-colors"
      : "nav-link";

    if (item.href.startsWith("/")) {
      return (
        <Link key={item.label} to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cls}>
          {item.label}
        </Link>
      );
    }
    return (
      <a
        key={item.label}
        href={item.href}
        onClick={(e) => {
          if (item.href.startsWith("#")) { e.preventDefault(); }
          handleNavClick(item.href);
        }}
        className={cls}
      >
        {item.label}
      </a>
    );
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="DATAEEL®" className="h-10 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => renderNavLink(item))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="font-medium text-foreground/80 hover:text-foreground hover:bg-muted gap-1.5"
              >
                Account
                <ChevronDown className={`h-4 w-4 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </Button>
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
                  >
                    <Link
                      to="/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/invoices"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      Invoices
                    </Link>
                    <Link
                      to="/account-settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Account Settings
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-muted transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                          Admin
                        </Link>
                        <Link
                          to="/admin/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-muted transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                          Settings
                        </Link>
                        <Link
                          to="/admin/credit-packages"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-muted transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                          Credit Packages
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors border-t border-border"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link to="/auth?mode=login">
                <Button variant="ghost" className="font-medium text-foreground/80 hover:text-foreground hover:bg-muted">
                  Login
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button className="bg-primary text-primary-foreground hover:brightness-110 font-semibold px-6">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 rounded-lg text-foreground">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-card border-t border-border">
            <div className="container mx-auto px-4 py-6 space-y-4">
              {navItems.map((item) => renderNavLink(item, true))}
              <div className="pt-4 border-t border-border space-y-3">
                {user ? (
                  <>
                    <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-secondary text-foreground gap-2">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Button>
                    </Link>
                    <Link to="/invoices" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-secondary text-foreground gap-2">
                        <FileText className="h-4 w-4" /> Invoices
                      </Button>
                    </Link>
                    <Link to="/account-settings" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-secondary text-foreground gap-2">
                        <Settings className="h-4 w-4" /> Account Settings
                      </Button>
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full border-secondary text-primary gap-2">
                            <Shield className="h-4 w-4" /> Admin
                          </Button>
                        </Link>
                        <Link to="/admin/settings" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full border-secondary text-primary gap-2">
                            <Shield className="h-4 w-4" /> Settings
                          </Button>
                        </Link>
                        <Link to="/admin/credit-packages" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full border-secondary text-primary gap-2">
                            <Shield className="h-4 w-4" /> Credit Packages
                          </Button>
                        </Link>
                      </>
                    )}
                    <Button variant="outline" className="w-full border-secondary text-foreground gap-2" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth?mode=login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-secondary text-foreground">Login</Button>
                    </Link>
                    <Link to="/auth?mode=signup" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary text-primary-foreground font-semibold">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
