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
  { icon: History, label: "Billing", href: "/dashboard/billing" },
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0 transition-transform duration-200 group-hover:scale-[1.04]">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight">
              NewsAI
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/explore"
              ? location.pathname === "/explore"
              : location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                  isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
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
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-accent">
                {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate leading-tight">
                  {user.full_name || user.email}
                </p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    user.is_premium ? "text-accent" : "text-muted-foreground"
                  }`}>
                    {user.is_premium && <Crown className="h-3 w-3" />}
                    {user.is_premium ? "Pro" : "Free"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link to="/login">Login</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
