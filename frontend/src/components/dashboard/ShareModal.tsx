import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, Link2, Sparkles, User as UserIcon } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

// Brand SVG icons
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  title: string;
  messages?: ChatMessage[];
}

export function ShareModal({ open, onOpenChange, shareUrl, title, messages = [] }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(`${title} — AI Analysis by NewsAI`);
  const encodedText = encodeURIComponent(`Check out this AI news analysis: ${title}`);

  const platforms = [
    {
      name: "Copy link",
      icon: Link2,
      action: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          toast.success("Link copied to clipboard!");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Failed to copy link");
        }
      },
    },
    {
      name: "X",
      icon: XIcon,
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, "_blank", "noopener,noreferrer"),
    },
    {
      name: "LinkedIn",
      icon: LinkedInIcon,
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank", "noopener,noreferrer"),
    },
    {
      name: "Reddit",
      icon: RedditIcon,
      action: () => window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`, "_blank", "noopener,noreferrer"),
    },
    {
      name: "WhatsApp",
      icon: WhatsAppIcon,
      action: () => window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank", "noopener,noreferrer"),
    },
  ];

  // Show up to 3 message pairs (user + ai) for preview
  const previewMessages = messages.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-base font-semibold">{title || "Share Analysis"}</DialogTitle>
        </DialogHeader>

        {/* Conversation Preview */}
        {previewMessages.length > 0 && (
          <div className="mx-6 mb-4 rounded-lg border border-border bg-muted/30 overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto p-4 space-y-3">
              {previewMessages.map((msg, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 ${
                    msg.role === "ai"
                      ? "bg-accent/10"
                      : "bg-foreground/10"
                  }`}>
                    {msg.role === "ai" ? (
                      <Sparkles className="h-3 w-3 text-accent" />
                    ) : (
                      <UserIcon className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs font-medium text-muted-foreground mb-0.5">
                      {msg.role === "ai" ? "NewsAI" : "You"}
                    </p>
                    <div className="text-xs text-foreground/80 line-clamp-3 prose prose-sm dark:prose-invert max-w-none [&>*]:m-0 [&>*]:leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Gradient fade at bottom */}
            {messages.length > 6 && (
              <div className="h-8 bg-gradient-to-t from-muted/30 to-transparent -mt-8 relative z-10 pointer-events-none" />
            )}
            {/* Watermark */}
            <div className="px-4 py-2 border-t border-border/50 flex items-center gap-1.5">
              <div className="h-4 w-4 rounded bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-2.5 w-2.5 text-accent" />
              </div>
              <span className="text-2xs text-muted-foreground font-medium">NewsAI</span>
            </div>
          </div>
        )}

        {/* Share platforms */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-3">
            {platforms.map((platform) => (
              <button
                key={platform.name}
                onClick={platform.action}
                className="group flex flex-col items-center gap-1.5 transition-all duration-150"
              >
                <div className="h-11 w-11 rounded-full border border-border bg-background flex items-center justify-center transition-all duration-150 group-hover:border-accent/40 group-hover:bg-accent/5 group-hover:scale-105">
                  {platform.name === "Copy link" && copied ? (
                    <Check className="h-4.5 w-4.5 text-accent" />
                  ) : (
                    <platform.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
                <span className="text-2xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {platform.name === "Copy link" && copied ? "Copied!" : platform.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
