import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { MessageSquare, Calendar, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SavedChat {
    id: string;
    title: string;
    updated_at: string;
}

const SavedChatsList = () => {
    const [chats, setChats] = useState<SavedChat[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const data = await api.chat.list();
            setChats(data);
        } catch (error) {
            console.error("Failed to fetch chats", error);
            toast.error("Failed to load saved chats");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.chat.delete(id);
            setChats(prev => prev.filter(c => c.id !== id));
            toast.success("Chat deleted");
        } catch (error) {
            toast.error("Failed to delete chat");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No saved chats yet</h3>
                <p className="text-muted-foreground mb-6">Start a conversation with the AI assistant to save it here.</p>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                Saved Chats
            </h2>
            <div className="grid gap-4">
                {chats.map(chat => (
                    <div
                        key={chat.id}
                        onClick={() => navigate(`/dashboard?chat=${chat.id}`)}
                        className="group bg-card hover:bg-accent/50 border border-border rounded-lg p-4 cursor-pointer transition-all flex items-center justify-between"
                    >
                        <div>
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                                {chat.title || "Untitled Chat"}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(chat.updated_at), "MMM d, yyyy")}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDelete(chat.id, e)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SavedChatsList;
