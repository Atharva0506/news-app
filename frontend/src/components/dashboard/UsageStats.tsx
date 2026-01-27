import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Cpu, Zap, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageData {
    total_tokens: number;
    daily_tokens: number;
    request_count: number;
    limit_daily: number;
}

export function UsageStats() {
    const [stats, setStats] = useState<UsageData | null>(null);

    useEffect(() => {
        api.auth.usage().then(setStats).catch(console.error);
    }, []);

    if (!stats) return null;

    const percentage = Math.min((stats.daily_tokens / stats.limit_daily) * 100, 100);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-accent" />
                    AI Usage (Daily)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span>{stats.daily_tokens} tokens</span>
                            <span>{stats.limit_daily} limit</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex flex-col p-2 bg-secondary/50 rounded-lg">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Total
                            </span>
                            <span className="font-bold text-lg">{stats.total_tokens}</span>
                        </div>
                        <div className="flex flex-col p-2 bg-secondary/50 rounded-lg">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Activity className="h-3 w-3" /> Requests
                            </span>
                            <span className="font-bold text-lg">{stats.request_count}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
