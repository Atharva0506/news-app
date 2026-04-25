import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Testimonials } from "@/components/landing/Testimonials";
import { TechStack } from "@/components/landing/TechStack";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { WelcomeModal } from "@/components/landing/WelcomeModal";
import { SEOHead } from "@/components/SEOHead";

const JSON_LD_WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "NewsAI",
  "url": "https://newsai.atharvanaik.me/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://newsai.atharvanaik.me/explore?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const Index = () => {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="NewsAI — AI-Powered News Aggregator & Intelligent Briefings"
        description="NewsAI is an AI-powered news aggregator with deep article analysis, bias detection, personalized feeds, and daily AI briefings. Start free today."
        canonical="/"
        keywords="AI news aggregator, news AI, AI news reader, news analysis, bias detection, personalized news feed, AI briefings, news intelligence"
        jsonLd={JSON_LD_WEBSITE}
      />
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <TechStack />
      <CTA />
      <Footer />
      <WelcomeModal />
    </div>
  );
};

export default Index;
