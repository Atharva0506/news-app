import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function Privacy() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow pt-28 pb-20 px-4 container mx-auto max-w-3xl">
                <h1 className="text-3xl font-bold mb-2 text-foreground">Privacy Policy</h1>
                <p className="text-sm text-muted-foreground mb-8">Last updated: June 2025</p>

                <div className="prose dark:prose-invert max-w-none space-y-8 text-muted-foreground text-sm leading-relaxed">
                    <p className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-500 text-[13px] font-medium">
                        Note: This project is built for learning and demo purposes. No real user data is permanently stored or sold.
                    </p>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
                        <p>
                            We collect information you provide when creating an account, including your name, email address, and Solana wallet address. We also collect usage data such as articles viewed, AI analyses requested, and feature interactions to improve the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
                        <p>Your information is used to:</p>
                        <ul className="list-disc pl-6 space-y-1.5 mt-2">
                            <li>Provide and personalize the news feed based on your preferred categories and language.</li>
                            <li>Process subscription payments via the Solana blockchain.</li>
                            <li>Generate AI-powered news analysis and chat responses.</li>
                            <li>Send transactional emails (verification, password reset) via Resend.</li>
                            <li>Track usage against your plan's limits.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Security</h2>
                        <p>
                            We implement industry-standard security measures including JWT-based authentication with token rotation, password hashing with bcrypt, and SSL/TLS encryption for all data in transit. Your database is hosted on Neon PostgreSQL with encrypted connections.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">4. Third-Party Services</h2>
                        <p>Our service integrates with the following third-party providers:</p>
                        <ul className="list-disc pl-6 space-y-1.5 mt-2">
                            <li><strong>Google Gemini</strong> — AI model for news analysis, chat, and support.</li>
                            <li><strong>RSS Feeds & GDELT</strong> — Public news data sources for article aggregation.</li>
                            <li><strong>Solana Blockchain</strong> — Payment processing (wallet addresses are public on-chain).</li>
                            <li><strong>Resend</strong> — Transactional email delivery.</li>
                            <li><strong>Neon</strong> — Managed PostgreSQL database hosting.</li>
                        </ul>
                        <p className="mt-2">Please review their respective privacy policies for how they handle data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
                        <p>
                            Account data is retained while your account is active. If you delete your account, it enters a 7-day soft-delete recovery period, after which all personal data is permanently removed. Cached news data and AI analysis results are automatically purged after 24 hours.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies & Local Storage</h2>
                        <p>
                            We use localStorage for authentication tokens, theme preferences, and onboarding state. For more details, see our{" "}
                            <a href="/cookies" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                                Cookie Policy
                            </a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">7. Contact</h2>
                        <p>
                            For privacy-related questions, contact us at{" "}
                            <a href="mailto:atharvan.coder@gmail.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                                atharvan.coder@gmail.com
                            </a>.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
