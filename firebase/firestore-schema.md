# Firestore Schema — smart_sorter_logs

## Collection

**Name:** `smart_sorter_logs`

Each document represents one successful classification from the Kodular app.

## Fields

| Field | Firestore type | REST API type | Example | Required |
|-------|----------------|---------------|---------|----------|
| `classification` | string | `stringValue` | `"Plastic"` | Yes |
| `confidence` | number | `doubleValue` | `0.98` | Yes |
| `timestamp` | timestamp | `timestampValue` | `"2026-08-20T05:55:00.000Z"` | Yes |
| `user_id` | string | `stringValue` | `"device-001"` | Yes |

## Classification values

Train the Teachable Machine model with these three classes:

- `Plastic`
- `Paper`
- `Background`

> Note: The lab scenario mentions "Metal" in the intro, but Part 1 uses **Background** as the third class. Use Plastic / Paper / Background consistently.

## REST API — Create document (POST)

**URL:**
```
https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/smart_sorter_logs?key={WEB_API_KEY}
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "fields": {
    "classification": { "stringValue": "Plastic" },
    "confidence": { "doubleValue": 0.98 },
    "timestamp": { "timestampValue": "2026-08-20T05:55:00.000Z" },
    "user_id": { "stringValue": "device-001" }
  }
}
```

## REST API — List documents (GET)

**URL:**
```
https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/smart_sorter_logs?key={WEB_API_KEY}
```

**Response shape (simplified):**
```json
{
  "documents": [
    {
      "name": "projects/.../databases/(default)/documents/smart_sorter_logs/abc123",
      "fields": {
        "classification": { "stringValue": "Plastic" },
        "confidence": { "doubleValue": 0.98 },
        "timestamp": { "timestampValue": "2026-08-20T05:55:00.000Z" },
        "user_id": { "stringValue": "device-001" }
      },
      "createTime": "2026-08-20T05:55:01.123456Z",
      "updateTime": "2026-08-20T05:55:01.123456Z"
    }
  ]
}
```

## Deploying security rules

1. Firebase Console → Firestore Database → **Rules** tab
2. Paste contents of [`firestore.rules`](firestore.rules)
3. Click **Publish**

Or via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

## Manual verification

1. Firebase Console → Firestore Database → **Data** tab
2. Confirm collection `smart_sorter_logs` exists
3. After a Kodular classification, a new document should appear with all four fields

See also: [`../kodular/sample-firestore-payload.json`](../kodular/sample-firestore-payload.json)
