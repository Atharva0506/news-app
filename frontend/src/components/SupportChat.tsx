import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
    role: "user" | "ai";
    content: string;
}

export function SupportChat() {
    const { user } = useAuth();
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
    const hasConversation = cleanHistory.length > 0;

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);

        try {
            const history = cleanHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                content: m.content
            }));

            // Add temporary empty message to stream into
            setMessages(prev => [...prev, { role: "ai", content: "" }]);

            const token = localStorage.getItem("token");
            const response = await fetch(`${api.support.chat.toString().includes('undefined') ? 'http://localhost:8000/api/v1' : 'http://localhost:8000/api/v1'}/support/chat`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: userMsg, history }),
            });

            if (!response.ok || !response.body) throw new Error("Processing failed");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullResponse = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(trimmed.substring(6));
                            if (data.status === "done") {
                                break;
                            } else if (data.status === "error") {
                                toast.error(data.message);
                            } else if (data.text) {
                                fullResponse += data.text;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content = fullResponse;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // ignore parse errors
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => {
                const newMsgs = [...prev];
                // If we failed and the last message is still the empty one, replace it
                if (newMsgs[newMsgs.length - 1].role === "ai" && newMsgs[newMsgs.length - 1].content === "") {
                    newMsgs[newMsgs.length - 1].content = "Sorry, I'm having trouble connecting right now. Please try again later.";
                }
                return newMsgs;
            });
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="fixed bottom-4 right-4 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        className="absolute bottom-14 right-0 w-72 sm:w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[450px]"
                    >
                        <div className="px-3 py-2.5 bg-accent/10 border-b border-border flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <Bot className="h-4 w-4 text-accent" />
                                <span className="text-sm font-semibold">NewsAI Support</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50" ref={scrollRef}>
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${msg.role === "user"
                                        ? "bg-blue-600 text-white"
                                        : "bg-card border border-border text-card-foreground"
                                        }`}>
                                        {msg.role === "ai" ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Thinking...</span>
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
                className="h-10 w-10 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
            >
                {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
            </motion.button>
        </div>
    );
}
