# Kodular Build Guide — Smart Sorter App

Step-by-step instructions for building the Smart Sorter mobile app in [Kodular Creator](https://creator.kodular.io/).

## Overview

The app:
1. Captures a photo via the device camera
2. Classifies the image using a Teachable Machine TFLite model
3. Displays the top class and confidence score
4. Logs the result to Firestore via REST API

---

## Step 1 — Create project and add components

Open Kodular Creator → **Create New Project** → name it `SmartSorter`.

Add these components to **Screen1**:

| Palette | Component | Rename to | Notes |
|---------|-----------|-----------|-------|
| Layout | Vertical Arrangement | `MainLayout` | Full-screen container |
| User Interface | Label | `StatusLabel` | Text: "Ready" |
| User Interface | Button | `ClassifyButton` | Text: "CLASSIFY" |
| User Interface | Label | `ResultLabel` | Text: "—" |
| Media | Camera | `Camera1` | — |
| Sensors | Clock | `Clock1` | For timestamp |
| Connectivity | Web | `Web1` | Firestore REST calls |
| Storage | TinyDB | `TinyDB1` | Persistent user ID |
| User Interface | Notifier | `Notifier1` | Error messages |

### TFLite extension

The lab requires a TensorFlow Lite extension compatible with Teachable Machine exports.

**Recommended extensions** (search Kodular community / extension marketplace):

1. **PersonalImageClassifier** — widely used with TM exports
2. **TFLite Model** — generic classifier extension

**To install:**
1. Download the `.aix` extension file
2. Kodular → **Projects** → **Import Extension**
3. Upload the `.aix` file
4. The extension component appears in the palette — drag it onto Screen1
5. Rename to `Classifier1`

---

## Step 2 — Upload assets

### Model files (from Teachable Machine export)

1. Kodular → **Projects** → **Assets**
2. Upload:
   - `model.tflite`
   - `labels.txt`

Sample labels format (see [`sample-labels.txt`](sample-labels.txt)):
```
Plastic
Paper
Background
```

### Configure extension properties

Select `Classifier1` in the Designer and set:

| Property | Value |
|----------|-------|
| Model | `model.tflite` |
| Labels | `labels.txt` |

> Property names vary by extension. Common names: `ModelPath`/`LabelsPath`, `Model`/`Labels`, or `ModelAsset`/`LabelsAsset`. Match your extension's Designer properties.

---

## Step 3 — Configure Screen1 layout

In the Designer, arrange components inside `MainLayout`:

```
┌─────────────────────────┐
│  StatusLabel            │  "Ready"
│  [ CLASSIFY ]           │  ClassifyButton
│  ResultLabel            │  "Plastic (0.98)"
└─────────────────────────┘
```

Set `MainLayout` Width/Height to **Fill parent**.

---

## Step 4 — Set Firebase constants

Create two **global variables** in the Blocks editor:

| Variable | Value |
|----------|-------|
| `FirebaseProjectId` | Your Firebase project ID (e.g. `smart-sorter-lab`) |
| `FirebaseApiKey` | Your Firebase Web API key |

> Find these in Firebase Console → Project Settings → General.

Alternatively, hardcode them directly in the Web URL block (less flexible but simpler for lab).

---

## Step 5 — Block logic

Switch to the **Blocks** editor. Build the following logic.

### 5.1 Initialize user ID (Screen1.Initialize)

```
when Screen1.Initialize
  if TinyDB1.GetTag("user_id") = ""
    set TinyDB1.StoreValue tag "user_id" value (join "device-" (pick random 1000 to 9999))
  end if
  set StatusLabel.Text to "Ready — tap CLASSIFY"
```

### 5.2 Classify button click

```
when ClassifyButton.Click
  set StatusLabel.Text to "Capturing..."
  call Camera1.TakePicture
```

### 5.3 After picture taken → classify

Extension event names vary. Common patterns:

**Pattern A — PersonalImageClassifier:**
```
when Camera1.AfterPicture image
  set StatusLabel.Text to "Classifying..."
  call Classifier1.ClassifyImage image
```

**Pattern B — Generic TFLite:**
```
when Camera1.AfterPicture image
  set StatusLabel.Text to "Classifying..."
  call Classifier1.Classify image path image
```

### 5.4 Handle classification result

Extension return format varies. Typical events:

**Pattern A — returns label + confidence directly:**
```
when Classifier1.GotClassification label confidence
  set global topClass to label
  set global topConfidence to confidence
  set ResultLabel.Text to (join label " (" confidence ")")
  set StatusLabel.Text to "Logging..."
  call logToFirestore with label confidence
```

**Pattern B — returns a list:**
```
when Classifier1.ClassificationComplete results
  set global topClass to (select list item 1 from results)
  set global topConfidence to (select list item 2 from results)
  set ResultLabel.Text to (join topClass " (" topConfidence ")")
  set StatusLabel.Text to "Logging..."
  call logToFirestore with topClass topConfidence
```

### 5.5 Procedure: logToFirestore

Create a procedure with inputs `classification` (text) and `confidence` (number):

```
to logToFirestore classification confidence
  set global isoTimestamp to (call Clock1.FormatDateTime
    pattern "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    instant Clock1.Now
    timezone "UTC")

  set global userId to TinyDB1.GetTag "user_id"

  set global firestoreUrl to (join
    "https://firestore.googleapis.com/v1/projects/"
    FirebaseProjectId
    "/databases/(default)/documents/smart_sorter_logs?key="
    FirebaseApiKey)

  set global jsonBody to (call buildFirestoreJson
    classification confidence isoTimestamp userId)

  set Web1.Url to firestoreUrl
  set Web1.RequestHeaders to (make a list
    (make a pair key "Content-Type" value "application/json"))
  call Web1.PostText with jsonBody
end procedure
```

### 5.6 Procedure: buildFirestoreJson

Create a procedure with inputs: `classification`, `confidence`, `timestamp`, `userId`.

Build the nested dictionary structure required by Firestore REST API:

```
to buildFirestoreJson classification confidence timestamp userId
  set fieldsDict to (make a dictionary)

  set fieldsDict[classification entry] to (make a dictionary
    (make a pair key "stringValue" value classification))

  set fieldsDict[confidence entry] to (make a dictionary
    (make a pair key "doubleValue" value confidence))

  set fieldsDict[timestamp entry] to (make a dictionary
    (make a pair key "timestampValue" value timestamp))

  set fieldsDict[user_id entry] to (make a dictionary
    (make a pair key "stringValue" value userId))

  set rootDict to (make a dictionary
    (make a pair key "fields" value fieldsDict))

  return (call rootDict.JsonText)
end procedure
```

> **Tip:** If Kodular's dictionary blocks are cumbersome, build the JSON string manually:
> ```
> join "{" fields ":{" classification ":{" stringValue ":" classification "},"
>      confidence ":{" doubleValue ":" confidence "},"
>      timestamp ":{" timestampValue ":" timestamp "},"
>      user_id ":{" stringValue ":" userId "}}}"
> ```
> See [`sample-firestore-payload.json`](sample-firestore-payload.json) for the exact format.

### 5.7 Handle Web response

```
when Web1.GotText response
  if (contains response "name") and (contains response "smart_sorter_logs")
    set StatusLabel.Text to "Logged successfully ✓"
    call Notifier1.ShowAlert notice "Classification logged to Firestore"
  else
    set StatusLabel.Text to "Log failed — check API key"
    call Notifier1.ShowAlert notice (join "Error: " response)
  end if
```

---

## Step 6 — Permissions

Kodular automatically requests camera permission when `Camera1.TakePicture` is called. On first run, the user must grant camera access.

For Android 6+, ensure the app has **Camera** permission in the manifest (Kodular handles this automatically for the Camera component).

---

## Step 7 — Build and install

1. Kodular → **Build** → **Android App (APK)**
2. Wait for build to complete
3. Download APK → transfer to phone → install
4. Open app → grant camera permission → tap **CLASSIFY**

---

## Step 8 — Verify Firestore logging

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project → **Firestore Database** → **Data**
3. Open collection `smart_sorter_logs`
4. Confirm new documents appear after each classification with fields:
   - `classification` (string)
   - `confidence` (number)
   - `timestamp` (timestamp)
   - `user_id` (string)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension not found | Search Kodular community for "TFLite" or "Teachable Machine" extensions |
| Model fails to load | Confirm `model.tflite` and `labels.txt` are in Assets; check extension property names |
| Wrong classification | Retrain TM model with more samples; ensure good lighting |
| Firestore POST fails (403) | Check Web API key; confirm Firestore rules allow public write |
| Firestore POST fails (400) | Verify JSON format matches [`sample-firestore-payload.json`](sample-firestore-payload.json) |
| Timestamp rejected | Use ISO 8601 UTC format: `2026-08-20T05:55:00.000Z` |
| Camera black screen | Grant camera permission in phone Settings → Apps |

---

## Extension fallback notes

If your primary TFLite extension is unavailable:

1. **MIT App Inventor PersonalImageClassifier** — `.aix` files are often compatible with Kodular
2. **Custom extension** — some community members share TM-compatible extensions on Kodular forums
3. Test early — extension APIs differ; adjust event/block names to match your chosen extension

---

## Reference files

- [`sample-labels.txt`](sample-labels.txt) — expected labels after TM export
- [`sample-firestore-payload.json`](sample-firestore-payload.json) — REST POST body format
- [`../firebase/firestore-schema.md`](../firebase/firestore-schema.md) — full schema docs
- [`../scripts/test-firestore-post.ps1`](../scripts/test-firestore-post.ps1) — test Firestore without the app
