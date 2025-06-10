import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Checkbox,
  Container,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  CircularProgress,
  Button,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPostsByCollectionId } from "../thunks/postsThunks";
import { db } from "../utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAppDispatch } from "../utils/store";
import { CollectionType, PostWithID } from "../utils/types";
import "./viewCollection.css";

const ViewCollection = () => {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const dispatch = useAppDispatch();

  const [collectionDetails, setCollectionDetails] =
    useState<CollectionType | null>(null);
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<{ [id: string]: boolean }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const loadCollection = async () => {
      if (!collectionId) return navigate("/page-not-found");

      try {
        const snap = await getDoc(doc(db, "collections", collectionId));
        if (!snap.exists()) return navigate("/page-not-found");

        const data = snap.data();
        setCollectionDetails({
          name: data.name,
          ownerId: data.ownerId,
          posts: data.posts,
          sharedWith: data.sharedWith,
          isShareableOutsideCompany: data.isShareableOutsideCompany,
        });

        const results = await dispatch(
          fetchPostsByCollectionId(collectionId)
        ).unwrap();
        setPosts(results);
        setSelectedPosts(
          results.reduce((acc, post) => ({ ...acc, [post.id]: true }), {})
        );
      } catch (err) {
        console.error(err);
        navigate("/access-denied");
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [collectionId, dispatch, navigate]);

  const handleCheckboxChange = (postId: string) => {
    setSelectedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCopyLink = (postId?: string) => {
    const url = postId
      ? `${window.location.origin}/view-post/${postId}`
      : `${window.location.origin}/view-collection/${collectionId}`;
    navigator.clipboard.writeText(url);
    setSnackbarOpen(true);
  };

  const formatDisplayDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;

  return (
    <div className="view-collection-page">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          mb={3}
        >
          <Typography variant="h4">{collectionDetails?.name}</Typography>
          <Tooltip title="Copy collection link">
            <IconButton onClick={() => handleCopyLink()}>
              <ShareIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={() => navigate("/user-home-page")}
            sx={{ mt: 2 }}
          >
            Go to Home
          </Button>

          <button
            className="back-to-dashboard-btn"
            onClick={() => {
              navigate("/dashboard"); // ← this causes Dashboard to mount fresh
              sessionStorage.setItem("dashboardMode", "CollectionsMode"); // optional fallback
            }}
          >
            ← Back to Collections
          </button>
        </Stack>

        <Stack spacing={3}>
          {posts.map((post) => (
            <Card key={post.id} sx={{ position: "relative" }}>
              <CardMedia
                component="img"
                height="400"
                image={post.imageUrl}
                alt="Post image"
                sx={{ objectFit: "cover" }}
              />
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6">
                    {post.account?.accountName || "Unknown Store"}
                  </Typography>
                  <Typography variant="body2">{post.description}</Typography>
                  <Typography variant="body2">
                    📅 {formatDisplayDate(post.displayDate)}
                  </Typography>
                  <Typography variant="body2">
                    📍 {post.account?.accountAddress} {post.state}
                  </Typography>
                  <Typography variant="body2">
                    🧃 Brands: {post.brands?.join(", ") || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    🔖 Hashtags: {post.hashtags?.join(" ") || "None"}
                  </Typography>
                  <Typography variant="body2">
                    👤 {post.postUser?.firstName} {post.postUser?.lastName}
                  </Typography>
                  <Typography variant="body2">
                    📦 {post.totalCaseCount || "No"} cases
                  </Typography>
                </Stack>
                <Checkbox
                  checked={!!selectedPosts[post.id]}
                  onChange={() => handleCheckboxChange(post.id)}
                  sx={{ position: "absolute", top: 8, right: 8 }}
                />
                <Tooltip title="Copy link to this post">
                  <IconButton
                    onClick={() => handleCopyLink(post.id)}
                    sx={{ position: "absolute", top: 8, right: 48 }}
                  >
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000}
          onClose={() => setSnackbarOpen(false)}
          message="Link copied to clipboard"
        />
      </Container>
    </div>
  );
};

export default ViewCollection;
