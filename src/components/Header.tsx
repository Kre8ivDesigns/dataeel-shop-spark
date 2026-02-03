import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
  { label: "RaceCards", href: "#racecards" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "#about" },
];

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-baseline">
            <span
              className={`text-2xl font-bold tracking-tight transition-colors ${
                isScrolled ? "text-navy" : "text-white"
              }`}
            >
              DATA
            </span>
            <span className="text-2xl font-bold text-racing-green">EEL</span>
            <span
              className={`text-xs ml-0.5 transition-colors ${
                isScrolled ? "text-navy" : "text-white"
              }`}
            >
              ®
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => {
                if (item.href.startsWith("#")) {
                  e.preventDefault();
                  handleNavClick(item.href);
                }
              }}
              className={`text-sm font-medium transition-colors duration-200 hover:text-racing-green ${
                isScrolled ? "text-charcoal/80" : "text-white/90"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Utility Nav */}
        <div className="hidden lg:flex items-center gap-4">
          <Button
            variant="ghost"
            className={`font-medium ${
              isScrolled
                ? "text-charcoal hover:text-racing-green"
                : "text-white hover:bg-white/10"
            }`}
          >
            Login
          </Button>
          <Button className="bg-racing-green hover:bg-racing-green-dark text-white font-semibold px-6 shadow-green">
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden p-2 rounded-lg transition-colors ${
            isScrolled ? "text-charcoal" : "text-white"
          }`}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-border shadow-lg"
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    if (item.href.startsWith("#")) {
                      e.preventDefault();
                    }
                    handleNavClick(item.href);
                  }}
                  className="block text-charcoal font-medium py-2 hover:text-racing-green transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 border-t border-border space-y-3">
                <Button variant="outline" className="w-full">
                  Login
                </Button>
                <Button className="w-full bg-racing-green hover:bg-racing-green-dark text-white font-semibold">
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
