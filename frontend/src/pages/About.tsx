import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Github, Linkedin, Twitter, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
    const socialLinks = [
        {
            icon: Globe,
            label: "Portfolio",
            href: "https://atharva-naik-portfolio.vercel.app/",
            color: "text-purple-500 bg-purple-500/10"
        },
        {
            icon: Github,
            label: "GitHub",
            href: "https://github.com/Atharva0506",
            color: "text-gray-900 dark:text-gray-100 bg-gray-500/10"
        },
        {
            icon: Twitter,
            label: "X (Twitter)",
            href: "https://x.com/Atharva_0506",
            color: "text-blue-400 bg-blue-400/10"
        },
        {
            icon: Linkedin,
            label: "LinkedIn",
            href: "https://www.linkedin.com/in/atharva0506/",
            color: "text-blue-600 bg-blue-600/10"
        },
        {
            icon: Mail,
            label: "Email",
            href: "mailto:atharvan.coder@gmail.com",
            color: "text-red-500 bg-red-500/10"
        }
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl w-full text-center space-y-8"
                >
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            About the Developer
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            Hi, I'm Atharva Naik. I built NewsAI to revolutionize how we consume information.
                            My passion lies in creating intelligent, user-centric applications that solve real-world problems using the latest AI technologies.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {socialLinks.map((link, index) => (
                            <motion.a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className={`p-4 rounded-xl border border-border hover:border-accent/50 transition-all flex flex-col items-center gap-3 hover:shadow-lg group ${index === 0 || index === 4 || index === 3 ? "sm:col-span-1" : ""}`}
                            >
                                <div className={`p-3 rounded-full ${link.color} group-hover:scale-110 transition-transform`}>
                                    <link.icon className="h-6 w-6" />
                                </div>
                                <span className="font-medium text-foreground">{link.label}</span>
                            </motion.a>
                        ))}
                    </div>

                    <div className="pt-8">
                        <Button asChild variant="outline" size="lg">
                            <a href="https://atharva-naik-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer">
                                View Full Portfolio
                            </a>
                        </Button>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
