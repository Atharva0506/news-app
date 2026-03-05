import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { MessageSquare, Calendar, Trash2, ChevronDown, ChevronUp, Bot, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
    role: "user" | "ai";
    content: string;
}

interface SavedChat {
    id: string;
    title: string;
    messages: ChatMessage[];
    created_at: string;
    updated_at: string;
}

const SavedChatsList = () => {
    const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: chats = [], isLoading, isError } = useQuery<SavedChat[]>({
        queryKey: ['saved-chats'],
        queryFn: () => api.chat.list(),
        staleTime: 2 * 60 * 1000,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.chat.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-chats'] });
            toast.success("Chat deleted");
        },
        onError: () => {
            toast.error("Failed to delete chat");
        }
    });

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteMutation.mutate(id);
    };

    const toggleExpand = (id: string) => {
        setExpandedChatId(prev => prev === id ? null : id);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">Failed to load chats</h3>
                <p className="text-sm text-muted-foreground mb-4">Something went wrong. Please try again later.</p>
                <Button size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['saved-chats'] })}>
                    Retry
                </Button>
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">No saved chats yet</h3>
                <p className="text-sm text-muted-foreground">
                    Save a conversation from the AI Assistant to view it here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    Saved Chats
                </h2>
                <span className="text-xs text-muted-foreground">
                    {chats.length} chat{chats.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="grid gap-3">
                {chats.map(chat => {
                    const isExpanded = expandedChatId === chat.id;
                    const userMessages = chat.messages?.filter(m => m.role === 'user') || [];
                    const preview = userMessages[0]?.content?.slice(0, 80) || "No messages";
                    const msgCount = chat.messages?.length || 0;

                    return (
                        <div
                            key={chat.id}
                            className="bg-card border border-border rounded-lg overflow-hidden transition-all"
                        >
                            {/* Chat Header */}
                            <button
                                onClick={() => toggleExpand(chat.id)}
                                className="w-full p-3 flex items-center justify-between hover:bg-accent/5 transition-colors text-left"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm mb-0.5 truncate">
                                        {chat.title || "Untitled Chat"}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(chat.updated_at), "MMM d, yyyy 'at' h:mm a")}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            {msgCount} message{msgCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {!isExpanded && (
                                        <p className="text-sm text-muted-foreground mt-1.5 truncate">
                                            {preview}{preview.length >= 80 ? "..." : ""}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 ml-3 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={(e) => handleDelete(chat.id, e)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    {isExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Chat Messages */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-border p-4 space-y-3 max-h-[400px] overflow-y-auto bg-background/50">
                                            {chat.messages?.map((msg, i) => (
                                                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                                    {msg.role === "ai" && (
                                                        <div className="shrink-0 h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center mt-1">
                                                            <Bot className="h-3.5 w-3.5 text-accent" />
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user"
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
                                                    {msg.role === "user" && (
                                                        <div className="shrink-0 h-6 w-6 rounded-full bg-blue-600/10 flex items-center justify-center mt-1">
                                                            <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SavedChatsList;
