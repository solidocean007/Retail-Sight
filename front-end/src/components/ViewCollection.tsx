import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { saveAs } from "file-saver";
import { fetchPostsByIds } from "../thunks/postsThunks";
import { useAppDispatch } from "../utils/store";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useFirebaseAuth } from "../utils/useFirebaseAuth"; // Adjust based on your auth hook
import { PostWithID } from "../utils/types";
import "./viewCollection.css";

export const ViewCollection = () => {
  const { collectionId, token } = useParams<{
    collectionId: string;
    token?: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentUser } = useFirebaseAuth(); // Adjust based on your auth hook
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<{ [id: string]: boolean }>(
    {}
  );
  const [loading, setLoading] = useState(true);

  interface TokenValidationResponse {
    valid: boolean; // Assuming this is the correct shape
  }

  // Define the shape of the accumulator
  interface SelectedPosts {
    [key: string]: boolean;
  }

  useEffect(() => {
    const fetchCollection = async () => {
      if (!collectionId) {
        console.error("Collection ID is undefined.");
        navigate("/page-not-found");
        return;
      }
      setLoading(true);
      try {
        // Validate token for shared link access
        if (token && collectionId) {
          const functions = getFunctions();
          const validateShareTokenFn = httpsCallable(
            functions,
            "validateShareToken"
          );
          const tokenValidationResponse = await validateShareTokenFn({
            collectionId,
            token,
          });
          const isValidToken = (
            tokenValidationResponse.data as TokenValidationResponse
          ).valid;

          if (!isValidToken) {
            navigate("/access-denied");
            return;
          }
        }

        // Fetch collection and posts logic
        const collectionRef = doc(db, "collections", collectionId);
        const docSnap = await getDoc(collectionRef);

        if (docSnap.exists()) {
          const collectionData = docSnap.data(); // Assume this contains the posts IDs

          const actionResult = await dispatch(
            fetchPostsByIds({ postIds: collectionData.posts })
          ).unwrap();
          setPosts(actionResult);

          // Initialize all posts as selected (checked)
          const allSelected = actionResult.reduce<SelectedPosts>(
            (acc, post) => {
              acc[post.id] = true; // Now TypeScript knows acc is an object with string keys and boolean values
              return acc;
            },
            {}
          );

          setSelectedPosts(allSelected);
        } else {
          navigate("/page-not-found");
        }
      } catch (error) {
        console.error("Error fetching collection or validating token:", error);
        navigate("/access-denied");
      } finally {
        setLoading(false);
      }
    };

    if (collectionId) {
      fetchCollection();
    }
  }, [collectionId, token, dispatch, navigate]);

  // Handle checkbox change
  const handleCheckboxChange = (postId: string) => {
    setSelectedPosts((prevSelectedPosts) => ({
      ...prevSelectedPosts,
      [postId]: !prevSelectedPosts[postId],
    }));
  };

  const handleExportSelected = () => {
    // Only allow export for signed-in users
    if (!currentUser) {
      navigate("/login"); // Redirect or prompt for login
      return;
    }

    const postsToExport = posts.filter((post) => selectedPosts[post.id]);
    const blob = new Blob([JSON.stringify(postsToExport, null, 2)], {
      type: "text/json;charset=utf-8",
    });
    saveAs(blob, "selected-posts.json");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="view-collection-container">
      <div className="view-collection-header">
        <h1>Collection:</h1>
        {/* I need the collection name and other collection properties */}
        <button onClick={handleExportSelected}>Export Selected</button>
      </div>

      <div className="posts-list">
        {posts.map((post) => (
          <div key={post.id} className="post-list-item">
            <div className="list-item-image">
              <img src={`${post.imageUrl}_200x200`} alt="" />
            </div>
            <div className="list-item-details">
              <h3>
                {post.selectedStore} {post.storeNumber}{" "}
              </h3>
              <h4>
                {post.description} {/* Display post details */}
              </h4>
              <h4>
                {post.storeAddress} {post.state}
              </h4>
              <h4>
                {post.totalCaseCount > 0
                  ? `${post.totalCaseCount} : total cases`
                  : "Total cases undefined"}
              </h4>
            </div>

            <input
              type="checkbox"
              checked={!!selectedPosts[post.id]}
              onChange={() => handleCheckboxChange(post.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
