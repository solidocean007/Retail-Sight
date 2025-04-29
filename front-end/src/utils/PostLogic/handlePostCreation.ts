// useHandlePostSubmission
import { useSelector } from "react-redux";
import { NavigateFunction } from "react-router-dom";
import { CompanyMissionType, PostType, SubmittedMissionType } from "../types";
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
import {
  addPostToFirestore,
  updateCategoriesInFirestore,
  updateChannelsInFirestore,
} from "./updateFirestore";
import { v4 as uuidv4 } from "uuid";
import { extractHashtags, extractStarTags } from "../extractHashtags";
import { useAppDispatch } from "../store";
import { createSubmittedMission } from "../../thunks/missionsThunks";
import { sendAchievementToGalloAxis } from "../helperFunctions/sendAchievementToGalloAxis";
import { updateGoalWithSubmission } from "../helperFunctions/updateGoalWithSubmission";
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
      const resizedOriginalBlob = await resizeImage(selectedFile, 800, 900); // what does this do?
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
          // const originalImageUrl = await getDownloadURL( // not being used
          //   uploadOriginalTask.snapshot.ref
          // );

          // Resize and compress the image
          const resizedBlob = await resizeImage(selectedFile, 500, 600); // what does this do as well?
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

              const sharedToken = uuidv4();
              // Set the expiry to one week from now
              const tokenExpiryDate = new Date();
              tokenExpiryDate.setDate(tokenExpiryDate.getDate() + 7);
              const tokenExpiry = tokenExpiryDate.toISOString();

              // Extract hashtags and starTags directly from the description
              const hashtags = extractHashtags(post.description ?? "");
              const starTags = extractStarTags(post.description ?? "");

              const cleanedDescription = post.description
                ?.replace(/(#|[*])\s+/g, "$1") // Remove spaces after # or *
                .trim(); // Trim any leading/trailing spaces

              // Post data without images
              const postDataWithoutImage = {
                category: post.category,
                channel: post.channel,
                description: cleanedDescription,
                imageUrl: "", // Temporary placeholder
                account: post.account ?? null,
                // storeNumber: post.storeNumber,
                city: post.city,
                state: post.state,
                visibility: post.visibility,
                displayDate: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                totalCaseCount: post.totalCaseCount,
                createdBy: userData ?? null, // ✅ Save whole current user object
                ...(post.postedFor && { postedFor: post.postedFor }), // ✅ Save if creating on behalf
                supplier: post.supplier,
                brands: post.brands,
                companyGoalId: post.companyGoalId || null, // Ensures companyGoalId exists
                companyGoalDescription: post.companyGoalDescription || null, // Ensures description exists
                companyGoalTitle: post.companyGoalTitle || null, // Ensures title  exists
                galloGoalDescription: post.galloGoalDescription || null, // Ensures galloGoalDescription exists
                galloGoalTitle: post.galloGoalTitle || null, // Ensures galloGoal title exists
                hashtags: hashtags,
                starTags: starTags,
                commentCount: 0,
                likes: [],
                token: {
                  sharedToken: sharedToken,
                  tokenExpiry: tokenExpiry,
                },
                oppId: post.oppId || null,
                closedBy: post.closedBy || user.displayName || "",
                closedDate:
                  post.closedDate || new Date().toISOString().split("T")[0],
                closedUnits: post.closedUnits || 0,
              };

              // Create the post in Firestore
              const newDocRef = await addPostToFirestore(
                db,
                postDataWithoutImage
              );

              const postId = newDocRef.id;

              // Update goal with the post ID
              await updateGoalWithSubmission(post, postId,);

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
              
              await addPostToIndexedDB(newPostWithID);
              dispatch(addNewPost(newPostWithID));
              

              // Send Achievement to Gallo Axis if oppId exists
              if (post.oppId) {
                const achievementPayload = {
                  oppId: post.oppId,
                  closedBy: post.closedBy ?? user.displayName ?? "",

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

              // Update channels collection
              await updateChannelsInFirestore(db, post.channel, newDocRef.id);

              // Update categories collection
              await updateCategoriesInFirestore(
                db,
                post.category,
                newDocRef.id
              );

              // i need to eventually update hashtags and startags in the firestore

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
