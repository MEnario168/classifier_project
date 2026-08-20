# Smart Sorter Web App

Mobile-friendly Next.js app for the Smart Sorter lab. Open it on your phone browser, use the camera to classify waste, and log results to Firestore.

The app loads a Teachable Machine **TensorFlow.js** export via `@tensorflow/tfjs` (no separate Teachable Machine npm package required).

## Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- Teachable Machine model exported as **TensorFlow.js**

## Local development

```bash
cd web
npm install
cp .env.local.example .env.local
# Edit .env.local with your Firebase web app config
npm run dev
```

Open http://localhost:3000 on your computer or phone (same Wi-Fi).

> Camera access on mobile requires HTTPS in production. For local phone testing, use your computer browser or deploy to Vercel first.

## Add your model

Export from Teachable Machine:
1. **Export Model** -> **TensorFlow.js** -> Download
2. Copy `model.json`, `metadata.json`, and weight file(s) into `public/model/`

## Deploy to Vercel via GitHub

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) -> **Add New Project**
3. Import your GitHub repository
4. Set **Root Directory** to `web`
5. Add environment variables from `.env.local.example`
6. Deploy

Your app will be available at a URL like `https://your-project.vercel.app`.

## Phone usage

1. Open the Vercel URL in Chrome or Safari
2. Allow camera access
3. Point at Plastic, Paper, or Background item
4. Tap **CLASSIFY**
5. Confirm new documents appear in Firestore `smart_sorter_logs`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |

## Architecture

```
Phone browser -> Next.js app -> Firestore
Firestore -> Apps Script -> Google Sheets -> Looker Studio
```

See the repo root README for the full lab pipeline.
