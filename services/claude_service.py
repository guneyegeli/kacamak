import anthropic
import json
import os
import logging
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger("claude_service")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def claude_sor(prompt: str, json_mod: bool = False, max_tokens: int = 4096,
               system: str = None, temperature: float = None) -> dict | str:
    try:
        kwargs = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system
        if temperature is not None:
            kwargs["temperature"] = temperature
        mesaj = client.messages.create(**kwargs)
    except Exception as e:
        log.error("İstek hatası: %s: %s", type(e).__name__, e)
        return {} if json_mod else ""

    yanit = mesaj.content[0].text
    log.debug("stop_reason=%s, uzunluk=%d", mesaj.stop_reason, len(yanit))

    if mesaj.stop_reason == "max_tokens":
        log.warning("Yanıt max_tokens (%d) sınırına ulaştı, JSON eksik olabilir!", max_tokens)

    if json_mod:
        temiz = yanit.strip()
        if temiz.startswith("```"):
            temiz = temiz.split("\n", 1)[-1]
            if "```" in temiz:
                temiz = temiz[:temiz.rfind("```")]
            temiz = temiz.strip()
        try:
            return json.loads(temiz)
        except json.JSONDecodeError as e:
            log.warning("JSON parse hatası: %s", e)
            for i in range(len(temiz) - 1, -1, -1):
                if temiz[i] == '}':
                    try:
                        return json.loads(temiz[:i+1])
                    except json.JSONDecodeError:
                        continue
            log.error("JSON kurtarma başarısız")
            return {}
    return yanit
