// handlePostCreation.ts
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { PostType } from "../types";
import { auth, db } from "../firebase";
import { uploadImageToStorage } from "./upLoadImage";
import { extractHashtags } from "../extractHashtags";
import { showMessage } from "../../Slices/snackbarSlice";
import { addNewPost } from "../../Slices/postsSlice";
import { selectUser } from "../../Slices/userSlice";
import { storage } from "../firebase";
import { ref as storageRef, uploadBytesResumable } from "firebase/storage";

import {
  addPostToFirestore,
  updateCategoriesInFirestore,
  updateChannelsInFirestore,
} from "./updateFirestore";
import { addNewlyCreatedPostToIndexedDB } from "../database/indexedDBUtils";
import { DocumentReference, deleteDoc, updateDoc } from "firebase/firestore";
import { UploadTaskSnapshot } from "firebase/storage";
// import { fetchUserFromFirebase } from "../userData/fetchUserFromFirebase";

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
    // Inside handlePostSubmission function
    const fileRef = storageRef(storage, `images/${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(fileRef, selectedFile);

    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        // Get progress and round it to the nearest whole number
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setUploadProgress(progress);
      },
      (error: Error) => {
        // error is defined but never used
        showMessage(`Upload error: ${error.message}`);
        setIsUploading(false); // Ensure to stop the loading indicator on error
      },
      () => {
        // Handle successful upload here
        setIsUploading(false);
      }
    );

    const user = auth.currentUser;
    if (!user || !userData) return;
    // const uid = user.uid;

    let hashtags: string[] = [];
    if (post.description) {
      hashtags = extractHashtags(post.description);
    }

    let newDocRef: DocumentReference | null = null; // Initialize as null

    try {
      if (!userData) {
        throw new Error("User data not found.");
        // return; why not return here?
      }

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
        hashtags: hashtags,
        commentCount: 0,
        likes: [],
      };

      // Add post to 'posts' collection and store the reference
      // newDocRef = await addDoc(collection(db, "posts"), postDataWithoutImage);
      // Create the post and get back the docRef and postData
      // Add post to 'posts' collection and store the reference
      newDocRef = await addPostToFirestore(db, postDataWithoutImage);

      // Now upload the image and get the URL
      const downloadURL = await uploadImageToStorage(user.uid, selectedFile);

      // Then update the document with the imageUrl using the newDocRef returned earlier
      await updateDoc(newDocRef, { imageUrl: downloadURL }); // Argument of type '{ docRef: DocumentReference<any, DocumentData>; postData: any; }' is not assignable to parameter of type 'DocumentReference<unknown, { imageUrl: string; }>'.

      // Now create newPostWithID with the imageUrl and the id from newDocRef
      const newPostWithID = {
        ...postDataWithoutImage,
        imageUrl: downloadURL,
        id: newDocRef.id, // Property 'id' does not exist on type '{ docRef: DocumentReference<any, DocumentData>; postData: any; }'
      };

      // Dispatch action to add this new post to Redux state
      dispatch(addNewPost(newPostWithID));

      // Add the new post to IndexedDB
      await addNewlyCreatedPostToIndexedDB(newPostWithID);

      // Update channels collection
      await updateChannelsInFirestore(db, post.channel, newDocRef.id); 

      // Update categories collection
      await updateCategoriesInFirestore(db, post.category, newDocRef.id);

      dispatch(showMessage("Post added successfully!"));
      setIsUploading(false);
      navigate("/");
    } catch (error) {
      console.error("Error adding post:", error); // this logs
      dispatch(showMessage(`Error adding post: ${(error as Error).message}`));
      if (newDocRef) {
        // cannot find name newDocRef
        await deleteDoc(newDocRef); // type mismatch also on newDocRef
      }
    }
  };
  return handlePostSubmission;
};