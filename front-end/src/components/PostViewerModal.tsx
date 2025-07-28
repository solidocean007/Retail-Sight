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
  postId: string;
  open: boolean;
  onClose: () => void;
  currentUserUid: string;
}

const PostViewerModal: React.FC<PostViewerModalProps> = ({
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
    const fetchPost = async () => {
      if (cachedPost) {
        setPost(cachedPost);
        setLoading(false);
      } else {
        try {
          const docRef = doc(db, "posts", postId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
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
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.7)", // ✅ darker overlay
        },
      }}
      PaperProps={{
        sx: {
          p: 0,
          backgroundColor: "transparent",
          boxShadow: "none",
          overflow: "visible",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "var(--dashboard-header-background)",
          px: 2,
          py: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        View Post
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers={false}
        sx={{
          p: 0,
          overflowY: "auto",
          backgroundColor: "transparent",
          maxHeight: "90vh", // ✅ ensures scroll area is bounded to screen
          display: "flex",
          justifyContent: "center",
        }}
      >
        {loading ? (
          <Box sx={{ p: 4 }}>
            <CircularProgress />
          </Box>
        ) : post ? (
          <Box
            sx={{
              width: "100%",
              maxWidth: isMobile ? "100%" : "660px", // ⬅️ card width max
              borderRadius: "12px",
              overflow: "hidden",
              mx: "auto",
            }}
          >
            <PostCard
              id={post.id}
              post={post}
              currentUserUid={currentUserUid}
              style={{}}
              postIdToScroll={post.id}
            />
          </Box>
        ) : (
          <Box p={2}>
            <p>Post not found.</p>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PostViewerModal;
