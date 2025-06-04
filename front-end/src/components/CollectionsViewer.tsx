import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Grid,
  Tooltip,
  Stack,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import { Delete, Share } from "@mui/icons-material";
import { db } from "../utils/firebase";
import {
  collection as firestoreCollection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useDispatch } from "react-redux";
import CollectionForm from "./CollectionForm";
import CustomConfirmation from "./CustomConfirmation";
import { CollectionType, CollectionWithId } from "../utils/types";
import {
  addOrUpdateCollection,
  deleteUserCreatedCollectionFromIndexedDB,
  getCollectionsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { showMessage } from "../Slices/snackbarSlice";

const CollectionsViewer = () => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null
  );
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] =
    useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(
        firestoreCollection(db, "collections")
      );
      const fetchedCollections = querySnapshot.docs.map((doc) => ({
        ...(doc.data() as CollectionType),
        id: doc.id,
      }));

      for (const collection of fetchedCollections) {
        await addOrUpdateCollection(collection);
      }

      setCollections(fetchedCollections);
    } catch (error) {
      console.error("Error fetching collections: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCollections = async () => {
      setLoading(true);
      const localCollections = await getCollectionsFromIndexedDB();
      setCollections(localCollections);
      await fetchCollections();
      setLoading(false);
    };

    loadCollections();
  }, []);

  const handleAddCollection = async (newCollection: CollectionType) => {
    try {
      await addDoc(firestoreCollection(db, "collections"), newCollection);
      await fetchCollections();
    } catch (error) {
      console.error("Error adding collection: ", error);
    }
  };

  const handleDeleteCollectionConfirmed = async () => {
    if (collectionToDelete) {
      try {
        await deleteDoc(doc(db, "collections", collectionToDelete));
        await deleteUserCreatedCollectionFromIndexedDB(collectionToDelete);
        setCollections((prev) =>
          prev.filter((c) => c.id !== collectionToDelete)
        );
        setCollectionToDelete(null);
      } catch (error) {
        console.error("Error deleting collection: ", error);
      }
    }
    setIsConfirmationOpen(false);
  };

  const handleCollectionClick = (collection: CollectionWithId) => {
    if (collection.posts.length > 0) {
      navigate(`/view-collection/${collection.id}`);
    } else {
      dispatch(showMessage("No posts are in this collection yet."));
    }
  };

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/view-collection/${id}`
    );
    dispatch(showMessage("Link copied to clipboard"));
  };

  return (
    <Box p={3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">Your Collections</Typography>
        <Button
          variant="contained"
          onClick={() => setShowCreateCollectionDialog(true)}
        >
          Create Collection
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3}>
          {collections.map((collection) => {
            const sampleImages = (collection.previewImages || []).slice(0, 6);

            return (
              <Grid item xs={12} sm={6} md={4} key={collection.id}>
                <Card sx={{ p: 2, position: "relative" }}>
                  <Box display="flex" justifyContent="center" gap={-2}>
                    {sampleImages.map((url, index) => (
                      <CardMedia
                        key={index}
                        component="img"
                        src={url}
                        alt={`preview-${index}`}
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 1,
                          boxShadow: 2,
                          transform: `rotate(${index * 2 - 9}deg)`, // more angled
                          marginLeft: index === 0 ? 0 : -1, // tighter overlap
                          zIndex: sampleImages.length - index,
                        }}
                      />
                    ))}
                  </Box>

                  <CardContent>
                    <Typography variant="h6" noWrap>
                      {collection.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {collection.posts.length} post
                      {collection.posts.length !== 1 ? "s" : ""}
                    </Typography>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mt={2}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleCollectionClick(collection)}
                      >
                        View
                      </Button>
                      <Tooltip title="Copy link">
                        <IconButton
                          onClick={() => handleCopyLink(collection.id)}
                        >
                          <Share />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => setCollectionToDelete(collection.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <CollectionForm
        isOpen={showCreateCollectionDialog}
        onAddCollection={handleAddCollection}
        onClose={() => setShowCreateCollectionDialog(false)}
      />

      <CustomConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleDeleteCollectionConfirmed}
        message="Are you sure you want to delete this collection?"
      />
    </Box>
  );
};

export default CollectionsViewer;
