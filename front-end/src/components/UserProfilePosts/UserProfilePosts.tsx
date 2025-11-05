import { Container } from "@mui/material";
// import { useEffect, useState } from "react";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import "./userProfilePosts.css";
// import { PostWithID, UserType } from "../../utils/types";
import { PostWithID, UserType } from "../../utils/types";
import { fetchUserCreatedPosts } from "../../thunks/postsThunks";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  addUserCreatedPostsInIndexedDB,
  getUserCreatedPostsFromIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { setUserPosts, sortPostsByDate } from "../../Slices/postsSlice";
import "./userProfilePosts.css";
import { userDeletePost } from "../../utils/PostLogic/deletePostLogic";
import { getAuth, onAuthStateChanged } from "@firebase/auth";

export const UserProfilePosts = ({
  currentUser,
}: {
  currentUser: UserType | null;
}) => {
  const dispatch = useAppDispatch();
  const userId = currentUser?.uid;
  const userPosts = useSelector((state: RootState) => state.posts.userPosts);

  const auth = getAuth();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Authenticated User:", user); // User is signed in
      } else {
        console.log("No authenticated user."); // No user is signed in
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedPost, setSelectedPost] = useState<PostWithID | null>();

  useEffect(() => {
    async function fetchAndStorePosts() {
      if (!userId) return; // Early return if userId is undefined or null

      try {
        let posts = await getUserCreatedPostsFromIndexedDB();

        if (!posts || posts.length === 0) {
          console.log("Fetching user posts from Firestore");
          const fetchedUserPosts = await dispatch(
            fetchUserCreatedPosts(userId),
          ).unwrap();
          await addUserCreatedPostsInIndexedDB(fetchedUserPosts);
          posts = fetchedUserPosts;
        }

        // Re-sort posts based on new sorting criteria before setting them to Redux
        const sortedPosts = sortPostsByDate(posts);
        dispatch(setUserPosts(sortedPosts));
      } catch (error) {
        console.error("Failed to fetch or store user posts:", error);
        // Optionally dispatch an error action or set error state as needed
      }
    }

    fetchAndStorePosts();
  }, [userId, dispatch]);

  // Function to construct thumbnail URL
  const getThumbnailUrl = (imageUrl: string) => {
    const dotIndex = imageUrl.lastIndexOf(".");
    if (dotIndex === -1) return imageUrl; // Return original if no file extension found
    return `${imageUrl.substring(0, dotIndex)}_200x200${imageUrl.substring(
      dotIndex,
    )}`;
  };

  // const handleOpenFullscreen = (post: PostWithID) => {
  //   setSelectedPost(post);
  //   setIsModalOpen(true);
  // };

  // const handleCloseModal = () => {
  //   setIsModalOpen(false);
  //   setSelectedPost(null);
  // };

  const handleDeletePost = (post: PostWithID) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      // Proceed with the deletion logic here
      userDeletePost({ post });
      console.log("Deleting post:", post.id);
      // Dispatch an action or call a function to delete the post from state and/or backend
    }
  };

  return (
    <Container>
      <div className="user-posts-container">
        {userPosts.length === 0 && <h4>You have no posts yet</h4>}
        {userPosts.length}
        {userPosts.map((post) => (
          <div key={post.id} className="post-row">
            <div className="post-image-container">
              {post.imageUrl && (
                <>
                  <img src={getThumbnailUrl(post.imageUrl)} alt="Thumbnail" />
                  {/* <button  onClick={() => handleOpenFullscreen(post)}>
                    View
                  </button> */}
                </>
              )}
            </div>
            <div className="post-store-info">
              <div className="post-store-name">{post.account?.accountName}</div>
              <div className="post-store-address">
                {post.account?.accountAddress}
              </div>
            </div>
            <div className="post-hashtags">
              {post.hashtags.map((tag) => (
                <span key={tag} className="hashtag">
                  {tag}{" "}
                </span>
              ))}
            </div>
            <div className="post-actions">
              <button onClick={() => handleDeletePost(post)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};
