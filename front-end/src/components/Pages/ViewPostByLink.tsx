import { useState, useEffect} from "react";
import {  useNavigate, useParams } from "react-router-dom";
import { PostWithID } from "../../utils/types";
import HeaderBar from "./../HeaderBar";
import { CircularProgress, Button, Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import "./viewSharedPost.css";
import MemoizedPostCard from "./../PostCard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

export const PublicPostViewer = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const user = useSelector(selectUser);
  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setError("Missing post link.");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "posts", postId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPost({ ...(docSnap.data() as PostWithID), id: docSnap.id });
        } else {
          setError("Post not found.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load the post.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

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
          onClick={() => navigate("/request-access")}
        >
          Join Displaygram to Share Your Own!
        </Button>
      </Box>
    );
  }

  return (
    <div className="view-shared-post-page">
      <HeaderBar toggleFilterMenu={() => {}} />

      <div className="view-shared-post-container">
        <div className="view-shared-post-header">
          {!user && (
            <div className="cta-hero">
              <Typography variant="h2" align="center" className="cta-heading">
                Retail displays that inspire. Results that scale.
              </Typography>

              <Typography
                variant="body1"
                align="center"
                className="cta-subtext"
              >
                Displaygram is where suppliers and distributors showcase their
                best work—and get results.
              </Typography>

              <button
                color="secondary"
                className="cta-learn-button"
                onClick={() => navigate("/request-access")}
              >
                Learn More & Get Started
              </button>
            </div>
          )}
        </div>

        <div className="view-post-by-link-page">
          {post && (
            <div className="view-post-card-wrapper">
              <MemoizedPostCard
                post={post}
                id={post.id}
                currentUserUid={user?.uid || ""}
              />
            </div>
          )}

          {!user && (
            <div className="view-post-footer-cta">
              <h3>Want to share your own displays?</h3>
              <button
                className="view-post-cta-secondary"
                onClick={() => navigate("/sign-up-login?mode=signup")}
              >
                Join Displaygram
              </button>
            </div>
          )}
        </div>
      </div>
      <div>
        <h3>Click Image For Larger View</h3>
      </div>
    </div>
  );
};

export default PublicPostViewer;
