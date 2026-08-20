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

const MODEL_URL = "/model/model.json";
const METADATA_URL = "/model/metadata.json";
const DEFAULT_IMAGE_SIZE = 224;

let modelPromise: Promise<ClassifierModel> | null = null;

async function fetchMetadata(): Promise<ModelMetadata> {
  const response = await fetch(METADATA_URL);
  if (!response.ok) {
    throw new Error(
      `Could not load ${METADATA_URL}. Export TensorFlow.js from Teachable Machine and copy files to public/model/.`
    );
  }
  return response.json();
}

export function loadClassifierModel(): Promise<ClassifierModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const metadata = await fetchMetadata();
      const model = await tf.loadLayersModel(MODEL_URL);
      const labels = metadata.labels ?? [];

      if (!labels.length) {
        throw new Error("Model metadata.json is missing labels.");
      }

      return {
        model,
        labels,
        imageSize: metadata.imageSize ?? DEFAULT_IMAGE_SIZE,
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
