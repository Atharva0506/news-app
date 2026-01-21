from typing import TypedDict, Optional

class Cleaned(TypedDict):
    title: str
    url: str
    content: str

class Classification(TypedDict, total=False):
    category: Optional[str]
    sentiment: Optional[str]
    tags: list[str]

class Summary(TypedDict):
    short: str
    detailed: list[str]

class Bias(TypedDict):
    score: float
    explanation: str

class Explanation(TypedDict):
    eli5: str
    interview: str
