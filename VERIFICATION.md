# End-to-End Verification Guide

Complete this checklist after implementing all four parts of the Smart Sorter lab.

## Pre-flight: repo validation

Run from the project root:

```powershell
.\scripts\validate-setup.ps1
```

Expected output: all checks pass.

## Phase 1 — Classification model

| Step | Action | Pass? |
|------|--------|-------|
| 1.1 | `web/public/model/metadata.json` lists Plastic, Paper, Background | ☐ |
| 1.2 | Metadata `placeholder` is `false` (or your own TM model Preview >95%) | ☐ |
| 1.3 | Model is TensorFlow.js (`model.json` + weights), not TFLite | ☐ |
| 1.4 | Live `/model/metadata.json` and `/model/model.json` return 200 on deploy | ☐ |

## Phase 2 — Firebase / Firestore

| Step | Action | Pass? |
|------|--------|-------|
| 2.1 | Firebase project created | ☐ |
| 2.2 | Firestore enabled in Test mode | ☐ |
| 2.3 | Security rules deployed from `firebase/firestore.rules` | ☐ |
| 2.4 | `web/.env.local` filled with Firebase web app config | ☐ |
| 2.5 | Smoke test passes: `.\scripts\test-firestore-post.ps1` | ☐ |
| 2.6 | Document visible in Firebase Console → Firestore → `smart_sorter_logs` | ☐ |

### Smoke test command

```powershell
cd C:\Users\Michael\Downloads\Act_2\smart-sorter
copy config.local.env.example config.local.env
# Edit config.local.env with your Firebase credentials
.\scripts\test-firestore-post.ps1
```

## Phase 3 — Web app (Vercel)

| Step | Action | Pass? |
|------|--------|-------|
| 3.1 | `cd web && npm install && npm run dev` works locally | ☐ |
| 3.2 | Camera preview and CLASSIFY work in browser | ☐ |
| 3.3 | Repo pushed to GitHub | ☐ |
| 3.4 | Vercel project imported with Root Directory = `web` | ☐ |
| 3.5 | `NEXT_PUBLIC_FIREBASE_*` env vars set on Vercel | ☐ |
| 3.6 | Vercel URL opens on phone; camera permission granted | ☐ |
| 3.7 | CLASSIFY shows Plastic/Paper/Background with confidence | ☐ |
| 3.8 | Status shows "Logged successfully" after classify | ☐ |
| 3.9 | New document in Firestore with all 4 fields | ☐ |

## Phase 4 — Sheets + Looker Studio

| Step | Action | Pass? |
|------|--------|-------|
| 4.1 | Google Sheet "Smart Sorter Data" created | ☐ |
| 4.2 | Apps Script pasted; Script Properties set | ☐ |
| 4.3 | `setupSheet()` and `setupTrigger()` run successfully | ☐ |
| 4.4 | `syncFirestoreToSheet()` populates sheet rows | ☐ |
| 4.5 | Looker Studio data source connected to sheet | ☐ |
| 4.6 | Time series, pie chart, and scorecard created | ☐ |
| 4.7 | Dashboard shows data after web app classification + sync | ☐ |
| 4.8 | Share link copied for submission | ☐ |

## Full pipeline test (recommended order)

1. **Train & export** TM model as TensorFlow.js → copy to `web/public/model/`
2. **Configure Firebase** → deploy rules → run smoke test
3. **Run web app locally** → classify 3+ items (one per class)
4. **Deploy to Vercel** → test on phone
5. **Verify Firestore** — 3+ documents in `smart_sorter_logs`
6. **Run Apps Script sync** — sheet has 3+ rows
7. **Open Looker Studio** — charts reflect the data
8. **Share dashboard link**

## Timing notes

- Firestore logging: **immediate** after web app classify
- Sheet sync: up to **5 minutes** (or run `syncFirestoreToSheet()` manually)
- Looker refresh: click **Refresh data** or wait ~15 min for cache

## Deliverables checklist

Submit these for the lab:

- [ ] Vercel web app URL (or screenshot of phone browser classifying an item)
- [ ] Firebase Console screenshot showing `smart_sorter_logs` documents
- [ ] Looker Studio shared dashboard link
- [ ] (Optional) Google Sheet link showing synced data
