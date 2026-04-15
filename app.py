from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
if not app.secret_key:
    raise ValueError("FLASK_SECRET_KEY .env dosyasında tanımlı değil")
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "capacitor://localhost",
    "http://localhost",
"https://dedektifgezgin.com",
    "https://www.dedektifgezgin.com",
])

from api.kullanici import bp as kullanici_bp
from api.tercihler import bp as tercihler_bp
from api.firsatlar import bp as firsatlar_bp
from api.paketler import bp as paketler_bp
from api.bildirim import bp as bildirim_bp
from api.foto import bp as medya_bp
from api.otel import bp as otel_bp
from api.canli_fiyat import bp as canli_fiyat_bp
from api.rehberler import bp as rehberler_bp

app.register_blueprint(kullanici_bp)
app.register_blueprint(tercihler_bp)
app.register_blueprint(firsatlar_bp)
app.register_blueprint(paketler_bp)
app.register_blueprint(bildirim_bp)
app.register_blueprint(medya_bp)
app.register_blueprint(otel_bp)
app.register_blueprint(canli_fiyat_bp)
app.register_blueprint(rehberler_bp)

@app.route("/")
def index():
    return send_from_directory("frontend/dist", "index.html")

@app.route("/<path:path>")
def static_files(path):
    try:
        return send_from_directory("frontend/dist", path)
    except:
        return send_from_directory("frontend/dist", "index.html")

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
