import { useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import {
  Button,
  CircularProgress,
  InputAdornment,
  TextField,
} from "@mui/material";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { showMessage } from "../Slices/snackbarSlice";
import { selectUser } from "../Slices/userSlice";
import { useCompanyCollections } from "../hooks/useCompanyCollections";
import { db } from "../utils/firebase";
import { CreateCollectionInput } from "../utils/types";
import CollectionCard from "./CollectionCard";
import CollectionForm from "./CollectionForm";
import CustomConfirmation from "./CustomConfirmation";

import "./collectionsViewer.css";

const CollectionsViewer = () => {
  const user = useSelector(selectUser);
  const {
    collections,
    loading,
    fetchCollections,
    createCollection,
    deleteCollection,
  } = useCompanyCollections(user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  );
  const [sharingCollectionId, setSharingCollectionId] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] =
    useState(false);

  const visibleCollections = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return [...collections]
      .filter(
        (collection) =>
          !search ||
          [collection.name, collection.description].some((value) =>
            value?.toLowerCase().includes(search),
          ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collections, searchTerm]);

  const totalPostCount = useMemo(
    () =>
      collections.reduce(
        (total, collection) => total + (collection.posts?.length ?? 0),
        0,
      ),
    [collections],
  );

  const handleAddCollection = async (input: CreateCollectionInput) => {
    try {
      await createCollection(input);
    } catch (error) {
      console.error("Error adding collection:", error);
      dispatch(showMessage("Could not create collection."));
      throw error;
    }
  };

  const handleDeleteCollectionConfirmed = async () => {
    if (!collectionToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteCollection(collectionToDelete);
      setCollectionToDelete(null);
      dispatch(showMessage("Collection deleted."));
    } catch (error) {
      console.error("Error deleting collection:", error);
      dispatch(showMessage("Could not delete collection."));
    } finally {
      setDeleting(false);
    }
  };

  const handleCollectionClick = (collectionId: string, postCount: number) => {
    if (postCount === 0) {
      dispatch(showMessage("Add a post before opening this collection."));
      return;
    }
    navigate(`/view-collection/${collectionId}`, {
      state: { returnToDashboard: true },
    });
  };

  const handleCopyLink = async (id: string, alreadyShareable: boolean) => {
    if (sharingCollectionId) return;
    setSharingCollectionId(id);
    try {
      if (!alreadyShareable) {
        await updateDoc(doc(db, "collections", id), {
          isShareableOutsideCompany: true,
          updatedAt: serverTimestamp(),
        });
        await fetchCollections();
      }
      await navigator.clipboard.writeText(
        `${window.location.origin}/view-collection/${id}`,
      );
      dispatch(
        showMessage(
          alreadyShareable
            ? "Public collection link copied."
            : "Public link enabled and copied.",
        ),
      );
    } catch (error) {
      console.error("Error enabling collection sharing:", error);
      dispatch(showMessage("Could not create share link."));
    } finally {
      setSharingCollectionId(null);
    }
  };

  const selectedCollectionName = collections.find(
    (collection) => collection.id === collectionToDelete,
  )?.name;

  return (
    <main className="collections-page">
      <header className="collections-page__header">
        <div className="collections-page__title-group">
          <span className="collections-page__mark" aria-hidden="true">
            <CollectionsBookmarkOutlinedIcon />
          </span>
          <div>
            <span className="collections-page__eyebrow">Workspace</span>
            <h1>Collections</h1>
            <p>Organize useful displays into focused, shareable sets.</p>
          </div>
        </div>
        <Button
          className="collections-create-button"
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={() => setShowCreateCollectionDialog(true)}
        >
          New collection
        </Button>
      </header>

      <section
        className="collections-library"
        aria-labelledby="collections-library-title"
      >
        <div className="collections-library__heading">
          <div>
            <h2 id="collections-library-title">Collection library</h2>
            <p>
              {collections.length.toLocaleString()} collection
              {collections.length === 1 ? "" : "s"} ·{" "}
              {totalPostCount.toLocaleString()} saved post
              {totalPostCount === 1 ? "" : "s"}
            </p>
          </div>
          {loading && collections.length > 0 && (
            <span className="collections-sync-status" role="status">
              <CircularProgress size={13} /> Refreshing
            </span>
          )}
        </div>

        {collections.length > 0 && (
          <TextField
            className="collections-search"
            label="Search collections"
            placeholder="Name or description…"
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon aria-hidden="true" />
                </InputAdornment>
              ),
            }}
          />
        )}

        {loading && collections.length === 0 ? (
          <div className="collections-state" role="status">
            <CircularProgress size={30} />
            <strong>Loading collections</strong>
            <span>Gathering your company’s saved displays.</span>
          </div>
        ) : collections.length === 0 ? (
          <div className="collections-state collections-state--empty">
            <CollectionsBookmarkOutlinedIcon aria-hidden="true" />
            <strong>No collections yet</strong>
            <span>
              Create a collection to group displays for a project, account, or
              presentation.
            </span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={() => setShowCreateCollectionDialog(true)}
            >
              Create your first collection
            </Button>
          </div>
        ) : visibleCollections.length === 0 ? (
          <div className="collections-state">
            <SearchOutlinedIcon aria-hidden="true" />
            <strong>No matching collections</strong>
            <span>Try a broader name or description.</span>
          </div>
        ) : (
          <div className="collections-grid">
            {visibleCollections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                sharing={sharingCollectionId === collection.id}
                onView={handleCollectionClick}
                onShare={handleCopyLink}
                onDelete={setCollectionToDelete}
              />
            ))}
          </div>
        )}
      </section>

      <CollectionForm
        isOpen={showCreateCollectionDialog}
        onAddCollection={handleAddCollection}
        onClose={() => setShowCreateCollectionDialog(false)}
      />
      <CustomConfirmation
        isOpen={Boolean(collectionToDelete)}
        onClose={() => {
          if (!deleting) setCollectionToDelete(null);
        }}
        onConfirm={handleDeleteCollectionConfirmed}
        loading={deleting}
        title="Delete collection?"
        message={`Delete “${selectedCollectionName || "this collection"}”? The posts will remain in the activity feed.`}
      />
    </main>
  );
};

export default CollectionsViewer;
