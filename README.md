# Smart Sorter — Real-time ML and BI Integration

Lab support repo for the **Smart Classifier** activity (MFGS). This project implements a waste-classification mobile app that logs predictions to Firestore and visualizes them in Looker Studio.

## Architecture

```
Kodular App (Camera + TFLite)
        │ POST (Firestore REST)
        ▼
   Firestore (smart_sorter_logs)
        │ Apps Script sync (every 5 min)
        ▼
   Google Sheets (Smart Sorter Data)
        │ Looker Studio connector
        ▼
   Dashboard (charts + scorecards)
```

## Quick start checklist

### Part 1 — Teachable Machine model

- [ ] Open [Teachable Machine](https://teachablemachine.withgoogle.com/) → Image Project → Standard Image Model
- [ ] Create 3 classes with **50+ samples each**:
  - `Plastic` — bottle, cup, lid
  - `Paper` — crumpled paper, newspaper, cardboard
  - `Background` — desk, wall, non-target surface
- [ ] Train model → Preview until **>95%** accuracy
- [ ] Export → **TensorFlow Lite** → Floating Point (or Quantized)
- [ ] Copy `model.tflite` and `labels.txt` into `assets/` and Kodular Assets manager

Optional datasets: TrashNet, Recyclable and Household Waste Classification (Kaggle/Roboflow).

### Part 2 — Firebase / Firestore

- [ ] Create project at [Firebase Console](https://console.firebase.google.com/)
- [ ] Enable Firestore → Test mode → note **Project ID** and **Web API Key**
- [ ] Deploy rules from [`firebase/firestore.rules`](firebase/firestore.rules)
- [ ] Copy `config.local.env.example` → `config.local.env` and fill in credentials
- [ ] Run smoke test: `.\scripts\test-firestore-post.ps1` (optional)

See [`firebase/firestore-schema.md`](firebase/firestore-schema.md) for document structure.

### Part 3 — Kodular mobile app

- [ ] Follow step-by-step guide: [`kodular/KODULAR-BLOCKS.md`](kodular/KODULAR-BLOCKS.md)
- [ ] Upload TFLite extension, `model.tflite`, and `labels.txt`
- [ ] Build APK → install on phone → test classification + logging
- [ ] Verify documents appear in Firebase Console → Firestore → `smart_sorter_logs`

### Part 4 — Looker Studio dashboard

- [ ] Create Google Sheet **"Smart Sorter Data"** with headers: `classification`, `timestamp`, `confidence`, `user_id`
- [ ] Paste [`apps-script/firestore-to-sheets.gs`](apps-script/firestore-to-sheets.gs) into Apps Script
- [ ] Set Script Properties: `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`
- [ ] Run `setupTrigger()` once → sync runs every 5 minutes
- [ ] Build dashboard per [`looker-studio/DASHBOARD-SPEC.md`](looker-studio/DASHBOARD-SPEC.md)
- [ ] Share Looker Studio link as deliverable

## Project structure

| Path | Purpose |
|------|---------|
| `firebase/` | Firestore rules and schema docs |
| `kodular/` | Kodular build guide + sample payloads |
| `apps-script/` | Firestore → Google Sheets sync |
| `looker-studio/` | Dashboard specification |
| `assets/` | Place `model.tflite` and `labels.txt` here after TM export |
| `scripts/` | Optional REST API smoke tests |

## Security note

The included Firestore rules allow **public read/write** — suitable for lab use only. For production, restrict writes to authenticated users. See comments in `firebase/firestore.rules`.

## Lab deliverables

1. Working Kodular APK that classifies and logs to Firestore
2. Firebase project with `smart_sorter_logs` collection populated
3. Shared Looker Studio dashboard link showing live (near-real-time) data
