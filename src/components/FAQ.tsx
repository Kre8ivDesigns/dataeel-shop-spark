import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is an EEL RaceCard?",
    answer:
      "An EEL RaceCard is a downloadable PDF that contains algorithmic predictions for every race at a specific track on a given day. It includes picks from both our Concert and Aptitude algorithms, giving you a comprehensive view of the day's races.",
  },
  {
    question: "How much does a RaceCard cost?",
    answer:
      "Each RaceCard costs just $5 (or less with credit packages). One RaceCard gives you predictions for an entire day's races at any track. Our Best Value package brings the cost down to $3.33 per card.",
  },
  {
    question: "What tracks do you cover?",
    answer:
      "We cover 28+ racetracks across the United States and Canada, including all major venues like Churchill Downs, Santa Anita, Gulfstream Park, Saratoga, Del Mar, and many more.",
  },
  {
    question: "How do the algorithms work?",
    answer:
      "Our proprietary algorithms—Concert and Aptitude—analyze historical race data from Equibase®. Concert focuses on past live performance and race pressure, while Aptitude evaluates inherent ability and future potential. Together, they provide a well-rounded prediction system.",
  },
  {
    question: "Do I need any special software?",
    answer:
      "No! That's the beauty of DATAEEL. Your RaceCard is delivered as a simple PDF that you can view on any device—your phone, tablet, or computer. Just download it before you head to the track.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No, your credits never expire. Purchase them when you see a good deal, and use them whenever you're ready to hit the track. They'll always be in your account waiting for you.",
  },
  {
    question: "What if I'm new to horse racing?",
    answer:
      "DATAEEL is perfect for newcomers! Our tagline is 'Horse Racing Simplified®' for a reason. The RaceCards are easy to understand—just follow the picks without needing to learn complex handicapping.",
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
            Everything you need to know about DATAEEL and our prediction service.
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
