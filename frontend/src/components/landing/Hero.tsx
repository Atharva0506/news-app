import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { VideoModal } from "./VideoModal";

export function Hero() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero pt-14">
      {/* Background decoration — subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/8 border border-accent/15 mb-8"
          >
            <Sparkles className="h-3 w-3 text-accent" />
            <span className="text-xs font-medium text-accent">Powered by Multi-Agent AI</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5"
          >
            Understand the News.{" "}
            <span className="text-gradient">Not Just Read It.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
          >
            AI-powered summaries, bias detection, and smart personalization.
            Get the complete picture in seconds, not hours.
            <span className="text-accent font-medium block mt-1.5 text-sm">Start your 3-Day Free Trial today.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/signup">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground h-11 px-6 text-sm font-medium">
                Get Started Free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-sm font-medium"
              onClick={() => setIsVideoOpen(true)}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              View Demo
            </Button>
            <a
              href="https://atharvanaik.me/posts/news-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Read Case Study →
            </a>
          </motion.div>

          <VideoModal
            isOpen={isVideoOpen}
            onClose={() => setIsVideoOpen(false)}
            videoSrc="/News AI Demo.webm"
          />

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="flex items-center justify-center gap-8 sm:gap-12 mt-12"
          >
            {[
              { value: "100+", label: "Active Users" },
              { value: "1000+", label: "Articles Analyzed" },
              { value: "99%", label: "Accuracy Rate" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl sm:text-2xl font-semibold tracking-tight">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-2 mt-12"
        >
          {[
            { icon: Sparkles, label: "AI Summaries" },
            { icon: Shield, label: "Bias Detection" },
            { icon: Zap, label: "Real-time Analysis" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/50 text-xs font-medium"
            >
              <item.icon className="h-3 w-3 text-accent" />
              <span>{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
