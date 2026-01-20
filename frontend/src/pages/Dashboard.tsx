import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Newspaper,
  Bookmark,
  Settings,
  User,
  Sparkles,
  Search,
  Filter,
  Clock,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Newspaper, label: "My Feed", href: "/dashboard/feed" },
  { icon: Bookmark, label: "Saved", href: "/dashboard/saved" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const mockNews = [
  {
    id: 1,
    title: "AI Regulation: EU Reaches Historic Agreement on Comprehensive AI Act",
    summary: "The European Union has reached a landmark agreement on the AI Act, establishing the world's first comprehensive legal framework for artificial intelligence.",
    source: "Reuters",
    category: "Technology",
    readTime: "4 min",
    bias: "neutral",
    sentiment: "positive",
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    title: "Federal Reserve Signals Potential Rate Cuts in 2024 Amid Cooling Inflation",
    summary: "The Federal Reserve indicated it may cut interest rates next year as inflation continues to ease, signaling a shift in monetary policy.",
    source: "Bloomberg",
    category: "Finance",
    readTime: "3 min",
    bias: "center-right",
    sentiment: "neutral",
    timestamp: "4 hours ago",
  },
  {
    id: 3,
    title: "Climate Summit: Nations Pledge $100 Billion for Green Energy Transition",
    summary: "At COP29, developed nations committed to a $100 billion annual fund to help developing countries transition to renewable energy sources.",
    source: "The Guardian",
    category: "Environment",
    readTime: "5 min",
    bias: "center-left",
    sentiment: "positive",
    timestamp: "6 hours ago",
  },
];

const biasColors: Record<string, string> = {
  neutral: "bg-green-500/10 text-green-600 dark:text-green-400",
  "center-left": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "center-right": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<typeof mockNews[0] | null>(null);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shrink-0">
            <Sparkles className="h-5 w-5 text-accent-foreground" />
          </div>
          {!sidebarCollapsed && <span className="text-xl font-bold">NewsAI</span>}
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
              item.label === "Home" ? "bg-sidebar-accent" : ""
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-accent" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">John Doe</p>
              <p className="text-xs text-muted-foreground truncate">Pro Plan</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-20 -right-3 h-6 w-6 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
          style={{ left: sidebarCollapsed ? "52px" : "248px" }}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>

            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                className="pl-10 bg-secondary border-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiPanelOpen(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="hidden sm:inline">Ask AI</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select defaultValue="all">
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

            <Select defaultValue="today">
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all-sentiment">
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
          </div>

          {/* News Grid */}
          <div className="grid gap-4 md:gap-6">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-border bg-card">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))
              : mockNews.map((article, index) => (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="p-6 rounded-2xl border border-border bg-card hover:border-accent/30 transition-all shadow-soft hover:shadow-glow cursor-pointer"
                    onClick={() => {
                      setSelectedArticle(article);
                      setAiPanelOpen(true);
                    }}
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
                          setSelectedArticle(article);
                          setAiPanelOpen(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 text-accent" />
                      </Button>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {article.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{article.category}</Badge>
                      <Badge className={biasColors[article.bias]}>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {article.bias}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {article.readTime}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <TrendingUp className="h-3 w-3" />
                        {article.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {article.timestamp}
                      </span>
                    </div>
                  </motion.article>
                ))}
          </div>
        </main>
      </div>

      {/* AI Assistant Panel */}
      <Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">Ask anything about the news</p>
                </div>
              </div>
            </div>

            {/* Context */}
            {selectedArticle && (
              <div className="p-4 border-b border-border bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Discussing:</p>
                <p className="text-sm font-medium line-clamp-2">{selectedArticle.title}</p>
              </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                {/* Suggested prompts */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Suggested questions:</p>
                  <div className="space-y-2">
                    {[
                      "What are the key takeaways?",
                      "What's the opposing view?",
                      "Is there any bias in this article?",
                      "What are the implications?",
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        className="w-full text-left px-4 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors text-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question..."
                  className="flex-1"
                />
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Send
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
