import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeError } from "@/lib/errorHandler";
import { motion } from "framer-motion";
import { Mail, HelpCircle, Clock, Send, AlertTriangle, ArrowLeft, CheckCircle } from "lucide-react";
import heroContact from "@/assets/hero-contact.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const contactOptions = [
  {
    icon: Mail,
    title: "Email Us",
    description: "support@dataeel.com",
    detail: "We respond within 24 hours",
    bestFor: "Account questions, technical issues",
    cta: "Send Email",
    href: "mailto:support@dataeel.com",
  },
  {
    icon: HelpCircle,
    title: "Help Center",
    description: "Find answers instantly",
    detail: "Common topics: Credits, Downloads, Refunds",
    bestFor: "Self-service support",
    cta: "Browse FAQs",
    href: "#faq-section",
  },
];

const contactFaqs = [
  {
    question: "How do I download a RaceCard?",
    answer: "After purchasing credits, navigate to the RaceCards page, select your track and date, then click the Download button. Your RaceCard PDF will begin downloading immediately.",
  },
  {
    question: "What if a race is cancelled?",
    answer:
      "Email support@dataeel.com with your account and the card you downloaded. For qualifying full-program cancellations, we may restore a credit at our discretion.",
  },
  {
    question: "Do credits expire?",
    answer: "No, your credits never expire. Purchase them when you see a good deal, and use them whenever you're ready to hit the track.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Per our Terms & Conditions, all sales are final. If you have a billing error or need help with your account, contact support@dataeel.com.",
  },
  {
    question: "Which algorithm should I use?",
    answer: "Both algorithms are included in every RaceCard! Concert™ analyzes past live performance, while Aptitude™ evaluates inherent ability. We recommend checking both for the best results.",
  },
];

const categoryLabels: Record<string, string> = {
  technical: "Technical Issue",
  billing: "Billing Question",
  feature: "Feature Request",
  general: "General Inquiry",
};

const ContactPage = () => {
  const { user } = useAuth();
  const [formState, setFormState] = useState<"idle" | "submitting" | "success">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) {
      setFormError("Please choose a topic.");
      return;
    }
    setFormError(null);
    setFormState("submitting");
    const { error } = await supabase.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim(),
      category: subject,
      subject: categoryLabels[subject] ?? subject,
      message: message.trim(),
      user_id: user?.id ?? null,
    });
    setFormState("idle");
    if (error) {
      setFormError(sanitizeError(error));
      return;
    }
    setFormState("success");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero — distinct crop asset vs Home (Hero.tsx uses @/assets/hero-racing.jpg) */}
      <section className="relative min-h-[22rem] flex flex-col justify-center overflow-hidden pt-28 pb-14 md:pt-32 md:pb-16">
        <div className="absolute inset-0">
          <img
            src={heroContact}
            alt="Horse racing at the track"
            className="w-full h-full object-cover object-[52%_center]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(232 59% 8% / 0.92) 0%, hsl(214 52% 15% / 0.88) 50%, hsl(232 59% 6% / 0.9) 100%)",
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none"
            aria-hidden
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="h-1 w-16 bg-primary mx-auto rounded-full mb-4" aria-hidden />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-heading tracking-tight">
              Get in Touch
            </h1>
            <p className="text-lg text-white/85">
              We're here to help you win more
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {contactOptions.map((option, index) => (
              <motion.div
                key={option.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="card-dark text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                  <option.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 font-heading">{option.title}</h3>
                <p className="text-foreground/80 text-sm mb-1">{option.description}</p>
                <p className="text-muted-foreground text-xs mb-1">{option.detail}</p>
                <p className="text-muted-foreground text-xs mb-4">Best for: {option.bestFor}</p>
                <a href={option.href}>
                  <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    {option.cta}
                  </Button>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center font-heading">
                Send Us a Message
              </h2>

              {formState === "success" ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 font-heading">Message sent!</h3>
                  <p className="text-muted-foreground">We'll respond within 24 hours.</p>
                  <Button
                    className="mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    onClick={() => setFormState("idle")}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Name *</label>
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
                    <Input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Subject *</label>
                    <Select value={subject} onValueChange={setSubject} required>
                      <SelectTrigger className="bg-muted border-border text-foreground">
                        <SelectValue placeholder="Choose a topic" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing Question</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="general">General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Message *</label>
                    <Textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help?"
                      rows={5}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary resize-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Your email is safe with us.</p>
                  {formError && (
                    <p className="text-sm text-destructive" role="alert">
                      {formError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={formState === "submitting"}
                    className="w-full bg-primary text-primary-foreground hover:brightness-110 font-semibold py-6"
                  >
                    {formState === "submitting" ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-sm mx-auto text-center card-dark">
            <Clock className="h-5 w-5 text-primary mx-auto mb-2" />
            <h3 className="font-semibold text-foreground text-sm mb-1">Business Hours</h3>
            <p className="text-muted-foreground text-xs">Monday - Friday: 9:00 AM - 5:00 PM ET</p>
            <p className="text-muted-foreground text-xs">Weekend inquiries answered on Monday</p>
          </div>
        </div>
      </section>

      {/* Emergency */}
      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto p-4 rounded-xl border border-warning/30 bg-warning/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-semibold text-warning text-sm">Urgent Issue?</span>
            </div>
            <p className="text-muted-foreground text-xs">
              If you're experiencing a critical problem during live racing, email support@dataeel.com with "URGENT" in the subject for fastest response.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section id="faq-section" className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8 font-heading">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {contactFaqs.map((faq, index) => (
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
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
