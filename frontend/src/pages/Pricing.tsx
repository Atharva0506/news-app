import { useState, useEffect } from "react";
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
import { SEOHead } from "@/components/SEOHead";




export default function Pricing() {
  const { user, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Plan Name
  const navigate = useNavigate();

  // Dynamic Pricing State
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solNetwork, setSolNetwork] = useState<string>("devnet");

  useEffect(() => {
    // Fetch pricing and network config from backend
    api.payments.getConfig()
      .then(config => {
        setSolPrice(config.pro_plan_price);
        setSolNetwork(config.solana_network);
      })
      .catch(err => {
        console.error("Failed to load payment config:", err);
        // Fallback to loading state or handle error
        toast.error("Could not load pricing information");
      });
  }, []);

  const isProActive = user?.plan_type === 'pro' && user?.premium_expiry && new Date(user.premium_expiry) > new Date();

  const plans = [
    {
      name: "Free",
      id: "free",
      description: "Get started with NewsAI — includes a 3-day Free Trial of all Pro features (except Save Chat).",
      monthlyPrice: 0,
      displayPrice: "0 SOL",
      features: [
        "AI chat limit: 1,000 tokens/day",
        "1 news summary per day",
        "1 feed refresh per day",
        "🎉 3-day Pro trial on signup",
      ],
      cta: "Get Started Free",
      popular: false,
      missing_features: [
        "Deep analysis (locked)",
        "Save chat history",
        "Higher rate limits",
      ]
    },
    {
      name: "Pro",
      id: "pro",
      description: "Unlock the full power of NewsAI with higher limits and advanced features.",
      monthlyPrice: solPrice!, // Can be null initially (handled in UI)
      displayPrice: solPrice !== null ? `${solPrice} SOL` : "Loading...",
      features: [
        "AI chat limit: 10,000 tokens/day",
        "3 deep analyses per day",
        "Unlimited news summary & feed refresh",
        "Save chat history",
        "High-priority AI Fallback (Gemini + Groq)",
        "Billing history & invoices",
        "Higher rate limits",
      ],
      cta: "Pay with Solana",
      popular: true,
    },
  ];

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
    if (isProActive && plan.id === 'pro') {
      toast.info("You already have an active Pro subscription. Wait until it expires to renew.");
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
          } catch (walletErr: unknown) {
            const walletError = walletErr as { message?: string; name?: string };
            console.log("Wallet Error Details:", walletError);
            // Handle User Rejection or Plugin Closure (which is effectively a rejection)
            if (
              walletError.message?.includes("User rejected") ||
              walletError.name === "WalletSignTransactionError" ||
              walletError.name === "WalletSendTransactionError" ||
              walletError.message?.includes("Plugin Closed")
            ) {
              console.log("User rejected signature or closed wallet");
              toast.warning("Transaction cancelled by user");
              // Call backend to cancel the intent
              await api.payments.cancel(intent.payment_id);
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

        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error("Unknown error");
          console.error("Solana Error:", error);
          toast.error("Transaction failed: " + error.message);
          // Try to record failure if we have a payment_id? (Maybe not needed if we didn't get a signature)
        }
      }

    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Payment Flow Error:", error);
      if (err.message && err.message.includes("verify your email") && import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION !== 'false') {
        toast.error("Email verification required", {
          action: {
            label: "Resend Email",
            onClick: () => api.auth.resendVerification().then(() => toast.success("Verification email sent!"))
          }
        });
      } else {
        toast.error(err.message || "Payment initialization failed");
      }
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing — Free & Pro Plans"
        description="Start free with NewsAI or upgrade to Pro for 10,000 AI chat tokens/day, deep article analysis, unlimited feeds, and saved chat history. Pay securely with Solana."
        canonical="/pricing"
        keywords="NewsAI pricing, news AI plans, free news AI, pro news aggregator, Solana payment"
      />
      <Navbar />

      <section className="pt-28 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/8 border border-accent/15 mb-5">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-xs font-medium text-accent">Simple Pricing</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Choose your plan
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-5">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>

            {/* Solana Network Notice */}
            {/* Solana Network Notice */}
            {/* Solana Network Notice */}
            {solNetwork && (
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${solNetwork === "mainnet"
                  ? "bg-green-500/10 border border-green-500/20 text-green-600"
                  : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                  }`}>
                  <span>
                    {solNetwork === "mainnet"
                      ? "✅ Payments are running on Mainnet (real payments)"
                      : "⚠️ Payments are running on Devnet (testing mode)"}
                  </span>
                </div>
                <a href="/solana-guide" className="text-sm text-muted-foreground hover:text-accent underline">
                  New to Solana? Read our Payment Guide
                </a>
              </div>
            )}

            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + index * 0.08 }}
                className={`relative p-6 rounded-lg border ${plan.popular
                  ? 'border-accent bg-card shadow-md'
                  : 'border-border bg-card'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {plan.displayPrice}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">/month</span>
                </div>

                <Button
                  className={`w-full mb-6 h-10 text-sm ${plan.popular
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    : ''
                    }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={
                    isProcessing === plan.name ||
                    (plan.monthlyPrice > 0 && !publicKey) ||
                    (plan.id === "pro" && solPrice === null) ||
                    (plan.id === "pro" && isProActive)
                  }
                >
                  {isProcessing === plan.name || (plan.id === "pro" && solPrice === null) ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {plan.id === "pro" && solPrice === null ? "Loading..." : "Processing..."}
                    </>
                  ) : plan.id === 'pro' && isProActive ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Currently Subscribed
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>

                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span className="text-[13px]">{feature}</span>
                    </li>
                  ))}
                  {/* @ts-expect-error -- missing_features only exists on the Free plan */}
                  {plan.missing_features?.map((feature: string, i: number) => (
                    <li key={`missing-${i}`} className="flex items-start gap-2 text-muted-foreground/50">
                      <div className="h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="block w-3 h-px bg-current rotate-45 absolute"></span>
                        <span className="block w-3 h-px bg-current -rotate-45 absolute"></span>
                      </div>
                      <span className="text-[13px] line-through">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* FAQ Teaser */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-center mt-12"
          >
            <p className="text-sm text-muted-foreground">
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
