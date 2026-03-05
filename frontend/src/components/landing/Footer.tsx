import { Link } from "react-router-dom";
import { Sparkles, Twitter, Github, Linkedin } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "/" },
    { label: "Explore", href: "/explore" },
    { label: "Pricing", href: "/pricing" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Company: [
    { label: "About Me", href: "/about" },
    { label: "Portfolio", href: "https://atharvanaik.me/" },
    { label: "Building NewsAI (Blog)", href: "https://atharvanaik.me/posts/news-ai" },
    { label: "Contact: atharvn.coder@gmail.com", href: "mailto:atharvn.coder@gmail.com" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "FAQ", href: "/faq" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-secondary/20 border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Sparkles className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-base font-bold">NewsAI</span>
            </Link>
            <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">
              AI-powered news intelligence for the modern reader. Understand more, miss less.
            </p>
            <div className="flex gap-3">
              <a href="https://x.com/Atharva_0506" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://github.com/Atharva0506" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-4 w-4" />
              </a>
              <a href="https://www.linkedin.com/in/atharva0506/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">{category}</h4>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("http") ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NewsAI. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Thank you for using NewsAI 💖
          </p>
        </div>
      </div>
    </footer>
  );
}
