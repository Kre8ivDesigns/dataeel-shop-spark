import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield } from "lucide-react";
import logo from "@/assets/dataeel-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
  { label: "RaceCards", href: "/racecards" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "/contact" },
];

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
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
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-primary gap-1.5">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
          {user ? (
            <Button variant="ghost" onClick={handleSignOut} className="font-medium text-foreground/80 hover:text-foreground hover:bg-muted">
              Sign Out
            </Button>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="font-medium text-foreground/80 hover:text-foreground hover:bg-muted">
                  Login
                </Button>
              </Link>
              <Link to="/auth">
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
              {isAdmin && (
                <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block text-primary font-medium py-2">
                  <Shield className="h-4 w-4 inline mr-1.5" /> Admin Dashboard
                </Link>
              )}
              <div className="pt-4 border-t border-border space-y-3">
                {user ? (
                  <Button variant="outline" className="w-full border-secondary text-foreground" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-secondary text-foreground">Login</Button>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
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
