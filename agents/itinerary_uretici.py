from services.claude_service import claude_sor

def itinerary_olustur(firsat: dict, tercihler: dict = {}, gece: int = 3) -> dict:
    tipler = tercihler.get("tercih_tipleri", [])
    cocuklu = tercihler.get("cocuk_var", False)
    yetiskin = tercihler.get("yetiskin_sayisi", 1)

    prompt = f"""Sen deneyimli bir seyahat planlayicisisin. Turkce, gun bazli cok detayli seyahat programi hazirla.

Destinasyon: {firsat.get('varis_sehir', firsat['varis'])}
Sure: {gece} gece / {gece+1} gun
Kisi: {yetiskin} yetiskin{'+ cocuk' if cocuklu else ''}
Tercih: {', '.join(tipler) if tipler else 'genel'}
Cocuklu: {'Evet - aile dostu oneriler yap' if cocuklu else 'Hayir'}

Her gun icin 3 zaman dilimi (sabah/ogle/aksam), her zaman diliminde:
- Emoji ile baslayan aktivite adi
- Gezilecek yer veya restoran onerisi (gercek isim ver)
- Ulasim bilgisi (nasil gidilir)
- Tahmini harcama (EUR)

ONEMLI: Gercek mekan isimleri kullan. Yerel, turistik olmayan restoran ve kafeler de oner.

Sadece JSON dondur, baska hicbir sey yazma:
{{
  "gunler": [
    {{
      "gun": 1,
      "tema": "Varis ve ilk kesif",
      "emoji": "✈️",
      "sabah": {{
        "emoji": "🛬",
        "aktivite": "Havalimanindan sehir merkezine transfer",
        "detay": "...",
        "ulasim": "Metro/otobus ile nasil gidilir",
        "harcama_eur": 5
      }},
      "ogle": {{
        "emoji": "🍽️",
        "aktivite": "...",
        "detay": "...",
        "restoran": "Restoran Adi - kisa aciklama",
        "ulasim": "...",
        "harcama_eur": 15
      }},
      "aksam": {{
        "emoji": "🌆",
        "aktivite": "...",
        "detay": "...",
        "restoran": "Restoran Adi - kisa aciklama",
        "ulasim": "...",
        "harcama_eur": 25
      }},
      "gun_toplam_eur": 45,
      "ipucu": "Bugun icin ozel bir ipucu"
    }}
  ],
  "pratik": {{
    "ulasim": "Havalimanindan sehir merkezine ulasim detayi",
    "para": "Yerel para birimi, kartla odeme durumu",
    "dil": "Temel yerel ifadeler (3-4 tane)",
    "guvenlik": "Dikkat edilecek hususlar",
    "ipuclari": ["Ipucu 1", "Ipucu 2", "Ipucu 3"]
  }},
  "toplam_aktivite_eur": 150,
  "en_iyi_zaman": "Bu destinasyon icin en iyi ziyaret zamani"
}}"""
    return claude_sor(prompt, json_mod=True)
