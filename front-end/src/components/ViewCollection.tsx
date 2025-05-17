import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../utils/store";
import { useFirebaseAuth } from "../utils/useFirebaseAuth";
import { CollectionType, PostWithID } from "../utils/types";
import { CircularProgress, Button } from "@mui/material";
import { db } from "../utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import { fetchPostsByCollectionId } from "../thunks/postsThunks";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./viewCollection.css";

export const ViewCollection = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentUser } = useFirebaseAuth();

  const [collectionDetails, setCollectionDetails] =
    useState<CollectionType | null>(null);
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<{ [id: string]: boolean }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [imageSize, setImageSize] = useState<"small" | "medium" | "large">(
    "medium"
  );

  useEffect(() => {
    const loadCollection = async () => {
      if (!collectionId) {
        navigate("/page-not-found");
        return;
      }

      setLoading(true);
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

        const actionResult = await dispatch(
          fetchPostsByCollectionId(collectionId)
        ).unwrap();
        setPosts(actionResult);

        const initialSelection = actionResult.reduce((acc, post) => {
          acc[post.id] = true;
          return acc;
        }, {} as { [id: string]: boolean });

        setSelectedPosts(initialSelection);
      } catch (error) {
        console.error("Error loading collection:", error);
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

  const handleExportSelected = async () => {
    const postIdsToExport = posts
      .filter((post) => selectedPosts[post.id])
      .map((post) => post.id);
    if (postIdsToExport.length === 0) {
      alert("No posts selected for export.");
      return;
    }

    try {
      const functions = getFunctions();
      const exportPostsFn = httpsCallable(functions, "exportPosts");
      setExporting(true);
      const result: any = await exportPostsFn({
        collectionId,
        postIds: postIdsToExport,
      });

      if (result.data?.url) {
        const response = await fetch(result.data.url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", "exported_posts.zip");
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        alert("Failed to export posts.");
      }
    } catch (error) {
      console.error("Error exporting posts:", error);
      alert("Error exporting posts.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  const getImageSizeStyle = () => {
    switch (imageSize) {
      case "small":
        return { width: "100%", maxWidth: "200px", height: "auto" };
      case "medium":
        return { width: "100%", maxWidth: "400px", height: "auto" };
      case "large":
        return { width: "100%", maxWidth: "800px", height: "auto" };
      default:
        return { width: "100%", maxWidth: "400px", height: "auto" };
    }
  };

  return (
    <div className="view-collection-container">
      <div className="view-collection-header">
        <h1>{collectionDetails?.name}</h1>
        <Button
          onClick={handleExportSelected}
          disabled={exporting}
          variant="outlined"
        >
          {exporting ? "Exporting..." : "Export Selected"}
        </Button>
        <div className="image-size-controls">
          <Button
            onClick={() => setImageSize("small")}
            variant={imageSize === "small" ? "contained" : "outlined"}
          >
            Small
          </Button>
          <Button
            onClick={() => setImageSize("medium")}
            variant={imageSize === "medium" ? "contained" : "outlined"}
          >
            Medium
          </Button>
          <Button
            onClick={() => setImageSize("large")}
            variant={imageSize === "large" ? "contained" : "outlined"}
          >
            Large
          </Button>
        </div>

        <Button onClick={() => navigate("/dashboard")} variant="outlined">
          Back to Dashboard
        </Button>
      </div>

      <div className="posts-list">
        {posts.map((post) => (
          <div key={post.id} className="post-list-item">
            <div className="list-item-image">
              <img
                src={post.imageUrl}
                alt="Post Preview"
                style={getImageSizeStyle()}
              />
            </div>
            <div className="list-item-details">
              <h3>{post.account?.accountName}</h3>
              <p>{post.description}</p>
              <p>
                {post.account?.accountAddress} {post.state}
              </p>
              <p>
                {post.totalCaseCount > 0
                  ? `${post.totalCaseCount} cases`
                  : "No cases specified"}
              </p>
            </div>
            <input
              type="checkbox"
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
