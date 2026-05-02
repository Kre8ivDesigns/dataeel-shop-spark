import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = { question: string; answer: ReactNode };

const faqs: FaqItem[] = [
  {
    question: "What is theDATA EEL™?",
    answer: (
      <>
        theDATA EEL™ delivers algorithms for thoroughbred racing like no other. You get predictions via
        downloadable EEL RaceCards with Concert™ and Aptitude™ picks for every race at a track on a given
        day. Content is for entertainment and information—past performance does not guarantee future
        results; see our{" "}
        <Link to="/disclaimer" className="text-primary underline underline-offset-2 hover:text-neon">
          Disclaimer
        </Link>{" "}
        for details.
      </>
    ),
  },
  {
    question: "How much does a RaceCard cost?",
    answer:
      "Registration is free. RaceCards are redeemed with credits (one credit = one track day, both algorithms). Credit packages start around $5 per credit and scale down with larger bundles. Buy credits when signed in, then download from RaceCards for your track and date.",
  },
  {
    question: "What tracks do you cover?",
    answer:
      "We cover 28+ racetracks across the United States and Canada, including major venues such as Churchill Downs, Santa Anita, Gulfstream Park, Saratoga, Del Mar, Woodbine, Aqueduct, Tampa Bay Downs, Fair Grounds, Oaklawn Park, Keeneland, and many more.",
  },
  {
    question: "What are the Concert™ and Aptitude™ algorithms?",
    answer:
      "Concert™ focuses on live performance under race-day pressure—how horses run from gate to wire in front of the crowd. Aptitude™ emphasizes inherent ability and profile—style, pace, stamina, and upside. Every RaceCard includes both; they complement each other using Equibase® data.",
  },
  {
    question: "Do I need any special software?",
    answer:
      "No. Each RaceCard is a PDF you can open on phone, tablet, or desktop—download from your account after you sign in. No handicapping app required; take it to the track or review anywhere.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No. Credits stay in your account until you use them, so you can buy when it suits you and redeem on race day.",
  },
  {
    question: "What if I'm new to horse racing?",
    answer:
      "That is what Horse Racing Simplified® is for. RaceCards present picks in a straightforward way so you are not buried in past-performance sheets on day one—learn the game while you go.",
  },
  {
    question: "What if a race day is cancelled or changed?",
    answer:
      "Reach out to support@dataeel.com with your account email and the card you downloaded. For qualifying full-program cancellations or similar issues, we may restore a credit at our discretion. We do not control weather, stewards, or track decisions.",
  },
  {
    question: "How do payments, receipts, and refunds work?",
    answer: (
      <>
        Purchases run through Stripe. We accept major cards (Visa, Mastercard, American Express, Discover)
        in US dollars. Per our{" "}
        <Link to="/terms" className="text-primary underline underline-offset-2 hover:text-neon">
          Terms &amp; Conditions
        </Link>
        , all sales are final. For billing discrepancies or account problems, email support@dataeel.com.
        Optionally review invoices or payment history in your account where available.
      </>
    ),
  },
  {
    question: "How do I contact support?",
    answer: (
      <>
        Email support@dataeel.com or use our{" "}
        <Link to="/contact" className="text-primary underline underline-offset-2 hover:text-neon">
          Contact
        </Link>{" "}
        page for billing, downloads, and account questions. We aim to respond within one business day.
      </>
    ),
  },
];

const midFaq = Math.ceil(faqs.length / 2);
const faqColumns = [faqs.slice(0, midFaq), faqs.slice(midFaq)] as const;

export const FAQ = () => {
  return (
    <section id="faq" className="py-24 bg-card">
      <div className="container mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="badge-neon mb-4 inline-block">FAQ</span>
          <h2 className="section-title mb-4">
            Frequently Asked <span className="text-neon">Questions</span>
          </h2>
          <p className="section-subtitle">
            Everything you need to know about theDATA EEL™ and our prediction service.
          </p>
        </motion.div>

        {/* FAQ Accordion — full band width; two columns on large screens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid max-w-none gap-6 lg:grid-cols-2 lg:items-start"
        >
          {faqColumns.map((column, colIndex) => (
            <Accordion key={colIndex} type="single" collapsible className="space-y-4">
              {column.map((faq, index) => {
                const globalIndex = colIndex === 0 ? index : index + midFaq;
                return (
                  <AccordionItem
                    key={globalIndex}
                    value={`item-${globalIndex}`}
                    className="bg-muted rounded-xl px-6 border-none"
                  >
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
