import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PostWithID } from "../utils/types";
import HeaderBar from "./HeaderBar";
import { CircularProgress, Button, Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./viewSharedPost.css";
import MemoizedPostCard from "./PostCard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

export const ViewSharedPost = () => {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const user = useSelector(selectUser);
  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const token = query.get("token");

  const fetchPostDirectly = async (id: string) => {
    try {
      setLoading(true);
      const docRef = doc(db, "posts", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setPost({ ...(docSnap.data() as PostWithID), id: docSnap.id });
      } else {
        setError("Post not found.");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while loading the post.");
    } finally {
      setLoading(false);
    }
  };

  const validateSharedLink = async (id: string, token: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/validatePostShareToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: id, token }),
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

  // if (!user && !token) {
  //   // Save the full current location
  //   localStorage.setItem(
  //     "postRedirect",
  //     window.location.pathname + window.location.search
  //   );
  //   navigate("/login");
  //   return;
  // }

  useEffect(() => {
    // 🧠 Don't run anything until we *know* whether user is signed in
    if (user === undefined) return;
    console.log("current user:", user);

    if (!postId) {
      navigate("/page-not-found");
      setError("Missing post ID.");
      setLoading(false);
      return;
    }

    if (user) {
      fetchPostDirectly(postId);
    } else if (token) {
      validateSharedLink(postId, token);
    } else {
      setError("Missing access token."); // why does this render in the window?  im trying to access the page 
      setLoading(false);
    }
  }, [postId, token, user]);

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
              onClick={() => navigate("/request-access")}
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
