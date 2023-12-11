import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { PostType } from "../types";
import { auth, db } from "../firebase";
import { uploadImageToStorage } from "./upLoadImage";
import { extractHashtags } from "../extractHashtags";
import { showMessage } from "../../Slices/snackbarSlice";
import { addNewPost } from "../../Slices/postsSlice";
import { selectUser } from "../../Slices/userSlice";
import {
  addPostToFirestore,
  updateCategoriesInFirestore,
  updateChannelsInFirestore,
} from "./updateFirestore";
import { fetchUserFromFirebase } from "../userData/fetchUserFromFirebase";

export const useHandlePostSubmission = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector(selectUser);

  const handlePostSubmission = async (post: PostType, selectedFile: File) => {
    const user = auth.currentUser;
    console.log(user, " : user");
    if (!user || !userData) return;
    // const uid = user.uid;

    let hashtags: string[] = [];
    if (post.description) {
      hashtags = extractHashtags(post.description);
    }

    try {
      console.log(userData, ": userData");
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
          state: post.state,
          city: post.city,
          visibility: post.visibility,
          supplier: post.supplier,
          brands: post.brands,
          timestamp: new Date().toISOString(),
          user: {
            postUserName: user.displayName || 'Unknown',
            postUserId: user.uid,
            postUserCompany: userData.company,
          },
          hashtags: hashtags,
          commentCount: 0,
          likes: [],
        };

        console.log("Channel:", post.channel);
        console.log("Category:", post.category);

        // Add post to 'posts' collection
        const newDocRef = await addPostToFirestore(db, postData); // adds the postData as a new post.
        const newPostWithID = { ...postData, id: newDocRef.id };

        // Dispatch action to add this new post to Redux state
        dispatch(addNewPost(newPostWithID));
        console.log("Post ID:", newDocRef.id);

        // Update channels collection
        await updateChannelsInFirestore(db, post.channel, newDocRef.id);

        // Update categories collection
        await updateCategoriesInFirestore(db, post.category, newDocRef.id);

        dispatch(showMessage("Post added successfully!"));
        navigate("/userHomePage");
      }
    } catch (error) {
      console.error("Error adding post:", error); // this logs
      dispatch(showMessage(`Error adding post: ${(error as Error).message}`));
    }
  };
  return handlePostSubmission;
};
