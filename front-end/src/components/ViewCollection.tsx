import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { fetchPostsByIds } from "../thunks/postsThunks";
import { useAppDispatch } from "../utils/store";
import { useFirebaseAuth } from "../utils/useFirebaseAuth";
import { CollectionType, PostWithID } from "../utils/types";
import { CircularProgress, Button } from "@mui/material";
import "./viewCollection.css";

export const ViewCollection = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentUser } = useFirebaseAuth();

  const [collectionDetails, setCollectionDetails] = useState<CollectionType | null>(null);
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  // ✅ Validate collection access via API
  const validateCollectionAccess = async (): Promise<boolean> => {
    console.log("Current user before validating collection access:", currentUser);

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/validateCollectionAccess",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionId,
            userId: currentUser?.uid,
          }),
        }
      );

      const result = await response.json();
      console.log("Collection access validation result:", result);

      if (!response.ok || !result.valid) {
        navigate("/access-denied");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating collection access:", error);
      navigate("/access-denied");
      return false;
    }
  };

  useEffect(() => {
    const loadCollection = async () => {
      if (!collectionId) {
        navigate("/page-not-found");
        return;
      }

      setLoading(true);

      if (!(await validateCollectionAccess())) {
        return;
      }

      try {
        const collectionRef = doc(db, "collections", collectionId);
        const docSnap = await getDoc(collectionRef);

        if (!docSnap.exists()) {
          navigate("/page-not-found");
          return;
        }

        const data = docSnap.data();
        const collectionData: CollectionType = {
          name: data.name,
          ownerId: data.ownerId,
          posts: data.posts,
          sharedWith: data.sharedWith,
          isShareableOutsideCompany: data.isShareableOutsideCompany,
        };

        setCollectionDetails(collectionData);

        if (Array.isArray(data.posts) && data.posts.length > 0) {
          const actionResult = await dispatch(fetchPostsByIds({ postIds: data.posts })).unwrap();
          setPosts(actionResult);

          const initialSelection = actionResult.reduce((acc, post) => {
            acc[post.id] = true;
            return acc;
          }, {} as { [key: string]: boolean });

          setSelectedPosts(initialSelection);
        }
      } catch (error) {
        console.error("Error fetching collection:", error);
        navigate("/access-denied");
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [collectionId, dispatch, navigate]);

  const handleCheckboxChange = (postId: string) => {
    setSelectedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <div className="view-collection-container">
      <div className="view-collection-header">
        <h1>{collectionDetails?.name || "Loading..."}</h1>
        <Button onClick={() => navigate("/dashboard")} variant="outlined">
          Back to Dashboard
        </Button>
      </div>

      <div className="posts-list">
        {posts.map((post) => (
          <div key={post.id} className="post-list-item">
            <div className="list-item-image">
              <img src={`${post.imageUrl}_200x200`} alt="Post preview" />
            </div>
            <div className="list-item-details">
              <h3>{post.account?.accountName}</h3>
              <p>{post.description}</p>
              <p>{post.account?.accountAddress} {post.state}</p>
              <p>{post.totalCaseCount > 0 ? `${post.totalCaseCount} cases` : "No cases specified"}</p>
            </div>
            <input
              type="checkbox"
              aria-label={`Select post ${post.account?.accountName || post.id}`}
              checked={!!selectedPosts[post.id]}
              onChange={() => handleCheckboxChange(post.id)}
              className="list-item-checkbox"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewCollection;

