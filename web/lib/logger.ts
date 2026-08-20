import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { getUserId } from "./user-id";

export async function logClassification(
  classification: string,
  confidence: number
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const db = getDb();
  await addDoc(collection(db, "smart_sorter_logs"), {
    classification,
    confidence,
    timestamp: serverTimestamp(),
    user_id: getUserId(),
  });
}
