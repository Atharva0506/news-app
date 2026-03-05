import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

interface FeedFiltersProps {
  category: string;
  onCategoryChange: (value: string) => void;
  sentiment: string;
  onSentimentChange: (value: string) => void;
}

export function FeedFilters({
  category,
  onCategoryChange,
  sentiment,
  onSentimentChange,
}: FeedFiltersProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="general">General</SelectItem>
          <SelectItem value="technology">Technology</SelectItem>
          <SelectItem value="business">Business</SelectItem>
          <SelectItem value="science">Science</SelectItem>
          <SelectItem value="health">Health</SelectItem>
          <SelectItem value="politics">Politics</SelectItem>
          <SelectItem value="world">World</SelectItem>
          <SelectItem value="entertainment">Entertainment</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sentiment} onValueChange={onSentimentChange}>
        <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
          <SelectValue placeholder="Sentiment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-sentiment">All Sentiment</SelectItem>
          <SelectItem value="positive">Positive</SelectItem>
          <SelectItem value="neutral">Neutral</SelectItem>
          <SelectItem value="negative">Negative</SelectItem>
        </SelectContent>
      </Select>

      {user && !user.is_premium && (
        <Button
          className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground h-9 text-sm"
          asChild
        >
          <Link to="/pricing" className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Upgrade to Pro</span>
          </Link>
        </Button>
      )}
    </div>
  );
}
