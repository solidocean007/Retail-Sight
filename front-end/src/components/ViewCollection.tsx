import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { saveAs } from "file-saver";
import { fetchPostsByIds } from "../thunks/postsThunks";
import { useAppDispatch } from "../utils/store";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useFirebaseAuth } from "../utils/useFirebaseAuth"; // Adjust based on your auth hook
import { CollectionType, PostWithID } from "../utils/types";
import "./viewCollection.css";
import { CircularProgress } from "@mui/material";

interface SelectedPosts { // this isnt used
  [key: string]: boolean;
}

// Define a type for your function's response
interface ExportDummyDataResponse {
  url: string;
}


export const ViewCollection = () => {
  const [collectionDetails, setCollectionDetails] = // setcollectionsdetails isnt used
    useState<CollectionType | null>(null);
  const [exporting, setExporting] = useState(false); // exporting isnt used
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

  interface ExportPostsResponse {
    url?: string;
  }

  interface ExportPostsRequest {
    collectionId: string | undefined;
    postIds: string[];
  }

  useEffect(() => {
    const fetchCollection = async () => {
      console.log(collectionId)
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
          const data = docSnap.data();
          const collectionData: CollectionType = {
            name: data.name,
            ownerId: data.ownerId,
            posts: data.posts,
            sharedWith: data.sharedWith,
            isShareableOutsideCompany: data.isShareableOutsideCompany,
          };
        
          setCollectionDetails(collectionData);
          
          if (data && Array.isArray(data.posts) && data.posts.length > 0) {
            const actionResult = await dispatch(
              fetchPostsByIds({ postIds: data.posts })
            ).unwrap();
            setPosts(actionResult);

            // Assuming actionResult is an array of posts and each post has an 'id' property
            const allSelected = actionResult.reduce<SelectedPosts>(
              (acc, post) => {
                acc[post.id] = true;
                return acc;
              },
              {}
            );

            setSelectedPosts(allSelected);
          } else {
            console.log(
              "Document has no posts or posts are not in expected format."
            );
            // Handle the case where posts are missing or malformed, possibly set an error state or message
          }
        } else {
          console.log("No such document!");
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

  const downloadZipFile = async (url: string) => {
    console.log(`Starting to download zip file from: ${url}`);
    try {
      console.log("begin download??") 
      const response = await fetch(url); 
      console.log('Received response from fetch');
      const data = await response.blob();
      console.log('Converted response to blob');
      const downloadUrl = window.URL.createObjectURL(data);
      console.log(`Generated download URL: ${downloadUrl}`);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", "exported_posts.zip");
      document.body.appendChild(link);
      link.click();
      console.log('Link clicked for download');
      link.remove(); // Clean up
    } catch (error) {
      console.error("Failed to download the file:", error); 
    }
  };

  const handleExportSelected = async () => {
    console.log("Starting handleExportSelected");
    if (!currentUser) {
      navigate("/sign-up-login");
      return;
    }

    const postIdsToExport = posts
      .filter((post) => selectedPosts[post.id])
      .map((post) => post.id);

    if (postIdsToExport.length === 0) {
      alert("No posts selected for export.");
      return;
    }
    console.log(`Filtered posts, total posts to export: ${postIdsToExport.length}`);

    if (postIdsToExport.length === 0) {
      console.log("No posts selected for export, alerting user");
      alert("No posts selected for export.");
      return;
    }

    try {
      console.log("Attempting to call exportPosts cloud function");
      const functions = getFunctions();
      const exportPostsFn = httpsCallable<
        ExportPostsRequest,
        ExportPostsResponse
      >(functions, "exportPosts");
      console.log("Cloud function call successful, result received"); // this logs
      setExporting(true);

      const result = await exportPostsFn({ collectionId, postIds: postIdsToExport });
      console.log(result)
      setExporting(false); 

      if (result.data.url) {
        console.log(`Download URL received: ${result.data.url}, initiating download`); // this line logs the correct url to begin download
        downloadZipFile(result.data.url); 
      } else {
        console.log("No URL received from cloud function, alerting user");
        alert("Failed to export posts. Please try again.");
      }
    } catch (error) {
      console.error("Error exporting posts:", error);
      setExporting(false); 
      alert("Error exporting posts. Please try again."); // Error exporting posts. Please try again.
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  const handleBackButton = () => {
    navigate('/collections')
  }

  return (
    <div className="view-collection-container">
      <div className="view-collection-header">
        <h1>
          Collection:{" "}
          {collectionDetails ? collectionDetails.name : <CircularProgress />}
        </h1>
        <button onClick={handleExportSelected}>Export Selected</button>
        <button onClick={handleBackButton}>Back</button>
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
