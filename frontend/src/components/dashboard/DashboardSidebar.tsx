import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Newspaper,
  Settings as SettingsIcon,
  Sparkles,
  History,
  MessageSquareDashed,
  Compass,
  LogOut,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { UsageStats } from "@/components/dashboard/UsageStats";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Newspaper, label: "My Feed", href: "/dashboard/feed" },
  { icon: Compass, label: "Explore", href: "/explore" },
  { icon: MessageSquareDashed, label: "Saved Chats", href: "/dashboard/saved" },
  { icon: History, label: "Billing History", href: "/dashboard/billing" },
  { icon: SettingsIcon, label: "Settings", href: "/dashboard/settings" },
];

interface DashboardSidebarProps {
  collapsed?: boolean;
  mobile?: boolean;
}

export function DashboardSidebar({ collapsed, mobile = false }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shadow-sm shadow-accent/20 shrink-0 transition-transform group-hover:scale-105">
            <Sparkles className="h-4.5 w-4.5 text-accent-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              NewsAI
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/explore"
              ? location.pathname === "/explore"
              : location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? "bg-accent/15 text-accent font-semibold shadow-sm shadow-accent/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
              }`}
            >
              <item.icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                  isActive ? "text-accent" : "text-muted-foreground group-hover:text-accent/70"
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Usage Stats */}
      {!collapsed && (
        <div className="mx-3 mb-2 shrink-0">
          <UsageStats />
        </div>
      )}

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border mt-auto shrink-0">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0 border border-accent/10">
              <span className="text-sm font-semibold text-accent">
                {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.full_name || user.email}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    user.is_premium ? "text-accent" : "text-muted-foreground"
                  }`}>
                    {user.is_premium && <Crown className="h-3 w-3" />}
                    {user.is_premium ? "Pro" : "Free"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={logout}
                    title="Logout"
                  >
                    <LogOut className="h-3.5 w-3.5" />
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
}
