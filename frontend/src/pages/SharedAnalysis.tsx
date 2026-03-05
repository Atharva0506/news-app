import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Sparkles, ExternalLink, Eye, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface SharedData {
  id: string;
  article_title: string;
  article_url: string;
  analysis_json: {
    messages?: { role: string; content: string }[];
    summary?: string;
  };
  view_count: number;
  created_at: string;
}

export default function SharedAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.share
      .get(id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-xl font-bold mb-2">Analysis not found</h1>
        <p className="text-muted-foreground text-sm mb-4">
          This shared analysis may have been removed or the link is invalid.
        </p>
        <Button variant="outline" asChild>
          <Link to="/explore">Browse Explore</Link>
        </Button>
      </div>
    );
  }

  const aiMessages =
    data.analysis_json.messages?.filter((m) => m.role === "ai") || [];
  const userMessages =
    data.analysis_json.messages?.filter((m) => m.role === "user") || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <span className="font-bold text-lg">NewsAI</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link to="/explore">
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Explore
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Article info */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Shared Analysis
          </p>
          <h1 className="text-2xl font-bold mb-3">{data.article_title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <a
              href={data.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Read original article
            </a>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {data.view_count} views
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(data.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Analysis content */}
        <div className="space-y-4">
          {data.analysis_json.messages?.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg p-4 ${
                msg.role === "user"
                  ? "bg-accent/5 border border-accent/10"
                  : "bg-muted"
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                {msg.role === "user" ? "Question" : "AI Analysis"}
              </p>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center py-8 rounded-lg border border-dashed border-border">
          <Sparkles className="h-6 w-6 mx-auto mb-2 text-accent/40" />
          <h3 className="font-semibold text-sm mb-1">
            Want to analyze articles yourself?
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Sign up for free AI-powered news analysis.
          </p>
          <Button
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            asChild
          >
            <Link to="/signup">Sign up free</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
