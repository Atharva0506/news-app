import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function Cookies() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow pt-32 pb-20 px-4 container mx-auto max-w-4xl">
                <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
                <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
                    <p className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 font-medium">
                        Note: This project is built for learning and demo purposes.
                    </p>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">1. What Are Cookies</h2>
                        <p>
                            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Cookies</h2>
                        <p>
                            We use cookies for the following purposes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                            <li>To enable certain functions of the Service</li>
                            <li>To provide analytics</li>
                            <li>To store your preferences (such as Light/Dark mode)</li>
                            <li>To enable advertisements delivery, including behavioral advertising</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">3. Your Choices</h2>
                        <p>
                            If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages might not display properly.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
