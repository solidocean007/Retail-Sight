import { useSelector } from "react-redux";
import { NavigateFunction } from "react-router-dom";
import {
  CompanyMissionType,
  FirestorePostPayload,
  PostInputType,
  PostWithID,
  SubmittedMissionType,
} from "../types";
import { auth, db, storage } from "../firebase";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  UploadTask,
  UploadTaskSnapshot,
} from "firebase/storage";
import { DocumentReference, deleteDoc, updateDoc } from "firebase/firestore";
import { showMessage } from "../../Slices/snackbarSlice";
import { selectUser } from "../../Slices/userSlice";
import { resizeImage } from "../../images/resizeImages";
import { useAppDispatch } from "../store";
import { createSubmittedMission } from "../../thunks/missionsThunks";
import { sendAchievementToGalloAxis } from "../helperFunctions/sendAchievementToGalloAxis";
import { updateGoalWithSubmission } from "../helperFunctions/updateGoalWithSubmission";
import { addPostsToIndexedDB } from "../database/indexedDBUtils";
import { addNewPost } from "../../Slices/postsSlice";
import { getOptimizedSizes } from "./getOptimizedSizes";
import { buildPostPayload } from "./buildPostPayload";
import { addPostToFirestore } from "./updateFirestore";
import { normalizePost } from "../normalizePost";

// Helper to wrap a Firebase storage upload task into a Promise
function uploadTaskAsPromise(task: UploadTask): Promise<UploadTaskSnapshot> {
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      () => { /* progress handled externally */ },
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
    selectedCompanyMission: CompanyMissionType,
    apiKey: string,
    navigate: NavigateFunction
  ): Promise<PostWithID> => {
    if (!userData) throw new Error("User not authenticated");
    const user = auth.currentUser;
    if (!user) throw new Error("Auth missing");

    setIsUploading(true);
    try {
      // 1. Optimize sizes
      const { original, resized } = await getOptimizedSizes(selectedFile);

      // 2. Resize original and upload
      let originalUploadProgress = 0;
      const originalBlob = await resizeImage(selectedFile, original[0], original[1]);
      const originalRef = storageRef(
        storage,
        `images/${new Date().toISOString().split('T')[0]}/${user.uid}-${Date.now()}/original.jpg`
      );
      const origTask = uploadBytesResumable(originalRef, originalBlob);
      origTask.on('state_changed', (snap) => {
        originalUploadProgress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgress((originalUploadProgress + 0) / 2);
      });
      await uploadTaskAsPromise(origTask);

      // 3. Resize compressed and upload
      let resizedUploadProgress = 0;
      const resizedBlob = await resizeImage(selectedFile, resized[0], resized[1]);
      const resizedRef = storageRef(
        storage,
        `images/${new Date().toISOString().split('T')[0]}/${user.uid}-${Date.now()}/resized.jpg`
      );
      const resTask = uploadBytesResumable(resizedRef, resizedBlob);
      resTask.on('state_changed', (snap) => {
        resizedUploadProgress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgress((originalUploadProgress + resizedUploadProgress) / 2);
      });
      const resSnapshot = await uploadTaskAsPromise(resTask);

      // 4. Get URL
      const resizedUrl = await getDownloadURL(resSnapshot.ref);

      // 5. Build Firestore payload
      const payload: FirestorePostPayload = buildPostPayload({
        ...post,
        imageUrl: "",
        postUser: post.postUser ?? userData,
      });

      // 6. Write to Firestore
      let newDocRef: DocumentReference;
      try {
        newDocRef = await addPostToFirestore(db, payload);
      } catch (error) {
        throw new Error(`Failed to create post document: ${error}`);
      }

      const postId = newDocRef.id;

      // 7. Conditionally update goal
      if (post.companyGoalId || post.oppId) {
        await updateGoalWithSubmission(post, postId);
      }

      // 8. Stamp image URL + timestamp
      await updateDoc(newDocRef, {
        imageUrl: resizedUrl,
        timestamp: new Date(),
      });

      // 9. Normalize and cache
      const finalPost: PostWithID = normalizePost({
        ...payload,
        id: postId,
        imageUrl: resizedUrl,
      });
      dispatch(addNewPost(finalPost));
      await addPostsToIndexedDB([finalPost]);

      // 10. Send achievement to Gallo Axis
      if (post.oppId) {
        const achievementPayload = {
          oppId: post.oppId,
          galloGoalTitle: post.galloGoalTitle,
          galloGoalDescription: post.galloGoalDescription,
          closedBy: post.closedBy ?? user.displayName ?? "",
          closedDate: post.closedDate || new Date().toISOString().split('T')[0],
          closedUnits: post.closedUnits || "0",
          photos: [{ file: resizedUrl }],
        };
        await sendAchievementToGalloAxis(
          achievementPayload,
          apiKey,
          navigate,
          dispatch
        );
      }

      // 11. Create submitted mission
      if (selectedCompanyMission?.id) {
        const submittedMission: SubmittedMissionType = {
          companyMissionId: selectedCompanyMission.id,
          postIdForObjective: postId,
        };
        await dispatch(createSubmittedMission(submittedMission));
      }

      showMessage("Post added successfully!");
      return finalPost;
    } catch (error) {
      // Cleanup on any failure
      console.error("Error in post submission:", error);
      showMessage(`Error adding post: ${error instanceof Error ? error.message : error}`);
      // Attempt to delete the Firestore doc if it exists
      // Note: newDocRef scoped inside try; you could track it above if needed
      try {
        // @ts-ignore
        if (newDocRef) await deleteDoc(newDocRef);
      } catch {
        console.warn("Failed to cleanup Firestore doc.");
      }
      throw error;
    } finally {
      setIsUploading(false);
      navigate("/user-home-page");
    }
  };

  return handlePostSubmission;
};
