import * as tf from "@tensorflow/tfjs";

export type ClassifierModel = {
  model: tf.LayersModel;
  labels: string[];
  imageSize: number;
};

export type Prediction = {
  className: string;
  probability: number;
};

type ModelMetadata = {
  labels?: string[];
  imageSize?: number;
};

function getModelBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_MODEL_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "/model";
}

function getModelUrls() {
  const base = getModelBaseUrl();
  return {
    base,
    modelUrl: `${base}/model.json`,
    metadataUrl: `${base}/metadata.json`,
  };
}

let modelPromise: Promise<ClassifierModel> | null = null;

async function fetchMetadata(): Promise<ModelMetadata> {
  const { metadataUrl } = getModelUrls();
  const response = await fetch(metadataUrl);

  if (!response.ok) {
    throw new Error(
      `Could not load ${metadataUrl}. Export TensorFlow.js from Teachable Machine, copy files to web/public/model/, then redeploy. See web/public/model/README.md`
    );
  }

  return response.json();
}

export function loadClassifierModel(): Promise<ClassifierModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { modelUrl } = getModelUrls();
      const metadata = await fetchMetadata();
      const model = await tf.loadLayersModel(modelUrl);
      const labels = metadata.labels ?? [];

      if (!labels.length) {
        throw new Error("Model metadata.json is missing labels.");
      }

      return {
        model,
        labels,
        imageSize: metadata.imageSize ?? 224,
      };
    })();
  }

  return modelPromise;
}

export async function predictFromVideo(
  classifier: ClassifierModel,
  video: HTMLVideoElement
): Promise<Prediction[]> {
  const { model, labels, imageSize } = classifier;

  const probabilities = tf.tidy(() => {
    const input = tf.browser
      .fromPixels(video)
      .resizeNearestNeighbor([imageSize, imageSize])
      .toFloat()
      .div(255)
      .expandDims(0);

    const output = model.predict(input);

    if (Array.isArray(output)) {
      throw new Error("Unexpected multi-output model.");
    }

    return output.dataSync();
  });

  return labels.map((className, index) => ({
    className,
    probability: probabilities[index] ?? 0,
  }));
}

export function getTopPrediction(predictions: Prediction[]): Prediction | null {
  if (!predictions.length) {
    return null;
  }

  return predictions.reduce((best, current) =>
    current.probability > best.probability ? current : best
  );
}
