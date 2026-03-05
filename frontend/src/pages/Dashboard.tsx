import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FeedSummary } from "@/components/dashboard/FeedSummary";
import { FeedFilters } from "@/components/dashboard/FeedFilters";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { AiChatPanel } from "@/components/dashboard/AiChatPanel";
import SavedChatsList from "@/components/SavedChatsList";
import Settings from "@/pages/Settings";
import BillingHistoryPage from "@/pages/BillingHistoryPage";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isSettingsPage = location.pathname.includes("/settings");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sentiment, setSentiment] = useState("all-sentiment");

  // AI Panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  // Feed refresh
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const handleRefreshFeed = () => {
    setFeedRefreshKey((prev) => prev + 1);
    toast.success("Feed refreshed");
  };

  // Determine which sub-page to show
  const renderContent = () => {
    if (isSettingsPage) return <Settings />;
    if (location.pathname.includes("/billing")) return <BillingHistoryPage />;
    if (location.pathname.includes("/saved"))
      return (
        <div className="max-w-4xl mx-auto">
          <SavedChatsList />
        </div>
      );

    return (
      <>
        {/* Email verification banner */}
        {user &&
          !user.is_verified &&
          import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION !== "false" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-md mb-6 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Verify your email to upgrade to Pro.</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  api.auth
                    .resendVerification()
                    .then(() => toast.success("Verification email sent!"))
                }
                className="h-7 text-xs"
              >
                Resend
              </Button>
            </div>
          )}

        {/* Daily briefing */}
        {user && (
          <div className="mb-6">
            <FeedSummary />
          </div>
        )}

        {/* Filters */}
        <FeedFilters
          category={category}
          onCategoryChange={setCategory}
          sentiment={sentiment}
          onSentimentChange={setSentiment}
        />

        {/* News feed */}
        <NewsFeed
          refreshTrigger={feedRefreshKey}
          onSelectArticle={(article) => {
            setSelectedArticle(article);
            setAiPanelOpen(true);
          }}
          filters={{
            category: category === "all" ? undefined : category,
            sentiment: sentiment === "all-sentiment" ? undefined : sentiment,
            search: searchQuery,
          }}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 h-screen sticky top-0 ${
          sidebarCollapsed ? "w-14" : "w-60"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          <DashboardSidebar collapsed={sidebarCollapsed} />
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-20 -right-3 h-6 w-6 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefreshFeed={handleRefreshFeed}
          onOpenAiPanel={() => setAiPanelOpen(true)}
          showSearch={!isSettingsPage}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderContent()}
        </main>
      </div>

      {/* AI Chat Panel */}
      <AiChatPanel
        open={aiPanelOpen}
        onOpenChange={setAiPanelOpen}
        selectedArticle={selectedArticle}
        onArticleChange={setSelectedArticle}
      />
    </div>
  );
}
