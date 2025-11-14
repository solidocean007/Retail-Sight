import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PostWithID } from "../../utils/types";
import HeaderBar from "./../HeaderBar";
import { CircularProgress, Button, Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import "./viewSharedPost.css";
import MemoizedPostCard from "./../PostCard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

export const ViewPostByLink = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const user = useSelector(selectUser);
  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  console.log("viewpostbylink")

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
    <div className=" view-shared-post-page">
      <HeaderBar toggleFilterMenu={() => {}} />
        <button className="btn-secondary" onClick={()=>navigate("/user-home-page")}>Home</button>

      <div className="view-shared-post-container">
        <MemoizedPostCard
          post={post as PostWithID}
          id={(post as PostWithID).id}
          currentUserUid={user?.uid || ""}
        />
      </div>
    </div>
  );
};

export default ViewPostByLink;
