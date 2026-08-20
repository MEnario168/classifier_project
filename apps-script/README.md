# Apps Script Setup Guide

Automates Firestore → Google Sheets sync for the Smart Sorter lab.

## Quick setup (5 steps)

### 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Rename it to **Smart Sorter Data**
4. Rename the first tab to **Smart Sorter Data** (must match `SHEET_NAME` in script)

### 2. Add the script

1. In the spreadsheet: **Extensions** → **Apps Script**
2. Delete any default code in `Code.gs`
3. Paste the full contents of [`firestore-to-sheets.gs`](firestore-to-sheets.gs)
4. Save (Ctrl+S)

### 3. Set Script Properties

1. Apps Script editor → **Project Settings** (gear icon)
2. Scroll to **Script Properties** → **Add script property**

| Property | Value |
|----------|-------|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_WEB_API_KEY` | Your Firebase Web API key |

### 4. Run one-time setup functions

In the Apps Script editor, select and run each function once:

1. **`setupSheet()`** — creates header row
2. **`syncFirestoreToSheet()`** — test manual sync (check Execution log)
3. **`setupTrigger()`** — schedules sync every 5 minutes

Grant permissions when prompted (Google account access to Sheets + external URL fetch).

### 5. Verify sync

1. Ensure Firestore has documents in `smart_sorter_logs` (use Kodular app or `scripts/test-firestore-post.ps1`)
2. Run `syncFirestoreToSheet()` manually
3. Check the sheet — rows should appear with: `document_id`, `classification`, `timestamp`, `confidence`, `user_id`

## Functions reference

| Function | Purpose | Run when |
|----------|---------|----------|
| `setupSheet()` | Create/clear headers | Once at start |
| `setupTrigger()` | Schedule 5-min sync | Once at start |
| `syncFirestoreToSheet()` | Fetch Firestore → write sheet | Auto every 5 min, or manual test |

## Troubleshooting

| Error | Fix |
|-------|-----|
| Missing Script Properties | Add `FIREBASE_PROJECT_ID` and `FIREBASE_WEB_API_KEY` |
| Firestore GET failed (403) | Check API key; confirm Firestore rules allow read |
| Empty sheet after sync | Confirm Firestore collection has documents |
| Trigger not running | Re-run `setupTrigger()`; check Triggers tab in Apps Script |

## Connect to Looker Studio

After sync works, follow [`../looker-studio/DASHBOARD-SPEC.md`](../looker-studio/DASHBOARD-SPEC.md) to build the dashboard.
