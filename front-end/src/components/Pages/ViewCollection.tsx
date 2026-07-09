import {
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
import { fetchPostsByCollectionId } from "../../thunks/postsThunks";
import { db } from "../../utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAppDispatch } from "../../utils/store";
import { CollectionType, PostWithID } from "../../utils/types";
import "./viewCollection.css";
import { derivePostImageVariants } from "../../utils/PostLogic/derivePostImageVariants";

const ViewCollection = () => {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const dispatch = useAppDispatch();

  const [collectionDetails, setCollectionDetails] =
    useState<CollectionType | null>(null);
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Record<string, boolean>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const loadCollection = async () => {
      if (!collectionId) {
        navigate("/page-not-found");
        return;
      }

      try {
        setLoading(true);

        const snap = await getDoc(doc(db, "collections", collectionId));

        if (!snap.exists()) {
          navigate("/page-not-found");
          return;
        }

        const data = snap.data();

        setCollectionDetails({
          companyId: data.companyId ?? "",
          name: data.name ?? "Untitled Collection",
          description: data.description ?? "",
          ownerId: data.ownerId ?? "",
          posts: Array.isArray(data.posts) ? data.posts : [],
          sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
          isShareableOutsideCompany: data.isShareableOutsideCompany ?? false,
        } as CollectionType);

        setPreviewImages(
          Array.isArray(data.previewImages) ? data.previewImages : [],
        );

        const results = await dispatch(
          fetchPostsByCollectionId(collectionId),
        ).unwrap();

        setPosts(results);

        setSelectedPosts(
          results.reduce<Record<string, boolean>>((acc, post) => {
            acc[post.id] = true;
            return acc;
          }, {}),
        );
      } catch (err) {
        console.error("ViewCollection failed:", err);
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
      ? `${window.location.origin}/p/${postId}`
      : `${window.location.origin}/view-collection/${collectionId}`;

    navigator.clipboard.writeText(url);
    setSnackbarOpen(true);
  };

  const formatDisplayDate = (iso?: string) => {
    if (!iso) return "Date unavailable";

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) return "Date unavailable";

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
      <Container maxWidth="xl" sx={{ py: 4 }}>
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
              sessionStorage.setItem("dashboardMode", "CollectionsMode");
              navigate("/dashboard");
            }}
          >
            ← Back to Collections
          </button>
        </Stack>

        <div className="posts-grid">
          {posts.map((post, index) => {
            const imageSet = derivePostImageVariants(post);
            const cardImage =
              imageSet.feedSrc || post.imageUrl || post.originalImageUrl || "";

            return (
              <Card key={post.id} sx={{ position: "relative" }}>
                <CardMedia
                  component="img"
                  height="400"
                  image={cardImage}
                  alt="Post image"
                  sx={{ objectFit: "cover" }}
                />

                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6">
                      {post.account?.accountName || "Unknown Store"}
                    </Typography>

                    <Typography variant="body2">
                      {post.description || "No description"}
                    </Typography>

                    <Typography variant="body2">
                      📅 {formatDisplayDate(post.displayDate)}
                    </Typography>

                    <Typography variant="body2">
                      📍 {post.account?.accountAddress || "Address unavailable"}{" "}
                      {post.state || ""}
                    </Typography>

                    <Typography variant="body2">
                      🧃 Brands: {post.brands?.join(", ") || "N/A"}
                    </Typography>

                    <Typography variant="body2">
                      🔖 Hashtags: {post.hashtags?.join(" ") || "None"}
                    </Typography>

                    <Typography variant="body2">
                      👤 {post.postUser?.firstName || ""}{" "}
                      {post.postUser?.lastName || ""}
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
            );
          })}
        </div>

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
