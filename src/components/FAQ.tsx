import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is theDATA EEL™?",
    answer:
      "theDATA EEL™ has arrived – Algorithms for thoroughbred horse racing like no other. We provide horse racing predictions via downloadable EEL RaceCards that contain algorithmic picks from both our Concert™ and Aptitude™ algorithms for every race at a specific track on a given day.",
  },
  {
    question: "How much does a RaceCard cost?",
    answer:
      "Registration is FREE. If you wish to purchase theDATA EEL™ RaceCard you will need to buy 1 Credit. Credits start at $5 each, but our larger packages bring the cost down to as low as $2/card. One credit = one full day of predictions at any track.",
  },
  {
    question: "What tracks do you cover?",
    answer:
      "We cover 28+ racetracks across the United States and Canada, including all major venues like Churchill Downs, Santa Anita, Gulfstream Park, Saratoga, Del Mar, Woodbine, Aqueduct, Tampa Bay Downs, Fair Grounds, Oaklawn Park, Keeneland, and many more.",
  },
  {
    question: "What are the Concert™ and Aptitude™ algorithms?",
    answer:
      "Concert™ analyzes past live performance – how horses perform under pressure, in front of the crowd, from gate to finish. It focuses on proven winners. Aptitude™ evaluates inherent ability and future potential – running style, pace, stamina, and capability. It identifies future stars. Together, they provide a well-rounded prediction system powered by Equibase® data.",
  },
  {
    question: "Do I need any special software?",
    answer:
      "No! That's the beauty of DATAEEL. Horse Racing Simplified® means your RaceCard is delivered as a simple PDF that you can view on any device—your phone, tablet, or computer. Just download it before you head to the track.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No, your credits never expire. Purchase them when you see a good deal, and use them whenever you're ready to hit the track. They'll always be in your account waiting for you.",
  },
  {
    question: "What if I'm new to horse racing?",
    answer:
      "DATAEEL is perfect for newcomers! Our tagline is 'Horse Racing Simplified®' for a reason. Are you NEW to horse racing? theDATA EEL™ will change your horse racing life. The RaceCards are easy to understand—just follow the picks without needing to learn complex handicapping.",
  },
  {
    question: "What if a race is cancelled?",
    answer:
      "If a race day is cancelled and you've already downloaded the RaceCard, contact our support team and we'll credit your account. We stand behind our product and want to ensure you get value from every credit.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-24 bg-card">
      <div className="container mx-auto px-4">
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

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-muted rounded-xl px-6 border-none"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
