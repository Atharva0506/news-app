import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const faqs = [
    {
        question: "How does the AI summary work?",
        answer: "Our multi-agent AI system analyzes thousands of news articles in real-time. It uses specialized agents to collect, verify, classification, and summarize content, providing you with concise, unbiased updates.",
    },
    {
        question: "What is the Solana payment integration?",
        answer: "We use the Solana blockchain for fast, secure, and low-fee subscription payments. You can pay using any Solana-compatible wallet (like Phantom or Solflare). Currently, payments are processed on the **Solana Devnet** for testing purposes.",
    },
    {
        question: "Is there a free plan available?",
        answer: "Yes! Our Free plan gives you access to 10 AI summaries per day and basic bias detection. It's perfect for casual readers who want to try out our technology.",
    },
    {
        question: "What are the limits of the Pro plan?",
        answer: "The Pro plan creates a premium experience with unlimited AI summaries, advanced bias analysis, real-time notifications, and access to our AI Q&A assistant. It also unlocks all news categories.",
    },
    {
        question: "Can I cancel my subscription?",
        answer: "Absolutely. You can cancel your subscription at any time from your dashboard settings. Your premium access will continue until the end of the current billing period.",
    },
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />

            <main className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-accent/10 text-accent mb-6">
                            <HelpCircle className="h-8 w-8" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
                        <p className="text-muted-foreground text-lg">
                            Everything you need to know about NewsAI and our services.
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="border border-border rounded-xl overflow-hidden bg-card"
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-accent/5 transition-colors"
                                >
                                    <span className="font-semibold text-lg pr-4">{faq.question}</span>
                                    <ChevronDown
                                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {openIndex === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
                                                {faq.answer.includes("**") ? (
                                                    <span dangerouslySetInnerHTML={{
                                                        __html: faq.answer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                    }} />
                                                ) : (
                                                    faq.answer
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-16 text-center bg-card border border-border rounded-2xl p-8">
                        <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
                        <p className="text-muted-foreground mb-6">
                            Can't find the answer you're looking for? Please check our documentation or contact our support team.
                        </p>
                        <a
                            href="mailto:support@newsai.demo"
                            className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
                        >
                            Contact Support
                        </a>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
