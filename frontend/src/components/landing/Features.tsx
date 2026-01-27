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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function Features() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-4">
            Everything you need to stay informed
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform combines cutting-edge AI with thoughtful design to transform how you consume news.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative p-6 rounded-2xl bg-gradient-card border border-border hover:border-accent/30 transition-all duration-300 shadow-soft hover:shadow-glow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-4 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
