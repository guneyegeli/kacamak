import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def claude_sor(prompt: str, json_mod: bool = False, max_tokens: int = 4096) -> dict | str:
    try:
        mesaj = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
    except Exception as e:
        print(f"[Claude API] İstek hatası: {type(e).__name__}: {e}")
        return {} if json_mod else ""

    yanit = mesaj.content[0].text
    print(f"[Claude API] stop_reason={mesaj.stop_reason}, uzunluk={len(yanit)}")

    if mesaj.stop_reason == "max_tokens":
        print(f"[Claude API] UYARI: Yanıt max_tokens ({max_tokens}) sınırına ulaştı, JSON eksik olabilir!")

    if json_mod:
        temiz = yanit.strip()
        # ```json ... ``` bloğunu çıkar
        if temiz.startswith("```"):
            temiz = temiz.split("\n", 1)[-1]  # İlk satırı at (```json)
            if "```" in temiz:
                temiz = temiz[:temiz.rfind("```")]
            temiz = temiz.strip()
        try:
            return json.loads(temiz)
        except json.JSONDecodeError as e:
            print(f"[Claude API] JSON parse hatası: {e}")
            print(f"[Claude API] Yanıtın son 200 karakteri: {temiz[-200:]}")
            # Kesik JSON'u kurtarmayı dene — son kapanmamış brace'e kadar kes
            for i in range(len(temiz) - 1, -1, -1):
                if temiz[i] == '}':
                    try:
                        return json.loads(temiz[:i+1])
                    except json.JSONDecodeError:
                        continue
            print("[Claude API] JSON kurtarma başarısız")
            return {}
    return yanit
