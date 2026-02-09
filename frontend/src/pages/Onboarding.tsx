import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Check, ChevronRight, Globe, MapPin, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const Onboarding = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        language: 'en',
        country: 'us',
        content_type: 'news',
        favorite_categories: [] as string[],
        favorite_keywords: [] as string[]
    });

    const categories = [
        "technology", "business", "science", "health",
        "entertainment", "sports", "politics", "world"
    ];

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.preferences.update(formData);
            toast({
                title: "All set!",
                description: "Your feed has been personalized.",
            });
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to save preferences", error);
            toast({
                title: "Error",
                description: "Failed to save preferences. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (cat: string) => {
        setFormData(prev => {
            const isSelected = prev.favorite_categories.includes(cat);
            if (isSelected) {
                return { ...prev, favorite_categories: prev.favorite_categories.filter(c => c !== cat) };
            } else {
                if (prev.favorite_categories.length >= 5) {
                    toast({
                        title: "Limit reached",
                        description: "You can select up to 5 topics.",
                        variant: "destructive", // or default/warning if available
                    });
                    return prev;
                }
                return { ...prev, favorite_categories: [...prev.favorite_categories, cat] };
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
                <Link to="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <Sparkles className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <span className="text-2xl font-bold">NewsAI</span>
                </Link>

                <div className="bg-card border border-border rounded-2xl p-8 shadow-soft">
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-2xl font-bold">
                                {step === 1 ? "Personalize your feed" : "Select Topics"}
                            </h1>
                            <span className="text-sm text-muted-foreground">Step {step} of 2</span>
                        </div>
                        <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-accent"
                                initial={{ width: "0%" }}
                                animate={{ width: step === 1 ? "50%" : "100%" }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>

                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> Language
                                </Label>
                                <select
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.language}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                >
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Region
                                </Label>
                                <select
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                >
                                    <option value="us">United States</option>
                                    <option value="gb">United Kingdom</option>
                                    <option value="in">India</option>
                                    <option value="au">Australia</option>
                                </select>
                            </div>

                            <Button
                                onClick={() => setStep(2)}
                                className="w-full h-11 group"
                            >
                                Continue
                                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <p className="text-muted-foreground text-sm">
                                Choose up to 5 topics you're interested in. We'll curate your feed based on these.
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${formData.favorite_categories.includes(cat)
                                                ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                                                : 'bg-background text-foreground border-input hover:border-accent hover:text-accent'
                                            }`}
                                    >
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="flex-1 h-11"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-[2] h-11"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Setting up...
                                        </>
                                    ) : (
                                        <>
                                            Finish Setup
                                            <Check className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Onboarding;
