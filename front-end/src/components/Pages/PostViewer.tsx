import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PostWithID } from "../../utils/types";
import HeaderBar from "../HeaderBar";
import { CircularProgress, Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import MemoizedPostCard from "../PostCard";
import { db } from "../../utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import "./viewSharedPost.css";

const PostViewer = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const user = useSelector(selectUser);

  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postId) {
      setError("Missing post ID.");
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);

        if (!snap.exists()) {
          setError("Post not found.");
          return;
        }

        setPost({ ...(snap.data() as PostWithID), id: snap.id });
      } catch (err: any) {
        console.error("Failed to load post:", err);
        setError("Unable to load this post.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // ---------------------------------------
  // Loading UI
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
  // Error UI
  // ---------------------------------------
  if (error) {
    return (
      <Box textAlign="center" mt={8}>
        <HeaderBar toggleFilterMenu={() => {}} />

        <Typography variant="h6" color="error" mb={2}>
          {error}
        </Typography>

        <Typography
          variant="body2"
          onClick={() => navigate(-1)}
          sx={{ cursor: "pointer", color: "var(--primary)" }}
        >
          Go Back
        </Typography>
      </Box>
    );
  }

  // ---------------------------------------
  // Valid Post
  // ---------------------------------------
  return (
    <>
      <HeaderBar toggleFilterMenu={() => {}} />

      <div className="view-shared-post-container">
        {post && (
          <MemoizedPostCard
            post={post}
            id={post.id}
            currentUserUid={user?.uid || ""}
          />
        )}
      </div>
    </>
  );
};

export default PostViewer;
