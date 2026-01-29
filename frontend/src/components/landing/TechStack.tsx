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
    <section className="py-16 bg-background border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <p className="text-sm text-muted-foreground">
            Built with the best tools in the industry
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center items-center gap-8 md:gap-12"
        >
          {technologies.map((tech, index) => {
            const Icon = tech.icon;

            return (
              <div
                key={index}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{tech.name}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
