import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { User, CreditCard, Sparkles, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
// BillingHistory moved to dedicated page in Dashboard
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export default function Settings() {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<{
        favorite_categories: string[];
        favorite_keywords: string[];
        summary_style?: string;
    }>({ favorite_categories: [], favorite_keywords: [], summary_style: "short" });

    const [newKeyword, setNewKeyword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const data = await api.preferences.get();
            setPreferences(data);
        } catch (e) {
            toast.error("Failed to load preferences");
        }
    };

    const savePreferences = async (updatedPrefs: typeof preferences) => {
        try {
            setIsLoading(true);
            const data = await api.preferences.update(updatedPrefs);
            setPreferences(data);
            toast.success("Preferences saved");
        } catch (e) {
            toast.error("Failed to save preferences");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCategory = (cat: string) => {
        const current = preferences.favorite_categories;
        const isSelected = current.includes(cat);
        const maxCategories = user?.is_premium ? 5 : 1;

        if (!isSelected && current.length >= maxCategories) {
            toast.error(
                user?.is_premium
                    ? "Pro users can select up to 5 categories."
                    : "Free users can select only 1 category. Upgrade to Pro for more!"
            );
            return;
        }

        const updated = isSelected
            ? current.filter(c => c !== cat)
            : [...current, cat];
        savePreferences({ ...preferences, favorite_categories: updated });
    };

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        if (preferences.favorite_keywords.includes(newKeyword.trim())) return;

        savePreferences({
            ...preferences,
            favorite_keywords: [...preferences.favorite_keywords, newKeyword.trim()]
        });
        setNewKeyword("");
    };

    const removeKeyword = (kw: string) => {
        savePreferences({
            ...preferences,
            favorite_keywords: preferences.favorite_keywords.filter(k => k !== kw)
        });
    };

    const handleDeleteAccount = async () => {
        try {
            setIsLoading(true);
            await api.auth.deleteAccount();
            toast.success("Account deleted successfully");
            // Force logout and redirect
            localStorage.removeItem("token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/";
        } catch (e: any) {
            toast.error(e.message || "Failed to delete account");
            setIsLoading(false);
        }
    };

    const categories = ["Technology", "Finance", "Environment", "Politics", "Business"];

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto">
            <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/dashboard"><Home className="h-5 w-5" /></Link>
                </Button>
                <h1 className="text-3xl font-bold">Settings</h1>
            </div>

            <div className="space-y-6">
                {/* Profile Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Account Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Name</label>
                            <div className="p-3 border rounded-md bg-muted text-muted-foreground">{user?.full_name || "Not set"}</div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="p-3 border rounded-md bg-muted text-muted-foreground">{user?.email}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription Card */}
                <Card className={`${user?.is_premium ? "border-accent/50 bg-accent/5" : ""}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Subscription
                            {user?.is_premium && <Badge className="bg-accent text-accent-foreground">Pro</Badge>}
                        </CardTitle>
                        <CardDescription>Manage your plan and billing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="font-medium">{user?.is_premium ? "Premium Plan" : "Free Plan"}</p>
                                {user?.premium_expiry && (
                                    <p className="text-sm text-muted-foreground">Expires: {new Date(user.premium_expiry).toLocaleDateString()}</p>
                                )}
                            </div>
                            {!user?.is_premium && (
                                <Button className="w-full sm:w-auto bg-gradient-to-r from-accent to-purple-600" asChild>
                                    <Link to="/pricing">Upgrade to Pro</Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            News Preferences
                        </CardTitle>
                        <CardDescription>Customize your feed and AI summaries</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Categories */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-medium">Favorite Categories</h3>
                                <span className="text-xs text-muted-foreground">
                                    Selected: {preferences.favorite_categories.length}/{user?.is_premium ? 5 : 1}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <Badge
                                        key={cat}
                                        variant={preferences.favorite_categories.includes(cat) ? "default" : "outline"}
                                        className={`cursor-pointer hover:opacity-80 px-3 py-1.5 ${preferences.favorite_categories.includes(cat) ? "bg-primary" : ""}`}
                                        onClick={() => toggleCategory(cat)}
                                    >
                                        {cat}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Keywords */}
                        <div>
                            <h3 className="text-sm font-medium mb-3">Topic Keywords</h3>
                            <div className="flex gap-2 max-w-sm mb-3">
                                <Input
                                    placeholder="Add topic (e.g. 'AI', 'Space')"
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                                />
                                <Button variant="outline" onClick={addKeyword}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {preferences.favorite_keywords.map(kw => (
                                    <Badge key={kw} variant="secondary" className="gap-1 pl-3">
                                        {kw}
                                        <button onClick={() => removeKeyword(kw)} className="text-muted-foreground hover:text-foreground ml-1">×</button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Summary Style */}
                        <div className="pt-4 border-t">
                            <h3 className="text-sm font-medium mb-3">AI Summary Style</h3>
                            <div className="w-full sm:w-60">
                                <Select
                                    value={preferences.summary_style || "short"}
                                    onValueChange={(val) => savePreferences({ ...preferences, summary_style: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="short">Short (Default)</SelectItem>
                                        <SelectItem value="detailed">Detailed</SelectItem>
                                        <SelectItem value="bullet">Bullet Points</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>Irreversible actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="font-medium">Delete Account</p>
                                <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">Delete Account</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your account
                                            and remove your data from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Delete Account
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>

                {/* Billing History */}
                {/* Billing History moved to /dashboard/billing */}
            </div>
        </div>
    );
}
