import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from collections.abc import Mapping, Sequence

from fastapi import HTTPException

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"
CHECK_PROMPT = "What is 2 + 2? Reply with just the answer."


def run_chat_completion(
    messages: Sequence[Mapping[str, str]],
    response_format: Mapping[str, str] | None = None,
) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenRouter is not configured. Set OPENROUTER_API_KEY.",
        )

    payload = {
        "model": MODEL,
        "messages": list(messages),
        "temperature": 0,
    }
    if response_format is not None:
        payload["response_format"] = response_format

    request = Request(
        OPENROUTER_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            response_body = bytes(response.read())
            result: Any = json.loads(response_body)
    except HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"OpenRouter returned HTTP {error.code}.",
        ) from None
    except (URLError, TimeoutError, OSError):
        raise HTTPException(
            status_code=502,
            detail="Could not connect to OpenRouter.",
        ) from None
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=502,
            detail="OpenRouter returned an invalid response.",
        ) from None

    try:
        answer = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(
            status_code=502,
            detail="OpenRouter returned an invalid response.",
        ) from None

    if not isinstance(answer, str) or not answer.strip():
        raise HTTPException(
            status_code=502,
            detail="OpenRouter returned an empty response.",
        )

    return answer.strip()


def run_connection_check() -> dict[str, str]:
    answer = run_chat_completion(
        [{"role": "user", "content": CHECK_PROMPT}]
    )
    return {"model": MODEL, "answer": answer}
