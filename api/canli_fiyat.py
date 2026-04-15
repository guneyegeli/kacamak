from flask import Blueprint, request, jsonify
import requests
import os
import time
import logging
from datetime import datetime

bp = Blueprint("canli_fiyat", __name__)
log = logging.getLogger("canli_fiyat")

TOKEN = os.getenv("TRAVELPAYOUTS_TOKEN")
RUB_TRY_KURU = float(os.getenv("RUB_TRY_KURU", "0.37"))

# 15 dakika in-memory cache
_cache = {}
CACHE_SURESI = 15 * 60  # saniye


def _cache_key(cikis, varis, gidis, donus):
    return f"{cikis}-{varis}-{gidis}-{donus}"


@bp.route("/api/canli-fiyat", methods=["GET"])
def canli_fiyat():
    cikis = request.args.get("cikis", "").upper()
    varis = request.args.get("varis", "").upper()
    gidis = request.args.get("gidis", "")
    donus = request.args.get("donus", "")
    yetiskin = int(request.args.get("yetiskin", "1"))

    if not cikis or not varis or not gidis:
        return jsonify({"canli_fiyat": None, "hata": "eksik parametre"})

    key = _cache_key(cikis, varis, gidis, donus)

    # Cache kontrol
    if key in _cache:
        entry = _cache[key]
        if time.time() - entry["zaman"] < CACHE_SURESI:
            fiyat = entry["fiyat"]
            return jsonify({
                "canli_fiyat": round(fiyat * yetiskin) if fiyat else None,
                "kisi_basi": fiyat,
                "kaynak": "travelpayouts",
                "guncelleme": entry["saat"],
            })

    # Travelpayouts API çağrısı
    try:
        params = {
            "origin": cikis,
            "destination": varis,
            "depart_date": gidis,
            "currency": "rub",
            "token": TOKEN,
        }
        if donus:
            params["return_date"] = donus

        r = requests.get(
            "https://api.travelpayouts.com/v1/prices/direct",
            params=params,
            timeout=10,
        )

        if not r.ok:
            log.warning("Travelpayouts API hatasi: %s", r.status_code)
            return jsonify({"canli_fiyat": None, "hata": "fiyat alinamadi"})

        data = r.json()
        # Yanıt formatı: {"success": true, "data": {"KRR": {"0": {"price": 1234, ...}}}}
        varis_data = data.get("data", {}).get(varis, {})

        fiyat_rub = None
        for _, ucus in varis_data.items():
            if isinstance(ucus, dict) and "price" in ucus:
                fiyat_rub = ucus["price"]
                break

        if fiyat_rub is None:
            # Cache'e null kaydet (gereksiz tekrar çağrı olmasın)
            saat = datetime.now().strftime("%H:%M")
            _cache[key] = {"fiyat": None, "zaman": time.time(), "saat": saat}
            return jsonify({"canli_fiyat": None, "hata": "bu rota icin fiyat bulunamadi"})

        fiyat_try = round(fiyat_rub * RUB_TRY_KURU)
        saat = datetime.now().strftime("%H:%M")

        # Cache'e kaydet
        _cache[key] = {"fiyat": fiyat_try, "zaman": time.time(), "saat": saat}

        return jsonify({
            "canli_fiyat": round(fiyat_try * yetiskin),
            "kisi_basi": fiyat_try,
            "kaynak": "travelpayouts",
            "guncelleme": saat,
        })

    except Exception as e:
        log.error("Canli fiyat hatasi: %s", e)
        return jsonify({"canli_fiyat": None, "hata": "fiyat alinamadi"})
