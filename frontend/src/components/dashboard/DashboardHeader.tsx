import { Search, Menu, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "./DashboardSidebar";

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

const getTimeUntilNextReset = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefreshFeed: () => void;
  onOpenAiPanel: () => void;
  showSearch?: boolean;
}

export function DashboardHeader({
  searchQuery,
  onSearchChange,
  onRefreshFeed,
  onOpenAiPanel,
  showSearch = true,
}: DashboardHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile sidebar trigger */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4.5 w-4.5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full">
              <DashboardSidebar mobile />
            </div>
          </SheetContent>
        </Sheet>

        {showSearch && (
          <div className="relative w-56 lg:w-72 hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search news..."
              className="pl-8 h-8 bg-secondary/60 border-0 text-sm rounded-lg placeholder:text-muted-foreground/60"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefreshFeed}
                  className="gap-1.5 h-8 text-xs font-medium"
                  disabled={
                    !!user &&
                    !user.is_premium &&
                    isSameDay(user.last_news_refresh_date)
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {user?.is_premium
                ? "Unlimited refreshes"
                : user &&
                  !user.is_premium &&
                  isSameDay(user.last_news_refresh_date)
                ? `Resets in ${getTimeUntilNextReset()}`
                : "Refresh feed"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          size="sm"
          onClick={onOpenAiPanel}
          className="gap-1.5 h-8 text-xs font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ask AI</span>
        </Button>
      </div>
    </header>
  );
}
