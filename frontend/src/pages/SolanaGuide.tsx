import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, Download, CreditCard, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SEOHead } from "@/components/SEOHead";

export default function SolanaGuide() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEOHead
                title="How to Pay with Solana — Payment Guide"
                description="Step-by-step guide to setting up a Solana wallet and paying for NewsAI Pro with Phantom or Solflare. Fast, secure, and low-fee crypto payments."
                canonical="/solana-guide"
                keywords="Solana payment guide, Phantom wallet, Solflare, crypto payment, how to pay with Solana"
            />
            <Navbar />

            <div className="flex-grow pt-32 pb-20 container mx-auto px-4 max-w-4xl space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">How to Pay with Solana</h1>
                    <p className="text-xl text-muted-foreground">
                        A secure, fast, and low-fee way to upgrade your account.
                    </p>
                </div>

                {/* Video Demo Section */}
                <Card className="overflow-hidden border-accent/20 shadow-lg">
                    <CardHeader className="bg-accent/5 pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <PlayCircle className="h-5 w-5 text-accent" />
                            Watch Video Tutorial
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 aspect-video bg-black relative flex items-center justify-center">
                        <video
                            controls
                            className="w-full h-full object-cover"

                        >
                            <source src="/News AI Demo.webm" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        {/* Placeholder overlay if video is missing (optional, checking via JS is better but this is simple HTML) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
                            <p className="text-white bg-black/50 px-4 py-2 rounded">Video Source: /videos/solana-demo.mp4</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <StepCard
                        icon={<Download className="w-8 h-8 text-primary" />}
                        title="1. Install Phantom Wallet"
                        description="Download the Phantom wallet extension for your browser or mobile app."
                        action={<Button variant="outline" className="w-full mt-2" onClick={() => window.open("https://phantom.app/", "_blank")}>Get Phantom</Button>}
                    />
                    <StepCard
                        icon={<CreditCard className="w-8 h-8 text-primary" />}
                        title="2. Add SOL to Wallet"
                        description="Purchase SOL directly within Phantom or transfer from an exchange like Coinbase/Binance."
                    />
                    <StepCard
                        icon={<Wallet className="w-8 h-8 text-primary" />}
                        title="3. Connect & Pay"
                        description="Click 'Pay with Solana' on our checkout page, connect your wallet, and approve."
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Instructions</CardTitle>
                        <CardDescription>Follow these steps to complete your transaction effortlessly.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Step 1: Set up your Wallet
                            </h3>
                            <p className="text-muted-foreground pl-7">
                                Go to <a href="https://phantom.app/" target="_blank" className="underline text-primary">Phantom.app</a> and install the wallet. Create a new wallet and save your recovery phrase securely.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Step 2: Get Solana (SOL)
                            </h3>
                            <p className="text-muted-foreground pl-7">
                                You need a small amount of SOL to pay for the subscription. You can buy SOL directly in Phantom using MoonPay/Coinbase Pay, or send it from another exchange.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Step 3: Complete Payment
                            </h3>
                            <ul className="list-disc pl-11 text-muted-foreground space-y-2">
                                <li>Go to the Subscription page on our app.</li>
                                <li>Select "Pay with Solana".</li>
                                <li>A Phantom popup will appear. Click <strong>Connect</strong>.</li>
                                <li>Confirm the transaction details and click <strong>Approve</strong>.</li>
                                <li>Wait a few seconds for confirmation. Your account will upgrade automatically!</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Troubleshooting</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Transaction Failed?</strong> Ensure you have enough SOL for gas fees (usually less than $0.01).</li>
                            <li><strong>Wallet not connecting?</strong> Refresh the page or try disabling other wallet extensions.</li>
                            <li><strong>Payment sent but not upgraded?</strong> Contact support with your transaction signature.</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                <div className="flex justify-center pt-4">
                    <Button size="lg" onClick={() => navigate("/pricing")}>
                        Go to Pricing Page <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Footer />
        </div>
    );
}

function StepCard({ icon, title, description, action }: any) {
    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
                    {icon}
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-muted-foreground text-sm">{description}</p>
                {action}
            </CardContent>
        </Card>
    );
}
