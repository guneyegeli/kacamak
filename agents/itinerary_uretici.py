from datetime import datetime
from services.claude_service import claude_sor
from services.bolge import bolge_bul, maks_gece, varsayilan_gece
from services.koordinat import sehir_adi_getir


def gece_hesapla(firsat: dict) -> int:
    """Uçuş tarihlerinden veya destinasyon bölgesine göre gece sayısı hesaplar."""
    varis = firsat.get('varis', '')
    ucus = firsat.get('ucus_tarihi', '')
    donus = firsat.get('donus_tarihi', '')

    if ucus and donus:
        try:
            g = datetime.strptime(ucus, "%Y-%m-%d")
            d = datetime.strptime(donus, "%Y-%m-%d")
            gece = (d - g).days
            if gece >= 1:
                return min(gece, maks_gece(varis))
        except ValueError:
            pass

    return varsayilan_gece(varis)


def _varis_sehir_bul(firsat: dict) -> str:
    """Fırsattan varış şehir adını çözer. DB'deki varis_sehir > IATA mapping > ham kod."""
    if firsat.get('varis_sehir'):
        return firsat['varis_sehir']
    return sehir_adi_getir(firsat.get('varis', ''))


def itinerary_olustur(firsat: dict, tercihler: dict = {}, gece: int = None) -> dict:
    from services.bolge import YURTICI

    tipler = tercihler.get("tercih_tipleri", [])
    cocuklu = tercihler.get("cocuk_var", False)
    yetiskin = tercihler.get("yetiskin_sayisi", 1)

    varis_sehir = _varis_sehir_bul(firsat)
    cikis_sehir = sehir_adi_getir(firsat.get('cikis', ''))
    yurtici = firsat.get('varis', '') in YURTICI

    if gece is None:
        gece = gece_hesapla(firsat)

    gece = min(gece, maks_gece(firsat.get('varis', '')))
    gun = gece + 1

    # Yurtiçi ve yurtdışı için farklı pratik bölümü
    if yurtici:
        pratik_format = '"pratik":{{"ulasim":"Havalimanından şehir merkezine ulaşım bilgisi","konaklama_bolgeleri":"Nerede kalınır, hangi semtler önerilir","ipuclari":["..."]}}'
        pratik_kural = f"- Pratik bolumunde SADECE ulasim (havalimanından merkeze nasıl gidilir) ve konaklama_bolgeleri (nerede kalınır) ver. Para birimi, dil, guvenlik YAZMA — yurtici seyahat."
    else:
        pratik_format = '"pratik":{{"ulasim":"...","para":"...","dil":"...","guvenlik":"...","ipuclari":["..."]}}'
        pratik_kural = f"- Sehir rehberi (pratik bolumu) {varis_sehir} icin olmali — ulasim, para birimi, dil, guvenlik bilgisi ver"

    # Yurtdışı ise hizmet sıralama talimatı ekle
    hizmet_sirala = ""
    if not yurtici:
        hizmet_sirala = f"""
- Destinasyona ozel hizmet ihtiyacini degerlendir ve "hizmet_siralama" alaninda su hizmetleri oncelik sirasina gore sirala:
  Secenekler: "esim", "arac", "sigorta", "valiz", "transfer"
  Kurallar:
    * Adalar veya uzak bolgeler (Bali, Maldivler, Phuket vb) → "arac" ve "esim" once
    * Buyuk sehir merkezi (Paris, Londra, Roma vb) → "transfer" ve "valiz" once
    * Schengen disi ulke → "esim" en basta
    * {gece}+ gece seyahat → "sigorta" en basta
  5 hizmeti de sirala, en cok gerekli olan basta olsun."""

    prompt = f"""Turkce, {varis_sehir} sehri icin tam {gun} gunluk ({gece} gece) seyahat programi hazirla.

ONEMLI: Varis sehri {varis_sehir}. Tum program {varis_sehir} icin olmali. Cikis sehri {cikis_sehir} hakkinda bilgi verme, sadece {varis_sehir} sehrindeki gezilecek yerler, restoranlar ve aktiviteleri yaz.

Kisi: {yetiskin} yetiskin{' + cocuk' if cocuklu else ''}
Tercih: {', '.join(tipler) if tipler else 'genel'}

Kurallar:
- Sadece {varis_sehir} sehrindeki gercek mekan/restoran isimleri kullan
- Her zaman diliminde emoji, aktivite, detay, ulasim, harcama_eur ver
- Oglen ve aksamda {varis_sehir} sehrinde restoran oner
- Her aktivite ve restoran icin google_maps_link alani ekle. Format: https://www.google.com/maps/search/?api=1&query=URL_ENCODED_MEKAN_ADI+{varis_sehir}
{pratik_kural}{hizmet_sirala}
- Kompakt JSON dondur, aciklama yazma

JSON formati:
{{"gunler":[{{"gun":1,"tema":"...","emoji":"...","sabah":{{"emoji":"...","aktivite":"...","detay":"...","google_maps_link":"https://www.google.com/maps/search/?api=1&query=Mekan+Adi+{varis_sehir}","ulasim":"...","harcama_eur":5}},"ogle":{{"emoji":"...","aktivite":"...","detay":"...","restoran":"Restoran Adi","restoran_maps_link":"https://www.google.com/maps/search/?api=1&query=Restoran+Adi+{varis_sehir}","google_maps_link":"https://www.google.com/maps/search/?api=1&query=Mekan+Adi+{varis_sehir}","ulasim":"...","harcama_eur":15}},"aksam":{{"emoji":"...","aktivite":"...","detay":"...","restoran":"Restoran Adi","restoran_maps_link":"https://www.google.com/maps/search/?api=1&query=Restoran+Adi+{varis_sehir}","google_maps_link":"https://www.google.com/maps/search/?api=1&query=Mekan+Adi+{varis_sehir}","ulasim":"...","harcama_eur":25}},"gun_toplam_eur":45,"ipucu":"..."}}],{pratik_format},"toplam_aktivite_eur":150,"en_iyi_zaman":"..."{(',"hizmet_siralama":["esim","transfer","arac","sigorta","valiz"]' if not yurtici else '')}}}"""

    sonuc = claude_sor(prompt, json_mod=True, max_tokens=8192)

    # Post-processing: eksik Google Maps linklerini ekle
    if sonuc and sonuc.get('gunler'):
        _maps_linkleri_ekle(sonuc, varis_sehir)

    return sonuc


def _maps_linkleri_ekle(itinerary: dict, sehir: str):
    """Claude'un üretmediği Google Maps linklerini post-processing ile ekler."""
    from urllib.parse import quote
    for gun in itinerary.get('gunler', []):
        for zaman in ('sabah', 'ogle', 'aksam'):
            bolum = gun.get(zaman)
            if not isinstance(bolum, dict):
                continue
            # Aktivite linki
            if bolum.get('aktivite') and not bolum.get('google_maps_link'):
                q = quote(f"{bolum['aktivite']} {sehir}")
                bolum['google_maps_link'] = f"https://www.google.com/maps/search/?api=1&query={q}"
            # Restoran linki
            if bolum.get('restoran') and not bolum.get('restoran_maps_link'):
                restoran_adi = bolum['restoran'].split(' - ')[0].strip()
                q = quote(f"{restoran_adi} {sehir}")
                bolum['restoran_maps_link'] = f"https://www.google.com/maps/search/?api=1&query={q}"
