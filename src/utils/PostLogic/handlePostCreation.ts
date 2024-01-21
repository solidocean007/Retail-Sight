import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { PostType } from "../types";
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
import { addNewlyCreatedPostToIndexedDB } from "../database/indexedDBUtils";
import { extractHashtags, extractStarTags } from "../extractHashtags";
import { addNewPost } from "../../Slices/postsSlice";
// Other necessary imports...

export const useHandlePostSubmission = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector(selectUser);

  const handlePostSubmission = async (
    post: PostType,
    selectedFile: File,
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>,
    setUploadProgress: React.Dispatch<React.SetStateAction<number>>
  ) => {
    console.log('new post creation logic')
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
      // Upload original image and track progress
      // resizeOriginalImage first then...
      const resizedOriginalBlob = await resizeImage(selectedFile, 800, 900);
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
          const resizedBlob = await resizeImage(selectedFile, 500, 600);
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

              // Post data without images
              const postDataWithoutImage = {
                category: post.category,
                channel: post.channel,
                description: post.description,
                imageUrl: "", // Temporary placeholder
                selectedStore: post.selectedStore,
                storeNumber: post.storeNumber,
                storeAddress: post.storeAddress,
                city: post.city,
                state: post.state,
                visibility: post.visibility,
                supplier: post.supplier,
                brands: post.brands,
                displayDate: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                user: {
                  postUserName: user.displayName || "Unknown",
                  postUserId: user.uid,
                  postUserCompany: userData.company,
                  postUserEmail: userData.email,
                },
                hashtags: extractHashtags(post.description ?? ""),
                starTags: extractStarTags(post.description ?? ""),
                commentCount: 0,
                likes: [],
              };

              // Create the post in Firestore
              const newDocRef = await addPostToFirestore(
                db,
                postDataWithoutImage
              );

              // Update the post with image URLs
              await updateDoc(newDocRef, {
                imageUrl: resizedImageUrl,
              });

              const newPostWithID = {
                ...postDataWithoutImage,
                id: newDocRef.id,
                imageUrl: resizedImageUrl, 
              };

              // Dispatch action to add this new post to Redux state
              dispatch(addNewPost(newPostWithID));

              // Add the new post to IndexedDB
              await addNewlyCreatedPostToIndexedDB(newPostWithID);

              // Update channels collection
              await updateChannelsInFirestore(db, post.channel, newDocRef.id);

              // Update categories collection
              await updateCategoriesInFirestore(
                db,
                post.category,
                newDocRef.id
              );

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
    }
  };

  return handlePostSubmission;
};
