import { useState } from "react";
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
    yearlyPrice: 0,
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
    yearlyPrice: 5,
    displayPrice: "0.5 SOL",
    features: [
      "Unlimited AI summaries",
      "Advanced bias detection",
      "All news categories",
      "Real-time notifications",
      "AI Q&A assistant",
      "Multi-agent analysis",
      "Priority support",
    ],
    cta: "Pay with Solana",
    popular: true,
  },
  {
    name: "Team",
    id: "team",
    description: "For teams and organizations",
    monthlyPrice: 1.5,
    yearlyPrice: 15,
    displayPrice: "1.5 SOL",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Team dashboards",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "SSO & advanced security",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { user, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Plan Name
  const navigate = useNavigate();

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

    setIsProcessing(plan.name);
    try {
      // 1. Create Intent
      // For simulation, we create a payment intent (returns address & reference)
      const amount = plan.monthlyPrice;
      const intent = await api.payments.createIntent(amount);

      // 2. Simulate Wallet Interaction (TEST MODE)
      if (intent.mode === "TEST") {
        toast.info("Test Mode: Simulating Wallet Signature...");
        await new Promise(r => setTimeout(r, 2000)); // Fake delay

        const signature = intent.reference; // In test mode, ref is valid sig

        // 3. Verify
        toast.info("Verifying Transaction...");
        await api.payments.verify({ transaction_signature: signature, amount });

        // 4. Refresh & Success
        await refreshProfile();
        toast.success(`Successfully subscribed to ${plan.name}!`);
        navigate("/dashboard");
      } else {
        toast.warning("Real Solana Mode not fully accessible without Wallet Adapter. Switch Backend to TEST mode.");
      }

    } catch (error: any) {
      toast.error(error.message || "Payment failed");
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
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            {isYearly && (
              <span className="ml-2 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                Save 20%
              </span>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className={`relative p-6 rounded-2xl border ${plan.popular
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
                  <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {plan.displayPrice}
                  </span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>

                <Button
                  className={`w-full mb-6 ${plan.popular
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    : ''
                    }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={isProcessing === plan.name}
                >
                  {isProcessing === plan.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
              <a href="#" className="text-accent hover:underline">
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
