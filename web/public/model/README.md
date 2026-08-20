# Teachable Machine model files (TensorFlow.js export)

## Required files in this folder

After training in [Teachable Machine](https://teachablemachine.withgoogle.com/):

1. **Export Model** -> **TensorFlow.js** -> **Download**
2. Copy these files here:

| File | Purpose |
|------|---------|
| `model.json` | Model architecture + weight references |
| `metadata.json` | Class labels (Plastic, Paper, Background) |
| `weights.bin` or `group1-shard*.bin` | Model weights |

## Deploy to Vercel

**Option A — Deploy script (recommended):**
```powershell
# From repo root, after copying model files here:
.\scripts\deploy-web.ps1
```

**Option B — Commit to GitHub:**
```powershell
git add web/public/model/
git commit -m "Add Teachable Machine TensorFlow.js model"
git push
```
Vercel will auto-redeploy from GitHub.

**Option C — Firebase Storage (large models):**
1. Upload all model files to a public Firebase Storage folder
2. Set Vercel env var: `NEXT_PUBLIC_MODEL_BASE_URL=https://storage.googleapis.com/YOUR_BUCKET/model`
3. Redeploy

## Verify deployment

Open these URLs in your browser (should return JSON, not 404):

- `/model/metadata.json`
- `/model/model.json`

Example: https://smart-sorter-rust.vercel.app/model/metadata.json

## Expected classes

- Plastic
- Paper
- Background
