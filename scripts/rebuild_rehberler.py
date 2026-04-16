"""
Tüm rehberleri Prompt 2.1 (Dedektif Gezgin Araştırdı) tonuyla yeniden üretir.

Kullanım:
  python3 scripts/rebuild_rehberler.py --dry-run   # Simülasyon
  python3 scripts/rebuild_rehberler.py              # Gerçek üretim

Güvenlik:
  - İşlem başında tam yedek alır (data/rehberler_prompt1_yedek_YYYY-MM-DD/)
  - Atomik yazma: .tmp → os.replace()
  - İlk 3 rehberde duraklar, onay bekler
  - Lock file ile cron çakışmasını önler
  - Başarısız üretimde eski dosyaya dokunmaz
"""

import os
import sys
import json
import time
import shutil
import logging
import argparse
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from agents.rehber_uretici import (
    rehber_uret, SEHIR_ADLARI, POPULER, TURKIYE_IATA, REHBER_DIR, kelime_say
)
import sqlite3

DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
LOCK_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "logs", ".rebuild_running.lock")
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")

# --- Yardımcılar ---

def yeni_tonda_mi(dosya_yolu):
    """Rehber zaten Prompt 2.1 tonunda mı kontrol et.
    Kesin imzalar kullanır — 'araştır' gibi genel kelimeler false positive verir.
    """
    try:
        with open(dosya_yolu, 'r', encoding='utf-8') as f:
            data = json.load(f)
        tanitim = data.get('tanitim', '').lower()
        # Kesin imzalar: sadece Prompt 2.1 çıktısında bulunabilecek ifadeler
        imzalar = ['dedektif gezgin', 'ekibimiz', 'ekibinin', 'incelediğimiz',
                   'tespit ettiğimiz', 'araştırmamız']
        return any(s in tanitim for s in imzalar)
    except Exception:
        return False


def basari_kontrolu(sonuc):
    """Üretilen rehberin tüm kalite kriterlerini kontrol et."""
    if not sonuc or not isinstance(sonuc, dict):
        return False, "None veya dict değil"
    if 'sehir' not in sonuc:
        return False, "'sehir' anahtarı eksik"
    try:
        json.dumps(sonuc, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        return False, f"JSON serileştirme hatası: {e}"
    tanitim = sonuc.get('tanitim', '')
    if not tanitim or len(tanitim) < 100:
        return False, f"tanitim çok kısa ({len(tanitim)} karakter)"
    tanitim_lower = tanitim.lower()
    imzalar = ['dedektif gezgin', 'ekibimiz', 'araştır', 'incelediğimiz']
    if not any(s in tanitim_lower for s in imzalar):
        return False, "Yeni ton imzası bulunamadı"
    return True, "OK"


def atomik_yaz(dosya_yolu, data):
    """Geçici dosyaya yaz, sonra atomik replace."""
    tmp_yol = dosya_yolu + '.tmp'
    with open(tmp_yol, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # Doğrulama: tmp dosyayı oku ve parse et
    with open(tmp_yol, 'r', encoding='utf-8') as f:
        json.load(f)
    os.replace(tmp_yol, dosya_yolu)


def kuyruk_olustur():
    """Önceliklendirilmiş şehir kuyruğu oluştur."""
    kuyruk = []
    eklenen = set()

    # Öncelik 1: Aktif fırsatlardaki yurtdışı şehirler
    try:
        conn = sqlite3.connect(DB)
        rows = conn.execute("""
            SELECT DISTINCT varis, varis_sehir, COUNT(*) as c FROM firsatlar
            WHERE aktif = 1 AND ucus_tarihi >= date('now')
            GROUP BY varis ORDER BY c DESC
        """).fetchall()
        conn.close()
        for varis, varis_sehir, _ in rows:
            if varis not in eklenen and varis not in TURKIYE_IATA:
                sehir = varis_sehir or SEHIR_ADLARI.get(varis, varis)
                kuyruk.append((varis, sehir))
                eklenen.add(varis)
    except Exception:
        pass

    # Öncelik 2: POPULER listesi
    for iata in POPULER:
        if iata not in eklenen and iata in SEHIR_ADLARI and iata not in TURKIYE_IATA:
            kuyruk.append((iata, SEHIR_ADLARI[iata]))
            eklenen.add(iata)

    # Öncelik 3: Geri kalan tüm şehirler
    for iata, sehir in SEHIR_ADLARI.items():
        if iata not in eklenen and iata not in TURKIYE_IATA:
            kuyruk.append((iata, sehir))
            eklenen.add(iata)

    return kuyruk


def lock_al():
    os.makedirs(os.path.dirname(LOCK_FILE), exist_ok=True)
    with open(LOCK_FILE, 'w') as f:
        f.write(f"PID={os.getpid()} started={datetime.now().isoformat()}")


def lock_sil():
    try:
        os.remove(LOCK_FILE)
    except FileNotFoundError:
        pass


# --- Ana İşlem ---

def main():
    parser = argparse.ArgumentParser(description="Rehberleri Prompt 2.1 ile yeniden üret")
    parser.add_argument('--dry-run', action='store_true', help='Simülasyon — API çağrısı yapmaz')
    args = parser.parse_args()
    dry_run = args.dry_run

    bugun = datetime.now().strftime('%Y-%m-%d')
    saat = datetime.now().strftime('%H-%M')
    yedek_klasor = os.path.join(os.path.dirname(REHBER_DIR), f"rehberler_prompt1_yedek_{bugun}")
    log_dosya = os.path.join(LOG_DIR, f"rehber_rebuild_{bugun}_{saat}.log")

    # Logging
    os.makedirs(LOG_DIR, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
            *([logging.FileHandler(log_dosya, encoding='utf-8')] if not dry_run else []),
        ],
    )
    log = logging.getLogger("rebuild")

    # Kuyruk
    kuyruk = kuyruk_olustur()
    if not kuyruk:
        log.error("Kuyruk boş — çıkılıyor")
        return

    # Mevcut rehberleri filtrele: zaten yeni tonda olanları ayır
    uretilecek = []
    atlanacak = []
    for iata, sehir in kuyruk:
        dosya = os.path.join(REHBER_DIR, f"{iata}.json")
        if os.path.exists(dosya) and yeni_tonda_mi(dosya):
            atlanacak.append((iata, sehir))
        else:
            uretilecek.append((iata, sehir))

    toplam = len(kuyruk)
    uretim_sayisi = len(uretilecek)
    atlanacak_sayisi = len(atlanacak)

    tahmini_sure = uretim_sayisi * 63 / 60  # ~60sn üretim + 3sn bekleme
    tahmini_maliyet = uretim_sayisi * 0.02  # ~$0.02/rehber (input+output)

    log.info("=" * 50)
    if dry_run:
        log.info("DRY-RUN MODU — API çağrısı yapılmayacak")
    log.info("=" * 50)
    log.info("Toplam kuyruk: %d şehir", toplam)
    log.info("Üretilecek: %d (eski ton veya dosya yok)", uretim_sayisi)
    log.info("Atlanacak: %d (zaten yeni tonda)", atlanacak_sayisi)
    log.info("Tahmini süre: %.1f dakika", tahmini_sure)
    log.info("Tahmini maliyet: $%.2f", tahmini_maliyet)
    log.info("Yedek klasör: %s", yedek_klasor)
    if not dry_run:
        log.info("Log dosyası: %s", log_dosya)
    log.info("=" * 50)

    if dry_run:
        log.info("")
        log.info("ÜRETİLECEKLER (sıralı):")
        for i, (iata, sehir) in enumerate(uretilecek, 1):
            mevcut = "mevcut" if os.path.exists(os.path.join(REHBER_DIR, f"{iata}.json")) else "YENİ"
            log.info("  %3d. %s (%s) [%s]", i, sehir, iata, mevcut)

        if atlanacak:
            log.info("")
            log.info("ATLANACAKLAR (zaten yeni tonda):")
            for iata, sehir in atlanacak:
                log.info("  - %s (%s)", sehir, iata)
        return

    # --- Gerçek üretim ---

    # Lock kontrolü
    if os.path.exists(LOCK_FILE):
        log.error("Lock dosyası mevcut: %s — başka bir rebuild çalışıyor olabilir", LOCK_FILE)
        log.error("Emin misiniz? Dosyayı silip tekrar deneyin.")
        return

    lock_al()
    try:
        # Yedekleme
        if os.path.exists(yedek_klasor):
            log.warning("Yedek klasör zaten var: %s — atlanıyor", yedek_klasor)
        else:
            log.info("Yedekleniyor: %s → %s", REHBER_DIR, yedek_klasor)
            shutil.copytree(REHBER_DIR, yedek_klasor)
            log.info("Yedekleme tamamlandı (%d dosya)", len(os.listdir(yedek_klasor)))

        # .gitignore'a yedek klasörünü ekle
        gitignore = os.path.join(os.path.dirname(REHBER_DIR), '..', '.gitignore')
        gitignore = os.path.normpath(gitignore)
        yedek_pattern = f"data/rehberler_prompt1_yedek_*"
        try:
            with open(gitignore, 'r') as f:
                icerik = f.read()
            if yedek_pattern not in icerik:
                with open(gitignore, 'a') as f:
                    f.write(f"\n{yedek_pattern}\n")
                log.info(".gitignore'a eklendi: %s", yedek_pattern)
        except Exception as e:
            log.warning(".gitignore güncellenemedi: %s", e)

        # Üretim döngüsü
        basarili = 0
        hatali = 0
        hatalar = []
        api_cagrisi = 0
        baslangic = time.time()
        sira = 0

        tam_kuyruk = []
        for iata, sehir in uretilecek:
            tam_kuyruk.append((iata, sehir, 'uret'))
        for iata, sehir in atlanacak:
            tam_kuyruk.append((iata, sehir, 'atla'))
        # Sırayı koru: uretilecek önce, atlanacak sonra (zaten öyle)

        for iata, sehir, aksiyon in tam_kuyruk:
            sira += 1

            if aksiyon == 'atla':
                log.info("[%d/%d] %s (%s) — ATLANDI (zaten yeni tonda)", sira, toplam, iata, sehir)
                continue

            t0 = time.time()
            try:
                yeni = rehber_uret(iata, sehir)
                api_cagrisi += 1
            except Exception as e:
                log.error("[%d/%d] %s (%s) — HATA: API exception: %s", sira, toplam, iata, sehir, e)
                hatali += 1
                hatalar.append((iata, sehir, f"API exception: {e}"))
                time.sleep(3)
                continue

            gecen = time.time() - t0
            gecerli, neden = basari_kontrolu(yeni)

            if gecerli:
                dosya = os.path.join(REHBER_DIR, f"{iata}.json")
                try:
                    atomik_yaz(dosya, yeni)
                    boyut = os.path.getsize(dosya) / 1024
                    basarili += 1
                    log.info("[%d/%d] %s (%s) — OK (%.1f KB, %.1f sn)",
                             sira, toplam, iata, sehir, boyut, gecen)
                except Exception as e:
                    hatali += 1
                    hatalar.append((iata, sehir, f"Yazma hatası: {e}"))
                    log.error("[%d/%d] %s (%s) — HATA: Yazma: %s, eski korundu",
                              sira, toplam, iata, sehir, e)
            else:
                hatali += 1
                hatalar.append((iata, sehir, neden))
                log.warning("[%d/%d] %s (%s) — HATA: %s, eski korundu",
                            sira, toplam, iata, sehir, neden)

            # İlk 3 kontrol noktası
            if basarili == 3 and basarili + hatali == api_cagrisi and api_cagrisi <= 5:
                log.info("")
                log.info("=" * 50)
                log.info("İLK 3 REHBER ÜRETİLDİ — KONTROL ET")
                log.info("=" * 50)

                kontrol_sayac = 0
                for k_iata, k_sehir, k_aksiyon in tam_kuyruk:
                    if k_aksiyon == 'atla':
                        continue
                    k_dosya = os.path.join(REHBER_DIR, f"{k_iata}.json")
                    if os.path.exists(k_dosya):
                        try:
                            with open(k_dosya, 'r', encoding='utf-8') as f:
                                k_data = json.load(f)
                            # Sadece başarıyla üretilmiş olanları göster
                            k_tanitim = k_data.get('tanitim', '')
                            if 'dedektif gezgin' in k_tanitim.lower() or 'ekibimiz' in k_tanitim.lower():
                                kontrol_sayac += 1
                                log.info("%d. %s (%s)", kontrol_sayac, k_sehir, k_iata)
                                log.info("   Tanıtım: %s...", k_tanitim[:200])
                                log.info("")
                                if kontrol_sayac >= 3:
                                    break
                        except Exception:
                            pass

                log.info("Devam etmek için ENTER, iptal için Ctrl+C.")
                log.info("=" * 50)
                try:
                    input()
                except (KeyboardInterrupt, EOFError):
                    log.info("İptal edildi.")
                    return

            # Her 10 rehberde özet
            uretim_sira = basarili + hatali
            if uretim_sira > 0 and uretim_sira % 10 == 0:
                gecen_toplam = (time.time() - baslangic) / 60
                ort_sure = gecen_toplam / uretim_sira if uretim_sira else 0
                kalan = (uretim_sayisi - uretim_sira) * ort_sure
                log.info("--- %d/%d tamamlandı | Başarılı: %d, Atlandı: %d, Hata: %d ---",
                         uretim_sira, uretim_sayisi, basarili, atlanacak_sayisi, hatali)
                log.info("--- Geçen süre: %.1f dk | Tahmini kalan: %.1f dk ---",
                         gecen_toplam, kalan)

            time.sleep(3)

        # --- Son Rapor ---
        toplam_sure = (time.time() - baslangic) / 60
        gercek_maliyet = api_cagrisi * 0.02

        log.info("")
        log.info("=" * 50)
        log.info("BATCH TAMAMLANDI")
        log.info("=" * 50)
        log.info("Toplam şehir: %d", toplam)
        log.info("Yeni ton ile üretildi: %d", basarili)
        log.info("Zaten yeni tonda (atlandı): %d", atlanacak_sayisi)
        log.info("Hata (eski korundu): %d", hatali)
        log.info("Toplam süre: %.1f dakika", toplam_sure)
        log.info("API çağrısı: %d", api_cagrisi)
        log.info("Tahmini maliyet: $%.2f", gercek_maliyet)
        log.info("")
        log.info("Yedek klasör: %s", yedek_klasor)
        log.info("Log dosyası: %s", log_dosya)

        if hatalar:
            log.info("")
            log.info("HATALI REHBERLER:")
            for h_iata, h_sehir, h_neden in hatalar:
                log.info("  - %s (%s): %s", h_sehir, h_iata, h_neden)

        log.info("=" * 50)

    finally:
        lock_sil()


if __name__ == "__main__":
    main()
