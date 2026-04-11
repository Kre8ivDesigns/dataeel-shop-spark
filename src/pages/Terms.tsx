import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TERMS_INTRO, TERMS_SECTIONS } from "@/legal/terms";
import { TermsIntro, TermsSections } from "@/legal/terms/TermsBody";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Terms &amp; Conditions</span>
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight mb-6">
            Terms &amp; Conditions
          </h1>
          <p className="text-lg font-semibold text-foreground mb-2">AGREEMENT TO OUR LEGAL TERMS</p>
          <TermsIntro lines={TERMS_INTRO} />
          <h2 className="text-lg font-bold text-foreground font-heading mb-4 uppercase tracking-wide">
            Table of contents
          </h2>
          <nav aria-label="Table of contents" className="mb-14 rounded-lg border border-border bg-card/50 p-6">
            <ol className="grid gap-2 sm:grid-cols-2 text-sm list-decimal pl-5 marker:text-primary">
              {TERMS_SECTIONS.map((s) => (
                <li key={s.id} className="pl-2">
                  <a href={`#${s.id}`} className="text-primary hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <TermsSections sections={TERMS_SECTIONS} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
