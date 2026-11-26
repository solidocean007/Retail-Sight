import { useCallback, useEffect, useMemo, useState } from "react";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import {
  listOfflineCapturesForUser,
  OFFLINE_CAPTURE_CHANGED_EVENT,
} from "./offlineCaptureDb";
import type { OfflineCaptureRecord } from "./types";
import { OFFLINE_CAPTURE_SYNCED_EVENT } from "./offlineCaptureService";
import "./offlineCaptureStatusBanner.css";
import { useNavigate } from "react-router-dom";

type Props = {
  userId: string;
};

export const OfflineCaptureStatusBanner = ({ userId }: Props) => {
  const navigate = useNavigate();
  const [captures, setCaptures] = useState<OfflineCaptureRecord[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [recentlySynced, setRecentlySynced] = useState(false);

  const refresh = useCallback(() => {
    void listOfflineCapturesForUser(userId)
      .then((records) =>
        setCaptures(records.filter((record) => record.state !== "synced")),
      )
      .catch((error) =>
        console.warn("Unable to read Displaygram saved-post status:", error),
      );
  }, [userId]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    let successTimer: number | null = null;
    const onSynced = () => {
      setRecentlySynced(true);
      if (successTimer !== null) window.clearTimeout(successTimer);
      successTimer = window.setTimeout(() => setRecentlySynced(false), 6000);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(OFFLINE_CAPTURE_CHANGED_EVENT, refresh);
    window.addEventListener(OFFLINE_CAPTURE_SYNCED_EVENT, onSynced);
    refresh();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(OFFLINE_CAPTURE_CHANGED_EVENT, refresh);
      window.removeEventListener(OFFLINE_CAPTURE_SYNCED_EVENT, onSynced);
      if (successTimer !== null) window.clearTimeout(successTimer);
    };
  }, [refresh]);

  const status = useMemo(() => {
    const failed = captures.filter((capture) => capture.state === "failed");
    const syncing = captures.filter(
      (capture) => capture.state === "uploading" || capture.state === "finalizing",
    );
    const queued = captures.filter((capture) => capture.state === "queued");
    if (failed.length > 0) {
      return {
        kind: "attention",
        icon: <WarningAmberOutlinedIcon />,
        text: `${failed.length} saved ${failed.length === 1 ? "post needs" : "posts need"} attention. ${failed.length === 1 ? "Its photo is" : "Their photos are"} safe on this device.`,
      };
    }
    if (syncing.length > 0) {
      return {
        kind: "syncing",
        icon: <SyncOutlinedIcon className="offline-capture-banner__spin" />,
        text: `Uploading ${syncing.length === 1 ? "1 saved post" : `${syncing.length} saved posts`}. Keep Displaygram open.`,
      };
    }
    if (queued.length > 0) {
      return {
        kind: online ? "waiting" : "offline",
        icon: online ? <CloudDoneOutlinedIcon /> : <CloudOffOutlinedIcon />,
        text: online
          ? `${queued.length === 1 ? "1 saved post is" : `${queued.length} saved posts are`} waiting to upload.`
          : `${queued.length === 1 ? "1 post saved" : `${queued.length} posts saved`} on this device. Uploads automatically when you're online.`,
      };
    }
    if (recentlySynced) {
      return {
        kind: "success",
        icon: <CloudDoneOutlinedIcon />,
        text: "Your saved post was uploaded successfully.",
      };
    }
    return null;
  }, [captures, online, recentlySynced]);

  if (!status) return null;

  return (
    <aside
      className={`offline-capture-banner offline-capture-banner--${status.kind}`}
      role="status"
      aria-live="polite"
    >
      {status.icon}
      <span>{status.text}</span>
      {status.kind !== "success" && (
        <button
          type="button"
          className="offline-capture-banner__action"
          onClick={() => navigate("/saved-posts")}
        >
          Saved posts
        </button>
      )}
    </aside>
  );
};
