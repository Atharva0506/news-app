import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    role: "user" | "ai";
    content: string;
}

export function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hi! I'm the NewsAI support bot. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const cleanHistory = messages.filter(m => m.role !== 'ai' || m.content !== "Hi! I'm the NewsAI support bot. How can I help you today?");

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);

        try {
            // Convert history to format expected by backend if needed, or backend handles it
            // Backend expects role: "user" | "ai" (or "model"?)
            // Backend logic uses 'role' matching schema.
            const history = cleanHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'model', // Gemini expects 'model' usually, but backend wrapper might handle it.
                // My backend code: messages.append((msg.role, msg.content))
                // And Gemini expects "model" for AI.
                // Let's send "model" for AI role.
                content: m.content
            }));

            // Correction: My backend loop:
            // for msg in request.history[-5:]:
            //    messages.append((msg.role, msg.content))
            // LangChain ChatGoogleGenerativeAI usage invokes with (role, content) tuples.
            // It maps "human"/"user" to user, "ai"/"assistant"/"model" to model.
            // So "ai" should be fine or "model". Let's use "model" to be safe for Google.

            const res = await api.support.chat(userMsg, history);
            setMessages(prev => [...prev, { role: "ai", content: res.response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "ai", content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-16 right-0 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-glow overflow-hidden flex flex-col max-h-[500px]"
                    >
                        <div className="p-4 bg-accent/10 border-b border-border flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-accent" />
                                <span className="font-semibold">NewsAI Support</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50" ref={scrollRef}>
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user"
                                        ? "bg-accent text-accent-foreground"
                                        : "bg-secondary text-secondary-foreground"
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-secondary rounded-lg px-3 py-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-border bg-background">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask about pricing, features..."
                                    className="flex-1"
                                />
                                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="h-12 w-12 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </motion.button>
        </div>
    );
}
