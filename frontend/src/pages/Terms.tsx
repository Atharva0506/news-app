import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function Terms() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow pt-32 pb-20 px-4 container mx-auto max-w-4xl">
                <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
                <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
                    <p className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 font-medium">
                        Note: This project is built for learning and demo purposes.
                    </p>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using our website, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">2. Use License</h2>
                        <p>
                            Permission is granted to temporarily download one copy of the materials (information or software) on NewsAI's website for personal, non-commercial transitory viewing only.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">3. Disclaimer</h2>
                        <p>
                            The materials on NewsAI's website are provided on an 'as is' basis. NewsAI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">4. Blockchain Transactions</h2>
                        <p>
                            Transactions on the Solana network are irreversible. You acknowledge that NewsAI has no control over the Solana network and cannot reverse or refund transactions once confirmed on the blockchain, except as explicitly provided in our refund policy (if any).
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
