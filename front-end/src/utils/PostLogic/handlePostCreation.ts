// useHandlePostSubmission
import { useSelector } from "react-redux";
import { NavigateFunction } from "react-router-dom";
import { CompanyAccountType, CompanyMissionType, PostType, SubmittedMissionType } from "../types";
import { auth, db, storage } from "../firebase";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import { DocumentReference, deleteDoc, updateDoc } from "firebase/firestore";
import { showMessage } from "../../Slices/snackbarSlice";
import { selectUser } from "../../Slices/userSlice";
import { resizeImage } from "../../images/resizeImages";

import { v4 as uuidv4 } from "uuid";
import { extractHashtags, extractStarTags } from "../extractHashtags";
import { useAppDispatch } from "../store";
import { createSubmittedMission } from "../../thunks/missionsThunks";
import { sendAchievementToGalloAxis } from "../helperFunctions/sendAchievementToGalloAxis";
import { updateGoalWithSubmission } from "../helperFunctions/updateGoalWithSubmission";
import { addPostsToIndexedDB } from "../database/indexedDBUtils";
import { addNewPost } from "../../Slices/postsSlice";
import { getOptimizedSizes } from "./getOptimizedSizes";
import { buildPostPayload } from "./buildPostPayload";
import { addPostToFirestore } from "./updateFirestore";
// Other necessary imports...

export const useHandlePostSubmission = () => {
  const dispatch = useAppDispatch();
  const userData = useSelector(selectUser);

  const handlePostSubmission = async (
    post: PostType,
    selectedFile: File,
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>,
    setUploadProgress: React.Dispatch<React.SetStateAction<number>>,
    selectedCompanyMission: CompanyMissionType,
    apiKey: string,
    navigate: NavigateFunction
  ) => {
    const { original, resized } = await getOptimizedSizes(selectedFile);
    setIsUploading(true);
    const user = auth.currentUser;
    if (!user || !userData) return;

    // Create a unique folder for each post's images
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
    const uniquePostFolder = `${formattedDate}/${user.uid}-${Date.now()}`;

    // Initialize states for individual upload progress
    let originalUploadProgress = 0;
    let resizedUploadProgress = 0;

    // Function to update overall progress
    const updateOverallProgress = () => {
      const totalProgress =
        (originalUploadProgress + resizedUploadProgress) / 2;
      setUploadProgress(totalProgress);
    };

    const newDocRef: DocumentReference | null = null; // Initialize as null

    try {
      const resizedOriginalBlob = await resizeImage(
        selectedFile,
        original[0],
        original[1]
      );
      const originalImagePath = `images/${uniquePostFolder}/original.jpg`;
      const originalImageRef = storageRef(storage, originalImagePath);
      const uploadOriginalTask = uploadBytesResumable(
        originalImageRef,
        resizedOriginalBlob
      );

      uploadOriginalTask.on(
        "state_changed",
        (snapshot) => {
          originalUploadProgress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          updateOverallProgress();
        },
        (error) => {
          showMessage(`Upload error: ${error.message}`);
          setIsUploading(false);
        },
        async () => {

          // Resize and compress the image
          const resizedBlob = await resizeImage(
            selectedFile,
            resized[0],
            resized[1]
          );
          const resizedImagePath = `images/${uniquePostFolder}/resized.jpg`;
          const resizedImageRef = storageRef(storage, resizedImagePath);
          const uploadResizedTask = uploadBytesResumable(
            resizedImageRef,
            resizedBlob
          );

          uploadResizedTask.on(
            "state_changed",
            (snapshot) => {
              resizedUploadProgress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              updateOverallProgress();
            },
            (error) => {
              showMessage(`Upload error: ${error.message}`);
              setIsUploading(false);
            },
            async () => {
              const resizedImageUrl = await getDownloadURL(
                uploadResizedTask.snapshot.ref
              );

              const postDataWithoutImage: PostType = buildPostPayload({ // right here is the error
                ...post,
                imageUrl: "",
              })

              // Create the post in Firestore
              const newDocRef = await addPostToFirestore(db, postDataWithoutImage); 
              const postId = newDocRef.id;

              // Update goal with the post ID
              await updateGoalWithSubmission(post, postId);

              // Update the post with image URLs
              await updateDoc(newDocRef, {
                imageUrl: resizedImageUrl,
                timestamp: new Date().toISOString(), // Update the timestamp as well
              });

              const newPostWithID = {
                ...postDataWithoutImage,
                id: newDocRef.id,
                imageUrl: resizedImageUrl,
              };

              dispatch(addNewPost(newPostWithID));
              await addPostsToIndexedDB([newPostWithID]);

              // Send Achievement to Gallo Axis if oppId exists
              if (post.oppId) {
                const achievementPayload = {
                  oppId: post.oppId,
                  galloGoalTitle: post.galloGoalTitle,
                  galloGoalDescription: post.galloGoalDescription,
                  closedBy: post.closedBy ?? user.displayName ?? "",
                  // i should add the gallo goal description and title here and remove from above
                  closedDate:
                    post.closedDate || new Date().toISOString().split("T")[0],
                  closedUnits: post.closedUnits || "0",
                  photos: [{ file: resizedImageUrl }],
                };

                await sendAchievementToGalloAxis(
                  achievementPayload,
                  apiKey,
                  navigate,
                  dispatch
                );
              }

              // // Update channels collection
              // await updateChannelsInFirestore(db, post.channel, newDocRef.id);

              // // Update categories collection
              // await updateCategoriesInFirestore(
              //   db,
              //   post.category,
              //   newDocRef.id
              // );

              if (newDocRef && selectedCompanyMission) {
                const submittedMission: SubmittedMissionType = {
                  companyMissionId: selectedCompanyMission.id!,
                  postIdForObjective: newDocRef.id,
                };

                await dispatch(createSubmittedMission(submittedMission));
              }

              dispatch(showMessage("Post added successfully!"));
              setIsUploading(false);
              navigate("/user-home-page");
            }
          );
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error adding post:", error.message);
        showMessage(`Error adding post: ${error.message}`);
      } else {
        // Handle case when error is not an instance of Error
        console.error("An unknown error occurred");
        showMessage("An unknown error occurred");
      }
      // Clean up: Delete the Firestore document if it was created
      if (newDocRef) {
        try {
          await deleteDoc(newDocRef);
        } catch (deleteError) {
          console.error("Error cleaning up Firestore document:", deleteError);
        }
      }
      setIsUploading(false);
      navigate("/user-home-page");
    }
  };

  return handlePostSubmission;
};
