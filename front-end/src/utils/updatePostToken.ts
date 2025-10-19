import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { TokenData } from "./types";

interface UpdatePostTokenProps {
  postId: string;
  token: TokenData;
}

// Your updated function using modular Firebase SDK syntax
export const updatePostToken = async ({
  postId,
  token,
}: UpdatePostTokenProps) => {
  try {
    // Reference to the document in the 'posts' collection
    const postRef = doc(db, "posts", postId);

    // Update the document
    await updateDoc(postRef, {
      "token.sharedToken": token.sharedToken,
      "token.tokenExpiry": token.tokenExpiry,
    });

    console.log("Post token updated successfully");
  } catch (error) {
    console.error("Error updating post token:", error);
    throw error; // Optionally re-throw the error
  }
};
