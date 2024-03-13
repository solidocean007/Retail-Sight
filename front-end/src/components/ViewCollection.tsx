import { useParams } from "react-router-dom";
import ActivityFeed from "./ActivityFeed";
import { useEffect, useState } from "react";
import { PostWithID } from "../utils/types";
import { fetchPostsByIds } from "../thunks/postsThunks";
import { useDispatch, useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./viewCollection.css";

export const ViewCollection = () => {
  const [viewMode, setViewMode] = useState("feed");
  const { collectionId } = useParams(); // This is your route parameter
  const dispatch = useAppDispatch();
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const postsState = useSelector((state: RootState) => state.posts); // Accessing posts state from the Redux store.  What is this for?
   // Use a map to keep track of selected posts for ease of handling individual post checkbox states
   const [selectedPosts, setSelectedPosts] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchCollectionAndPosts = async () => {
      if (collectionId) {
        // Fetch the collection document to get the posts array
        const collectionRef = doc(db, "collections", collectionId);
        const collectionSnap = await getDoc(collectionRef);

        if (collectionSnap.exists()) {
          const collectionData = collectionSnap.data();
          const postIds = collectionData.posts; // Assuming this is an array of post IDs

          // Dispatching the thunk to fetch posts by their IDs
          dispatch(fetchPostsByIds({ postIds })).then((actionResult) => {
            if (fetchPostsByIds.fulfilled.match(actionResult)) {
              // If the action is fulfilled, use the payload to set the posts
              setPosts(actionResult.payload);
            } else {
              // Handle any errors or rejections
              console.error("Failed to fetch posts for collection");
            }
          });
        } else {
          console.log("Collection document does not exist");
        }
      }
    };

    fetchCollectionAndPosts();
  }, [collectionId, dispatch]);

  const handleCheck = (postId: string) => {
    // Toggle the selected state for the post
    setSelectedPosts((prevSelected) => ({
      ...prevSelected,
      [postId]: !prevSelected[postId],
    }));
  };

  const handleRemoveChecked = () => {
    if (window.confirm('Are you sure you want to remove the selected posts?')) {
      // Remove the selected posts from the collection
      // Update Firestore collection to remove selected post IDs
      // Update the posts state to remove selected posts
      setPosts((prevPosts) => prevPosts.filter((post) => !selectedPosts[post.id]));
      // Reset the selected posts
      setSelectedPosts({});
      // Additional logic for Firestore update goes here...
    }
  };

  const handleExportChecked = () => {
    // Logic to export checked posts
    // this needs to export these posts into a folder.  zip maybe. that has a file for each post.  should this be a server function?
  };

  return (
    <div className="view-collection-container">
      {/* Toggle View Mode */}
      <div className="view-collection-header">
        <div>
          <button onClick={() => setViewMode("feed")}>Feed View</button>
          <button onClick={() => setViewMode("list")}>List View</button>
        </div>
        <div className="view-collection-actions">
          <button onClick={handleRemoveChecked}>Remove Checked</button>
          <button onClick={handleExportChecked}>Export Checked</button>
        </div>
      </div>

      {/* Render posts based on selected view mode */}
      {viewMode === "feed" ? (
        <ActivityFeed
          posts={posts}
          clearSearch={() => Promise.resolve()} // Provide a no-op function if needed
          activePostSet="feed"
          setActivePostSet={() => {}} // Example no-op function
          isSearchActive={false}
          setIsSearchActive={() => {}}
          // Omit props that are not applicable for this use case
        />
      ) : (
        <div className="list-view">
          {posts.map((post) => (
            <div key={post.id} className="post-list-item">
              <div className="list-item-image">
                <img src={`${post.imageUrl}-200x200`} alt="Post" />
              </div>
              <div className="list-item-details">
                <div className="list-item-store">
                  {post.selectedStore} {post.storeNumber}
                </div>
                <div className="list-item-address">{post.storeAddress}</div>
                <div className="list-item-date-cases">
                  <div className="list-item-display-date">
                    {new Date(post.displayDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="list-item-cases">
                    Cases: {post.totalCaseCount}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                className="list-item-checkbox"
                onChange={() => handleCheck(post.id)}
                // Ensure to control "checked" state via React state if necessary
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
