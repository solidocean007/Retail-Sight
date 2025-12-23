import { useSelector } from "react-redux";
import {
  FireStoreGalloGoalDocType,
  FirestorePostPayload,
  PostInputType,
  PostWithID,
} from "../types";
import { auth, db, storage } from "../firebase";
import {
  deleteObject,
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
import { useAppDispatch } from "../store";
import { updateGoalWithSubmission } from "../helperFunctions/updateGoalWithSubmission";
import { addPostsToIndexedDB } from "../database/indexedDBUtils";
import { addNewPost } from "../../Slices/postsSlice";
import { buildPostPayload } from "./buildPostPayload";
import { addPostToFirestore } from "./updateFirestore";
import { normalizePost } from "../normalize";
import { markGalloAccountAsSubmitted } from "../../thunks/galloGoalsThunk";
import { createManualAccountThunk } from "../../thunks/manulAccountsThunk";
import { logAiFeedback } from "../../hooks/logAiFeedback";
import { persistCustomProductData } from "./persistCustomProductData";
import { getFunctions, httpsCallable } from "firebase/functions";

function uploadTaskAsPromise(task: UploadTask): Promise<UploadTaskSnapshot> {
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      () => {},
      reject,
      () => resolve(task.snapshot)
    );
  });
}

export const useHandlePostSubmission = () => {
  const dispatch = useAppDispatch();
  const functions = getFunctions(undefined, "us-central1");
  const userData = useSelector(selectUser);
  const sendCF = httpsCallable(functions, "galloSendAchievement");

  const handlePostSubmission = async (
    post: PostInputType,
    selectedFile: File,
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>,
    setUploadProgress: React.Dispatch<React.SetStateAction<number>>,
    setUploadStatusText: React.Dispatch<React.SetStateAction<string>>,
    selectedGalloGoal?: FireStoreGalloGoalDocType | null
  ): Promise<PostWithID> => {
    if (!userData) throw new Error("User not authenticated");
    const user = auth.currentUser;
    if (!user) throw new Error("Auth missing");
    setIsUploading(true);
    setUploadStatusText("☁️ Preparing post...");

    let newDocRef: DocumentReference | undefined;

    try {
      // ✅ 1. Check if image already uploaded (pre-processed in UploadImage)
      const alreadyUploaded = post.imageUrl?.startsWith(
        "https://firebasestorage.googleapis.com"
      );

      let finalImageUrl = post.imageUrl || "";
      let finalOriginalUrl = post.originalImageUrl || post.imageUrl || "";

      if (!alreadyUploaded && selectedFile) {
        // 🧠 Fall back to old upload logic (only if image not pre-uploaded)
        setUploadStatusText("📸 Uploading image...");

        const dateString = new Date().toISOString().split("T")[0];
        const folderId = `${user.uid}-${Date.now()}`;
        const originalRef = storageRef(
          storage,
          `images/${dateString}/${folderId}/original.jpg`
        );

        const task = uploadBytesResumable(originalRef, selectedFile);
        task.on("state_changed", (snap) => {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          setUploadProgress(pct);
        });

        await uploadTaskAsPromise(task);
        finalImageUrl = await getDownloadURL(task.snapshot.ref);
        finalOriginalUrl = finalImageUrl;

        setUploadStatusText("✅ Image upload complete");
      } else {
        console.log("✅ Skipping image upload — already uploaded earlier");
      }

      // ✅ 2. Prepare and save Firestore doc
      const payload: FirestorePostPayload = buildPostPayload({
        ...post,
        imageUrl: finalImageUrl,
        postUser: post.postUser ?? userData,
      });

      newDocRef = await addPostToFirestore(db, payload);
      const postId = newDocRef.id;
      persistCustomProductData(userData.companyId, post).catch(console.warn);

      if (post.account?.typeOfAccount === "manual") {
        await dispatch(createManualAccountThunk(post.account));
      }

      if (post.companyGoalId || post.galloGoal?.oppId) {
        setUploadStatusText("🎯 Updating related goal...");
        await updateGoalWithSubmission(post, postId);
      }

      // ✅ 3. Update image URLs + timestamp
      await updateDoc(newDocRef, {
        imageUrl: finalImageUrl,
        originalImageUrl: finalOriginalUrl,
        timestamp: Timestamp.now(),
      });

      // 🧠 Log AI feedback if available
      try {
        await logAiFeedback({
          companyId: userData.companyId,
          imageId: newDocRef.id,
          detected: post.rawCandidates ?? [],
          accepted: post.autoDetectedBrands ?? [],
          aiEnabled: post.aiEnabled ?? false,
        });
      } catch (err) {
        console.warn("⚠️ AI feedback logging skipped:", err);
      }

      // ✅ 4. Local sync
      const finalPost: PostWithID = normalizePost({
        ...payload,
        id: postId,
        imageUrl: finalImageUrl,
        originalImageUrl: finalOriginalUrl,
      });

      dispatch(addNewPost(finalPost));
      await addPostsToIndexedDB([finalPost]);

      // ✅ 5. Optional: Gallo Axis integration
      if (post.galloGoal) {
        dispatch(showMessage("📤 Sending achievement to Gallo Axis..."));

        const closedDate =
          post.closedDate || new Date().toISOString().split("T")[0];

        try {
          await sendCF({
            env: post.galloGoal?.env, // Cannot find name 'selectedEnv'!!!
            oppId: post.galloGoal.oppId,
            closedBy: post.closedBy ?? user.displayName ?? "",
            closedDate, // MM-DD-YYYY Cannot find name 'formattedClosedDate'!!
            closedUnits: post.totalCaseCount || "0",
            photos: [{ file: finalImageUrl }],
          });

          if (selectedGalloGoal && post.account?.accountNumber) {
            await dispatch(
              markGalloAccountAsSubmitted({
                goal: selectedGalloGoal,
                accountNumber: post.account.accountNumber,
                postId,
              })
            );
            dispatch(showMessage("Achievement sent to Gallo!"));
          }
        } catch (err) {
          console.error("Gallo send failed (non-fatal)", err);
          dispatch(showMessage("Post saved, but Gallo sync failed"));
        }
      }

      // 🧹 6. Optional cleanup of temp uploads
      try {
        if (post.imageUrl?.includes("tempUploads")) {
          const tempPath = new URL(post.imageUrl).pathname;
          const decodedPath = decodeURIComponent(tempPath.split("/o/")[1]);
          const fileRef = storageRef(storage, decodedPath);
          await deleteObject(fileRef);

          console.log(`🧹 Deleted temporary upload: ${decodedPath}`);
        }
      } catch (cleanupErr) {
        console.warn("⚠️ Failed to delete temp upload:", cleanupErr);
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
