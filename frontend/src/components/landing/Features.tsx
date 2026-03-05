import { motion } from "framer-motion";
import { 
  Sparkles, 
  Scale, 
  Users, 
  Zap, 
  MessageSquare, 
  TrendingUp 
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Summaries",
    description: "Get concise, accurate summaries of any news article in seconds. Our AI distills complex stories into digestible insights.",
  },
  {
    icon: Scale,
    title: "Bias Detection",
    description: "Understand the political lean and potential bias in every article. Make informed decisions with full transparency.",
  },
  {
    icon: Users,
    title: "Multi-Agent Analysis",
    description: "Multiple AI agents analyze each story from different perspectives, giving you a 360° view of every topic.",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    description: "Stay ahead with instant notifications on breaking news and trending topics that matter to you.",
  },
  {
    icon: MessageSquare,
    title: "Ask AI Anything",
    description: "Have questions about an article? Ask our AI assistant for deeper context, related stories, or fact-checks.",
  },
  {
    icon: TrendingUp,
    title: "Personalized Feed",
    description: "Your news feed learns from your interests. The more you use it, the smarter it gets at surfacing relevant content.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35 },
  },
};

export function Features() {
  return (
    <section className="py-20 bg-background">
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
            Features
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2 mb-3">
            Everything you need to stay informed
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Cutting-edge AI with thoughtful design to transform how you consume news.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative p-5 rounded-lg bg-card border border-border hover:border-accent/20 transition-all duration-200"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 mb-3 group-hover:bg-accent/15 transition-colors">
                <feature.icon className="h-4 w-4 text-accent" />
              </div>
              <h3 className="text-[15px] font-semibold mb-1.5">{feature.title}</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
