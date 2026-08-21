/**
 * Train a MobileNetV2 transfer-learning classifier for Smart Sorter
 * classes: Plastic, Paper, Background
 *
 * Exports a TensorFlow.js layers model compatible with web/lib/classifier.ts
 * (expects float RGB input already normalized to [-1, 1]).
 */
import * as tf from "@tensorflow/tfjs-node";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const LABELS = ["Plastic", "Paper", "Background"];
const IMAGE_SIZE = 224;
const BATCH_SIZE = 32;
const HEAD_EPOCHS = 10;
const FINETUNE_EPOCHS = 8;
const SEED = 42;
const BACKBONE_URL =
  process.env.BACKBONE_URL ||
  "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.50_224/model.json";

const DATA_DIR = process.env.DATA_DIR || "/tmp/smart-sorter-train/classified";
const OUT_DIR =
  process.env.OUT_DIR ||
  path.resolve(import.meta.dirname, "../../web/public/model");
const WORK_DIR = process.env.WORK_DIR || "/tmp/smart-sorter-train/tfjs-work";

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function listLabeledImages(dataDir) {
  const items = [];
  for (let labelIndex = 0; labelIndex < LABELS.length; labelIndex++) {
    const label = LABELS[labelIndex];
    const dir = path.join(dataDir, label);
    if (!fs.existsSync(dir)) {
      throw new Error(`Missing class folder: ${dir}`);
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => ({ filePath: path.join(dir, f), labelIndex, label }));
    if (files.length < 20) {
      throw new Error(`Need more images for ${label}: found ${files.length}`);
    }
    items.push(...files);
  }
  return items;
}

function oversampleByLabel(items) {
  const byLabel = LABELS.map(() => []);
  for (const item of items) {
    byLabel[item.labelIndex].push(item);
  }
  const target = Math.max(...byLabel.map((group) => group.length));
  const balanced = [];
  for (const group of byLabel) {
    const copy = [...group];
    while (copy.length < target) {
      copy.push(group[Math.floor(rand() * group.length)]);
    }
    balanced.push(...copy.slice(0, target));
  }
  return shuffleInPlace(balanced);
}

async function loadImageTensor(filePath, augment) {
  let pipeline = sharp(filePath).rotate().resize(IMAGE_SIZE, IMAGE_SIZE, {
    fit: "cover",
    position: "centre",
  });

  if (augment) {
    if (rand() < 0.5) {
      pipeline = pipeline.flop();
    }
    const brightness = 0.85 + rand() * 0.3;
    const saturation = 0.85 + rand() * 0.3;
    pipeline = pipeline.modulate({ brightness, saturation });
  }

  const { data, info } = await pipeline
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== IMAGE_SIZE || info.height !== IMAGE_SIZE || info.channels !== 3) {
    throw new Error(`Unexpected image shape for ${filePath}: ${JSON.stringify(info)}`);
  }

  // MobileNetV2 preprocess: [0,255] -> [-1,1]
  const float = Float32Array.from(data, (v) => v / 127.5 - 1);
  return tf.tensor3d(float, [IMAGE_SIZE, IMAGE_SIZE, 3]);
}

function makeDataset(items, { augment, batchSize }) {
  let index = 0;
  const shuffled = shuffleInPlace([...items]);

  return {
    size: shuffled.length,
    async nextBatch() {
      if (index >= shuffled.length) {
        return null;
      }
      const slice = shuffled.slice(index, index + batchSize);
      index += batchSize;

      const xs = [];
      const ys = [];
      for (const item of slice) {
        xs.push(await loadImageTensor(item.filePath, augment));
        ys.push(item.labelIndex);
      }

      const x = tf.stack(xs);
      const y = tf.oneHot(tf.tensor1d(ys, "int32"), LABELS.length);
      xs.forEach((t) => t.dispose());
      return { x, y };
    },
    reset() {
      index = 0;
      shuffleInPlace(shuffled);
    },
  };
}

async function createModel() {
  const mobilenet = await tf.loadLayersModel(BACKBONE_URL);

  // Truncate before the final softmax dense layer (keep global pooling features).
  const bottleneck = mobilenet.getLayer("global_average_pooling2d_1");
  const featureModel = tf.model({
    inputs: mobilenet.inputs,
    outputs: bottleneck.output,
    name: "mobilenet_features",
  });
  featureModel.trainable = false;

  const input = tf.input({ shape: [IMAGE_SIZE, IMAGE_SIZE, 3], name: "image" });
  const features = featureModel.apply(input);
  let x = tf.layers
    .dense({ units: 256, activation: "relu", name: "dense_head" })
    .apply(features);
  x = tf.layers.dropout({ rate: 0.3, name: "dropout_head" }).apply(x);
  const output = tf.layers
    .dense({ units: LABELS.length, activation: "softmax", name: "predictions" })
    .apply(x);

  const model = tf.model({ inputs: input, outputs: output });
  model.compile({
    optimizer: tf.train.adam(1e-3),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });
  return { model, featureModel };
}

function unfreezeTopBlocks(featureModel, blocksToTrain = 6) {
  // Unfreeze the last N conv blocks for light fine-tuning.
  const trainableNames = new Set();
  const convLayers = featureModel.layers.filter((layer) =>
    /^conv_/.test(layer.name)
  );
  for (const layer of convLayers.slice(-blocksToTrain)) {
    trainableNames.add(layer.name);
  }

  for (const layer of featureModel.layers) {
    layer.trainable = trainableNames.has(layer.name);
  }
  featureModel.trainable = true;
}

async function runEpoch(model, dataset, { train }) {
  dataset.reset();
  let totalLoss = 0;
  let totalAcc = 0;
  let batches = 0;
  let examples = 0;

  while (true) {
    const batch = await dataset.nextBatch();
    if (!batch) break;

    let result;
    if (train) {
      result = await model.trainOnBatch(batch.x, batch.y);
    } else {
      result = await model.evaluate(batch.x, batch.y, { batchSize: batch.x.shape[0] });
      result = await Promise.all(result.map((t) => t.data()));
      result = result.map((d) => d[0]);
    }

    const loss = Array.isArray(result) ? result[0] : result;
    const acc = Array.isArray(result) ? result[1] : 0;
    const n = batch.x.shape[0];
    totalLoss += loss * n;
    totalAcc += acc * n;
    examples += n;
    batches += 1;
    batch.x.dispose();
    batch.y.dispose();
  }

  return {
    loss: totalLoss / Math.max(examples, 1),
    accuracy: totalAcc / Math.max(examples, 1),
    batches,
    examples,
  };
}

async function evaluateConfusion(model, items) {
  const matrix = Array.from({ length: LABELS.length }, () =>
    Array.from({ length: LABELS.length }, () => 0)
  );
  let correct = 0;

  for (const item of items) {
    const image = await loadImageTensor(item.filePath, false);
    const input = image.expandDims(0);
    const pred = model.predict(input);
    const probs = await pred.data();
    let best = 0;
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > probs[best]) best = i;
    }
    matrix[item.labelIndex][best] += 1;
    if (best === item.labelIndex) correct += 1;
    image.dispose();
    input.dispose();
    pred.dispose();
  }

  return {
    accuracy: correct / items.length,
    matrix,
    correct,
    total: items.length,
  };
}

async function main() {
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const allItems = await listLabeledImages(DATA_DIR);
  shuffleInPlace(allItems);

  // Stratified-ish split on unique files first, then oversample train only.
  const byLabel = LABELS.map(() => []);
  for (const item of allItems) {
    byLabel[item.labelIndex].push(item);
  }
  const trainItemsRaw = [];
  const valItems = [];
  for (const group of byLabel) {
    shuffleInPlace(group);
    const split = Math.max(1, Math.floor(group.length * 0.85));
    trainItemsRaw.push(...group.slice(0, split));
    valItems.push(...group.slice(split));
  }
  const trainItems = oversampleByLabel(trainItemsRaw);
  shuffleInPlace(valItems);

  console.log(
    JSON.stringify(
      {
        totals: Object.fromEntries(
          LABELS.map((label) => [
            label,
            allItems.filter((i) => i.label === label).length,
          ])
        ),
        train: trainItems.length,
        val: valItems.length,
      },
      null,
      2
    )
  );

  const { model, featureModel } = await createModel();
  model.summary();

  const trainDs = makeDataset(trainItems, { augment: true, batchSize: BATCH_SIZE });
  const valDs = makeDataset(valItems, { augment: false, batchSize: BATCH_SIZE });

  let bestValAcc = -1;
  const bestPath = path.join(WORK_DIR, "best-model");

  async function trainPhase(phaseName, epochs) {
    for (let epoch = 1; epoch <= epochs; epoch++) {
      const trainMetrics = await runEpoch(model, trainDs, { train: true });
      const valMetrics = await runEpoch(model, valDs, { train: false });
      console.log(
        `${phaseName} ${epoch}/${epochs} train_loss=${trainMetrics.loss.toFixed(4)} train_acc=${trainMetrics.accuracy.toFixed(4)} val_loss=${valMetrics.loss.toFixed(4)} val_acc=${valMetrics.accuracy.toFixed(4)}`
      );

      if (valMetrics.accuracy >= bestValAcc) {
        bestValAcc = valMetrics.accuracy;
        await model.save(`file://${bestPath}`);
        console.log(`  saved best model (val_acc=${bestValAcc.toFixed(4)})`);
      }
    }
  }

  await trainPhase("head", HEAD_EPOCHS);

  unfreezeTopBlocks(featureModel, 8);
  model.compile({
    optimizer: tf.train.adam(1e-4),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });
  await trainPhase("finetune", FINETUNE_EPOCHS);

  const best = await tf.loadLayersModel(`file://${bestPath}/model.json`);
  const evalResult = await evaluateConfusion(best, valItems);
  console.log("validation accuracy:", evalResult.accuracy.toFixed(4));
  console.log("confusion matrix (rows=true, cols=pred):", LABELS.join(", "));
  for (let i = 0; i < LABELS.length; i++) {
    console.log(LABELS[i], evalResult.matrix[i].join("\t"));
  }

  // Export to web/public/model
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (file === ".gitkeep" || file === "README.md") continue;
    fs.rmSync(path.join(OUT_DIR, file), { force: true, recursive: true });
  }

  await best.save(`file://${OUT_DIR}`);
  const metadata = {
    labels: LABELS,
    imageSize: IMAGE_SIZE,
    tfjsVersion: tf.version.tfjs,
    trainedAt: new Date().toISOString(),
    preprocessing: {
      centerCrop: true,
      normalize: "pixel / 127.5 - 1",
      range: [-1, 1],
    },
    metrics: {
      validationAccuracy: evalResult.accuracy,
      validationCorrect: evalResult.correct,
      validationTotal: evalResult.total,
      confusionMatrix: evalResult.matrix,
    },
    dataset: {
      source: "TrashNet (plastic/paper/cardboard) + empty-scene background photos",
      labels: LABELS,
    },
    placeholder: false,
  };
  fs.writeFileSync(path.join(OUT_DIR, "metadata.json"), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(
    path.join(WORK_DIR, "metrics.json"),
    JSON.stringify(metadata.metrics, null, 2)
  );

  console.log(`Exported model to ${OUT_DIR}`);
  console.log(`Validation accuracy: ${(evalResult.accuracy * 100).toFixed(1)}%`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
