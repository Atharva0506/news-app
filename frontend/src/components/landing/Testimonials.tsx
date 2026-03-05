import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Journalist, TechCrunch",
    content: "NewsAI has completely transformed my research workflow. The bias detection feature helps me maintain objectivity in my reporting.",
    avatar: "SC",
  },
  {
    name: "Michael Rodriguez",
    role: "Product Manager at Stripe",
    content: "I save at least 2 hours every day. The AI summaries are incredibly accurate and the multi-agent analysis gives perspectives I'd never considered.",
    avatar: "MR",
  },
  {
    name: "Emily Watson",
    role: "Policy Analyst",
    content: "As someone who needs to track legislation across multiple sources, NewsAI is indispensable. The personalization is eerily good.",
    avatar: "EW",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-medium text-accent uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2 mb-3">
            Loved by professionals worldwide
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Join thousands of journalists, researchers, and curious minds who trust NewsAI.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="p-5 rounded-lg bg-card border border-border"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                ))}
              </div>

              {/* Content */}
              <p className="text-[13px] text-foreground mb-5 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-accent">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-[13px]">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
