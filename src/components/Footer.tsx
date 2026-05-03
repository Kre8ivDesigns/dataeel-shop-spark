import { Link } from "react-router-dom";
import { Mail, Facebook, Twitter, Youtube } from "lucide-react";
import logo from "@/assets/dataeel-logo.png";

const footerLinks = {
  product: [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "RaceCards", href: "/#racecards" },
    { label: "Pricing", href: "/pricing" },
    { label: "News", href: "/#us-racing-news" },
  ],
  company: [
    { label: "About Us", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/contact" },
    { label: "Careers", href: "#" },
  ],
  legal: [
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Responsible Gaming", href: "#" },
  ],
};

const tracks = [
  "Churchill Downs", "Santa Anita", "Gulfstream Park", "Saratoga",
  "Del Mar", "Belmont Park", "Keeneland", "Aqueduct",
  "Tampa Bay Downs", "Fair Grounds", "Oaklawn Park", "Woodbine",
];

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border text-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img src={logo} alt="DATAEEL® - Horse Racing Simplified" className="h-12 w-auto" />
            </Link>
            <p className="text-base text-muted-foreground italic mb-4">Horse Racing Simplified®</p>
            <p className="text-foreground/50 mb-6 max-w-sm leading-relaxed">
              Thoroughbred predictions powered by algorithms. Get a full day of
              race picks for just $5.
            </p>
            <div className="space-y-3 text-sm">
              <a
                href="mailto:support@dataeel.com"
                className="flex items-center gap-3 text-foreground/50 hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@dataeel.com
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {[Facebook, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors text-foreground/60"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4 text-foreground capitalize font-heading">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link
                        to={link.href}
                        className="text-foreground/50 hover:text-foreground transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-foreground/50 hover:text-foreground transition-colors text-sm"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Tracks Coverage */}
        <div className="mt-12 pt-8 border-t border-border">
          <h4 className="font-semibold mb-4 text-foreground text-sm font-heading">
            We Cover 28+ Tracks
          </h4>
          <div className="flex flex-wrap gap-2">
            {tracks.map((track) => (
              <span
                key={track}
                className="px-3 py-1 rounded-full bg-muted text-foreground/40 text-xs"
              >
                {track}
              </span>
            ))}
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              + more
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-foreground/30">
            <p>
              © {new Date().getFullYear()} Data Pierce LLC. All rights reserved. DATAEEL®
              is a registered trademark.
            </p>
            <p>
              Data provided by{" "}
              <span className="text-foreground/50">Equibase Company LLC</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
