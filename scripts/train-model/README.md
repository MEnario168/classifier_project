# Train Smart Sorter model

Trains a MobileNet transfer-learning classifier (Plastic / Paper / Background)
and exports TensorFlow.js files into `web/public/model/`.

## Prerequisites

- Node.js 20+
- Dataset folders:

```
/tmp/smart-sorter-train/classified/
  Plastic/
  Paper/
  Background/
```

Default data prep (TrashNet + background scenes) is documented in the root README.

## Run

```bash
cd scripts/train-model
npm install
npm run train
```

Optional env vars:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATA_DIR` | `/tmp/smart-sorter-train/classified` | Labeled image folders |
| `OUT_DIR` | `../../web/public/model` | TFJS export destination |
| `BACKBONE_URL` | MobileNet v1 0.50 TFJS URL | Feature extractor |

After training, commit the updated `web/public/model/*` files (or host them via
`NEXT_PUBLIC_MODEL_BASE_URL`) and redeploy.
