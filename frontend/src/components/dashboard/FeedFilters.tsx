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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-secondary/50 border-0">
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
        <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs bg-secondary/50 border-0">
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
          size="sm"
          className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground h-8 text-xs font-medium"
          asChild
        >
          <Link to="/pricing" className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Upgrade
          </Link>
        </Button>
      )}
    </div>
  );
}
