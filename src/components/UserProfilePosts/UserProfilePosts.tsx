import { Container } from "@mui/material";
// import { useEffect, useState } from "react";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import "./userProfilePosts.css";
// import { PostWithID, UserType } from "../../utils/types";
import { UserType } from "../../utils/types";
import { fetchUserCreatedPosts } from "../../thunks/postsThunks";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  addUserCreatedPostsInIndexedDB,
  getUserCreatedPostsFromIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { setUserPosts } from "../../Slices/postsSlice";
import "./userProfilePosts.css";

export const UserProfilePosts = ({
  currentUser,
}: {
  currentUser: UserType | null;
}) => {
  const dispatch = useAppDispatch();
  const userId = currentUser?.uid; // is this right?
  const userPosts = useSelector((state: RootState) => state.posts.userPosts);

  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedPost, setSelectedPost] = useState<PostWithID | null>();

  useEffect(() => {
    async function fetchAndStorePosts() {
      if (!userId) {
        return; // Early return if userId is undefined or null
      }

      try {
        const userPostsInIndexedDB = await getUserCreatedPostsFromIndexedDB();

        if (userPostsInIndexedDB && userPostsInIndexedDB?.length > 0) {
          // If there are posts in IndexedDB, dispatch an action to set them in Redux
          dispatch(setUserPosts(userPostsInIndexedDB));
        } else {
          // If there are no posts in IndexedDB, fetch them from Firestore
          const fetchedUserPosts = await dispatch(
            fetchUserCreatedPosts(userId)
          ).unwrap();
          // After fetching, add these posts to IndexedDB
          await addUserCreatedPostsInIndexedDB(fetchedUserPosts);
          // And set them in Redux
          dispatch(setUserPosts(fetchedUserPosts));
        }
      } catch (error) {
        console.error("Failed to fetch or store user posts:", error);
        // Dispatch an error action or set error state as needed
      }
    }

    fetchAndStorePosts();
  }, [userId, dispatch]);

  // Function to construct thumbnail URL
  const getThumbnailUrl = (imageUrl: string) => {
    const dotIndex = imageUrl.lastIndexOf(".");
    if (dotIndex === -1) return imageUrl; // Return original if no file extension found
    return `${imageUrl.substring(0, dotIndex)}_200x200${imageUrl.substring(
      dotIndex
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

  const handleDeletePost = (postId: string) => {
    // I want to ask the user if they are sure about this action before deleting
    handleDeletePost(postId);
  };

  return (
    <Container>
      <div className="user-posts-container">
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
              <div className="post-store-name">{post.selectedStore}</div>
              <div className="post-store-address">{post.storeAddress}</div>
            </div>
            <div className="post-hashtags">
              {post.hashtags.map((tag) => (
                <span key={tag} className="hashtag">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="post-actions">
              <button onClick={() => handleDeletePost(post.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};
