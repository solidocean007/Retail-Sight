import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PostWithID } from "../utils/types";
import HeaderBar from "./HeaderBar";
import { CircularProgress, Button, Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./viewSharedPost.css";

export const ViewSharedPost = () => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const postId = query.get("id");
  const token = query.get("token");

  useEffect(() => {
    if (!postId || !token) {
      setError("Invalid link parameters.");
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch("https://my-fetch-data-api.vercel.app/api/validatePostShareToken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, token }),
        });

        const result = await response.json();
        if (!response.ok || !result.valid || !result.post) {
          setError(result.error || "Invalid or expired token.");
        } else {
          setPost(result.post);
        }
      } catch (err: any) {
        setError(err?.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [postId, token]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={8}>
        <HeaderBar toggleFilterMenu={() => {}} />
        <Typography variant="h5" color="error">{error}</Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={() => navigate("/")}>
          Go Back Home
        </Button>
      </Box>
    );
  }

  const formattedDate = post?.displayDate ? new Date(post.displayDate).toLocaleDateString() : "N/A";

  return (
    <div className="view-shared-post-container">
      <HeaderBar toggleFilterMenu={() => {}} />
      <Box mx="auto" maxWidth="600px" p={2} boxShadow={3} borderRadius={2} mt={4} bgcolor="background.paper">
        <Typography variant="h4" gutterBottom>
          Check out this display from Displaygram
        </Typography>
        <Typography variant="h6" gutterBottom>
          {post?.account?.accountName}
        </Typography>
        <Typography variant="body2" gutterBottom>
          {post?.account?.accountAddress}
        </Typography>
        <Typography variant="body2" gutterBottom>
          Date: {formattedDate}
        </Typography>
        <Typography variant="body2" gutterBottom>
          By: {post?.createdBy.firstName} {post?.createdBy.lastName} from {post?.createdBy.company}
        </Typography>
        <Box my={2}>
          <Typography variant="body1">{post?.description}</Typography>
        </Box>
        {post?.imageUrl && <img src={post.imageUrl} alt="Shared post" style={{ width: "100%", borderRadius: "8px" }} />}
        {!user && (
          <Box textAlign="center" mt={4}>
            <Typography variant="h6" gutterBottom>Love what you see?</Typography>
            <Button variant="contained" color="secondary" onClick={() => navigate("/signup")}>
              Join Displaygram to Share Your Own!
            </Button>
          </Box>
        )}
      </Box>
    </div>
  );
};

export default ViewSharedPost;
