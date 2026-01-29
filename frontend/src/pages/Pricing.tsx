import { useState } from "react";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Check, Sparkles, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Free",
    id: "free",
    description: "Perfect for trying out NewsAI",
    monthlyPrice: 0,
    displayPrice: "0 SOL",
    features: [
      "10 AI summaries per day",
      "Basic bias detection",
      "1 news category",
      "Email digest",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    id: "pro",
    description: "For individuals who want more",
    monthlyPrice: 0.5,
    displayPrice: "0.5 SOL",
    features: [
      "Unlimited AI summaries",
      "Advanced bias detection",
      "Up to 5 news categories",
      "Real-time notifications",
      "AI Q&A assistant",
      "Multi-agent analysis",
      "Priority support",
    ],
    cta: "Pay with Solana",
    popular: true,
  },
];

export default function Pricing() {
  const { user, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Plan Name
  const navigate = useNavigate();

  // Wallet Adapter Hooks
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }
    if (plan.monthlyPrice === 0) {
      toast.info("You are already on the Free Plan");
      return;
    }

    // 1. Check Wallet Connection
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet to continue.");
      return;
    }

    setIsProcessing(plan.name);
    try {
      // 1. Create Payment Intent
      const amount = plan.monthlyPrice;
      // Pass the plan ID to the backend
      const intent = await api.payments.createIntent(amount, plan.id);

      if (intent.mode === "TEST") {
        toast.info("Test Mode: Simulating Signature...");
        await new Promise(r => setTimeout(r, 2000));
        const signature = intent.reference;

        toast.info("Verifying...");
        await api.payments.verify({
          transaction_signature: signature,
          amount,
          sender_address: "TEST_WALLET",
          payment_id: intent.payment_id // Pass payment ID for verification
        });

        await refreshProfile();
        toast.success(`Subscribed to ${plan.name} (Test Mode)!`);
        navigate("/dashboard");
      } else {
        // REAL / DEVNET MODE
        if (!publicKey || !connection) {
          // Double check connection state
          toast.error("Wallet not connected. Please select a wallet.");
          return;
        }

        try {
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: new PublicKey(intent.address),
              lamports: amount * LAMPORTS_PER_SOL
            })
          );

          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = publicKey;

          // Catch Wallet Signing Errors specifically
          let signature;
          try {
            signature = await sendTransaction(transaction, connection);
          } catch (walletErr: any) {
            if (walletErr.message?.includes("User rejected") || walletErr.name === "WalletSignTransactionError") {
              console.log("User rejected signature");
              toast.warning("Transaction cancelled by user");
              // Optional: Call backend to cancel the intent?
              await api.payments.cancel(intent.payment_id);
              return;
            }
            if (walletErr.message?.includes("Plugin Closed")) {
              toast.error("Wallet popup closed. Please try again.");
              return;
            }
            throw walletErr; // Re-throw other errors
          }

          toast.info("Transaction sent. Waiting for confirmation...");

          // Use a custom confirming toast or state
          const confirmation = await connection.confirmTransaction(signature, "confirmed");

          if (confirmation.value.err) {
            throw new Error("Transaction failed on chain: " + JSON.stringify(confirmation.value.err));
          }

          toast.info("Verifying with backend...");
          await api.payments.verify({
            transaction_signature: signature,
            amount,
            sender_address: publicKey.toString(),
            payment_id: intent.payment_id
          });

          await refreshProfile();
          toast.success(`Subscribed to ${plan.name}!`);
          navigate("/dashboard");

        } catch (err: any) {
          console.error("Solana Error:", err);
          toast.error("Transaction failed: " + (err.message || "Unknown error"));
          // Try to record failure if we have a payment_id? (Maybe not needed if we didn't get a signature)
        }
      }

    } catch (error: any) {
      console.error("Payment Flow Error:", error);
      toast.error(error.message || "Payment initialization failed");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Simple Pricing</span>
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Choose your plan
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>

            {/* Solana Network Notice */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-medium mb-6">
              <span>⚠️ Payments are currently on Solana Devnet (testing network). Do not use real SOL.</span>
            </div>

            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className={`relative p-8 rounded-3xl border ${plan.popular
                  ? 'border-accent bg-gradient-card shadow-glow'
                  : 'border-border bg-card shadow-soft'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-bold">
                    {plan.displayPrice}
                  </span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>

                <Button
                  className={`w-full mb-8 h-12 text-base ${plan.popular
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    : 'h-12'
                    }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={isProcessing === plan.name || (plan.monthlyPrice > 0 && !publicKey)}
                >
                  {isProcessing === plan.name ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* FAQ Teaser */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center mt-16"
          >
            <p className="text-muted-foreground">
              Have questions?{" "}
              <a href="/faq" className="text-accent hover:underline">
                Check our FAQ
              </a>{" "}
              or{" "}
              <a href="#" className="text-accent hover:underline">
                contact support
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
