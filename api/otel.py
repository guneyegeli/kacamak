"""Otel arama API — Hotellook API kapalı olduğu için
doğrudan arama linkleri döndürür. Yanlış fiyat göstermek yerine
kullanıcıyı güvenilir arama sitelerine yönlendirir."""
import os
import logging
from flask import Blueprint, jsonify, request

bp = Blueprint("otel", __name__)
MARKER = os.getenv("TRAVELPAYOUTS_MARKER", "518734")
log = logging.getLogger("otel")


def _otel_link(sehir, checkin, checkout, yetiskin, cocuk):
    """Otel arama deep link'leri oluşturur."""
    from urllib.parse import quote
    yolcu_param = f"&adults={yetiskin}"
    if cocuk:
        yolcu_param += f"&children={cocuk}&childrenAges={'%2C'.join(['8'] * cocuk)}"

    return {
        "hotellook": f"https://search.hotellook.com/?destination={quote(sehir)}&checkIn={checkin}&checkOut={checkout}{yolcu_param}&marker={MARKER}&locale=tr&currency=try",
        "booking": f"https://www.booking.com/searchresults.html?ss={quote(sehir)}&checkin={checkin}&checkout={checkout}&group_adults={yetiskin}" + (f"&group_children={cocuk}" if cocuk else ""),
    }


@bp.route("/api/otel-ara")
def otel_ara():
    sehir = request.args.get("sehir", "").strip()
    checkin = request.args.get("checkin", "").strip()
    checkout = request.args.get("checkout", "").strip()
    yetiskin = int(request.args.get("yetiskin", 2))
    cocuk = int(request.args.get("cocuk", 0))

    if not sehir or not checkin or not checkout:
        return jsonify({"status": "not_found", "linkler": {}, "hata": "Eksik parametre"})

    # Gece sayısı
    try:
        from datetime import datetime
        g = datetime.strptime(checkin, "%Y-%m-%d")
        d = datetime.strptime(checkout, "%Y-%m-%d")
        gece = max((d - g).days, 1)
    except ValueError:
        gece = 3

    linkler = _otel_link(sehir, checkin, checkout, yetiskin, cocuk)

    return jsonify({
        "status": "links",
        "linkler": linkler,
        "gece": gece,
    })
