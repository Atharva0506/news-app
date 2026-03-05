import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Atom,
  FileType2,
  Palette,
  Code2,
  Zap,
  Network,
  Sparkles,
  Coins,
} from "lucide-react";

const technologies: { name: string; icon: LucideIcon }[] = [
  { name: "React", icon: Atom },
  { name: "TypeScript", icon: FileType2 },
  { name: "Tailwind CSS", icon: Palette },
  { name: "Python", icon: Code2 },
  { name: "FastAPI", icon: Zap },
  { name: "LangGraph", icon: Network },
  { name: "Gemini AI", icon: Sparkles },
  { name: "Solana", icon: Coins },
];

export function TechStack() {
  return (
    <section className="py-10 bg-background border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <p className="text-xs text-muted-foreground">
            Built with the best tools in the industry
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap justify-center items-center gap-6 md:gap-10"
        >
          {technologies.map((tech, index) => {
            const Icon = tech.icon;

            return (
              <div
                key={index}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{tech.name}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
