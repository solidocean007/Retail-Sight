import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import { CircularProgress, IconButton, Snackbar, Tooltip } from "@mui/material";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { selectUser } from "../../Slices/userSlice";
import { db } from "../../utils/firebase";
import { normalizePost } from "../../utils/normalize";
import { derivePostImageVariants } from "../../utils/PostLogic/derivePostImageVariants";
import { CollectionType, PostType, PostWithID } from "../../utils/types";
import HeaderBar from "../HeaderBar";

import "./viewCollection.css";

const formatDisplayDate = (iso?: string) => {
  if (!iso) return "Date unavailable";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const ViewCollection = () => {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const user = useSelector(selectUser);

  const [collectionDetails, setCollectionDetails] =
    useState<CollectionType | null>(null);
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const [unavailablePostCount, setUnavailablePostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCollection = async () => {
      if (!collectionId) {
        setError("This collection link is incomplete.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const collectionSnapshot = await getDoc(
          doc(db, "collections", collectionId),
        );

        if (!collectionSnapshot.exists()) {
          if (!cancelled) setError("This collection could not be found.");
          return;
        }

        const data = collectionSnapshot.data();
        const collection: CollectionType = {
          companyId: data.companyId ?? "",
          name: data.name ?? "Untitled collection",
          description: data.description ?? "",
          ownerId: data.ownerId ?? "",
          posts: Array.isArray(data.posts) ? data.posts : [],
          previewImages: Array.isArray(data.previewImages)
            ? data.previewImages
            : [],
          sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
          shareToken: data.shareToken,
          isShareableOutsideCompany: data.isShareableOutsideCompany ?? false,
        };

        const postResults = await Promise.allSettled(
          collection.posts.map(async (postId) => {
            const postSnapshot = await getDoc(doc(db, "posts", postId));
            if (!postSnapshot.exists()) return null;

            return normalizePost({
              id: postSnapshot.id,
              ...(postSnapshot.data() as PostType),
            });
          }),
        );

        if (cancelled) return;

        const loadedPosts = postResults.flatMap((result) =>
          result.status === "fulfilled" && result.value ? [result.value] : [],
        );

        setCollectionDetails(collection);
        setPosts(loadedPosts);
        setUnavailablePostCount(collection.posts.length - loadedPosts.length);
      } catch (loadError) {
        console.error("ViewCollection failed:", loadError);
        if (!cancelled) {
          setError("This collection is private or currently unavailable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCollection();

    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  const canManageCollection = Boolean(
    user &&
    collectionDetails &&
    (collectionDetails.ownerId === user.uid ||
      collectionDetails.companyId === user.companyId),
  );

  const handleBack = () => {
    if (user) {
      sessionStorage.setItem("dashboardMode", "CollectionsMode");
      navigate("/dashboard");
      return;
    }

    navigate("/");
  };

  const handleCopyCollectionLink = async () => {
    if (!collectionId || !collectionDetails) return;

    try {
      if (
        !collectionDetails.isShareableOutsideCompany &&
        !canManageCollection
      ) {
        setSnackbarMessage(
          "Only this collection’s company can enable sharing.",
        );
        return;
      }

      if (!collectionDetails.isShareableOutsideCompany) {
        await updateDoc(doc(db, "collections", collectionId), {
          isShareableOutsideCompany: true,
          updatedAt: serverTimestamp(),
        });
        setCollectionDetails((current) =>
          current ? { ...current, isShareableOutsideCompany: true } : current,
        );
      }

      await navigator.clipboard.writeText(window.location.href);
      setSnackbarMessage(
        collectionDetails.isShareableOutsideCompany
          ? "Collection link copied."
          : "Public sharing enabled and link copied.",
      );
    } catch (shareError) {
      console.error("Error copying collection link:", shareError);
      setSnackbarMessage("The collection link could not be copied.");
    }
  };

  const handleCopyPostLink = async (postId: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/p/${postId}`,
      );
      setSnackbarMessage("Post link copied.");
    } catch (shareError) {
      console.error("Error copying post link:", shareError);
      setSnackbarMessage("The post link could not be copied.");
    }
  };

  const handleOpenPost = (postId: string) => {
    navigate(user ? `/post/${postId}` : `/p/${postId}`, {
      state: {
        returnToCollection: `/view-collection/${collectionId}`,
        collectionName: collectionDetails?.name,
      },
    });
  };

  return (
    <div className="view-collection-page">
      <HeaderBar toggleFilterMenu={() => undefined} />

      <main className="view-collection-page__shell">
        <button
          type="button"
          className="view-collection-back"
          onClick={handleBack}
        >
          <ArrowBackRoundedIcon />
          {user ? "Back to collections" : "Displaygram home"}
        </button>

        {loading ? (
          <section className="view-collection-state" role="status">
            <CircularProgress size={32} />
            <strong>Opening collection</strong>
            <span>Gathering the saved displays.</span>
          </section>
        ) : error ? (
          <section className="view-collection-state view-collection-state--error">
            <LockOutlinedIcon aria-hidden="true" />
            <strong>Collection unavailable</strong>
            <span>{error}</span>
            <button type="button" onClick={handleBack}>
              {user ? "Return to collections" : "Return home"}
            </button>
          </section>
        ) : (
          <>
            <header className="view-collection-header">
              <div className="view-collection-header__identity">
                <span
                  className="view-collection-header__mark"
                  aria-hidden="true"
                >
                  <CollectionsBookmarkOutlinedIcon />
                </span>
                <div>
                  <span className="view-collection-header__eyebrow">
                    Collection
                  </span>
                  <h1>{collectionDetails?.name}</h1>
                  <p>
                    {collectionDetails?.description ||
                      "A focused set of saved retail displays."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="view-collection-share"
                onClick={handleCopyCollectionLink}
              >
                <ShareOutlinedIcon />
                {collectionDetails?.isShareableOutsideCompany
                  ? "Copy link"
                  : "Share collection"}
              </button>

              <div className="view-collection-header__meta">
                <span>
                  <ImageOutlinedIcon />
                  {posts.length.toLocaleString()} display
                  {posts.length === 1 ? "" : "s"}
                </span>
                <span>
                  {collectionDetails?.isShareableOutsideCompany ? (
                    <LinkRoundedIcon />
                  ) : (
                    <LockOutlinedIcon />
                  )}
                  {collectionDetails?.isShareableOutsideCompany
                    ? "Public link enabled"
                    : "Company workspace"}
                </span>
              </div>
            </header>

            {unavailablePostCount > 0 && (
              <p className="view-collection-notice" role="status">
                {unavailablePostCount.toLocaleString()} saved display
                {unavailablePostCount === 1 ? " is" : "s are"} no longer
                available to this viewer.
              </p>
            )}

            {posts.length === 0 ? (
              <section className="view-collection-state">
                <ImageOutlinedIcon aria-hidden="true" />
                <strong>No displays to show</strong>
                <span>Displays added to this collection will appear here.</span>
              </section>
            ) : (
              <section
                className="view-collection-grid"
                aria-label="Saved displays"
              >
                {posts.map((post) => {
                  const imageSet = derivePostImageVariants(post);
                  const cardImage =
                    imageSet.feedSrc ||
                    post.imageUrl ||
                    post.originalImageUrl ||
                    "";
                  const accountName =
                    post.account?.accountName ||
                    post.accountName ||
                    "Unknown account";
                  const location =
                    post.account?.accountAddress ||
                    post.accountAddress ||
                    [post.city, post.state].filter(Boolean).join(", ") ||
                    "Location unavailable";
                  const author =
                    post.postUserFullName ||
                    [post.postUser?.firstName, post.postUser?.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    "Displaygram user";
                  const brands = (post.brands ?? []).filter(Boolean);
                  const hashtags = (post.hashtags ?? []).filter(Boolean);

                  return (
                    <article className="view-collection-card" key={post.id}>
                      <button
                        type="button"
                        className="view-collection-card__image"
                        onClick={() => handleOpenPost(post.id)}
                        aria-label={`Open display from ${accountName}`}
                      >
                        {cardImage ? (
                          <img
                            src={cardImage}
                            alt={`Display at ${accountName}`}
                            loading="lazy"
                          />
                        ) : (
                          <span>
                            <ImageOutlinedIcon />
                            Image unavailable
                          </span>
                        )}
                        <span className="view-collection-card__cases">
                          <Inventory2OutlinedIcon />
                          {Number(
                            post.totalCaseCount || 0,
                          ).toLocaleString()}{" "}
                          cases
                        </span>
                      </button>

                      <div className="view-collection-card__body">
                        <div className="view-collection-card__title-row">
                          <div>
                            <h2>{accountName}</h2>
                            <p>
                              <LocationOnOutlinedIcon />
                              {location}
                            </p>
                          </div>
                          <Tooltip title="Copy post link">
                            <IconButton
                              aria-label={`Copy link to display at ${accountName}`}
                              onClick={() => handleCopyPostLink(post.id)}
                            >
                              <ShareOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        </div>

                        {post.description && (
                          <p className="view-collection-card__description">
                            {post.description}
                          </p>
                        )}

                        {(brands.length > 0 || hashtags.length > 0) && (
                          <div className="view-collection-card__tags">
                            {brands.slice(0, 2).map((brand) => (
                              <span key={`brand-${brand}`}>{brand}</span>
                            ))}
                            {hashtags.slice(0, 2).map((hashtag) => (
                              <span key={`tag-${hashtag}`}>
                                {hashtag.startsWith("#")
                                  ? hashtag
                                  : `#${hashtag}`}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="view-collection-card__footer">
                          <span>
                            <CalendarMonthOutlinedIcon />
                            {formatDisplayDate(post.displayDate)}
                          </span>
                          <span>{author}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenPost(post.id)}
                          >
                            View
                            <OpenInNewRoundedIcon />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={2600}
        onClose={() => setSnackbarMessage("")}
        message={snackbarMessage}
      />
    </div>
  );
};

export default ViewCollection;
