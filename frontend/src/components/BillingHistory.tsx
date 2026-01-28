import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, History } from "lucide-react";

interface PaymentTransaction {
    id: string;
    amount: number;
    currency: string;
    transaction_signature: string;
    status: string;
    created_at: string;
    is_test: boolean;
}

export function BillingHistory() {
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            // Fetch history using api wrapper
            const data = await api.payments.history();
            setTransactions(data);
        } catch (e) {
            console.error("Failed to load billing history", e);
        } finally {
            setIsLoading(false);
        }
    };

    const getExplorerUrl = (signature: string, isTest: boolean) => {
        // If isTest (TEST mode mock), maybe no link? Or link to mock?
        if (signature.startsWith("TEST-")) return "#";
        return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Billing History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No payment history found.</p>
                ) : (
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Transaction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="border-t hover:bg-muted/50 transition-colors">
                                        <td className="p-3">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(tx.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="p-3 font-medium">
                                            {tx.amount} SOL
                                            {tx.is_test && <Badge variant="outline" className="ml-2 text-[10px]">TEST</Badge>}
                                        </td>
                                        <td className="p-3">
                                            <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                                                {tx.status}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <a
                                                href={getExplorerUrl(tx.transaction_signature, tx.is_test)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-primary hover:underline truncate max-w-[120px] sm:max-w-[200px]"
                                            >
                                                {tx.transaction_signature.slice(0, 8)}...
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
