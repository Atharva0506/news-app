import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2, Check, ArrowRight, Sparkles, Globe, LayoutGrid, FileText,
    Cpu, Briefcase, FlaskConical, Heart, Landmark, Clapperboard, Earth, Newspaper
} from "lucide-react";

const AVAILABLE_CATEGORIES = [
    { id: "technology", label: "Technology", icon: Cpu },
    { id: "business", label: "Business", icon: Briefcase },
    { id: "science", label: "Science", icon: FlaskConical },
    { id: "health", label: "Health", icon: Heart },
    { id: "politics", label: "Politics", icon: Landmark },
    { id: "entertainment", label: "Entertainment", icon: Clapperboard },
    { id: "world", label: "World", icon: Earth },
    { id: "general", label: "General", icon: Newspaper },
];

export default function Onboarding() {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [language, setLanguage] = useState("en");
    const [country, setCountry] = useState("us");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [summaryStyle, setSummaryStyle] = useState("short");

    // Limits
    const MAX_CATEGORIES = user?.is_premium ? 5 : 3;

    const toggleCategory = (catId: string) => {
        setSelectedCategories((prev) => {
            if (prev.includes(catId)) {
                return prev.filter((c) => c !== catId);
            }
            if (prev.length >= MAX_CATEGORIES) {
                toast.error(`You can select up to ${MAX_CATEGORIES} categories. ${!user?.is_premium ? "Upgrade to Pro for more." : ""}`);
                return prev;
            }
            return [...prev, catId];
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.onboarding.submit({
                language,
                country,
                content_type: "news",
                favorite_categories: selectedCategories,
                favorite_keywords: [],
                summary_style: summaryStyle
            });

            await refreshProfile();
            toast.success("Onboarding complete! Generating your first feed...");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Failed to save preferences");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { icon: Globe, label: "Language & Region" },
        { icon: LayoutGrid, label: "Categories" },
        { icon: FileText, label: "Summary Style" },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg relative z-10"
            >
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <Sparkles className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <span className="text-2xl font-bold">NewsAI</span>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold mb-2">Personalize Your Feed</h1>
                        <p className="text-muted-foreground text-sm">
                            Let's set up your perfect news experience
                        </p>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {steps.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div
                                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-300 ${step > i + 1
                                            ? "bg-accent text-accent-foreground"
                                            : step === i + 1
                                                ? "bg-accent text-accent-foreground ring-2 ring-accent/30 ring-offset-2 ring-offset-card"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                >
                                    {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`w-12 h-0.5 transition-colors duration-300 ${step > i + 1 ? "bg-accent" : "bg-muted"}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step Content */}
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Preferred Language</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger className="h-11 bg-background">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">🇺🇸 English</SelectItem>
                                            <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                                            <SelectItem value="fr">🇫🇷 French</SelectItem>
                                            <SelectItem value="de">🇩🇪 German</SelectItem>
                                            <SelectItem value="hi">🇮🇳 Hindi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Region</Label>
                                    <Select value={country} onValueChange={setCountry}>
                                        <SelectTrigger className="h-11 bg-background">
                                            <SelectValue placeholder="Select region" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="us">🇺🇸 United States</SelectItem>
                                            <SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
                                            <SelectItem value="in">🇮🇳 India</SelectItem>
                                            <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                                            <SelectItem value="au">🇦🇺 Australia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Pick your favorite categories</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Select up to {MAX_CATEGORIES} categories to personalize your feed.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        {AVAILABLE_CATEGORIES.map((cat) => {
                                            const isSelected = selectedCategories.includes(cat.id);
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => toggleCategory(cat.id)}
                                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-200 cursor-pointer ${
                                                        isSelected
                                                            ? "border-accent bg-accent/10 text-accent ring-1 ring-accent/30"
                                                            : "border-border hover:border-accent/30 hover:bg-accent/5 text-foreground"
                                                    }`}
                                                >
                                                    <cat.icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                                                    <span>{cat.label}</span>
                                                    {isSelected && <Check className="h-3.5 w-3.5 ml-auto text-accent" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedCategories.length === 0 && (
                                        <p className="text-xs text-amber-500 mt-2">Select at least one category to continue.</p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                <Label className="text-sm font-medium">How do you want your summaries?</Label>
                                <RadioGroup value={summaryStyle} onValueChange={setSummaryStyle} className="space-y-3">
                                    <div className={`flex items-center space-x-3 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${summaryStyle === "short" ? "border-accent bg-accent/5 ring-1 ring-accent/20" : "border-border hover:border-accent/30 hover:bg-accent/5"}`}>
                                        <RadioGroupItem value="short" id="r1" />
                                        <Label htmlFor="r1" className="cursor-pointer flex-1">
                                            <span className="font-semibold block">Short & Concise</span>
                                            <span className="text-xs text-muted-foreground">Quick overview of the topic.</span>
                                        </Label>
                                    </div>
                                    <div className={`flex items-center space-x-3 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${summaryStyle === "detailed" ? "border-accent bg-accent/5 ring-1 ring-accent/20" : "border-border hover:border-accent/30 hover:bg-accent/5"}`}>
                                        <RadioGroupItem value="detailed" id="r2" />
                                        <Label htmlFor="r2" className="cursor-pointer flex-1">
                                            <span className="font-semibold block">Detailed</span>
                                            <span className="text-xs text-muted-foreground">In-depth analysis and context.</span>
                                        </Label>
                                    </div>
                                    <div className={`flex items-center space-x-3 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${summaryStyle === "bullet" ? "border-accent bg-accent/5 ring-1 ring-accent/20" : "border-border hover:border-accent/30 hover:bg-accent/5"}`}>
                                        <RadioGroupItem value="bullet" id="r3" />
                                        <Label htmlFor="r3" className="cursor-pointer flex-1">
                                            <span className="font-semibold block">Bullet Points</span>
                                            <span className="text-xs text-muted-foreground">Key takeaways in list format.</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer */}
                    <div className="flex justify-between mt-8">
                        <Button
                            variant="outline"
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={step === 1 || loading}
                            className="h-11"
                        >
                            Back
                        </Button>

                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(s => Math.min(3, s + 1))}
                                disabled={(step === 2 && selectedCategories.length === 0)}
                                className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                                Next <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Get Started
                            </Button>
                        )}
                    </div>
                </div>

                {/* Footer text */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                    You can always change these settings later.
                </p>
            </motion.div>
        </div>
    );
}
