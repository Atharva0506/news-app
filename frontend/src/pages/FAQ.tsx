import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SEOHead } from "@/components/SEOHead";

const faqs = [
    {
        question: "What's the difference between Free and Pro?",
        answer: "The <strong>Free plan</strong> gives you 1,000 AI chat tokens/day, 1 news summary per day, 1 feed refresh per day, and basic features — but no deep analysis or chat saving. The <strong>Pro plan</strong> gives you 10,000 AI chat tokens/day, 3 deep analyses per day, unlimited news summary & feed refresh, saved chat history, billing history, and higher rate limits. All new accounts also get a <strong>3-day free trial</strong> of Pro features (except Save Chat).",
    },
    {
        question: "What are token limits?",
        answer: "Tokens are units the AI uses to process and generate text. On the <strong>Free plan</strong>, you get up to <strong>1,000 tokens per day</strong>. On the <strong>Pro plan</strong>, this increases to <strong>10,000 tokens per day</strong>, allowing for longer, more detailed conversations and answers.",
    },
    {
        question: "What is deep analysis?",
        answer: "Deep analysis gives you an in-depth AI breakdown of any news article — including sentiment, bias detection, fact-checking cues, and a comprehensive summary. <strong>Pro users</strong> can run up to <strong>3 deep analyses per day</strong>. During the <strong>free trial</strong>, you get <strong>1 deep analysis per day</strong>. <strong>Free plan</strong> users (after trial) do not have access to this feature.",
    },
    {
        question: "How does the free trial work?",
        answer: "When you sign up, your first <strong>3 days</strong> automatically include all <strong>Pro features except Save Chat</strong> — 10,000 chat tokens/day, 1 deep analysis per day, and unlimited refresh. No payment is needed. During the trial, you'll see an <strong>Upgrade to Pro</strong> button. After the trial ends, your account switches to the Free plan (1,000 tokens, 1 summary/day, 1 refresh/day, no deep analysis) unless you upgrade.",
    },
    {
        question: "What happens after my limits are reached?",
        answer: "If you hit your AI chat token limit, the system will pause AI-powered features until the next day. However, we've implemented a <strong>Reliability Fallback</strong>: if our primary AI provider (Google Gemini) is busy or hits a rate limit, we automatically switch your request to our secondary provider (Groq/Llama) so your experience remains uninterrupted. Your usage dashboard updates in <strong>real-time</strong> as you use tokens.",
    },
    {
        question: "How do payments and billing work?",
        answer: "We use the <strong>Solana blockchain</strong> for fast, secure, low-fee payments. You can pay using any Solana-compatible wallet (Phantom, Solflare, etc.). Pro users have access to <strong>billing history & invoices</strong> in their account settings. <strong>Note:</strong> You cannot make another payment while your current Pro subscription is still active. Need help? Check our <a href='/solana-guide' class='text-accent hover:underline'>Solana Payment Guide</a>.",
    },
    {
        question: "How do I upgrade to Pro?",
        answer: "Head to the <a href='/pricing' class='text-accent hover:underline'>Pricing page</a>, connect your Solana wallet, and click <strong>Pay with Solana</strong> on the Pro plan. The upgrade is instant. If you're still in your free trial, you can upgrade anytime to unlock 3 deep analyses per day and Save Chat.",
    },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer.replace(/<[^>]+>/g, ""),
    },
  })),
};

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <SEOHead
                title="FAQ — Frequently Asked Questions"
                description="Get answers to common questions about NewsAI — pricing, token limits, deep analysis, free trial, Solana payments, and how to upgrade to Pro."
                canonical="/faq"
                jsonLd={FAQ_JSON_LD}
            />
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
                                                <span dangerouslySetInnerHTML={{ __html: faq.answer }} />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-16 text-center bg-card border border-border rounded-lg p-8">
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
