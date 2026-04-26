import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, ExternalLink, Search, RefreshCw } from "lucide-react";
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

    const { category, sentiment, search } = filters || {};

    const fetchNews = useCallback(async (forceRefresh: boolean = false) => {
        setIsLoading(true);
        try {
            const data = await api.news.getFeed({ category, sentiment, search, refresh: forceRefresh });
            setArticles(data);
            localStorage.setItem("cached_feed", JSON.stringify(data));
            await refreshProfile();
        } catch (error: unknown) {
            console.error(error);
            const cached = localStorage.getItem("cached_feed");
            const apiError = error as { status?: number; message?: string };
            if (cached) {
                setArticles(JSON.parse(cached));
                if (apiError.status === 403 || apiError.message?.includes("limit")) {
                    toast.info("Daily limit reached. Showing cached feed.");
                } else {
                    if (forceRefresh) toast.warning("Could not refresh. Showing cached feed.");
                }
            } else {
                toast.error(apiError.message || "Failed to load news feed");
            }
        } finally {
            setIsLoading(false);
        }
    }, [category, sentiment, search, refreshProfile]);

    useEffect(() => {
        fetchNews(false);
    }, [fetchNews]);

    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchNews(true);
        }
    }, [refreshTrigger, fetchNews]);

    const getBiasLabel = (score?: number) => {
        if (score === undefined) return "neutral";
        if (score < -0.3) return "left";
        if (score > 0.3) return "right";
        return "neutral";
    };

    const biasStyles: Record<string, string> = {
        neutral: "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400",
        left: "bg-blue-500/8 text-blue-600 dark:text-blue-400",
        right: "bg-amber-500/8 text-amber-600 dark:text-amber-400",
    };

    const sentimentDot: Record<string, string> = {
        positive: "bg-emerald-500",
        neutral: "bg-slate-400",
        negative: "bg-rose-500",
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-card flex gap-4">
                        <div className="flex-1 space-y-2.5">
                            <Skeleton className="h-5 w-4/5" />
                            <Skeleton className="h-3.5 w-full" />
                            <Skeleton className="h-3.5 w-3/4" />
                            <div className="flex gap-2 pt-1">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-14 rounded-full" />
                            </div>
                        </div>
                        <Skeleton className="hidden sm:block h-24 w-36 rounded-lg shrink-0" />
                    </div>
                ))}
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">No articles found</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-5">
                    Try adjusting your filters or refreshing the feed.
                </p>
                <div className="flex gap-2">
                    {(filters.category || filters.sentiment || filters.search) && (
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                            Clear Filters
                        </Button>
                    )}
                    <Button size="sm" onClick={() => fetchNews(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Refresh
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {articles.map((article, index) => (
                <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                    className="group rounded-lg border border-border bg-card hover:border-accent/20 hover:shadow-soft transition-all duration-200 cursor-pointer overflow-hidden flex flex-col sm:flex-row"
                    onClick={() => onSelectArticle(article)}
                >
                    {/* Content */}
                    <div className="flex flex-col flex-1 p-4">
                        {/* Meta row */}
                        <div className="flex items-center gap-2 mb-2">
                            {article.category?.slice(0, 2).map(cat => (
                                <span key={cat} className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {cat}
                                </span>
                            ))}
                            {article.sentiment && (
                                <span className={`h-1.5 w-1.5 rounded-full ${sentimentDot[article.sentiment] || sentimentDot.neutral}`} />
                            )}
                            <span className="text-2xs text-muted-foreground/70 ml-auto">
                                {new Date(article.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-[15px] font-semibold leading-snug group-hover:text-accent transition-colors duration-150 line-clamp-2 mb-1.5">
                            {article.title}
                        </h2>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                            {article.summary_short || article.description}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center gap-2 mt-auto">
                            <Badge variant="secondary" className={`text-2xs font-medium border-0 ${biasStyles[getBiasLabel(article.bias_score)]}`}>
                                {getBiasLabel(article.bias_score)}
                            </Badge>

                            <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectArticle(article);
                                    }}
                                >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Analyze
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(article.url, '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Source
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Image */}
                    {article.image && (
                        <div className="shrink-0 w-full sm:w-40 md:w-48 h-40 sm:h-auto relative overflow-hidden bg-muted">
                            <OptimizedImage
                                src={article.image}
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                        </div>
                    )}
                </motion.article>
            ))}
        </div>
    );
}
