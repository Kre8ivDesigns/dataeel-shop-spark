import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Results } from "@/components/Results";
import { RaceCards } from "@/components/RaceCards";
import { AbrNewsSection } from "@/components/AbrNewsSection";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { About } from "@/components/About";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { buildTickerLoopItems, tickerDurationSeconds } from "@/lib/breakingNewsTicker";

const FALLBACK_NEWS = [
  "Concert algorithm picks Winner in race#1, race#2, race#3, race#6, race#7; Belmont At Big A May1, 2026",
  "Aptitude algorithm hits TRIFECTA in race#8; Laurel Park May1, 2026",
  "Concert algorithm hits EXACTA in race#3 and in race#4; Gulfstream Park Apr25, 2026",
];

const BreakingNewsBar = () => {
  const [items, setItems] = useState(FALLBACK_NEWS);
  const [tickerDistance, setTickerDistance] = useState<number | null>(null);
  const tickerGroupRef = useRef<HTMLDivElement | null>(null);
  const tickerLoopItems = useMemo(() => buildTickerLoopItems(items, 12), [items]);
  const tickerDuration = useMemo(() => tickerDurationSeconds(tickerLoopItems) * 2, [tickerLoopItems]);

  useEffect(() => {
    supabase
      .from("breaking_news_items")
      .select("text")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setItems(data.map((row) => row.text));
        }
      });
  }, []);

  useLayoutEffect(() => {
    const group = tickerGroupRef.current;
    if (!group) return;

    const updateDistance = () => {
      setTickerDistance(Math.ceil(group.scrollWidth));
    };

    updateDistance();
    const observer = new ResizeObserver(updateDistance);
    observer.observe(group);
    if (document.fonts) {
      void document.fonts.ready.then(updateDistance);
    }

    return () => observer.disconnect();
  }, [tickerLoopItems]);

  return (
    <div data-testid="breaking-news-bar" className="fixed left-0 right-0 top-0 z-[60] flex h-8 overflow-hidden border-b border-primary/60 bg-black shadow-sm sm:h-9">
      <div className="flex shrink-0 items-center gap-1.5 bg-primary px-3 text-[10px] font-bold uppercase tracking-wider text-primary-foreground sm:gap-2 sm:px-4 sm:text-xs">
        <Trophy className="h-4 w-4" />
        <span className="sm:hidden">News</span>
        <span className="hidden sm:inline">Breaking News</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center overflow-hidden bg-black px-3 text-xs font-medium text-white/85 sm:px-4 sm:text-sm">
        <div
          className="flex w-max whitespace-nowrap animate-ticker-scroll will-change-transform motion-reduce:animate-none"
          style={{
            animationDuration: `${tickerDuration}s`,
            "--ticker-distance": tickerDistance ? `${tickerDistance}px` : "50%",
          } as CSSProperties}
        >
          <div ref={tickerGroupRef} className="flex shrink-0 whitespace-nowrap">
            {tickerLoopItems.map((item, index) => (
              <span key={`breaking-a-${index}`} className="mx-6 inline-flex shrink-0 items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 whitespace-nowrap" aria-hidden="true">
            {tickerLoopItems.map((item, index) => (
              <span key={`breaking-b-${index}`} className="mx-6 inline-flex shrink-0 items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const scrollTo = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    const frame = requestAnimationFrame(() => requestAnimationFrame(scrollTo));
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen">
      <BreakingNewsBar />
      <Header topOffsetClassName="top-8 sm:top-9" />
      <Hero />
      <HowItWorks />
      <Results />
      <RaceCards />
      <AbrNewsSection />
      <Pricing />
      <Testimonials />
      <About />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
