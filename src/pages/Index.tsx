import { useEffect } from "react";
import { useLocation } from "react-router-dom";
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
      <Header />
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
