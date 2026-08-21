"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { ClassifierModel } from "@/lib/classifier";
import type { Prediction } from "@/lib/types";

const LOW_CONFIDENCE = 0.55;

type AppStatus =
  | "initializing"
  | "ready"
  | "classifying"
  | "logging"
  | "logged"
  | "error";

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<ClassifierModel | null>(null);

  const [status, setStatus] = useState<AppStatus>("initializing");
  const [statusMessage, setStatusMessage] = useState("Starting camera and model...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [topClass, setTopClass] = useState<string>("-");
  const [topConfidence, setTopConfidence] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported in this browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          throw new Error("Video element is not available.");
        }

        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;

        await video.play();
        setCameraReady(true);
        setStatusMessage("Loading classification model...");

        const { loadClassifierModel } = await import("@/lib/classifier");
        const model = await loadClassifierModel();
        if (cancelled) {
          return;
        }

        modelRef.current = model;
        setStatus("ready");
        setStatusMessage("Ready - tap CLASSIFY");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to initialize the app.";
        setStatus("error");
        setErrorMessage(message);
        setStatusMessage(message);
      }
    }

    initialize();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleClassify = useCallback(async () => {
    const video = videoRef.current;
    const model = modelRef.current;

    if (!video || !model || status === "classifying" || status === "logging") {
      return;
    }

    setStatus("classifying");
    setStatusMessage("Classifying...");
    setErrorMessage(null);

    try {
      const { predictFromVideo, getTopPrediction } = await import("@/lib/classifier");
      const results = await predictFromVideo(model, video);
      const top = getTopPrediction(results);

      if (!top) {
        throw new Error("No prediction returned from the model.");
      }

      setPredictions(results);
      setTopClass(top.className);
      setTopConfidence(top.probability);

      if (top.probability < LOW_CONFIDENCE) {
        setStatus("ready");
        setStatusMessage(
          `Low confidence (${formatConfidence(top.probability)}) — move closer or improve lighting, then try again.`
        );
        return;
      }

      if (!isFirebaseConfigured()) {
        setStatus("ready");
        setStatusMessage("Classified locally. Add Firebase env vars to enable logging.");
        return;
      }

      setStatus("logging");
      setStatusMessage("Logging to Firestore...");
      const { logClassification } = await import("@/lib/logger");
      await logClassification(top.className, top.probability);
      setStatus("logged");
      setStatusMessage("Logged successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Classification or logging failed.";
      setStatus("error");
      setErrorMessage(message);
      setStatusMessage(message);
    }
  }, [status]);

  const isBusy = status === "classifying" || status === "logging";
  const canClassify = status === "ready" || status === "logged" || status === "error";

  return (
    <main className="app">
      <header className="header">
        <h1>Smart Sorter</h1>
        <p>Point your camera at Plastic, Paper, or Background</p>
      </header>

      <div className={`status${errorMessage ? " error" : ""}`}>{statusMessage}</div>

      <div className="videoWrap">
        <video ref={videoRef} className="video" autoPlay playsInline muted />
        {!cameraReady && (
          <div className="videoPlaceholder">Waiting for camera permission...</div>
        )}
      </div>

      <button
        type="button"
        className="classifyButton"
        onClick={handleClassify}
        disabled={!canClassify || isBusy || !cameraReady}
      >
        {isBusy ? "WORKING..." : "CLASSIFY"}
      </button>

      <section className="resultCard">
        <p className="resultLabel">Top result</p>
        <p className="resultValue">{topClass}</p>
        <p className="confidence">
          {topConfidence === null
            ? "Confidence: -"
            : `Confidence: ${formatConfidence(topConfidence)}`}
        </p>

        {predictions.length > 0 && (
          <div className="predictions">
            {predictions.map((prediction) => (
              <div className="predictionRow" key={prediction.className}>
                <span>{prediction.className}</span>
                <span>{formatConfidence(prediction.probability)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        {isFirebaseConfigured()
          ? "Predictions are logged to Firestore."
          : "Firebase not configured - classification works, logging disabled."}
      </footer>
    </main>
  );
}
