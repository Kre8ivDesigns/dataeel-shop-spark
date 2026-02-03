import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Youtube } from "lucide-react";

const footerLinks = {
  product: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "RaceCards", href: "#racecards" },
    { label: "Pricing", href: "/pricing" },
    { label: "Results", href: "#results" },
  ],
  company: [
    { label: "About Us", href: "#about" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
    { label: "Careers", href: "#" },
  ],
  legal: [
    { label: "Terms & Conditions", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Disclaimer", href: "#" },
    { label: "Responsible Gaming", href: "#" },
  ],
};

const tracks = [
  "Churchill Downs",
  "Santa Anita",
  "Gulfstream Park",
  "Saratoga",
  "Del Mar",
  "Belmont Park",
  "Keeneland",
  "Aqueduct",
  "Tampa Bay Downs",
  "Fair Grounds",
  "Oaklawn Park",
  "Woodbine",
];

export const Footer = () => {
  return (
    <footer className="bg-navy text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">DATA</span>
                <span className="text-3xl font-bold text-racing-green">EEL</span>
                <span className="text-xs ml-0.5">®</span>
              </div>
            </Link>
            <p className="tagline text-xl text-gold mb-4">Horse Racing Simplified®</p>
            <p className="text-white/60 mb-6 max-w-sm leading-relaxed">
              Thoroughbred predictions powered by algorithms. Get a full day of
              race picks for just $5.
            </p>
            <div className="space-y-3 text-sm">
              <a
                href="mailto:support@dataeel.com"
                className="flex items-center gap-3 text-white/60 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@dataeel.com
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-racing-green transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-racing-green transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-racing-green transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tracks Coverage */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <h4 className="font-semibold mb-4 text-white text-sm">We Cover 30+ Tracks</h4>
          <div className="flex flex-wrap gap-2">
            {tracks.map((track) => (
              <span
                key={track}
                className="px-3 py-1 rounded-full bg-white/5 text-white/50 text-xs"
              >
                {track}
              </span>
            ))}
            <span className="px-3 py-1 rounded-full bg-racing-green/20 text-racing-green text-xs">
              + more
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <p>
              © {new Date().getFullYear()} Data Pierce LLC. All rights reserved. DATAEEL®
              is a registered trademark.
            </p>
            <p>
              Data provided by{" "}
              <span className="text-white/60">Equibase Company LLC</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
