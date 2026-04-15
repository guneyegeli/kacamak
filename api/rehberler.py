from flask import Blueprint, jsonify
import os
import json
import logging

bp = Blueprint("rehberler", __name__)
log = logging.getLogger("rehberler")

REHBER_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "rehberler")


@bp.route("/api/rehberler", methods=["GET"])
def rehber_listesi():
    """Mevcut tüm rehberlerin listesini döndür."""
    if not os.path.isdir(REHBER_DIR):
        return jsonify([])

    liste = []
    for dosya in sorted(os.listdir(REHBER_DIR)):
        if not dosya.endswith('.json'):
            continue
        iata = dosya.replace('.json', '')
        try:
            with open(os.path.join(REHBER_DIR, dosya), 'r', encoding='utf-8') as f:
                data = json.load(f)
            liste.append({
                "iata": iata,
                "sehir": data.get("sehir", iata),
                "ulke": data.get("ulke", ""),
                "meta_description": data.get("meta_description", ""),
            })
        except Exception:
            continue

    return jsonify(liste)


@bp.route("/api/rehber/<iata_kodu>", methods=["GET"])
def rehber_detay(iata_kodu):
    """Tek şehir rehberini döndür."""
    dosya = os.path.join(REHBER_DIR, f"{iata_kodu.upper()}.json")
    if not os.path.exists(dosya):
        return jsonify({"hata": "Rehber bulunamadı"}), 404

    try:
        with open(dosya, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        log.error("Rehber okuma hatası: %s", e)
        return jsonify({"hata": "Rehber okunamadı"}), 500
