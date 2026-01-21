import asyncio
import json
from typing import Type, TypeVar
from pydantic import BaseModel, ValidationError
from google import genai
from app.core.config import settings

T = TypeVar("T", bound=BaseModel)

_client = genai.Client(api_key=settings.GEMINI_API_KEY)

class GeminiError(RuntimeError):
    pass

async def gemini_json(
    *,
    model: str,
    system: str,
    user: str,
    schema: Type[T],
    timeout_s: float = 25.0,
    retries: int = 2,
) -> T:
    prompt = (
        f"{system}\n\n"
        "Return ONLY valid JSON that matches this schema exactly.\n"
        "No markdown, no extra keys.\n\n"
        f"SCHEMA:\n{schema.model_json_schema()}\n\n"
        f"INPUT:\n{user}"
    )

    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            def _call():
                # Gemini client returns text; we parse JSON ourselves.
                res = _client.models.generate_content(model=model, contents=prompt)
                return getattr(res, "text", None) or ""

            text = await asyncio.wait_for(asyncio.to_thread(_call), timeout=timeout_s)
            data = json.loads(text)
            return schema.model_validate(data)

        except (asyncio.TimeoutError, json.JSONDecodeError, ValidationError) as e:
            last_err = e
            await asyncio.sleep(0.6 * (attempt + 1))

    raise GeminiError(f"Gemini JSON parse/validate failed: {last_err}")
