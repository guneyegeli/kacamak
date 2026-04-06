from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret")
CORS(app)

from api.kullanici import bp as kullanici_bp
from api.tercihler import bp as tercihler_bp
from api.firsatlar import bp as firsatlar_bp
from api.paketler import bp as paketler_bp
from api.bildirim import bp as bildirim_bp
from api.foto import bp as medya_bp

app.register_blueprint(kullanici_bp)
app.register_blueprint(tercihler_bp)
app.register_blueprint(firsatlar_bp)
app.register_blueprint(paketler_bp)
app.register_blueprint(bildirim_bp)
app.register_blueprint(medya_bp)

@app.route("/")
def index():
    return {"servis": "Kaçamak API", "durum": "aktif"}

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
