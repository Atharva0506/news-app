import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Send, Bookmark, Lock, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { api, API_URL } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Article {
  id: string;
  title: string;
  description?: string;
  content?: string;
  summary_short?: string;
  url: string;
  published_at?: string;
  author?: string;
  sentiment?: string;
  bias_score?: number;
  bias_explanation?: string;
  summary_detail?: string;
  tags?: string[];
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

interface AiChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedArticle: Article | null;
  onArticleChange: (article: Article | null) => void;
  onArticleUpdated?: (article: Article) => void;
}

export function AiChatPanel({
  open,
  onOpenChange,
  selectedArticle,
  onArticleChange,
  onArticleUpdated,
}: AiChatPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [aiProcessStatus, setAiProcessStatus] = useState<{
    status: string;
    agent?: string;
    message: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleAskAi = async () => {
    if (!chatInput.trim()) return;
    if (!user?.is_premium) {
      toast.error("Ask AI is a Premium feature. Upgrade to Pro!");
      return;
    }

    const question = chatInput;
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setIsAiLoading(true);

    try {
      const context = selectedArticle
        ? `Title: ${selectedArticle.title}\nDescription: ${selectedArticle.description || ""}\nContent: ${selectedArticle.content || ""}`
        : "";

      const res = await api.ai.ask({
        question,
        article_id: selectedArticle?.id,
        context,
      });
      setChatMessages((prev) => [...prev, { role: "ai", content: res.answer }]);
    } catch {
      toast.error("Failed to get answer from AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleProcessArticle = async () => {
    if (!user?.is_premium || !selectedArticle) return;
    setIsAiLoading(true);
    setAiProcessStatus({ status: "starting", message: "Running deep analysis..." });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/ai/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedArticle.id,
          title: selectedArticle.title,
          description: selectedArticle.description,
          content: selectedArticle.content || selectedArticle.description,
          url: selectedArticle.url,
          published_at: selectedArticle.published_at,
          author: selectedArticle.author,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Processing failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              if (data.status === "progress") {
                setAiProcessStatus(data);
              } else if (data.status === "complete") {
                setAiProcessStatus(null);
                toast.success("Analysis Complete!");

                const updatedArticle = {
                  ...selectedArticle,
                  ...data.article,
                  summary_short:
                    data.article.summary_short || selectedArticle.summary_short,
                  sentiment: data.article.sentiment || "Neutral",
                };
                onArticleChange(updatedArticle);
                onArticleUpdated?.(updatedArticle);

                const analysisMessage = `**Deep Analysis Report**

**Summary**: ${data.article.summary_short || "N/A"}

**Sentiment**: ${data.article.sentiment || "Neutral"}
**Bias Analysis**: ${data.article.bias_explanation || "N/A"} (Score: ${data.article.bias_score || 0})

**Detailed Summary**:
${data.article.summary_detail || "N/A"}

**Tags**: ${data.article.tags ? data.article.tags.join(", ") : "None"}`;

                setChatMessages((prev) => [
                  ...prev,
                  { role: "ai", content: analysisMessage },
                ]);
              } else if (data.status === "error") {
                toast.error(data.message);
                setAiProcessStatus(null);
              }
            } catch {
              // JSON parse error — skip
            }
          }
        }
      }
    } catch {
      toast.error("AI Processing failed");
      setAiProcessStatus(null);
    } finally {
      setIsAiLoading(false);
      setAiProcessStatus(null);
    }
  };

  const handleSaveChat = async () => {
    if (!user?.is_premium) {
      toast.error("Upgrade to Pro to save chats", {
        action: { label: "Upgrade", onClick: () => navigate("/pricing") },
      });
      return;
    }
    if (chatMessages.length === 0 || isSavingChat) return;
    setIsSavingChat(true);
    try {
      const firstUserMsg = chatMessages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 60) +
          (firstUserMsg.content.length > 60 ? "..." : "")
        : "AI Chat";
      await api.chat.create(title, chatMessages);
      toast.success("Chat saved successfully!");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to save chat";
      toast.error(msg);
    } finally {
      setIsSavingChat(false);
    }
  };

  const handleShareAnalysis = async () => {
    if (!selectedArticle || chatMessages.length === 0) return;
    try {
      const analysis = chatMessages
        .filter((m) => m.role === "ai")
        .map((m) => m.content)
        .join("\n\n");
      const res = await api.share.create({
        article_title: selectedArticle.title,
        article_url: selectedArticle.url,
        analysis_json: { messages: chatMessages, summary: analysis },
      });
      const shareUrl = `${window.location.origin}/share/${res.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.error("Failed to create share link");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetTitle className="sr-only">AI Assistant</SheetTitle>

        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  Ask anything about the news
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleShareAnalysis}
                  title="Share analysis"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={chatMessages.length === 0 || isSavingChat}
                title={
                  user?.is_premium
                    ? "Save chat"
                    : "Pro feature — Upgrade to save chats"
                }
                onClick={handleSaveChat}
              >
                {isSavingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user?.is_premium ? (
                  <Bookmark className="h-4 w-4" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Selected article context */}
        {selectedArticle && (
          <div className="p-4 border-b border-border bg-secondary/30 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="overflow-hidden">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Discussing:
                </p>
                <p className="text-sm font-medium line-clamp-1">
                  {selectedArticle.title}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => onArticleChange(null)}
              >
                Clear
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs h-8"
              onClick={handleProcessArticle}
              disabled={isAiLoading || !user?.is_premium}
            >
              <Sparkles className="h-3 w-3 text-accent" />
              {user?.is_premium ? "Run Deep Analysis" : "Deep Analysis (Premium)"}
            </Button>
          </div>
        )}

        {/* Progress indicator */}
        {aiProcessStatus && (
          <div className="px-4 py-2 bg-accent/5 border-b border-accent/10">
            <div className="flex items-center gap-2 text-xs font-medium text-accent">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              {aiProcessStatus.message}
            </div>
            <div className="mt-1 h-1 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-transform duration-500 ease-out"
                style={{
                  transform: `scaleX(${
                    aiProcessStatus.agent === "collector"
                      ? 0.2
                      : aiProcessStatus.agent === "classifier"
                      ? 0.4
                      : aiProcessStatus.agent === "summarizer"
                      ? 0.7
                      : aiProcessStatus.agent === "bias"
                      ? 0.9
                      : 1
                  })`,
                  transformOrigin: "left",
                }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4" ref={scrollRef}>
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground mt-10">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-accent/30" />
                <p className="text-sm">
                  Ask a question about your feed or a specific article.
                </p>
                {!user?.is_premium && (
                  <p className="text-xs mt-2 text-accent">
                    Upgrade to Premium to chat!
                  </p>
                )}
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is thinking...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex gap-2">
            <Input
              placeholder={
                user?.is_premium ? "Ask a question..." : "Premium feature"
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
              disabled={!user?.is_premium || isAiLoading}
              className="flex-1 h-9 text-sm"
            />
            <Button
              onClick={handleAskAi}
              disabled={!user?.is_premium || isAiLoading}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground h-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
