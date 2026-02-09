import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, CreditCard, Sparkles, Home, LogOut, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";

export default function Settings() {
    const { user, logout } = useAuth();
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
        <div className="min-h-screen bg-gradient-hero p-4 md:p-8">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
                    </div>
                </div>

                <div className="grid gap-8">
                    {/* Account Section */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Account Information</h2>
                                <p className="text-sm text-muted-foreground">Your personal details</p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input value={user?.full_name || ""} disabled className="bg-muted/50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input value={user?.email || ""} disabled className="bg-muted/50" />
                            </div>
                        </div>
                    </div>

                    {/* Subscription Section */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                    <CreditCard className="h-5 w-5 text-accent" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-semibold">Subscription Plan</h2>
                                        {user?.is_premium ? (
                                            <Badge className="bg-accent text-accent-foreground hover:bg-accent/80">PRO</Badge>
                                        ) : (
                                            <Badge variant="secondary">FREE</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {user?.is_premium
                                            ? `Valid until ${new Date(user.premium_expiry!).toLocaleDateString()}`
                                            : "Upgrade to unlock all features"}
                                    </p>
                                </div>
                            </div>
                            {!user?.is_premium && (
                                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                                    <Link to="/pricing">Upgrade to Pro</Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Feed Preferences</h2>
                                <p className="text-sm text-muted-foreground">Customize your AI news feed</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-6">
                            {/* Categories */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Favorite Categories</label>
                                    <span className="text-xs text-muted-foreground">
                                        {preferences.favorite_categories.length} / {user?.is_premium ? 5 : 1} selected
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => toggleCategory(cat)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${preferences.favorite_categories.includes(cat)
                                                    ? 'bg-accent text-accent-foreground border-accent'
                                                    : 'bg-background text-muted-foreground border-input hover:border-accent hover:text-accent'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Topic Keywords</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add topic (e.g. 'AI', 'Startup')"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                                        className="max-w-xs"
                                    />
                                    <Button variant="outline" onClick={addKeyword}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {preferences.favorite_keywords.map(kw => (
                                        <Badge key={kw} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                                            {kw}
                                            <button
                                                onClick={() => removeKeyword(kw)}
                                                className="h-4 w-4 rounded-full hover:bg-background flex items-center justify-center transition-colors"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Style */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium">AI Summary Style</label>
                                <Select
                                    value={preferences.summary_style || "short"}
                                    onValueChange={(val) => savePreferences({ ...preferences, summary_style: val })}
                                >
                                    <SelectTrigger className="w-full sm:w-[240px]">
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="short">Concise (Default)</SelectItem>
                                        <SelectItem value="detailed">Detailed Analysis</SelectItem>
                                        <SelectItem value="bullet">Bullet Points</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <p className="font-medium text-destructive-foreground/90">Delete Account</p>
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
                    </div>

                    <div className="flex justify-center pt-4">
                        <Button variant="ghost" onClick={logout} className="text-muted-foreground hover:text-foreground">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
