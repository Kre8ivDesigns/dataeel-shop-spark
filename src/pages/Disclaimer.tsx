import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DISCLAIMER_INTRO, DISCLAIMER_SECTIONS } from "@/legal/disclaimer/disclaimerSections";

const Disclaimer = () => {
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const scrollTo = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    const frame = requestAnimationFrame(() => requestAnimationFrame(scrollTo));
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Disclaimer</span>
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight mb-8">
            Disclaimer
          </h1>

          <p className="text-muted-foreground leading-relaxed mb-10">{DISCLAIMER_INTRO}</p>

          <h2 className="text-lg font-bold text-foreground font-heading mb-4 uppercase tracking-wide">
            Contents
          </h2>
          <nav aria-label="Disclaimer sections" className="mb-14 rounded-lg border border-border bg-card/50 p-6">
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {DISCLAIMER_SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-primary hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {DISCLAIMER_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-xl font-bold text-foreground font-heading tracking-tight mb-4">
                  {section.title}
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  {section.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Disclaimer;
