import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PostWithID } from "../utils/types";
import HeaderBar from "./HeaderBar";
import { CircularProgress, Button, Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./viewSharedPost.css";
import MemoizedPostCard from "./PostCard";

export const ViewSharedPost = () => {
  const navigate = useNavigate();
  const { postId, token } = useParams();
  const user = useSelector(selectUser);
  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postId || !token) {
      setError("Invalid link parameters.");
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(
          "https://my-fetch-data-api.vercel.app/api/validatePostShareToken",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId, token }),
          }
        );

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
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={8}>
        <HeaderBar toggleFilterMenu={() => {}} />
        <Typography variant="h5" color="error">
          {error}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => navigate("/sign-up-login?mode=signup")}
        >
          Join Displaygram to Share Your Own!
        </Button>
      </Box>
    );
  }

  return (
    <div className=" view-shared-post-page">
      <HeaderBar toggleFilterMenu={() => {}} />

      <div className="view-shared-post-container">
        <div className="view-shared-post-header">
          <div className="cta-hero">
            <Typography variant="h2" align="center" className="cta-heading">
              Retail displays that inspire. Results that scale.
            </Typography>
            <Typography variant="body1" align="center" className="cta-subtext">
              Displaygram is where suppliers and distributors showcase their best
              work—and get results.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              className="cta-learn-button"
              onClick={() => navigate("/request-access")}
            >
              Learn More & Get Started
            </Button>
          </div>

          <div>
            <h3>Click Image For Larger View</h3>
          </div>

        </div>

        <MemoizedPostCard
          post={post as PostWithID}
          id={(post as PostWithID).id}
          currentUserUid={user?.uid || ""}
        />

        {!user && (
          <Box textAlign="center" mt={4}>
            <Typography variant="h6" gutterBottom>
              Love what you see?
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate("/sign-up-login?mode=signup")}
            >
              Join Displaygram to Share Your Own!
            </Button>
          </Box>
        )}
      </div>
      {/* i need a cta modal here */}
      {/* abstract it and we can import it */}
    </div>
  );
};

export default ViewSharedPost;
