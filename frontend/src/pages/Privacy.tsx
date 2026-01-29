import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function Privacy() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow pt-32 pb-20 px-4 container mx-auto max-w-4xl">
                <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
                    <p className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 font-medium">
                        Note: This project is built for learning and demo purposes. No real user data is permanently stored or sold.
                    </p>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
                        <p>
                            We collect information you provide directly to us, such as when you create an account, subscribe to our newsletter, or contact us for support. This may include your name, email address, and wallet address.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
                        <p>
                            We use the information we collect to provide, maintain, and improve our services, including to process transactions, send you technical notices, and respond to your comments and questions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data Security</h2>
                        <p>
                            We implement reasonable security measures to protect your information. However, please note that no method of transmission over the internet or electronic storage is completely secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">4. Third-Party Services</h2>
                        <p>
                            Our service integrates with third-party APIs (including Currents API and Google Gemini) and the Solana blockchain. Please review their respective privacy policies for how they handle data.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
