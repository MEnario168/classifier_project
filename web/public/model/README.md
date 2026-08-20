# Place your Teachable Machine TensorFlow.js export here.

After training in Teachable Machine:
1. Export Model -> TensorFlow.js -> Download
2. Copy these files into this folder:
   - model.json
   - metadata.json
   - weights.bin (or weight shard files)

Expected classes:
- Plastic
- Paper
- Background

The web app loads:
- /model/model.json
- /model/metadata.json
