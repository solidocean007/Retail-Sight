import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db, functions } from "../utils/firebase";
import { httpsCallable } from "firebase/functions";

// Define the structure if not already done
interface TokenData {
  sharedToken: string;
  tokenExpiry?: string;
}

export const extendPostTokenExpiryAndShare = async (postId: string, tokenData: TokenData) => {
  try {
    console.log(`Extending token expiry for post ${postId}...`);

    // Set expiry to 7 days from now
    const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiryTimestamp = Timestamp.fromDate(newExpiryDate);

    // Update the expiry in Firestore
    await updateDoc(doc(db, "posts", postId), {
      "token.tokenExpiry": expiryTimestamp,
    });

    console.log(`Token expiry extended to ${newExpiryDate.toISOString()}. Generating share token...`);

    // Call your backend function to refresh the share token
    const generatePostShareToken = httpsCallable(functions, "generatePostShareToken");
    const response = await generatePostShareToken({ postId, tokenData });

    console.log("Share token generated successfully:", response.data);

    return response.data;  // Return the result for further processing if needed
  } catch (error) {
    console.error("Failed to extend token expiry and generate share token:", error);
    throw error;  // Rethrow so the calling component can handle UI feedback
  }
};
