import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const isSameDay = (d1?: string) => {
  if (!d1) return false;
  const date1 = new Date(d1);
  const now = new Date();
  return (
    date1.getUTCFullYear() === now.getUTCFullYear() &&
    date1.getUTCMonth() === now.getUTCMonth() &&
    date1.getUTCDate() === now.getUTCDate()
  );
};

const CACHE_KEY = "daily_briefing_summary";

export function FeedSummary() {
  const { user, refreshProfile } = useAuth();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setSummary(cached);
    } else {
      generateSummary(false);
    }
  }, []);

  const generateSummary = (forceRefresh: boolean = false) => {
    setLoading(true);
    api.ai
      .summarizeFeed(forceRefresh)
      .then((data) => {
        setSummary(data.summary);
        localStorage.setItem(CACHE_KEY, data.summary);
        refreshProfile();
      })
      .catch((err) => {
        if (err.status === 403 || err.message?.includes("limit")) {
          toast.info("Daily limit reached. Showing existing summary.");
        } else {
          setSummary(null);
          toast.error("Failed to generate summary");
        }
      })
      .finally(() => setLoading(false));
  };

  if (loading && !summary)
    return (
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Generating your daily briefing...
        </div>
      </div>
    );
  if (!summary && !loading) return null;

  return (
    <div className="p-4 rounded-lg border border-border bg-card relative group">
      <div className="flex justify-between items-center mb-3">
        <h3 className="flex items-center gap-2 font-semibold text-sm">
          <div className="h-6 w-6 rounded-md bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </div>
          Daily Briefing
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => generateSummary(true)}
                  disabled={
                    loading ||
                    (!!user &&
                      !user.is_premium &&
                      isSameDay(user.last_summary_refresh_date))
                  }
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {user?.is_premium
                ? "Refresh briefing"
                : user &&
                  !user.is_premium &&
                  isSameDay(user.last_summary_refresh_date)
                ? "Upgrade to Pro for unlimited refreshes"
                : "Refresh briefing"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {loading ? (
          <span className="animate-pulse-soft">Refreshing...</span>
        ) : (
          <ReactMarkdown>{summary || ""}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
