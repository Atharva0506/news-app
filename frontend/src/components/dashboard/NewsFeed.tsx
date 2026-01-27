import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, AlertCircle, Clock, TrendingUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
}

export interface NewsFilters {
    category?: string;
    sentiment?: string;
    search?: string;
}

export function NewsFeed({
    onSelectArticle,
    filters = {}
}: {
    onSelectArticle: (article: Article) => void,
    filters?: NewsFilters
}) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchNews();
    }, [filters.category, filters.sentiment, filters.search]);

    const fetchNews = async () => {
        setIsLoading(true);
        try {
            const data = await api.news.getFeed(filters);
            setArticles(data);
        } catch (error) {
            toast.error("Failed to load news feed");
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

    return (
        <div className="grid gap-4 md:gap-6">
            {articles.map((article, index) => (
                <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="p-6 rounded-2xl border border-border bg-card hover:border-accent/30 transition-all shadow-soft hover:shadow-glow cursor-pointer"
                    onClick={() => onSelectArticle(article)}
                >
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <h2 className="text-lg font-semibold leading-tight">
                            {article.title}
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectArticle(article);
                            }}
                        >
                            <MessageSquare className="h-4 w-4 text-accent" />
                        </Button>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {article.summary_short || article.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-auto">
                        {article.category?.map(cat => (
                            <Badge key={cat} variant="secondary">{cat}</Badge>
                        ))}

                        <Badge className={biasColors[getBiasLabel(article.bias_score)]}>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {getBiasLabel(article.bias_score)}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(article.published_at).toLocaleDateString()}
                        </span>

                        <div className="ml-auto flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground hidden sm:flex">
                                <TrendingUp className="h-3 w-3" />
                                {article.author || "Unknown"}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 ml-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(article.url, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                <ExternalLink className="h-3 w-3" />
                                <span className="sr-only sm:not-sr-only sm:inline-block">Read</span>
                            </Button>
                        </div>
                    </div>
                </motion.article>
            ))}
        </div>
    );
}
