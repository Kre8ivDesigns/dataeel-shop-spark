import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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

const FALLBACK_NEWS = [
  "Concert algorithm picks Winner in race#1, race#2, race#3, race#6, race#7; Belmont At Big A May1, 2026",
  "Aptitude algorithm hits TRIFECTA in race#8; Laurel Park May1, 2026",
  "Concert algorithm hits EXACTA in race#3 and in race#4; Gulfstream Park Apr25, 2026",
];

const BreakingNewsBar = () => {
  const [items, setItems] = useState(FALLBACK_NEWS);
  const [activeIndex, setActiveIndex] = useState(0);

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
          setActiveIndex(0);
        }
      });
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const activeItem = items[activeIndex] ?? "";

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] border-b border-primary/30 bg-primary text-primary-foreground shadow-sm">
      <div className="container mx-auto flex h-9 items-center gap-3 overflow-hidden px-4">
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <Trophy className="h-4 w-4" />
          Breaking News
        </div>
        <div className="min-w-0 flex-1 overflow-hidden text-sm font-medium">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${activeIndex}-${activeItem}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="truncate"
            >
              {activeItem}
            </motion.p>
          </AnimatePresence>
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
      <Header topOffsetClassName="top-9" />
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
