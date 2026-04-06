from flask import Blueprint, jsonify, request
from services.unsplash import foto_getir, galeri_getir
from services.aktivite import aktiviteler_getir
from services.koordinat import koordinat_getir, harita_embed_url
from services.youtube_data import videolar_getir

bp = Blueprint("medya", __name__)


@bp.route("/api/foto/<destinasyon>", methods=["GET"])
def destinasyon_foto(destinasyon):
    fotolar = foto_getir(destinasyon.upper())
    return jsonify(fotolar)


@bp.route("/api/foto/galeri/<destinasyon>", methods=["GET"])
def destinasyon_galeri(destinasyon):
    adet = request.args.get("count", 6, type=int)
    fotolar = galeri_getir(destinasyon.upper(), min(adet, 10))
    return jsonify(fotolar)


@bp.route("/api/aktiviteler/<destinasyon>", methods=["GET"])
def destinasyon_aktiviteler(destinasyon):
    sonuc = aktiviteler_getir(destinasyon.upper())
    return jsonify(sonuc)


@bp.route("/api/harita/<destinasyon>", methods=["GET"])
def destinasyon_harita(destinasyon):
    koord = koordinat_getir(destinasyon.upper())
    embed = harita_embed_url(destinasyon.upper())
    if not koord:
        return jsonify({"hata": "Koordinat bulunamadi"}), 404
    return jsonify({
        "lat": koord["lat"],
        "lon": koord["lon"],
        "isim": koord["isim"],
        "embed_url": embed,
    })


@bp.route("/api/videolar/<destinasyon>", methods=["GET"])
def destinasyon_videolar(destinasyon):
    return jsonify(videolar_getir(destinasyon.upper()))
