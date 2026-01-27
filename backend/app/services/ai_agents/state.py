from typing import List, Optional, TypedDict, Annotated
import operator

class AgentState(TypedDict):
    # Input
    article_id: str
    title: str
    content: str
    is_premium: bool
    
    # Processed Data
    category: Optional[str]
    sentiment: Optional[str]
    tags: List[str]
    summary_short: Optional[str]
    summary_detail: Optional[str]
    bias_score: Optional[float]
    bias_explanation: Optional[str]
    
    # Flow Control
    quality_score: float
    is_duplicate: bool
    error: Optional[str]
