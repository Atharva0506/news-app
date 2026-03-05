import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Newspaper,
  Settings as SettingsIcon,
  User,
  Sparkles,
  History,
  MessageSquareDashed,
  Compass,
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">NewsAI</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/explore"
              ? location.pathname === "/explore"
              : location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-2 px-3 shrink-0">
          <UsageStats />
        </div>
      )}

      <div className="p-3 border-t border-sidebar-border mt-auto shrink-0">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-accent" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.full_name || user.email}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">
                    {user.is_premium ? "Pro Plan" : "Free Plan"}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1"
                    onClick={logout}
                    title="Logout"
                  >
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
}
