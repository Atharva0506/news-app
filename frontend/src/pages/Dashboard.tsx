import { useState, useRef, useEffect } from "react";
import {
  Home, Newspaper, Settings as SettingsIcon, User, Sparkles, Search,
  Menu, ChevronLeft, ChevronRight, Send, History
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { UsageStats } from "@/components/dashboard/UsageStats";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import Settings from "@/pages/Settings";
import BillingHistoryPage from "@/pages/BillingHistoryPage";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Newspaper, label: "My Feed", href: "/dashboard/feed" },
  { icon: History, label: "Billing History", href: "/dashboard/billing" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
];

import { RefreshCw } from "lucide-react";

const FeedSummary = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cache key based on date to invalidate daily? Or just use same key and let user refresh.
  // User said "store it on user site... give refresh button once created".
  const CACHE_KEY = "daily_briefing_summary";

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setSummary(cached);
    } else {
      generateSummary();
    }
  }, []);

  const generateSummary = () => {
    setLoading(true);
    api.ai.summarizeFeed()
      .then(data => {
        setSummary(data.summary);
        localStorage.setItem(CACHE_KEY, data.summary);
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  };

  if (loading && !summary) return <div className="text-sm text-muted-foreground animate-pulse">Generating your daily briefing...</div>;
  if (!summary && !loading) return null; // Or show "Generate" button? But effect tries to generate automatically.

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 relative group">
      <div className="flex justify-between items-start mb-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-accent" />
          Daily Briefing
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={generateSummary}
          disabled={loading}
          title="Refresh Briefing"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {loading ? "Refreshing..." : summary}
      </p>
    </div>
  );
}

// Extracted Sidebar Component
const SidebarContent = ({ collapsed, mobile = false }: { collapsed?: boolean, mobile?: boolean }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shrink-0">
            <Sparkles className="h-5 w-5 text-accent-foreground" />
          </div>
          {!collapsed && <span className="text-xl font-bold">NewsAI</span>}
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${location.pathname === item.href ? "bg-sidebar-accent" : ""
              }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-4 px-4 shrink-0">
          <UsageStats />
        </div>
      )}

      <div className="p-4 border-t border-sidebar-border mt-auto shrink-0">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-accent" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">{user.is_premium ? "Pro Plan" : "Free Plan"}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={logout} title="Logout">
                    <User className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isSettingsPage = location.pathname.includes("/settings");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sentiment, setSentiment] = useState("all-sentiment");

  // AI State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const [aiProcessStatus, setAiProcessStatus] = useState<{ status: string, agent?: string, message: string } | null>(null);

  // Refresh State
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const handleRefreshFeed = () => {
    setFeedRefreshKey(prev => prev + 1);
    toast.success("Feed refreshed");
  };

  const handleAskAi = async () => {
    if (!chatInput.trim()) return;
    if (!user?.is_premium) {
      toast.error("Ask AI is a Premium feature. Upgrade to Pro!");
      return;
    }

    const question = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatInput("");
    setIsAiLoading(true);

    try {
      const context = selectedArticle
        ? `Title: ${selectedArticle.title}\nDescription: ${selectedArticle.description || ""}\nContent: ${selectedArticle.content || ""}`
        : "";

      const res = await api.ai.ask({
        question,
        article_id: selectedArticle?.id, // Optional now
        context: context
      });
      setChatMessages(prev => [...prev, { role: 'ai', content: res.answer }]);
    } catch (e) {
      toast.error("Failed to get answer from AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleProcessArticle = async (articleId: string) => {
    if (!user?.is_premium) return;
    setIsAiLoading(true);
    setAiProcessStatus({ status: 'starting', message: 'Running deep analysis...' });

    try {
      // Use fetch directly to handle streaming
      const token = localStorage.getItem("token");
      const { API_URL } = await import("@/lib/api");

      // Stateless: Send article data in body
      const response = await fetch(`${API_URL}/ai/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedArticle.id,
          title: selectedArticle.title,
          description: selectedArticle.description,
          content: selectedArticle.content || selectedArticle.description, // Fallback
          url: selectedArticle.url,
          published_at: selectedArticle.published_at,
          author: selectedArticle.author
        })
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
        // Keep the last part in buffer if it's not empty (incomplete message)
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const jsonStr = trimmed.substring(6);
              const data = JSON.parse(jsonStr);
              if (data.status === 'progress') {
                setAiProcessStatus(data);
              } else if (data.status === 'complete') {
                setAiProcessStatus(null);
                toast.success("Analysis Complete!");
                // Update specific article in frontend logic if needed (e.g. show summary)
                // But since we are stateless, we just show it in chat or panel?
                // The current UI might expect it in `selectedArticle`.
                // We can update selectedArticle state.
                // We can update selectedArticle state.
                setSelectedArticle(prev => ({
                  ...prev,
                  ...data.article,
                  summary_short: data.article.summary_short || prev.summary_short,
                  sentiment: data.article.sentiment || "Neutral"
                }));

                const analysisMessage = `**Deep Analysis Report**

**Summary**: ${data.article.summary_short || "N/A"}

**Sentiment**: ${data.article.sentiment || "Neutral"}
**Bias Analysis**: ${data.article.bias_explanation || "N/A"} (Score: ${data.article.bias_score || 0})

**Detailed Summary**:
${data.article.summary_detail || "N/A"}

**Tags**: ${data.article.tags ? data.article.tags.join(", ") : "None"}`;

                setChatMessages(prev => [...prev, { role: 'ai', content: analysisMessage }]);

              } else if (data.status === 'error') {
                toast.error(data.message);
                setAiProcessStatus(null);
              }
            } catch (e) {
              console.error("JSON Parse error", e);
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      toast.error("AI Processing failed");
      setAiProcessStatus(null);
    } finally {
      setIsAiLoading(false);
      setAiProcessStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <aside className={`hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 h-screen sticky top-0 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          <SidebarContent collapsed={sidebarCollapsed} />
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-20 -right-3 h-6 w-6 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
          style={{ left: sidebarCollapsed ? "52px" : "248px" }}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full"><SidebarContent mobile /></div>
              </SheetContent>
            </Sheet>

            {!isSettingsPage && (
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search news..."
                  className="pl-10 bg-secondary border-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline" size="sm" onClick={handleRefreshFeed} className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline" size="sm" onClick={() => setAiPanelOpen(true)} className="gap-2"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {isSettingsPage ? (
            <Settings />
          ) : location.pathname.includes("/billing") ? (
            <BillingHistoryPage />
          ) : (
            <>
              {user && (
                <div className="mb-8">
                  <FeedSummary />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="environment">Environment</SelectItem>
                    <SelectItem value="politics">Politics</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sentiment} onValueChange={setSentiment}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-sentiment">All Sentiment</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>

                {user && !user.is_premium && (
                  <Button className="ml-auto bg-gradient-to-r from-accent to-purple-600 border-0 hover:opacity-90 transition-opacity" asChild>
                    <Link to="/pricing" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Upgrade to Pro</span>
                    </Link>
                  </Button>
                )}
              </div>

              <NewsFeed
                key={feedRefreshKey}
                onSelectArticle={(article) => {
                  setSelectedArticle(article);
                  setAiPanelOpen(true);
                }}
                filters={{
                  category: category === "all" ? undefined : category,
                  sentiment: sentiment === "all-sentiment" ? undefined : sentiment,
                  search: searchQuery
                }}
              />
            </>
          )}
        </main>
      </div>

      <Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">Ask anything regarding news</p>
              </div>
            </div>
          </div>

          {/* ... Rest of sheet context ... */}
          {selectedArticle && (
            <div className="p-4 border-b border-border bg-secondary/50 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-1">Discussing:</p>
                  <p className="text-sm font-medium line-clamp-1">{selectedArticle.title}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedArticle(null)}>Clear</Button>
              </div>

              {/* AI Process Trigger */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-accent/20 hover:bg-accent/10"
                onClick={() => handleProcessArticle(selectedArticle.id)}
                disabled={isAiLoading || !user?.is_premium}
              >
                <Sparkles className="h-3 w-3 text-accent" />
                {user?.is_premium ? "Run Deep Analysis" : "Deep Analysis (Premium)"}
              </Button>
            </div>
          )}

          {/* ... AI Progress and Chat ... */}

          {/* AI Progress Display */}
          {aiProcessStatus && (
            <div className="px-4 py-2 bg-accent/5 border-b border-accent/10">
              <div className="flex items-center gap-2 text-xs font-medium text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                {aiProcessStatus.message}
              </div>
              <div className="mt-1 h-1 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent animate-pulse w-full origin-left" style={{
                  transform: `scaleX(${aiProcessStatus.agent === 'collector' ? 0.2 :
                    aiProcessStatus.agent === 'classifier' ? 0.4 :
                      aiProcessStatus.agent === 'summarizer' ? 0.7 :
                        aiProcessStatus.agent === 'bias' ? 0.9 : 1
                    })`,
                  transition: 'transform 0.5s ease'
                }} />
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-4" >
            {/* ... Chat Messages ... */}
            <div className="space-y-4" ref={scrollRef}>
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground mt-10">
                  <p>Ask a question about your feed or a specific article.</p>
                  {!user?.is_premium && <p className="text-xs mt-2 text-accent">Upgrade to Premium to chat!</p>}
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isAiLoading && <div className="text-sm text-muted-foreground animate-pulse">AI is thinking...</div>}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border mt-auto">
            <div className="flex gap-2">
              <Input
                placeholder={user?.is_premium ? "Ask a question..." : "Premium only feature"}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
                disabled={!user?.is_premium || isAiLoading}
                className="flex-1"
              />
              <Button
                onClick={handleAskAi}
                disabled={!user?.is_premium || isAiLoading}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
