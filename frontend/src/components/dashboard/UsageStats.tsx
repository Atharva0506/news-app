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
    deep_analysis_limit: number;
    trial_end_date?: string;
    subscription_expiry?: string;
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
    if (stats.plan_type === 'trial' && stats.trial_end_date) {
        const end = new Date(stats.trial_end_date);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const deepLimit = stats.deep_analysis_limit;

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
                            ✨ Upgrade to Pro — 3 deep analyses/day + Save Chats
                        </Link>
                    )}
                    {/* Free upgrade link */}
                    {stats.plan_type === 'free' && (
                        <Link to="/pricing" className="block text-xs text-center py-1.5 px-3 bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-colors">
                            ✨ Upgrade to Pro for advanced features
                        </Link>
                    )}
                    {/* Pro plan expiry */}
                    {stats.plan_type === 'pro' && stats.subscription_expiry && (
                        <p className="text-xs text-muted-foreground text-center">
                            Expires {new Date(stats.subscription_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    )}
                    {/* General AI Token Usage */}
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">AI Tokens (Daily)</span>
                            <span>{stats.daily_tokens} / {stats.limit_daily.toLocaleString()}</span>
                        </div>
                        <Progress
                            value={percentage}
                            className="h-1.5"
                        />
                    </div>

                    {/* Deep Analysis Limit */}
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Deep Analysis</span>
                            <span>
                                {deepLimit === 0
                                    ? "Locked"
                                    : `${stats.deep_analysis_count} / ${deepLimit}`
                                }
                            </span>
                        </div>
                        <Progress
                            value={deepLimit === 0 ? 100 : (stats.deep_analysis_count / deepLimit) * 100}
                            className={`h-1.5 ${deepLimit === 0 ? 'bg-muted opacity-50' : 'bg-muted'}`}
                        />
                        {deepLimit === 0 && (
                            <p className="text-[10px] text-destructive mt-1">
                                Upgrade to Pro to unlock Deep Analysis.
                            </p>
                        )}
                        {deepLimit > 0 && stats.deep_analysis_count >= deepLimit && (
                            <p className="text-[10px] text-destructive mt-1">
                                Daily limit reached. Resets tomorrow.
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
