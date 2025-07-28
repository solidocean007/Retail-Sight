import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  CircularProgress,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { PostWithID } from "../utils/types";
import { RootState } from "../utils/store";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import PostCard from "./PostCard"; // or your renderer

interface PostViewerModalProps {
  key: () => void;
  postId: string;
  open: boolean;
  onClose: () => void;
  currentUserUid: string;
}

const PostViewerModal: React.FC<PostViewerModalProps> = ({
  key,
  postId,
  open,
  onClose,
  currentUserUid,
}) => {
  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const cachedPost = useSelector((state: RootState) =>
    state.posts.posts.find((p) => p.id === postId)
  );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    console.log("📦 Modal received postId:", postId);
  }, [postId]);

  useEffect(() => {
    const fetchPost = async () => {
      if (cachedPost) {
        console.log("using cached post to display modal: ", postId);
        setPost(cachedPost);
        setLoading(false);
      } else {
        try {
          const docRef = doc(db, "posts", postId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            console.log("fetching post to display modal: ", postId);
            setPost({ ...(docSnap.data() as PostWithID), id: postId });
          }
        } catch (err) {
          console.error("Error fetching post:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    if (open) {
      setPost(null);
      setLoading(true);
      fetchPost();
    }
  }, [postId, open, cachedPost]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll="body"
      maxWidth={false}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.9)",
          },
        },
        paper: {
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        },
      }}
    >
      {/* 🔒 Fixed Close Button (outside scrollable content) */}
      <Box
        sx={{
          position: "fixed",
          top: "16px",
          right: "24px",
          zIndex: 1401, // > Modal backdrop (default 1200) and Dialog paper (1300)
          pointerEvents: "none", // prevent Box itself from blocking clicks
        }}
      >
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{
            pointerEvents: "auto", // only the button is clickable
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#fff",
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* 💬 Scrollable Content */}
      <DialogContent
        sx={{
          p: 0,
          overflow: "auto",
           maxHeight: "90vh",
        }}
      >
        <Box
          sx={{
            mx: "auto",
            maxWidth: 660,
            width: "100%",
            background: "transparent",
          }}
        >
          {loading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : post ? (
            <PostCard
              id={post.id}
              post={post}
              currentUserUid={currentUserUid}
              style={{}}
              postIdToScroll={post.id}
            />
          ) : (
            <Box p={2}>
              <p>Post not found.</p>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PostViewerModal;
