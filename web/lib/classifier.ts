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
  placeholder?: boolean;
  preprocessing?: {
    normalize?: string;
    range?: number[];
  };
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

/**
 * Teachable Machine / MobileNet-style capture:
 * center-crop to square, resize, normalize to [-1, 1].
 */
function captureFrame(
  video: HTMLVideoElement,
  imageSize: number
): tf.Tensor4D {
  return tf.tidy(() => {
    const pixels = tf.browser.fromPixels(video);
    const [height, width] = pixels.shape.slice(0, 2);
    const cropSize = Math.min(height, width);
    const beginHeight = Math.floor((height - cropSize) / 2);
    const beginWidth = Math.floor((width - cropSize) / 2);

    const cropped = pixels.slice(
      [beginHeight, beginWidth, 0],
      [cropSize, cropSize, 3]
    );

    const resized = tf.image.resizeBilinear(cropped, [imageSize, imageSize], true);
    // Match Teachable Machine / MobileNet: (pixel / 127.5) - 1
    return resized.toFloat().div(127.5).sub(1).expandDims(0) as tf.Tensor4D;
  });
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

      if (metadata.placeholder) {
        console.warn(
          "Loaded placeholder model — predictions will be inaccurate until a trained model is deployed."
        );
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
    const input = captureFrame(video, imageSize);
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
