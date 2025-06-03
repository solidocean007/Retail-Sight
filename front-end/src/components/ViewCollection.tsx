import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Checkbox,
  Button,
  IconButton,
  CircularProgress,
  Snackbar,
  Tooltip,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { useAppDispatch } from "../utils/store";
import { fetchPostsByCollectionId } from "../thunks/postsThunks";
import { db } from "../utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import { CollectionType, PostWithID } from "../utils/types";

const ViewCollection = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
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
          results.reduce((acc, post) => {
            acc[post.id] = true;
            return acc;
          }, {} as { [id: string]: boolean })
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/view-collection/${collectionId}`
    );
    setSnackbarOpen(true);
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;

  function formatDisplayDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {collectionDetails?.name}
      </Typography>
      <Tooltip title="Copy shareable link">
        <IconButton onClick={handleCopyLink}>
          <ShareIcon />
        </IconButton>
      </Tooltip>

      <Grid container spacing={3}>
        {posts.map((post) => (
          <Grid item xs={12} sm={6} md={6} key={post.id}>
            <Card sx={{ position: "relative" }}>
              <CardMedia
                component="img"
                height="440"
                image={post.imageUrl}
                alt="Post image"
              />
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">
                  {post.account?.accountName}
                </Typography>
                <Typography variant="body2">{post.description}</Typography>
                <Typography variant="body2">
                  Date: {formatDisplayDate(post.displayDate)}
                </Typography>
                {/* <Typography variant="body2">
                  Brands: {(post.brands ?? []).join(", ")}
                </Typography> */}
                <Typography variant="body2">
                  Hashtags:{" "}
                  {(post.hashtags ?? []).map((tag) => `${tag}`).join(" ")}
                </Typography>
                <Typography variant="body2">
                  Created by: {post.createdBy?.firstName}{" "}
                  {post.createdBy?.lastName}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {post.account?.accountAddress} {post.state}
                </Typography>
                <Typography variant="body2">
                  {post.totalCaseCount
                    ? `${post.totalCaseCount} cases`
                    : "No cases specified"}
                </Typography>
              </CardContent>
              <Checkbox
                checked={!!selectedPosts[post.id]}
                onChange={() => handleCheckboxChange(post.id)}
                sx={{ position: "absolute", top: 8, right: 8 }}
              />
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="Link copied to clipboard"
      />
    </Container>
  );
};

export default ViewCollection;
