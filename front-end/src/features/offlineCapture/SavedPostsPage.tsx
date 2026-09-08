import { useCallback, useEffect, useState } from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { loadStoredCaptureImage } from "./captureImageStorage";
import {
  listOfflineCapturesForUser,
  OFFLINE_CAPTURE_CHANGED_EVENT,
} from "./offlineCaptureDb";
import {
  discardOfflineCaptureDraft,
  queueOfflineCaptureForRetry,
} from "./offlineCaptureService";
import {
  requestOfflineCaptureSync,
} from "./offlineCaptureSync";
import type { OfflineCaptureRecord } from "./types";
import "./savedPostsPage.css";

const friendlyState: Record<OfflineCaptureRecord["state"], string> = {
  draft: "Unfinished",
  queued: "Waiting to upload",
  uploading: "Uploading",
  finalizing: "Finishing post",
  synced: "Uploaded",
  failed: "Needs attention",
};

const friendlyError = (code: string | null): string | null => {
  if (!code) return null;
  if (code === "company_membership_changed" || code.includes("permission-denied")) {
    return "Your account or company access changed. Sign in again or contact your administrator.";
  }
  if (code.includes("not-found") || code === "saved_image_missing") {
    return "Displaygram could not find the saved photo on this device.";
  }
  if (code.includes("invalid-argument") || code.includes("failed-precondition")) {
    return "Some post information is no longer valid. Reopen the post and review it.";
  }
  return "Displaygram could not upload this post yet. Check your connection and retry.";
};

const SavedPostCard = ({
  capture,
  onDiscard,
  onEdit,
  onRetry,
  online,
}: {
  capture: OfflineCaptureRecord;
  onDiscard: () => void;
  onEdit: () => void;
  onRetry: () => void;
  online: boolean;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void loadStoredCaptureImage(capture)
      .then((image) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(image);
        setPreviewUrl(objectUrl);
      })
      .catch(() => setPreviewUrl(null));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [capture]);

  const canEdit = capture.state === "draft" || capture.state === "failed";
  const canRetry = capture.state === "queued" || capture.state === "failed";
  const canDiscard = capture.state !== "uploading" && capture.state !== "finalizing";
  const errorText = friendlyError(capture.lastErrorCode);
  const accountLabel = capture.accountSnapshot?.displayLabel || "Store not selected";

  return (
    <article className="saved-post-card">
      <div className="saved-post-card__preview">
        {previewUrl ? (
          <img src={previewUrl} alt="Saved display" />
        ) : (
          <CloudOffOutlinedIcon aria-label="Preview unavailable" />
        )}
      </div>
      <div className="saved-post-card__details">
        <div className="saved-post-card__heading">
          <div>
            <span className={`saved-post-card__state saved-post-card__state--${capture.state}`}>
              {friendlyState[capture.state]}
            </span>
            <h2>{accountLabel}</h2>
          </div>
          <time dateTime={capture.capturedAt}>
            {new Date(capture.capturedAt).toLocaleString()}
          </time>
        </div>
        {errorText && <p className="saved-post-card__error">{errorText}</p>}
        <div className="saved-post-card__actions">
          {canEdit && (
            <button type="button" onClick={onEdit}>
              <EditOutlinedIcon /> Review post
            </button>
          )}
          {canRetry && (
            <button type="button" onClick={onRetry} disabled={!online}>
              <RefreshRoundedIcon /> Retry upload
            </button>
          )}
          <button
            type="button"
            className="danger"
            onClick={onDiscard}
            disabled={!canDiscard}
          >
            <DeleteOutlineRoundedIcon /> Discard
          </button>
        </div>
      </div>
    </article>
  );
};

const SavedPostsPage = () => {
  const user = useSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [captures, setCaptures] = useState<OfflineCaptureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  const refresh = useCallback(() => {
    if (!user?.uid) return;
    void listOfflineCapturesForUser(user.uid)
      .then((records) =>
        setCaptures(records.filter((capture) => capture.state !== "synced")),
      )
      .catch((error) => {
        console.warn("Unable to read saved posts:", error);
        dispatch(showMessage("Displaygram could not read saved posts on this device."));
      })
      .finally(() => setLoading(false));
  }, [user?.uid, dispatch]);

  useEffect(() => {
    refresh();
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener(OFFLINE_CAPTURE_CHANGED_EVENT, refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener(OFFLINE_CAPTURE_CHANGED_EVENT, refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  const discard = async (capture: OfflineCaptureRecord) => {
    if (!user?.uid) return;
    const confirmed = window.confirm(
      "Discard this saved post and remove its photo from this device? This cannot be undone.",
    );
    if (!confirmed) return;
    try {
      await discardOfflineCaptureDraft(capture.captureId, user.uid);
      dispatch(showMessage("Saved post discarded from this device."));
    } catch (error) {
      dispatch(
        showMessage(
          error instanceof Error
            ? error.message
            : "This saved post could not be discarded.",
        ),
      );
    }
  };

  const retry = async (capture: OfflineCaptureRecord) => {
    if (!user?.uid) return;
    try {
      await queueOfflineCaptureForRetry(capture.captureId, user.uid);
      requestOfflineCaptureSync();
      dispatch(showMessage("Displaygram is retrying this saved post."));
    } catch (error) {
      console.warn("Unable to retry saved post:", error);
      dispatch(showMessage("This saved post could not be retried."));
    }
  };

  return (
    <main className="saved-posts-page">
      <header className="saved-posts-page__header">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowBackRoundedIcon />
        </button>
        <div>
          <h1>Saved posts</h1>
          <p>
            These photos remain on this device until Displaygram confirms the post was uploaded.
          </p>
        </div>
      </header>

      {loading && <p className="saved-posts-page__empty">Checking this device…</p>}
      {!loading && captures.length === 0 && (
        <section className="saved-posts-page__empty">
          <CloudOffOutlinedIcon />
          <h2>No saved posts are waiting</h2>
          <p>Everything on this device has finished uploading.</p>
        </section>
      )}
      <section className="saved-posts-page__list" aria-live="polite">
        {captures.map((capture) => (
          <SavedPostCard
            key={capture.captureId}
            capture={capture}
            onDiscard={() => void discard(capture)}
            onEdit={() =>
              navigate("/create-post", {
                state: { offlineCaptureId: capture.captureId },
              })
            }
            onRetry={() => void retry(capture)}
            online={online}
          />
        ))}
      </section>
    </main>
  );
};

export default SavedPostsPage;
