import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Github, Mail, AlertTriangle } from "lucide-react";

export function WelcomeModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Check if user has seen the modal
        const hasSeenModal = localStorage.getItem("welcome-modal-seen");
        if (!hasSeenModal) {
            // Small delay to ensure smooth entry after page load
            const timer = setTimeout(() => setOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem("welcome-modal-seen", "true");
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] border-primary/20 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <AlertTriangle className="h-5 w-5" />
                        </span>
                        <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                            Welcome to Generative AI News!
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-base leading-relaxed pt-2">
                        Hi there! 👋 Thanks for visiting.
                        <br /><br />
                        This is a <strong>demo application</strong> built to showcase the power of AI agents in news aggregation. I'm currently using <strong>free tier APIs</strong> for both the LLM (Gemini) and News data.
                        <br /><br />
                        <span className="block p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-600 text-sm">
                            ⚠️ You might encounter <strong>rate limits</strong> or temporary service interruptions if the API quotas are exceeded.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 py-4">
                    <p className="text-sm text-muted-foreground text-center">
                        If you run into any issues or have feedback, I'd love to hear from you!
                    </p>
                    <div className="flex justify-center gap-3">
                        <a
                            href="mailto:atharvan.coder@gmail.com"
                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
                        >
                            <Mail className="h-4 w-4" />
                            Contact Me
                        </a>
                        <a
                            href="https://github.com/Atharva0506/news-app/issues"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            Report Issue
                        </a>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleClose} className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity">
                        Got it, let's explore! 🚀
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
