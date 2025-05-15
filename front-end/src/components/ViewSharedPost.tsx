// viewsharedpost.tsx
import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PostWithID } from "../utils/types";
import "./viewSharedPost.css";
import HeaderBar from "./HeaderBar";
import { CircularProgress } from "@mui/material";

export const ViewSharedPost = () => {
  const navigate = useNavigate();
  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const postId = query.get("id");
  const token = query.get("token");

useEffect(() => {
  if (!postId || !token) {
    console.error("Missing postId or token in URL.");
    setError("Invalid link parameters.");
    setLoading(false);
    return;
  }

  const loadAndValidatePost = async () => {
    try {
      console.log("Validating post with Vercel API:", { postId, token });

      const response = await fetch('https://my-fetch-data-api.vercel.app/api/validatePostShareToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, token }),
      });

      const result = await response.json();

      console.log("Validation response:", result);

      if (result.valid && result.post) {
        setPost(result.post);
      } else {
        console.error("Token validation failed or post not found.");
        setError("Invalid or expired token for this post.");
      }
    } catch (err: any) {
      console.error("Error during validation:", err);
      const message = err?.message || "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  loadAndValidatePost();
}, [postId, token]);


  if (loading) {
    return (
      <div className="view-shared-post-container">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-shared-post-container">
        <HeaderBar toggleFilterMenu={() => {}} />
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const formattedDate = post?.displayDate
    ? new Date(post.displayDate).toLocaleDateString()
    : "N/A";

  return (
    <div className="view-shared-post-container">
      <HeaderBar toggleFilterMenu={() => {}} />
      <div className="list-card">
        <div className="post-card dynamic-height">
          <div className="card-content">
            <div className="post-header" onClick={() => navigate("/")}>
              <h1>Check out this post from Displaygram.com</h1>
            </div>
            <div className="header-bottom">
              <div className="details-date">
                <div className="store-details">
                  <div className="store-name-number">
                    <h3>{post?.account?.accountName}</h3>
                  </div>
                  <div className="store-address-box">
                    <h5>{post?.account?.accountAddress}</h5>
                  </div>
                </div>
                <h5>date: {formattedDate}</h5>
              </div>

              <div className="post-user-details">
                <div className="post-user-name">
                  <p>by:</p>
                  <h4>
                    {`${post?.createdBy.firstName} ${post?.createdBy.lastName}`}
                  </h4>
                </div>
                <div className="user-company-box">
                  <p>company: </p>
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    {post?.createdBy.company}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div>{post?.description}</div>
          <img src={post?.imageUrl} alt="Shared post" />
        </div>
      </div>
    </div>
  );
};

export default ViewSharedPost;

