import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { PostType } from "../types";
import { auth, db } from "../firebase";
import { uploadImageToStorage } from "./upLoadImage";
import { extractHashtags } from "../extractHashtags";
import { showMessage } from "../../Slices/snackbarSlice";
import {
  addPostToFirestore,
  updateCategoriesInFirestore,
  updateChannelsInFirestore,
} from "./updateFirestore";
import { fetchUserFromFirebase } from "../userData/fetchUserFromFirebase";

export const useHandlePostSubmission = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handlePostSubmission = async (post: PostType, selectedFile: File) => {
    const user = auth.currentUser;
    if (!user) return;
    // const uid = user.uid;

    let hashtags: string[] = [];
    if (post.description) {
      hashtags = extractHashtags(post.description);
    }

    try {
      const userData = await fetchUserFromFirebase(user.uid);

      if (!userData) {
        console.error("User data not found for ID:", user.uid);
        return;
      }

      if (post.imageUrl) {
        const downloadURL = await uploadImageToStorage(user.uid, selectedFile);

        const postData = {
          category: post.category,
          channel: post.channel,
          description: post.description,
          imageUrl: downloadURL,
          selectedStore: post.selectedStore,
          storeAddress: post.storeAddress,
          postType: post.postType,
          timestamp: new Date().toISOString(),
          user: {
            postUserName: user.displayName,
            postUserId: user.uid,
            postUserCompany: userData.company,
          },
          hashtags: hashtags,
          commentCount: 0,
          likes: 0,
        };

        console.log("Channel:", post.channel);
        console.log("Category:", post.category);

        // Add post to 'posts' collection
        const newDocRef = await addPostToFirestore(db, postData);

        console.log("Post ID:", newDocRef.id);


        // Update channels collection
        await updateChannelsInFirestore(db, post.channel, newDocRef.id);

        // Update categories collection
        await updateCategoriesInFirestore(db, post.category, newDocRef.id);

        dispatch(showMessage("Post added successfully!"));
        navigate("/userHomePage");
      }
    } catch (error) {
      console.error("Error adding post:", error);
      dispatch(showMessage(`Error adding post: ${error.message}`)); // error is of type unknown
    }
  };
  return handlePostSubmission;
};
