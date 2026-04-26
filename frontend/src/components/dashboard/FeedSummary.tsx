import { useState, useEffect, useCallback } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { api, API_URL } from "@/lib/api";
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

  const generateSummary = useCallback(async (forceRefresh: boolean = false) => {
    setLoading(true);
    setSummary(""); // Clear summary while streaming

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/ai/feed/summary`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: forceRefresh }),
      });

      if (!response.ok || !response.body) throw new Error("Processing failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullSummary = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.substring(6));

              if (data.status === "done") {
                localStorage.setItem(CACHE_KEY, fullSummary);
                refreshProfile();
                break;
              } else if (data.status === "error") {
                if (data.error_code === "PLAN_LIMIT_REACHED") {
                  toast.info("Daily limit reached. Showing existing summary.");
                } else {
                  toast.error(data.message);
                }
              } else if (data.text) {
                fullSummary += data.text;
                setSummary(fullSummary);
              }
            } catch (_e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (_err: unknown) {
      setSummary(null);
      toast.error("Failed to generate summary");
    } finally {
      setLoading(false);
      window.dispatchEvent(new Event('usage-updated'));
    }
  }, [refreshProfile]);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setSummary(cached);
    } else {
      generateSummary(false);
    }
  }, [generateSummary]);

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
