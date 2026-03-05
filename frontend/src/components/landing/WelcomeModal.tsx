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
            <DialogContent className="sm:max-w-[480px] border-border bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                            <AlertTriangle className="h-4 w-4" />
                        </span>
                        <DialogTitle className="text-lg font-bold">
                            Welcome to Generative AI News!
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-[13px] leading-relaxed pt-2">
                        Hi there! 👋 Thanks for visiting.
                        <br /><br />
                        This is a <strong>demo application</strong> built to showcase the power of AI agents in news aggregation. I'm currently using <strong>free tier APIs</strong> for both the LLM (Gemini) and News data.
                        <br /><br />
                        <span className="block p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-600 text-xs">
                            ⚠️ You might encounter <strong>rate limits</strong> or temporary service interruptions if the API quotas are exceeded.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2.5 py-3">
                    <p className="text-xs text-muted-foreground text-center">
                        If you run into any issues or have feedback, I'd love to hear from you!
                    </p>
                    <div className="flex justify-center gap-2">
                        <a
                            href="mailto:atharvan.coder@gmail.com"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium transition-colors"
                        >
                            <Mail className="h-3.5 w-3.5" />
                            Contact Me
                        </a>
                        <a
                            href="https://github.com/Atharva0506/news-app/issues"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium transition-colors"
                        >
                            <Github className="h-3.5 w-3.5" />
                            Report Issue
                        </a>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleClose} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground text-sm">
                        Got it, let's explore! 🚀
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
