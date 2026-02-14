import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Cpu, Zap, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageData {
    total_tokens: number;
    daily_tokens: number;
    request_count: number;
    limit_daily: number;
    plan_type: string;
    deep_analysis_count: number;
    trial_end_date?: string;
}

export function UsageStats() {
    const [stats, setStats] = useState<UsageData | null>(null);

    useEffect(() => {
        const fetchUsage = () => api.auth.usage().then(setStats).catch(console.error);
        fetchUsage();
        const interval = setInterval(fetchUsage, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!stats) return null;

    const percentage = Math.min((stats.daily_tokens / stats.limit_daily) * 100, 100);

    // Calculate Days Left if Trial
    let daysLeft = 0;
    // Only calculate if plan is strictly trial, or if it's pro but we want to show expiry (handled below separately)
    // But for the "Trial: X Days Left" badge, only show if plan_type is trial.
    if (stats.plan_type === 'trial' && stats.trial_end_date) {
        const end = new Date(stats.trial_end_date);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-accent" />
                        Usage Limits
                    </div>
                    {stats.plan_type === 'trial' && (
                        <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                            Trial: {daysLeft} Days Left
                        </span>
                    )}
                    {stats.plan_type === 'free' && (
                        <span className="text-xs px-2 py-1 bg-secondary text-muted-foreground rounded-full">
                            Free Plan
                        </span>
                    )}
                    {stats.plan_type === 'pro' && (
                        <span className="text-xs px-2 py-1 bg-gold/20 text-gold rounded-full border border-gold/50">
                            PRO
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Trial upgrade link */}
                    {stats.plan_type === 'trial' && (
                        <Link to="/pricing" className="block text-xs text-center py-1.5 px-3 bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-colors">
                            ✨ Upgrade to Pro for unlimited access
                        </Link>
                    )}
                    {/* Pro plan expiry */}
                    {stats.plan_type === 'pro' && stats.trial_end_date && (
                        <p className="text-xs text-muted-foreground text-center">
                            Expires {new Date(stats.trial_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    )}
                    {/* General AI Token Usage */}
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">AI Tokens (Daily)</span>
                            <span>{stats.plan_type === 'pro' ? 'Unlimited' : `${stats.daily_tokens} / ${stats.limit_daily}`}</span>
                        </div>
                        <Progress
                            value={stats.plan_type === 'pro' ? 0 : percentage}
                            className="h-1.5"
                        />
                    </div>

                    {/* Deep Analysis Limit */}
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Deep Analysis</span>
                            <span>
                                {stats.deep_analysis_count} / {stats.plan_type === 'pro' ? '∞' : '1'}
                            </span>
                        </div>
                        <Progress
                            value={stats.plan_type === 'pro' ? 0 : (stats.deep_analysis_count / 1) * 100}
                            className="h-1.5 bg-muted"
                        />
                        {stats.plan_type !== 'pro' && stats.deep_analysis_count >= 1 && (
                            <p className="text-[10px] text-destructive mt-1">
                                Limit reached. Upgrade to Pro for unlimited.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Total Tokens
                            </span>
                            <span className="font-bold">{stats.total_tokens.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-muted-foreground flex items-center justify-end gap-1">
                                <Activity className="h-3 w-3" /> Requests
                            </span>
                            <span className="font-bold">{stats.request_count}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
