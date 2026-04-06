# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kaçamak** — a travel deal discovery platform that scans flight prices from Turkish airports, detects deeply discounted fares (≥35% below historical average), generates AI-powered day-by-day itineraries via Claude API, and pushes personalized notifications to matched users via Firebase Cloud Messaging. The frontend is a React + Capacitor mobile app.

Uygulama tamamen ücretsiz, gelir modeli sadece affiliate komisyonlarından (Travelpayouts/Aviasales %50-70, Booking.com/Agoda %25-60, GetYourGuide %8-15). App Store ve Google Play'de yayınlanacak. Hedef pazar: Türk yolcular.

## Commands

### Backend (Flask API)
```bash
pip install -r requirements.txt        # Install Python deps
python app.py                          # Run API server (default port 5001)
python run_cron.py                     # Run flight scanner cron job manually
```

### Frontend (React + Vite + Capacitor)
```bash
cd frontend
npm install                            # Install JS deps (requires Node >=22)
npm run dev                            # Dev server with HMR
npm run build                          # Production build
npm run lint                           # ESLint
```

### Capacitor (iOS / Android)
```bash
cd frontend
npm run build && npx cap sync          # Build + sync web assets to native
npx cap open ios                       # Open in Xcode
npx cap open android                   # Open in Android Studio
npx cap run ios                        # Build & run on iOS simulator
npx cap run android                    # Build & run on Android emulator
```

### Database
SQLite at `data/kacamak.db`. Schema is in `schema.sql`. Initialize with:
```bash
sqlite3 data/kacamak.db < schema.sql
```

## Architecture

### Data Flow
1. `run_cron.py` → `agents/ucus_tarayici.py` scans 5 Turkish airports (IST, SAW, ADB, AYT, ESB) via Travelpayouts API
2. Prices are compared against 90-day historical averages in DB (falls back to Travelpayouts month-matrix API)
3. Deals below 65% of average price → saved to `firsatlar` table
4. `services/eslestirici.py` matches deals to users based on departure airport, budget, and minimum discount preferences
5. `agents/itinerary_uretici.py` generates day-by-day travel itinerary via Claude API (JSON mode)
6. `services/firebase_service.py` sends push notifications to matched users

### Backend Layers
- **`api/`** — Flask blueprints, all routes under `/api/`. Endpoints: `kayit` (register), `fcm-token`, `tercihler` (preferences CRUD), `firsatlar` (deals list/detail), `paketler` (user packages), `foto/{destinasyon}` (Unsplash photos), `aktiviteler/{destinasyon}` (GetYourGuide activities), `bildirim/test` (test push)
- **`agents/`** — Background processing: flight scanning, deal detection, itinerary generation (enhanced: per-activity emoji, restaurants, transport, costs). `firsat_dedektoru`, `paket_uretici`, `paket_yenileyici` are stub files
- **`services/`** — External integrations: `travelpayouts.py` (flight/hotel APIs), `claude_service.py` (Anthropic API wrapper), `firebase_service.py` (FCM push via firebase-admin), `eslestirici.py` (user-deal matching), `unsplash.py` (destination photos), `aktivite.py` (GetYourGuide tours + static fallback for 11 cities)

### Frontend
React 19 + React Router + Axios. Pages: `AnaSayfa` (home/deal list), `Tercihler` (preference wizard), `FirsatDetay` (deal detail with itinerary). Targets mobile via Capacitor (iOS + Android).

### Key Tables (schema.sql)
- `kullanicilar` — users with FCM tokens
- `tercihler` — per-airport travel preferences (budget, discount threshold, guest count, hotel stars, trip duration, travel style)
- `paket_tercihleri` — which package components user wants (flight, hotel, activities, etc.)
- `firsatlar` — discovered flight deals with pricing and discount info
- `paketler` — generated itineraries linked to deals and users
- `bildirimler` — notification dedup tracking
- `yenileme_kuyrugu` — package refresh queue

## Environment Variables (.env)

### Backend (.env)
`ANTHROPIC_API_KEY`, `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`, `FIREBASE_CREDENTIALS` (path to service account JSON), `FLASK_SECRET_KEY`, `DATABASE_PATH`, `FLASK_PORT`, `UNSPLASH_ACCESS_KEY`, `GETYOURGUIDE_PARTNER_ID`, `GETYOURGUIDE_API_KEY`

### Frontend (frontend/.env)
`VITE_API_URL`, `VITE_TRAVELPAYOUTS_MARKER`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`

## Conventions

- All code, variable names, table/column names, and API responses are in **Turkish**
- Direct `sqlite3` connections throughout (no ORM) — always close connections
- Claude API calls go through `services/claude_service.py:claude_sor()` which handles JSON parsing
- `flask-cors` is enabled globally
- All user-facing text, UI labels, push notifications, and itineraries must be in Turkish
- Affiliate links must open in external browser, not in-app webview (to avoid App Store commission)
- Never commit .env files or API keys

## Current Status

### Tamamlanan
- Backend API (Flask)
- Travelpayouts entegrasyonu
- Cron job (flight scanner)
- Claude API itinerary generation
- React frontend
- schema.sql
- Firebase push notification (backend firebase-admin + frontend Capacitor PushNotifications + web fallback)
- Capacitor iOS/Android proje yapısı + sync
- Affiliate link entegrasyonu (Aviasales)
- Unsplash destinasyon fotograf entegrasyonu (hero + card photos)
- Detayli itinerary (emoji, restoran, ulasim, harcama per aktivite)
- GetYourGuide aktivite/tur entegrasyonu (11 sehir statik + API fallback)
- Sunset Explorer tema (gece mavisi + turuncu + altin)

### Bekleyen
- Unsplash API key (unsplash.com/developers)
- GetYourGuide API key (partner.getyourguide.com)
- Firebase project olusturma + credentials dosyasi (console.firebase.google.com)
- Xcode'da signing & capabilities (Push Notifications)
- App Store / Google Play yayinlama
