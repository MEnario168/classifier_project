# End-to-End Verification Guide

Complete this checklist after implementing all four parts of the Smart Sorter lab.

## Pre-flight: repo validation

Run from the project root:

```powershell
.\scripts\validate-setup.ps1
```

Expected output: all checks pass.

## Phase 1 — Teachable Machine

| Step | Action | Pass? |
|------|--------|-------|
| 1.1 | 3 classes created (Plastic, Paper, Background) with 50+ samples each | ☐ |
| 1.2 | Model trained; Preview accuracy >95% | ☐ |
| 1.3 | Exported as TensorFlow Lite (Floating Point or Quantized) | ☐ |
| 1.4 | `model.tflite` and `labels.txt` copied to `assets/` | ☐ |
| 1.5 | Same files uploaded to Kodular Assets manager | ☐ |

## Phase 2 — Firebase / Firestore

| Step | Action | Pass? |
|------|--------|-------|
| 2.1 | Firebase project created | ☐ |
| 2.2 | Firestore enabled in Test mode | ☐ |
| 2.3 | Security rules deployed from `firebase/firestore.rules` | ☐ |
| 2.4 | `config.local.env` filled with Project ID and Web API Key | ☐ |
| 2.5 | Smoke test passes: `.\scripts\test-firestore-post.ps1` | ☐ |
| 2.6 | Document visible in Firebase Console → Firestore → `smart_sorter_logs` | ☐ |

### Smoke test command

```powershell
cd C:\Users\Michael\Downloads\Act_2\smart-sorter
copy config.local.env.example config.local.env
# Edit config.local.env with your Firebase credentials
.\scripts\test-firestore-post.ps1
```

## Phase 3 — Kodular app

| Step | Action | Pass? |
|------|--------|-------|
| 3.1 | All components added per `kodular/KODULAR-BLOCKS.md` | ☐ |
| 3.2 | TFLite extension installed and configured | ☐ |
| 3.3 | Firebase Project ID and API Key set in blocks | ☐ |
| 3.4 | APK built and installed on phone | ☐ |
| 3.5 | Camera permission granted | ☐ |
| 3.6 | CLASSIFY → shows Plastic/Paper/Background with confidence | ☐ |
| 3.7 | Status shows "Logged successfully" after classify | ☐ |
| 3.8 | New document in Firestore with all 4 fields | ☐ |

## Phase 4 — Sheets + Looker Studio

| Step | Action | Pass? |
|------|--------|-------|
| 4.1 | Google Sheet "Smart Sorter Data" created | ☐ |
| 4.2 | Apps Script pasted; Script Properties set | ☐ |
| 4.3 | `setupSheet()` and `setupTrigger()` run successfully | ☐ |
| 4.4 | `syncFirestoreToSheet()` populates sheet rows | ☐ |
| 4.5 | Looker Studio data source connected to sheet | ☐ |
| 4.6 | Time series, pie chart, and scorecard created | ☐ |
| 4.7 | Dashboard shows data after Kodular classification + sync | ☐ |
| 4.8 | Share link copied for submission | ☐ |

## Full pipeline test (recommended order)

1. **Train & export** TM model → upload to Kodular
2. **Configure Firebase** → deploy rules → run smoke test
3. **Build Kodular app** → install APK → classify 3+ items (one per class)
4. **Verify Firestore** — 3+ documents in `smart_sorter_logs`
5. **Run Apps Script sync** — sheet has 3+ rows
6. **Open Looker Studio** — charts reflect the data
7. **Share dashboard link**

## Timing notes

- Firestore logging: **immediate** after Kodular classify
- Sheet sync: up to **5 minutes** (or run `syncFirestoreToSheet()` manually)
- Looker refresh: click **Refresh data** or wait ~15 min for cache

## Deliverables checklist

Submit these for the lab:

- [ ] Kodular APK (or screenshot of app classifying an item)
- [ ] Firebase Console screenshot showing `smart_sorter_logs` documents
- [ ] Looker Studio shared dashboard link
- [ ] (Optional) Google Sheet link showing synced data
