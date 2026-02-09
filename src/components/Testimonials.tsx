import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Michael R.",
    location: "Tampa, FL",
    text: "I used to spend hours poring over the Racing Form. Now I just grab my EEL RaceCard and head to the track. Hit a TRIFECTA last week!",
    rating: 5,
    avatar: "MR",
  },
  {
    name: "Sarah K.",
    location: "Los Angeles, CA",
    text: "Finally, horse racing predictions that actually make sense. The Concert algorithm nailed 4 winners for me at Santa Anita. Money well spent!",
    rating: 5,
    avatar: "SK",
  },
  {
    name: "David L.",
    location: "Lexington, KY",
    text: "As a 30-year handicapper, I was skeptical. But DATAEEL's algorithms see things I miss. Now it's my secret weapon at the track.",
    rating: 5,
    avatar: "DL",
  },
  {
    name: "Jennifer M.",
    location: "Chicago, IL",
    text: "My first time betting horses was at the Kentucky Derby. Downloaded the RaceCard, followed the picks, and cashed 3 tickets. I'm hooked!",
    rating: 5,
    avatar: "JM",
  },
];

export const Testimonials = () => {
  return (
    <section className="py-24 bg-card relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge-warning mb-4 inline-block">Testimonials</span>
          <h2 className="section-title mb-4">
            Trusted by <span className="text-neon">Thousands</span> of Bettors
          </h2>
          <p className="section-subtitle">
            Join the growing community of horse racing enthusiasts who've simplified their handicapping.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index }}
              className="card-dark relative group"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground/80 leading-relaxed mb-6">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
