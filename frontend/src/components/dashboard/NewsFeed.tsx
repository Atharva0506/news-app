import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, AlertCircle, Clock, TrendingUp, ExternalLink, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface Article {
    id: string;
    title: string;
    description: string;
    summary_short?: string;
    url: string;
    author: string;
    category: string[];
    published_at: string;
    sentiment?: string;
    bias_score?: number;
    image?: string;
}

export interface NewsFilters {
    category?: string;
    sentiment?: string;
    search?: string;
}

export function NewsFeed({
    onSelectArticle,
    filters = {},
    refreshTrigger = 0
}: {
    onSelectArticle: (article: Article) => void,
    filters?: NewsFilters,
    refreshTrigger?: number
}) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { refreshProfile } = useAuth();

    // Effect for Filters (Load from DB/Cache)
    useEffect(() => {
        fetchNews(false);
    }, [filters.category, filters.sentiment, filters.search]);

    // Effect for Refresh Button (Force API Fetch)
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchNews(true);
        }
    }, [refreshTrigger]);

    const fetchNews = async (forceRefresh: boolean = false) => {
        setIsLoading(true);
        try {
            const data = await api.news.getFeed({ ...filters, refresh: forceRefresh });
            setArticles(data);
            if (!forceRefresh) {
                // Only update local cache on initial load if we want, or always?
                // Always is fine.
            }
            localStorage.setItem("cached_feed", JSON.stringify(data));
            await refreshProfile();
        } catch (error: any) {
            console.error(error);
            // Fallback to cache
            const cached = localStorage.getItem("cached_feed");
            if (cached) {
                setArticles(JSON.parse(cached));
                if (error.status === 403 || error.message.includes("limit")) {
                    toast.info("Daily limit reached. Showing cached feed.");
                } else {
                    if (forceRefresh) toast.warning("Could not refresh. Showing cached feed.");
                }
            } else {
                toast.error(error.message || "Failed to load news feed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const biasColors: Record<string, string> = {
        neutral: "bg-green-500/10 text-green-600 dark:text-green-400",
        left: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        right: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    };

    const getBiasLabel = (score?: number) => {
        if (score === undefined) return "neutral";
        if (score < -0.3) return "left";
        if (score > 0.3) return "right";
        return "neutral";
    }

    if (isLoading) {
        return (
            <div className="grid gap-4 md:gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-border bg-card">
                        <Skeleton className="h-6 w-3/4 mb-3" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6 mb-4" />
                    </div>
                ))}
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                    We couldn't find any news articles matching your current filters.
                </p>
                <div className="flex gap-2">
                    {/* Suggest clearing filters or refreshing */}
                    {(filters.category || filters.sentiment || filters.search) && (
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Clear Filters
                        </Button>
                    )}
                    <Button onClick={() => fetchNews(true)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Feed
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:gap-6">
            {articles.map((article, index) => (
                <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="group rounded-2xl border border-border bg-card hover:border-accent/30 transition-all shadow-soft hover:shadow-glow cursor-pointer overflow-hidden flex flex-col sm:flex-row"
                    onClick={() => onSelectArticle(article)}
                >
                    {/* Image Section - Stacked on mobile, Left on desktop */}
                    {article.image && (
                        <div className="shrink-0 w-full sm:w-48 md:w-64 h-48 sm:h-auto relative overflow-hidden bg-muted">
                            <OptimizedImage
                                src={article.image}
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>
                    )}

                    <div className="flex flex-col flex-1 p-5 md:p-6">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <h2 className="text-lg font-semibold leading-tight group-hover:text-accent transition-colors line-clamp-2">
                                {article.title}
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 -mt-1 -mr-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectArticle(article);
                                }}
                            >
                                <MessageSquare className="h-4 w-4 text-muted-foreground hover:text-accent" />
                            </Button>
                        </div>

                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 sm:line-clamp-3">
                            {article.summary_short || article.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                            {article.category?.map(cat => (
                                <Badge key={cat} variant="secondary" className="text-xs font-normal">{cat}</Badge>
                            ))}

                            <Badge className={`${biasColors[getBiasLabel(article.bias_score)]} border-0`}>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {getBiasLabel(article.bias_score)}
                            </Badge>

                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                                <Clock className="h-3 w-3" />
                                {new Date(article.published_at).toLocaleDateString()}
                            </span>

                            <div className="hidden sm:flex items-center gap-2 border-l border-border pl-2 ml-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2 hover:bg-accent/10 hover:text-accent"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(article.url, '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Read Source
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.article>
            ))}
        </div>
    );
}
