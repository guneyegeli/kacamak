import firebase_admin
from firebase_admin import credentials, messaging
import os
from dotenv import load_dotenv

load_dotenv()

_app = None


def _firebase_init():
    global _app
    if _app:
        return
    cred_path = os.getenv("FIREBASE_CREDENTIALS", "firebase-credentials.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred)
        print("[Firebase] Basariyla baslatildi")
    else:
        print(f"[Firebase] Credentials dosyasi bulunamadi: {cred_path}")


def bildirim_gonder(fcm_token: str, baslik: str, mesaj: str, data: dict = {}) -> bool:
    _firebase_init()
    if not _app:
        print("[Firebase] Uygulama baslatilamadi, bildirim gonderilemedi")
        return False
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=baslik, body=mesaj),
            data={k: str(v) for k, v in data.items()},
            token=fcm_token,
            android=messaging.AndroidConfig(priority="high"),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1)
                )
            ),
        )
        response = messaging.send(message)
        print(f"[Firebase] Bildirim gonderildi: {response}")
        return True
    except messaging.UnregisteredError:
        print(f"[Firebase] Token gecersiz, cihaz kayit disi: {fcm_token[:20]}...")
        return False
    except Exception as e:
        print(f"[Firebase] Bildirim hatasi: {e}")
        return False


def toplu_bildirim_gonder(tokenlar: list, baslik: str, mesaj: str, data: dict = {}) -> dict:
    _firebase_init()
    if not _app:
        return {"basarili": 0, "basarisiz": len(tokenlar)}
    messages = [
        messaging.Message(
            notification=messaging.Notification(title=baslik, body=mesaj),
            data={k: str(v) for k, v in data.items()},
            token=token,
        )
        for token in tokenlar
    ]
    response = messaging.send_each(messages)
    return {
        "basarili": response.success_count,
        "basarisiz": response.failure_count,
    }
