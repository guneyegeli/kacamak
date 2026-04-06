from flask import Blueprint, request, jsonify
import sqlite3, json, os

bp = Blueprint("firsatlar", __name__)
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")

@bp.route("/api/firsatlar", methods=["GET"])
def firsatlar_listele():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT * FROM firsatlar
        WHERE gecerlilik > datetime('now') OR gecerlilik IS NULL
        ORDER BY indirim_orani DESC
        LIMIT 50
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@bp.route("/api/firsatlar/<int:firsat_id>", methods=["GET"])
def firsat_detay(firsat_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    firsat = conn.execute(
        "SELECT * FROM firsatlar WHERE id=?", (firsat_id,)
    ).fetchone()
    paket = conn.execute(
        "SELECT * FROM paketler WHERE firsat_id=?", (firsat_id,)
    ).fetchone()
    conn.close()
    if not firsat:
        return jsonify({"hata": "Bulunamadı"}), 404
    return jsonify({
        "firsat": dict(firsat),
        "paket": json.loads(paket["icerik"]) if paket else None
    })


@bp.route("/api/firsatlar/<int:firsat_id>/alternatifler", methods=["GET"])
def alternatif_tarihler(firsat_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    firsat = conn.execute(
        "SELECT cikis, varis FROM firsatlar WHERE id=?", (firsat_id,)
    ).fetchone()
    if not firsat:
        conn.close()
        return jsonify([])
    rows = conn.execute("""
        SELECT id, ucus_tarihi, donus_tarihi, fiyat, indirim_orani
        FROM firsatlar
        WHERE id != ? AND cikis = ? AND varis = ?
        AND ucus_tarihi >= date('now')
        AND (gecerlilik > datetime('now') OR gecerlilik IS NULL)
        ORDER BY fiyat ASC
        LIMIT 6
    """, (firsat_id, firsat["cikis"], firsat["varis"])).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@bp.route("/api/firsatlar/<int:firsat_id>/benzer", methods=["GET"])
def benzer_firsatlar(firsat_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    firsat = conn.execute(
        "SELECT cikis, varis FROM firsatlar WHERE id=?", (firsat_id,)
    ).fetchone()
    if not firsat:
        conn.close()
        return jsonify([])
    rows = conn.execute("""
        SELECT * FROM firsatlar
        WHERE id != ? AND cikis = ?
        AND (gecerlilik > datetime('now') OR gecerlilik IS NULL)
        ORDER BY indirim_orani DESC
        LIMIT 4
    """, (firsat_id, firsat["cikis"])).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])
