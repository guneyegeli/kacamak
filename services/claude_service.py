import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def claude_sor(prompt: str, json_mod: bool = False) -> dict | str:
    mesaj = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    yanit = mesaj.content[0].text

    if json_mod:
        try:
            temiz = yanit.strip().removeprefix("```json").removesuffix("```").strip()
            return json.loads(temiz)
        except Exception as e:
            print(f"JSON parse hatası: {e}")
            return {}
    return yanit
