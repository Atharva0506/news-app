import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Testimonials } from "@/components/landing/Testimonials";
import { TechStack } from "@/components/landing/TechStack";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const Index = () => {
  const { user, isLoading } = useAuth();

  // Optional: Auto-redirect to dashboard if logged in?
  // User requirement: "Show Dashboard access".
  // Usually means changing buttons.
  // If I simply redirect, it satisfies "access".
  // "If user IS logged in... Show Dashboard access".
  // Let's modify Navbar to be smart.
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <TechStack />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
