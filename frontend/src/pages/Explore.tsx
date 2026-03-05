import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Clock,
  ExternalLink,
  Compass,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface ExploreArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image?: string;
  published_at: string;
  source_name?: string;
  category?: string[];
  author?: string;
}

const CATEGORIES = [
  "all",
  "general",
  "technology",
  "business",
  "science",
  "health",
  "politics",
  "world",
  "entertainment",
];

export default function Explore() {
  const [articles, setArticles] = useState<ExploreArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const { user } = useAuth();

  useEffect(() => {
    fetchArticles();
  }, [activeCategory]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const category = activeCategory === "all" ? undefined : activeCategory;
      const data = await api.explore.feed(category);
      setArticles(data);
    } catch {
      // Silently fail — show empty state
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <span className="font-bold text-lg">NewsAI</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 text-xs" asChild>
                  <Link to="/dashboard">
                    Dashboard
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 text-xs" asChild>
                  <Link to="/signup">
                    Sign up free
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <div className="border-b border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-bold">Explore</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-lg">
            Browse the latest news from dozens of sources. Sign up to unlock AI
            analysis, personalized feeds, and more.
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="border-b border-border sticky top-14 z-30 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Compass className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No articles found. Try a different category.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {/* Featured article (first one) */}
            {articles.length > 0 && (
              <motion.a
                href={articles[0].url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="group block rounded-lg border border-border bg-card overflow-hidden md:flex"
              >
                {articles[0].image && (
                  <div className="md:w-1/2 h-48 md:h-auto bg-muted overflow-hidden">
                    <OptimizedImage
                      src={articles[0].image}
                      alt={articles[0].title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-5 md:p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    {articles[0].source_name && (
                      <span className="text-xs font-medium text-accent">
                        {articles[0].source_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(articles[0].published_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-accent transition-colors line-clamp-2">
                    {articles[0].title}
                  </h2>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                    {articles[0].description}
                  </p>
                  <div className="flex items-center gap-2 mt-auto">
                    {articles[0].category?.slice(0, 2).map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs font-normal">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.a>
            )}

            {/* Rest of articles in a list */}
            {articles.slice(1).map((article, index) => (
              <motion.a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.03 }}
                className="group flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-accent/20 transition-colors"
              >
                {article.image && (
                  <div className="hidden sm:block shrink-0 w-28 h-20 rounded-md overflow-hidden bg-muted">
                    <OptimizedImage
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {article.source_name && (
                      <span className="text-xs font-medium text-accent">
                        {article.source_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(article.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm group-hover:text-accent transition-colors line-clamp-2 mb-1">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground text-xs line-clamp-2">
                    {article.description}
                  </p>
                </div>
                <div className="hidden sm:flex items-center">
                  <ExternalLink className="h-4 w-4 text-muted-foreground/50 group-hover:text-accent transition-colors" />
                </div>
              </motion.a>
            ))}
          </div>
        )}

        {/* CTA — only show for unauthenticated users */}
        {!user && (
          <div className="mt-12 text-center py-10 rounded-lg border border-dashed border-border">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-accent/40" />
            <h3 className="font-semibold mb-1">Want AI-powered analysis?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Sign up to get personalized feeds, AI summaries, bias detection, and
              deep article analysis.
            </p>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link to="/signup">Get started free</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
