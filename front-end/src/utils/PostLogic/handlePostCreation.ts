import { useSelector } from "react-redux";
import { NavigateFunction } from "react-router-dom";
import {
  FireStoreGalloGoalDocType,
  FirestorePostPayload,
  PostInputType,
  PostWithID,
} from "../types";
import { auth, db, storage } from "../firebase";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  UploadTask,
  UploadTaskSnapshot,
} from "firebase/storage";
import {
  DocumentReference,
  Timestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { showMessage } from "../../Slices/snackbarSlice";
import { selectUser } from "../../Slices/userSlice";
import { resizeImage } from "../../images/resizeImages";
import { useAppDispatch } from "../store";
import { sendAchievementToGalloAxis } from "../helperFunctions/sendAchievementToGalloAxis";
import { updateGoalWithSubmission } from "../helperFunctions/updateGoalWithSubmission";
import { addPostsToIndexedDB } from "../database/indexedDBUtils";
import { addNewPost } from "../../Slices/postsSlice";
import { getOptimizedSizes } from "./getOptimizedSizes";
import { buildPostPayload } from "./buildPostPayload";
import { addPostToFirestore } from "./updateFirestore";
import { normalizePost } from "../normalizePost";
import { markGalloAccountAsSubmitted } from "../../thunks/galloGoalsThunk";
import { createManualAccountThunk } from "../../thunks/manulAccountsThunk";

// Helper to wrap a Firebase storage upload task into a Promise
function uploadTaskAsPromise(task: UploadTask): Promise<UploadTaskSnapshot> {
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      () => {
        /* progress handled externally */
      },
      (error) => reject(error),
      () => resolve(task.snapshot)
    );
  });
}

export const useHandlePostSubmission = () => {
  const dispatch = useAppDispatch();
  const userData = useSelector(selectUser);

  const handlePostSubmission = async (
    post: PostInputType,
    selectedFile: File,
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>,
    setUploadProgress: React.Dispatch<React.SetStateAction<number>>,
    setUploadStatusText: React.Dispatch<React.SetStateAction<string>>,
    apiKey?: string,
    selectedGalloGoal?: FireStoreGalloGoalDocType | null
  ): Promise<PostWithID> => {
    if (!userData) throw new Error("User not authenticated");
    const user = auth.currentUser;
    if (!user) throw new Error("Auth missing");

    setIsUploading(true);
    setUploadStatusText("📸 Optimizing image...");

    let newDocRef: DocumentReference | undefined;
    try {
      let totalBytes = 0;
      let totalTransferred = 0;

      const { original, resized } = await getOptimizedSizes(selectedFile);

      // ✅ Use one consistent timestamp for folder
      const dateString = new Date().toISOString().split("T")[0];
      const folderId = `${user.uid}-${Date.now()}`;

      // 🔄 ORIGINAL IMAGE
      const originalBlob = await resizeImage(
        selectedFile,
        original[0],
        original[1]
      );
      totalBytes += originalBlob.size;

      const originalRef = storageRef(
        storage,
        `images/${dateString}/${folderId}/original.jpg`
      );
      const origTask = uploadBytesResumable(originalRef, originalBlob);

      origTask.on("state_changed", (snap) => {
        totalTransferred = snap.bytesTransferred;
        setUploadProgress((totalTransferred / totalBytes) * 100);
      });
      await uploadTaskAsPromise(origTask);
      const originalUrl = await getDownloadURL(originalRef);

      // 🔄 RESIZED IMAGE
      const resizedBlob = await resizeImage(
        selectedFile,
        resized[0],
        resized[1]
      );
      totalBytes += resizedBlob.size;

      const resizedRef = storageRef(
        storage,
        `images/${dateString}/${folderId}/resized.jpg`
      );
      const resTask = uploadBytesResumable(resizedRef, resizedBlob);

      setUploadStatusText("☁️ Uploading images...");
      resTask.on("state_changed", (snap) => {
        totalTransferred = originalBlob.size + snap.bytesTransferred;
        setUploadProgress((totalTransferred / totalBytes) * 100);
      });
      const resSnapshot = await uploadTaskAsPromise(resTask);
      const resizedUrl = await getDownloadURL(resSnapshot.ref);

      // 📄 Prepare Firestore payload
      const payload: FirestorePostPayload = buildPostPayload({
        ...post,
        imageUrl: "", // placeholder
        postUser: post.postUser ?? userData,
      });

      newDocRef = await addPostToFirestore(db, payload);
      const postId = newDocRef.id;

      if (post.account?.typeOfAccount === "manual") {
        await dispatch(createManualAccountThunk(post.account));
      }

      if (post.companyGoalId || post.oppId) {
        setUploadStatusText("🎯 Updating related goal...");
        await updateGoalWithSubmission(post, postId);
      }

      await updateDoc(newDocRef, {
        imageUrl: resizedUrl,
        originalImageUrl: originalUrl,
        timestamp: Timestamp.now(),
      });

      const finalPost: PostWithID = normalizePost({
        ...payload,
        id: postId,
        imageUrl: resizedUrl,
        originalImageUrl: originalUrl,
      });

      dispatch(addNewPost(finalPost));
      await addPostsToIndexedDB([finalPost]);

      if (post.oppId && apiKey) {
        dispatch(showMessage("📤 Sending achievement to Gallo Axis..."));
        const achievementPayload = {
          oppId: post.oppId,
          galloGoalTitle: post.galloGoalTitle,
          closedBy: post.closedBy ?? user.displayName ?? "",
          closedDate: post.closedDate || new Date().toISOString().split("T")[0],
          closedUnits: post.totalCaseCount || "0",
          photos: [{ file: resizedUrl }],
        };

        await sendAchievementToGalloAxis(achievementPayload, apiKey, dispatch);

        if (selectedGalloGoal && post.account?.accountNumber) {
          await dispatch(
            markGalloAccountAsSubmitted({
              goal: selectedGalloGoal,
              accountNumber: post.account.accountNumber,
              postId: postId,
            })
          );
        }
      }

      dispatch(showMessage("🎉 Post added successfully!"));
      return finalPost;
    } catch (error) {
      dispatch(
        showMessage(
          `❌ Error: ${error instanceof Error ? error.message : error}`
        )
      );
      if (newDocRef) {
        try {
          await deleteDoc(newDocRef);
        } catch {
          dispatch(showMessage("⚠️ Partial cleanup failed. Please try again."));
        }
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return handlePostSubmission;
};
