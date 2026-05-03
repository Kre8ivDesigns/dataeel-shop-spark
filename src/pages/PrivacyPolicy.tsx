import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import {
  PRIVACY_AFTER_SUMMARY,
  PRIVACY_INTRO_BULLETS,
  PRIVACY_INTRO_CLOSING,
  PRIVACY_INTRO_PARAGRAPHS,
  PRIVACY_SECTIONS,
  PRIVACY_SUMMARY_POINTS,
} from "@/legal/privacy";
import { PrivacySections, RichParagraph } from "@/legal/privacy/PrivacyBody";

const PrivacyPolicy = () => {
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
      <PageHero
        badge="Legal"
        title={
          <>
            Privacy <span className="text-neon">Policy</span>
          </>
        }
        align="center"
        sectionClassName="pb-8"
      />
      <main className="pb-16 pt-4 md:pt-6">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="space-y-4 text-muted-foreground leading-relaxed mb-8">
            {PRIVACY_INTRO_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <ul className="list-disc pl-6 space-y-2">
              {PRIVACY_INTRO_BULLETS.map((item, i) => (
                <li key={i}>
                  <RichParagraph text={item} className="mb-0" />
                </li>
              ))}
            </ul>
            {PRIVACY_INTRO_CLOSING.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <h2 className="text-lg font-bold text-foreground font-heading mb-4 uppercase tracking-wide">
            Summary of key points
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            This summary provides key points from our privacy notice, but you can find out more details about any of
            these topics by clicking the link following each key point or by using our table of contents below to find
            the section you are looking for.
          </p>
          <ul className="list-disc pl-6 space-y-3 text-muted-foreground mb-8">
            {PRIVACY_SUMMARY_POINTS.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
          {PRIVACY_AFTER_SUMMARY.map((p, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-10">
              {p}
            </p>
          ))}

          <h2 className="text-lg font-bold text-foreground font-heading mb-4 uppercase tracking-wide">
            Table of contents
          </h2>
          <nav aria-label="Table of contents" className="mb-14 rounded-lg border border-border bg-card/50 p-6">
            <ol className="grid gap-2 sm:grid-cols-2 text-sm list-decimal pl-5 marker:text-primary">
              {PRIVACY_SECTIONS.map((s) => (
                <li key={s.id} className="pl-2">
                  <a href={`#${s.id}`} className="text-primary hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <PrivacySections sections={PRIVACY_SECTIONS} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
