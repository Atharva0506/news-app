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
        language?: string;
        country?: string;
        favorite_categories: string[];
        favorite_keywords: string[];
        summary_style?: string;
    }>({ favorite_categories: [], favorite_keywords: [], summary_style: "short", language: "en", country: "us" });

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

        const maxKeywords = user?.is_premium ? 5 : 3;
        if (preferences.favorite_keywords.length >= maxKeywords) {
            toast.error(user?.is_premium ? "Max 5 keywords allowed." : "Free plan limited to 3 keywords.");
            return;
        }

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
            toast.success("Account scheduled for deletion. You have 7 days to cancel by logging back in.");
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
                                <p className="text-sm text-muted-foreground">Manage your personal details</p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={user?.full_name || ""}
                                        onChange={(e) => {
                                            // Handle local state update? 
                                            // Actually better to have a local state form or just prompt on blur.
                                            // For simplicity, let's make a small inline form or dialog.
                                            // Let's implement a direct update button pattern.
                                        }}
                                        disabled={true} // For now, let's keep it simple or implement edit mode
                                        className="bg-muted/50"
                                    />
                                    <EditProfileDialog user={user} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <div className="space-y-2">
                                    <Input value={user?.email || ""} disabled className="bg-muted/50" />
                                    {user?.is_verified ? (
                                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 px-3 py-1.5 rounded-lg w-fit">
                                            <Sparkles className="h-3 w-3" />
                                            Verified
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                            <span className="text-sm text-yellow-600 flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                                Unverified
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10"
                                                onClick={() => {
                                                    api.auth.resendVerification()
                                                        .then(() => toast.success("Verification email sent!"))
                                                        .catch(() => toast.error("Failed to send email"));
                                                }}
                                            >
                                                Resend
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <ChangePasswordDialog />
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

                            {/* Language & Region */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Content Language</label>
                                    <Select
                                        value={preferences.language || "en"}
                                        onValueChange={(val) => savePreferences({ ...preferences, language: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                            <SelectItem value="fr">French</SelectItem>
                                            <SelectItem value="de">German</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Region</label>
                                    <Select
                                        value={preferences.country || "us"}
                                        onValueChange={(val) => savePreferences({ ...preferences, country: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select region" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="us">United States</SelectItem>
                                            <SelectItem value="uk">United Kingdom</SelectItem>
                                            <SelectItem value="in">India</SelectItem>
                                            <SelectItem value="ca">Canada</SelectItem>
                                            <SelectItem value="au">Australia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Topic Keywords</label>
                                    <span className="text-xs text-muted-foreground">
                                        {preferences.favorite_keywords.length} / {user?.is_premium ? 5 : 3} used
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add topic (e.g. 'AI', 'Startup')"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                                        className="max-w-xs"
                                        disabled={preferences.favorite_keywords.length >= (user?.is_premium ? 5 : 3)}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={addKeyword}
                                        disabled={preferences.favorite_keywords.length >= (user?.is_premium ? 5 : 3)}
                                    >
                                        Add
                                    </Button>
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
                    {(() => {
                        const accountTooNew = user?.created_at
                            ? (Date.now() - new Date(user.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                            : false;
                        const eligibleDate = user?.created_at
                            ? new Date(new Date(user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
                                .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : null;

                        return (
                            <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Trash2 className="h-5 w-5 text-destructive" />
                                    <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <p className="font-medium text-destructive-foreground/90">Delete Account</p>
                                        <p className="text-sm text-muted-foreground">
                                            {accountTooNew
                                                ? `You can delete your account after ${eligibleDate}.`
                                                : "Permanently delete your account and all data."
                                            }
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={accountTooNew}>
                                                Delete Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Your account will be scheduled for deletion. You have 7 days to
                                                    log back in to cancel. After 7 days, all data will be permanently removed.
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
                        );
                    })()}

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

function EditProfileDialog({ user }: { user: any }) {
    const { refreshProfile } = useAuth();
    const [name, setName] = useState(user?.full_name || "");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.auth.updateProfile({ full_name: name });
            await refreshProfile();
            toast.success("Profile updated!");
            setOpen(false);
        } catch (e: any) {
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 bg-background">
                    <span className="sr-only">Edit</span>
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                    >
                        <path
                            d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00178 12.709 2.14646 12.8536C2.29113 12.9982 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42166 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42166 9.28547Z"
                            fill="currentColor"
                            fillRule="evenodd"
                            clipRule="evenodd"
                        />
                    </svg>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Edit Profile</AlertDialogTitle>
                    <AlertDialogDescription>
                        Update your public profile information.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSave(); }} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ChangePasswordDialog() {
    const [password, setPassword] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!password) return;
        setLoading(true);
        try {
            await api.auth.updateProfile({ password });
            toast.success("Password updated successfully!");
            setOpen(false);
            setPassword("");
        } catch (e: any) {
            toast.error("Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline">Change Password</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Change Password</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter your new password below. You'll need to login again with the new password.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password"
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSave(); }} disabled={loading || !password}>
                        {loading ? "Updating..." : "Update Password"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
