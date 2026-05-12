from flask import Blueprint, Response, abort
import os
import re
import json
import html
import sqlite3
import logging
from datetime import datetime, timezone
from xml.sax.saxutils import escape

bp = Blueprint("seo", __name__)
log = logging.getLogger("seo")

BASE_URL = os.getenv("SITE_URL", "https://www.dedektifgezgin.com").rstrip("/")
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REHBER_DIR = os.path.join(PROJECT_ROOT, "data", "rehberler")
DB_PATH = os.path.join(PROJECT_ROOT, "data", "kacamak.db")

IATA_REGEX = re.compile(r"^[A-Za-z]{2,4}$")
INDEX_HTML_PATH = os.path.join(PROJECT_ROOT, "frontend", "dist", "index.html")
OG_IMAGE_DEFAULT = f"{BASE_URL}/logo.png"


def _aktif_varisler():
    """En az 1 aktif fırsata sahip varış IATA'larını döndürür."""
    if not os.path.exists(DB_PATH):
        return []
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            "SELECT DISTINCT varis FROM firsatlar "
            "WHERE aktif = 1 AND varis IS NOT NULL AND varis != ''"
        ).fetchall()
        return sorted({r[0] for r in rows})
    finally:
        conn.close()


def _iso_tarih(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def _url_giris(loc, lastmod=None, changefreq=None, priority=None):
    parcalar = ["  <url>", f"    <loc>{escape(loc)}</loc>"]
    if lastmod:
        parcalar.append(f"    <lastmod>{lastmod}</lastmod>")
    if changefreq:
        parcalar.append(f"    <changefreq>{changefreq}</changefreq>")
    if priority:
        parcalar.append(f"    <priority>{priority}</priority>")
    parcalar.append("  </url>")
    return "\n".join(parcalar)


def _index_template():
    """frontend/dist/index.html'i diskten oku (her seferinde, cache yok)."""
    with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
        return f.read()


@bp.route("/sitemap.xml", methods=["GET"])
def sitemap():
    bugun = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    girisler = []

    # Ana sayfa
    girisler.append(_url_giris(
        f"{BASE_URL}/", lastmod=bugun, changefreq="daily", priority="1.0"
    ))

    # Rehberler liste sayfası
    girisler.append(_url_giris(
        f"{BASE_URL}/rehberler", lastmod=bugun, changefreq="weekly", priority="0.9"
    ))

    # Her rehber (177 dosya beklenir)
    if os.path.isdir(REHBER_DIR):
        for dosya in sorted(os.listdir(REHBER_DIR)):
            if not dosya.endswith(".json"):
                continue
            iata = dosya[:-5]
            try:
                lastmod = _iso_tarih(os.path.getmtime(os.path.join(REHBER_DIR, dosya)))
            except OSError:
                lastmod = bugun
            girisler.append(_url_giris(
                f"{BASE_URL}/rehber/{iata}",
                lastmod=lastmod, changefreq="monthly", priority="0.7"
            ))

    # Aktif fırsatı olan varış havalimanları için aggregate sayfa
    for iata in _aktif_varisler():
        girisler.append(_url_giris(
            f"{BASE_URL}/firsat/{iata}",
            lastmod=bugun, changefreq="daily", priority="0.8"
        ))

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(girisler)
        + "\n</urlset>\n"
    )

    log.info("Sitemap üretildi: %d URL", len(girisler))

    return Response(
        xml,
        mimetype="application/xml",
        headers={
            "Cache-Control": "public, max-age=0, must-revalidate",
            "X-Content-Type-Options": "nosniff",
        },
    )


@bp.route("/rehber/<iata>", methods=["GET"])
def rehber_ssr(iata):
    # 1) Path traversal + format koruma: yalnızca 2-4 harf
    if not IATA_REGEX.match(iata):
        abort(404)
    iata_norm = iata.upper()

    # 2) JSON'u oku, yoksa 404 (catch-all'a düşmesin)
    rehber_yolu = os.path.join(REHBER_DIR, f"{iata_norm}.json")
    if not os.path.exists(rehber_yolu):
        abort(404)
    try:
        with open(rehber_yolu, "r", encoding="utf-8") as f:
            rehber = json.load(f)
    except Exception:
        log.exception("Rehber JSON okunamadı: %s", iata_norm)
        abort(404)

    # 3) Alanları al
    sehir = rehber.get("sehir") or iata_norm
    aciklama = rehber.get("meta_description") or f"{sehir} seyahat rehberi - Dedektif Gezgin"
    tanitim = rehber.get("tanitim") or ""
    paragraflar = [p.strip() for p in tanitim.split("\n\n") if p.strip()][:3]
    kanonik_url = f"{BASE_URL}/rehber/{iata_norm}"
    title = f"{sehir} Rehberi - Dedektif Gezgin"
    og_image = OG_IMAGE_DEFAULT  # JSON'larda görsel alanı yok, varsayılan logo

    # XSS koruması: tüm değerleri escape et
    title_esc = html.escape(title, quote=True)
    aciklama_esc = html.escape(aciklama, quote=True)
    sehir_esc = html.escape(sehir, quote=True)
    kanonik_esc = html.escape(kanonik_url, quote=True)
    og_image_esc = html.escape(og_image, quote=True)
    p_html = "".join(f"<p>{html.escape(p)}</p>" for p in paragraflar)

    # 4) Head'e inject edilecek meta'lar
    meta_blok = (
        f'<meta name="description" content="{aciklama_esc}">\n'
        f'    <meta property="og:title" content="{title_esc}">\n'
        f'    <meta property="og:description" content="{aciklama_esc}">\n'
        f'    <meta property="og:url" content="{kanonik_esc}">\n'
        f'    <meta property="og:type" content="article">\n'
        f'    <meta property="og:image" content="{og_image_esc}">\n'
        f'    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <link rel="canonical" href="{kanonik_esc}">'
    )

    # 5) Root içine inject edilecek görünür içerik (React mount edince silinir)
    icerik_blok = (
        f'<article style="max-width:800px;margin:2rem auto;padding:1rem;'
        f'font-family:system-ui,-apple-system,sans-serif;color:#222;line-height:1.6">'
        f'<h1>{sehir_esc} Rehberi</h1>'
        f'<p style="color:#666;font-size:1.1rem">{aciklama_esc}</p>'
        f'<hr style="margin:2rem 0;border:0;border-top:1px solid #eee">'
        f'{p_html}'
        f'</article>'
    )

    # 6) <noscript> fallback (JS kapalı kullanıcı için)
    noscript_blok = (
        f'<noscript>{icerik_blok}'
        f'<p style="text-align:center;margin:1rem">'
        f'<a href="/rehberler">Tüm seyahat rehberleri →</a></p>'
        f'</noscript>'
    )

    # 7) Template'i oku
    try:
        template = _index_template()
    except OSError:
        log.exception("index.html template okunamadı")
        abort(500)

    # 7a) <html lang="en"> → <html lang="tr">
    html_out = template.replace('<html lang="en">', '<html lang="tr">', 1)

    # 7b) Title: regex ile değiştir, lambda kullan ki replacement string yorumlanmasın
    yeni_title = f"<title>{title_esc}</title>"
    html_out, title_degisim = re.subn(
        r"<title>.*?</title>", lambda _: yeni_title, html_out, count=1
    )
    if title_degisim == 0:
        log.warning("Title replace başarısız: %s", iata_norm)

    # 7c) </head> öncesi: meta blok
    html_out = html_out.replace("</head>", f"    {meta_blok}\n  </head>", 1)

    # 7d) <div id="root"></div> içine: görünür içerik
    html_out = html_out.replace(
        '<div id="root"></div>',
        f'<div id="root">{icerik_blok}</div>',
        1,
    )

    # 7e) </body> öncesi: noscript fallback
    html_out = html_out.replace("</body>", f"  {noscript_blok}\n</body>", 1)

    log.info("Rehber SSR: %s (%s)", iata_norm, sehir)

    return Response(
        html_out,
        mimetype="text/html; charset=utf-8",
        headers={
            "Cache-Control": "public, max-age=300, must-revalidate",
            "X-Content-Type-Options": "nosniff",
        },
    )
