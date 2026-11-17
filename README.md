# KIR Attendance

Crew attendance & payroll for KIR CCTV & Services: kiosk time in/out with PIN + selfie, Sat–Fri weekly grid, manual attendance, activity logs, payroll CSV.

Static site (no build step) · Supabase (Postgres + Auth + Realtime) · deploy on Vercel.

## Setup (≈10 minutes)

### 1. Supabase
1. Create a project at https://supabase.com (region: Singapore).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user** → create one login per device/person. The app signs in with a **username** (no email typed): user `admin` = Supabase email `admin@kir.ph`, user `kiosk` = `kiosk@kir.ph`. Tick *Auto confirm* (nothing is ever emailed).
4. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up" so only accounts you create can log in.
5. **Project Settings → API** → copy the **Project URL** and **anon public** key.

### 2. Config
Edit `config.js` on GitHub and paste the two values:
```js
window.KIR_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi..."
};
```
(The anon key is meant to be public — data is protected by login + Row Level Security.)

### 3. Vercel
1. https://vercel.com/new → **Import** `jbsario/kir-attendance-web`.
2. Framework preset: **Other**. No build command. **Deploy**.
3. Your site: `https://kir-attendance-web.vercel.app` (rename in Project → Settings → Domains).

Every push to `main` redeploys automatically.

## Using it
- **Kiosk phone/tablet:** open the site, sign in once with username `kiosk`, *Add to Home Screen*. Stays signed in.
- **Admin PIN** (default `1234`) unlocks Week, Payroll, Logs, Settings. Change it in Settings.
- Demo mode (no database) is available on the connect screen for testing.

## Time in / out methods
Settings → **Time in / out method**:
- **PIN** — worker taps name → enters own 4-digit PIN → selfie (optional) → Time In/Out.
- **Supervised** — no PIN. An admin/foreman taps **Start session** on the Clock screen (admin PIN + supervisor name + length 2h/4h/8h/end of day). While it runs, workers tap their name → confirm → Time In/Out. Admin tabs lock during the session.
  - **Quick tap** toggle: one tap = instant time in/out (no selfie) with a 7-second **Undo**.
  - Every punch is stamped "supervised by …" (👁 on Today/Week, Source column in Payroll CSV, Logs). Session start/end and undos are logged.
  - Geofence rules still apply. Session ends automatically.
- Admin can always use **✍ Manual attendance**, the Week grid, or edit records.

## Snapshots
Settings → **Snapshot on time in/out: On** (default). Every time in and time out takes an automatic photo from the front camera — PIN, supervised and quick tap alike:
- Live camera preview opens on the punch screen; the photo is captured the instant **Time In / Time Out** is tapped.
- Quick tap mode shows a live camera strip on the Clock screen and snaps on every name tap.
- Each photo is stamped: name · TIME IN/OUT · date & time · job site/GPS · supervisor.
- Photos show on Today, Week grid (thumbnails), record details, and are kept with each record (~7–20 KB each). Camera off when not punching.
- If the camera is blocked/unavailable, the app falls back to the phone's photo picker.
- Needs HTTPS and camera permission (allow once on the kiosk phone).

## Geofencing (job sites)
Settings → **📍 Geofence**:
- **Add site here** while standing at the job site (or add at map center and tap the map to place it). Name it and set the radius (25–1000 m; 80–150 m suits a house/building site).
- **Mode:** *Off* · *Flag* (allow, but mark outside punches 🚩) · *Strict* (time in/out only inside a site — workers outside must get an admin manual entry).
- Every kiosk time in/out stores GPS lat/lng, accuracy, nearest site and distance. Flags show on Today, Week grid, records, Logs (filter **🚩 Outside geofence**) and in both CSV exports.
- Needs HTTPS (Vercel provides it) and location permission on the kiosk phone.

## Offline mode & sync
- Open the site once with internet; after that it opens with **no signal** (service worker caches the app, maps you've viewed, and the last 60–90 days of data).
- Offline, everything keeps working: kiosk time in/out with selfie + GPS, manual attendance, edits, deletes, worker changes, logs. Changes are saved on the phone (IndexedDB) in an **outbox**.
- When internet returns the outbox uploads automatically in order (on reconnect, every 20 s, and when the app is reopened). Header chip shows status: ☁️ Synced · 📴 Offline · N to sync · 🔄 Syncing · ⚠️ failed.
- Settings → **📶 Offline & sync**: pending list, last sync time, **Sync now**, **Save data for offline** (downloads last 60 days), retry/dismiss any rejected changes.
- Stays signed in offline. The first sign-in on a new device needs internet.
- If two phones edit the *same worker on the same day* while both offline, the last one to sync wins (both actions remain in Logs).

## Data
| table | contents |
|---|---|
| `employees` | workers: name, position, daily rate, PIN, active |
| `att` | one row per worker per day (`YYYY-MM-DD_<id>`): time in/out, selfies, source, note |
| `logs` | append-only audit trail of every punch, manual entry, edit, delete, worker & settings change |
| `config` | shift times, grace, lunch, OT multiplier, admin PIN |

Export anytime from Payroll / Logs (CSV) or Supabase → Table Editor.
