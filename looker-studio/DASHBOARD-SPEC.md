# Looker Studio Dashboard Specification

Build a dashboard connected to the **Smart Sorter Data** Google Sheet (synced from Firestore via Apps Script).

## Prerequisites

- Google Sheet **"Smart Sorter Data"** with columns:
  - `document_id` (string)
  - `classification` (string)
  - `timestamp` (date/time)
  - `confidence` (number)
  - `user_id` (string)
- Apps Script trigger running (`setupTrigger()` every 5 minutes)
- At least a few test rows in the sheet (run Kodular app or smoke test)

## Step 1 — Create data source

1. Go to [Looker Studio](https://lookerstudio.google.com/)
2. **Create** → **Data Source**
3. Connector: **Google Sheets**
4. Select spreadsheet: **Smart Sorter Data**
5. Worksheet: **Smart Sorter Data** (same name as sheet tab)
6. Click **Connect**

## Step 2 — Configure field types

Confirm or set these field types in the data source editor:

| Field | Type | Aggregation (default) |
|-------|------|----------------------|
| `document_id` | Text | None |
| `classification` | Text | None |
| `timestamp` | **Date & Time** | None |
| `confidence` | **Number** | Average |
| `user_id` | Text | None |

> Important: `timestamp` must be **Date & Time**, not Text, for time-series charts.

Click **Create Report**.

## Step 3 — Visualizations

### Chart 1: Logging volume over time (Time series)

| Setting | Value |
|---------|-------|
| Chart type | Time series |
| Dimension | `timestamp` |
| Time dimension grouping | Day (or Hour for more detail) |
| Metric | Record Count |
| Title | Classification Log Volume |

**Purpose:** Track how many classifications are logged over time.

### Chart 2: Classification distribution (Pie chart)

| Setting | Value |
|---------|-------|
| Chart type | Pie chart |
| Dimension | `classification` |
| Metric | Record Count |
| Title | Waste Type Distribution |

**Purpose:** Show proportion of Plastic vs Paper vs Background.

### Chart 3: Average confidence (Scorecard)

| Setting | Value |
|---------|-------|
| Chart type | Scorecard |
| Metric | `confidence` (Aggregation: **Average**) |
| Title | Average Model Confidence |
| Number format | Percent or 2 decimal places |

**Purpose:** Display overall model confidence across all predictions.

## Step 4 — Optional enhancements

### Table: Recent classifications

| Setting | Value |
|---------|-------|
| Chart type | Table |
| Dimensions | `timestamp`, `classification`, `confidence`, `user_id` |
| Sort | `timestamp` descending |
| Rows | 10 |

### Filter control

Add a **Drop-down list** control on `classification` so viewers can filter by waste type.

### Date range control

Add a **Date range control** on `timestamp` for flexible time filtering.

## Step 5 — Layout suggestion

```
┌─────────────────────────────────────────────────────┐
│  Smart Sorter Dashboard          [Date Range ▼]     │
├──────────────────────────┬──────────────────────────┤
│  Scorecard: Avg Confidence│  Pie: Classification Mix │
├──────────────────────────┴──────────────────────────┤
│  Time Series: Log Volume Over Time                  │
├─────────────────────────────────────────────────────┤
│  Table: Recent Classifications                      │
└─────────────────────────────────────────────────────┘
```

## Step 6 — Share deliverable

1. Click **Share** (top right)
2. Set access: **Anyone with the link can view** (or restrict to instructor)
3. Copy link and submit as lab deliverable

## Refresh behavior

- Apps Script syncs Firestore → Sheet every **5 minutes**
- Looker Studio caches data; click **Refresh data** in the report or wait for auto-refresh (~15 min default)
- For demo: run `syncFirestoreToSheet()` manually in Apps Script, then refresh Looker

## Verification checklist

- [ ] Data source connects to Smart Sorter Data sheet
- [ ] `timestamp` field type is Date & Time
- [ ] Time series chart shows log volume
- [ ] Pie chart shows Plastic / Paper / Background split
- [ ] Scorecard shows average confidence (e.g. 0.85–0.99)
- [ ] Dashboard updates after new Kodular classifications sync
- [ ] Share link works for reviewer

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty charts | Run Apps Script sync manually; confirm Firestore has documents |
| Timestamp not grouping | Change field type to Date & Time in data source |
| Stale data | Refresh data in Looker; check Apps Script trigger is active |
| Wrong confidence format | Set aggregation to Average; format as number with 2 decimals |
