import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../utils/firebase";

export async function logAiFeedback({
  companyId,
  imageId,
  detected,
  accepted,
  aiEnabled,
}: {
  companyId: string;
  imageId: string;
  detected: string[];
  accepted: string[];
  aiEnabled: boolean;
}) {
  try {
    await addDoc(collection(db, "ai_feedback"), {
      companyId,
      imageId,
      detected,
      accepted,
      aiEnabled,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn("AI feedback logging failed:", err);
  }
}
