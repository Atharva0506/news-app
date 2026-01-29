import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, XCircle, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Transaction {
    id: string;
    amount: number;
    currency: string;
    transaction_signature: string;
    status: "pending" | "completed" | "failed";
    created_at: string;
    is_test: boolean;
    sender_address?: string;
    plan?: string;
}

export default function BillingHistoryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const data = await api.payments.history();
            setTransactions(data);
        } catch (e) {
            console.error("Failed to load billing history", e);
            toast.error("Failed to load billing history");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Completed</Badge>;
            case "pending":
                return <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">Pending</Badge>;
            case "failed":
                return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Billing History</h2>
                <p className="text-muted-foreground">
                    View your past transactions and subscription payments.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>
                        A list of your recent payments on Solana Devnet.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No transactions found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Network</TableHead>
                                    <TableHead>Wallet</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Signature</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(new Date(tx.created_at), "MMM d, yyyy")}</span>
                                                <span className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "h:mm a")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium capitalize">{tx.plan || "Pro"}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{tx.amount} SOL</span>
                                        </TableCell>
                                        <TableCell>
                                            {tx.is_test ? (
                                                <Badge variant="secondary" className="text-xs">TEST</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs border-accent/50 text-accent">Devnet</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tx.sender_address ? (
                                                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground" title={tx.sender_address}>
                                                    <Wallet className="h-3 w-3" />
                                                    {tx.sender_address.slice(0, 4)}...{tx.sender_address.slice(-4)}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                                                <a
                                                    href={`https://explorer.solana.com/tx/${tx.transaction_signature}?cluster=devnet`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1"
                                                >
                                                    View
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
