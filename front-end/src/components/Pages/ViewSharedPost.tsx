import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PostWithID } from "../../utils/types";
import HeaderBar from "../HeaderBar";
import { CircularProgress, Button, Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import "./viewSharedPost.css";
import MemoizedPostCard from "../PostCard";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../utils/firebase";

const ViewSharedPost = () => {
  const navigate = useNavigate();
  const { postId, token } = useParams();

  const user = useSelector(selectUser);

  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postId || !token) {
      setError("Invalid share link.");
      setLoading(false);
      return;
    }

    const validate = async () => {
      try {
        const functions = getFunctions();
        const validateFn = httpsCallable(
          functions,
          "validatePostShareToken"
        );

        const result: any = await validateFn({ postId, token });

        if (!result.data?.valid) {
          setError(result.data?.error || "Invalid or expired share link.");
        } else {
          // We validated the token AND retrieved the sanitized post
          setPost(result.data.post as PostWithID);
        }
      } catch (err: any) {
        console.error("Share link validation failed:", err);
        setError(err.message || "Something went wrong validating this link.");
      } finally {
        setLoading(false);
      }
    };

    validate();
  }, [postId, token]);

  // ---------------------------------------
  // Loading State
  // ---------------------------------------
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

  // ---------------------------------------
  // Error State
  // ---------------------------------------
  if (error) {
    return (
      <Box textAlign="center" mt={8}>
        <HeaderBar toggleFilterMenu={() => {}} />

        <Typography variant="h5" color="error" mb={2}>
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

  // ---------------------------------------
  // Valid Post — Render Like Normal
  // ---------------------------------------
  return (
    <div className="view-shared-post-page">
      <HeaderBar toggleFilterMenu={() => {}} />

      <div className="view-shared-post-container">
        <div className="view-shared-post-header">
          <div className="cta-hero">
            <Typography variant="h2" align="center" className="cta-heading">
              Retail displays that inspire. Results that scale.
            </Typography>

            <Typography variant="body1" align="center" className="cta-subtext">
              Displaygram is where suppliers and distributors showcase their
              best work—and get results.
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

        {post && (
          <MemoizedPostCard
            post={post}
            id={post.id}
            currentUserUid={user?.uid || ""}
          />
        )}

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
    </div>
  );
};

export default ViewSharedPost;
