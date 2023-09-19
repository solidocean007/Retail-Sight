// handlePostLogic.ts
import { db } from "../utils/firebase"; // adjust the path as necessary
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { auth } from "../utils/firebase";
import { showMessage } from "../Slices/snackbarSlice"; // Adjust the path as necessary
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";



import { PostType } from "./types";

const extractHashtags = (description: string) => {
  const hashtagPattern = /#\w+/g;
  return description.match(hashtagPattern) || [];
};


// ... (other imports)

export const useHandlePostSubmission = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handlePostSubmission = async (
    post: PostType,
    selectedFile: File
  ) => {
    const user = auth.currentUser;
    if (!user) return; // No user, abort the function
    const uid = user.uid;
    console.log("User UID:", uid);
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
    const imageFileName = `${uid}-${Date.now()}.jpg`;
    const imagePath = `images/${formattedDate}/${uid}/${imageFileName}`;
    let hashtags = []; // Variable 'hashtags' implicitly has type 'any[]' in some locations where its type cannot be determined.
    if (post.description) {
      const hashtags = extractHashtags(post.description);
      console.log("Extracted Hashtags:", hashtags); // this logs after submission
      // return hashtags;
    }
  
    try {
      console.log("attempt to submit post");
      const storage = getStorage();
      const storageRef = ref(storage, imagePath);
  
      // Fetch the user's data from Firestore
      const userDocRef = doc(db, "users", uid);
      const userDocSnapshot = await getDoc(userDocRef);
      const userData = userDocSnapshot.data();
  
      if (!userData) {
        console.error("User data not found for ID:", uid);
        return;
      }
  
      console.log("User Data from Firestore:", userData);
  
      if (post.imageUrl) {
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);
  
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log("Upload is " + progress + "% done");
          },
          (error) => {
            dispatch(
              showMessage(`Error uploading image. Please try again.${error}`)
            );
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  
            const postData = {
              description: post.description,
              imageUrl: downloadURL,
              postType: post.postType,
              timestamp: new Date().toISOString(),
              user: {
                name: `${userData.firstName} ${userData.lastName}`,
                company: userData.company,
                userId: uid,
                email: userData.email,
              },
              hashtags: hashtags, // Cannot find name hashtags
              store: post.selectedStore,
            };
  
            console.log("Post Data to be added:", postData);
  
            await addDoc(collection(db, "posts"), postData);
            dispatch(showMessage("Post added successfully!")); // cannot find name dispatch
  
            // Navigate to another page or provide feedback to the user
            navigate("/userHomePage");
          }
        );
      }
    } catch (error) {
      console.error("Error adding post:", error);
    }
  };

  return handlePostSubmission;
};




export const handleSelectedStoreLogic = (
  store: google.maps.places.PlaceResult,
  storeAddress: string,
  setSelectedStore: (store: any) => void
) => {
  setSelectedStore({
    storeName: store.name,
    storeAddress: storeAddress,
  });
};
