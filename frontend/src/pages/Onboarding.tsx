import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { preferences } from '../api/api';

const Onboarding = () => {
    const navigate = useNavigate();
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
            await preferences.update(formData);
            navigate('/dashboard'); // Or wherever main feed is
        } catch (error) {
            console.error("Failed to save preferences", error);
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
                if (prev.favorite_categories.length >= 5) return prev; // Limit to 5
                return { ...prev, favorite_categories: [...prev.favorite_categories, cat] };
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-xl">
                <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">Welcome!</h1>

                {step === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Personalize your feed</h2>

                        <div>
                            <label className="block text-sm font-medium mb-2">Language</label>
                            <select
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                                value={formData.language}
                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Region</label>
                            <select
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            >
                                <option value="us">United States</option>
                                <option value="gb">United Kingdom</option>
                                <option value="in">India</option>
                                <option value="au">Australia</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                        >
                            Next
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Select Topics</h2>
                        <p className="text-gray-400 text-sm">Choose up to 5 topics you love.</p>

                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${formData.favorite_categories.includes(cat)
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="text-gray-400 hover:text-white transition"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Finish'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
