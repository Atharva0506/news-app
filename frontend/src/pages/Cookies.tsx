import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function Cookies() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow pt-28 pb-20 px-4 container mx-auto max-w-3xl">
                <h1 className="text-3xl font-bold mb-2 text-foreground">Cookie Policy</h1>
                <p className="text-sm text-muted-foreground mb-8">Last updated: June 2025</p>

                <div className="prose dark:prose-invert max-w-none space-y-8 text-muted-foreground text-sm leading-relaxed">
                    <p className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-500 text-[13px] font-medium">
                        Note: This project is built for learning and demo purposes.
                    </p>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">1. What Are Cookies</h2>
                        <p>
                            Cookies are small data files placed on your device when you visit a website. They help websites function properly, improve user experience, and provide analytics information to site owners.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">2. Cookies We Use</h2>
                        <p>We use the following types of cookies and local storage:</p>
                        <ul className="list-disc pl-6 space-y-1.5 mt-2">
                            <li><strong>Authentication tokens</strong> — Stored in localStorage to keep you signed in across sessions.</li>
                            <li><strong>Theme preference</strong> — Your dark/light mode choice is saved in localStorage.</li>
                            <li><strong>Onboarding state</strong> — Tracks whether you've completed the initial setup flow.</li>
                            <li><strong>Analytics</strong> — Basic, anonymous usage data to help us improve the platform.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">3. Third-Party Cookies</h2>
                        <p>
                            We do not use third-party advertising cookies. Some external services we integrate with (such as Google Gemini and Solana wallet providers) may set their own cookies. Please refer to their privacy policies for details.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">4. Managing Cookies</h2>
                        <p>
                            You can clear cookies and local storage through your browser settings at any time. Note that clearing authentication tokens will sign you out, and clearing theme preferences will reset your display settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3">5. Contact</h2>
                        <p>
                            If you have questions about our use of cookies, please contact us at{" "}
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
