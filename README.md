# Smart Sorter — Real-time ML and BI Integration

Lab support repo for the **Smart Classifier** activity (MFGS). This project implements a waste-classification **web app** (phone-friendly) that logs predictions to Firestore and visualizes them in Looker Studio.

## Architecture

```
Phone Browser (Next.js on Vercel)
  Camera + TensorFlow.js TM model
        │ Firebase SDK
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
- [ ] Export → **TensorFlow.js** → Download
- [ ] Copy `model.json`, `metadata.json`, and weight file(s) into [`web/public/model/`](web/public/model/)

Optional datasets: TrashNet, Recyclable and Household Waste Classification (Kaggle/Roboflow).

### Part 2 — Firebase / Firestore

- [ ] Create project at [Firebase Console](https://console.firebase.google.com/)
- [ ] Enable Firestore → Test mode → note **Project ID** and Web app config
- [ ] Deploy rules from [`firebase/firestore.rules`](firebase/firestore.rules)
- [ ] Copy `web/.env.local.example` → `web/.env.local` and fill in Firebase values
- [ ] Run smoke test: `.\scripts\test-firestore-post.ps1` (optional)

See [`firebase/firestore-schema.md`](firebase/firestore-schema.md) for document structure.

### Part 3 — Web app (local + Vercel)

- [ ] Follow [`web/README.md`](web/README.md)
- [ ] `cd web && npm install && npm run dev`
- [ ] Test classification in browser (camera + CLASSIFY button)
- [ ] Push repo to GitHub and deploy on [Vercel](https://vercel.com) with **Root Directory** = `web`
- [ ] Add `NEXT_PUBLIC_FIREBASE_*` env vars in Vercel
- [ ] Open Vercel URL on phone → classify → verify Firestore logs

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
| `web/` | Next.js web app (camera, TM model, Firestore logging) |
| `firebase/` | Firestore rules and schema docs |
| `apps-script/` | Firestore → Google Sheets sync |
| `looker-studio/` | Dashboard specification |
| `scripts/` | REST API smoke tests and setup validation |

## Security note

The included Firestore rules allow **public read/write** — suitable for lab use only. For production, restrict writes to authenticated users. See comments in `firebase/firestore.rules`.

## Lab deliverables

1. Working web app URL (Vercel) that classifies and logs to Firestore from a phone browser
2. Firebase project with `smart_sorter_logs` collection populated
3. Shared Looker Studio dashboard link showing live (near-real-time) data
