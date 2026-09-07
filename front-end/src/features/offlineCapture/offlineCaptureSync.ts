import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ref as storageRef,
  uploadBytesResumable,
  type UploadTask,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { storage } from "../../utils/firebase";
import {
  NATIVE_APP_RESUMED_EVENT,
  NATIVE_NETWORK_STATUS_EVENT,
} from "../../native/nativeRuntime";
import { loadStoredCaptureImage } from "./captureImageStorage";
import {
  listOfflineCapturesForUser,
  updateOfflineCapture,
} from "./offlineCaptureDb";
import { markOfflineCaptureSynced } from "./offlineCaptureService";
import type { OfflineCaptureRecord } from "./types";

type FinalizeOfflineCaptureResult = {
  postId: string;
  alreadyFinalized: boolean;
};

const RETRYABLE_STATES = new Set(["queued", "uploading", "finalizing"]);
const PERMANENT_FUNCTION_CODES = new Set([
  "functions/invalid-argument",
  "functions/failed-precondition",
  "functions/not-found",
  "functions/permission-denied",
  "functions/unauthenticated",
]);

const uploadTaskAsPromise = (task: UploadTask): Promise<UploadTaskSnapshot> =>
  new Promise((resolve, reject) => {
    task.on("state_changed", () => undefined, reject, () => resolve(task.snapshot));
  });

const safeExtension = (capture: OfflineCaptureRecord): string => {
  const fromName = capture.image.fileName.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (capture.image.mimeType === "image/png") return "png";
  if (capture.image.mimeType === "image/webp") return "webp";
  return "jpg";
};

const errorCode = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "offline_sync_failed";
};

const finalizeCapture = httpsCallable<
  {
    captureId: string;
    capturedAt: string;
    storagePath: string;
    postPayload: Record<string, unknown>;
  },
  FinalizeOfflineCaptureResult
>(getFunctions(undefined, "us-central1"), "finalizeOfflineCapture");

const syncCapture = async (
  capture: OfflineCaptureRecord,
  activeCompanyId: string,
): Promise<void> => {
  if (capture.companyId !== activeCompanyId) {
    await updateOfflineCapture(capture.captureId, capture.userId, {
      state: "failed",
      lastErrorCode: "company_membership_changed",
    });
    return;
  }

  const attemptAt = new Date().toISOString();
  await updateOfflineCapture(capture.captureId, capture.userId, {
    state: "uploading",
    attemptCount: capture.attemptCount + 1,
    lastAttemptAt: attemptAt,
    lastErrorCode: null,
  });

  try {
    const image = await loadStoredCaptureImage(capture);
    const storagePath = [
      "offlineUploads",
      capture.companyId,
      capture.userId,
      capture.captureId,
      `original.${safeExtension(capture)}`,
    ].join("/");
    const upload = uploadBytesResumable(storageRef(storage, storagePath), image, {
      contentType: capture.image.mimeType,
      customMetadata: {
        captureId: capture.captureId,
        companyId: capture.companyId,
        ownerUid: capture.userId,
      },
    });
    await uploadTaskAsPromise(upload);

    await updateOfflineCapture(capture.captureId, capture.userId, {
      state: "finalizing",
    });
    const result = await finalizeCapture({
      captureId: capture.captureId,
      capturedAt: capture.capturedAt,
      storagePath,
      postPayload: capture.postPayload,
    });
    await markOfflineCaptureSynced(
      capture.captureId,
      capture.userId,
      result.data.postId,
    );
  } catch (error) {
    const code = errorCode(error);
    await updateOfflineCapture(capture.captureId, capture.userId, {
      state: PERMANENT_FUNCTION_CODES.has(code) ? "failed" : "queued",
      lastErrorCode: code,
    });
    throw error;
  }
};

let stopActiveSync: (() => void) | null = null;

export const startOfflineCaptureSync = (
  userId: string,
  companyId: string,
): (() => void) => {
  stopActiveSync?.();

  let stopped = false;
  let running = false;
  let retryTimer: number | null = null;

  const scheduleRetry = (attemptCount: number) => {
    if (stopped || retryTimer !== null) return;
    const delay = Math.min(30_000 * 2 ** Math.min(attemptCount, 5), 15 * 60_000);
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      void run();
    }, delay);
  };

  const run = async () => {
    if (stopped || running || !navigator.onLine) return;
    running = true;
    let highestAttemptCount = 0;

    try {
      const captures = await listOfflineCapturesForUser(userId);
      const pending = captures
        .filter((capture) => RETRYABLE_STATES.has(capture.state))
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

      for (const capture of pending) {
        if (stopped || !navigator.onLine) break;
        highestAttemptCount = Math.max(highestAttemptCount, capture.attemptCount);
        try {
          await syncCapture(capture, companyId);
        } catch (error) {
          console.warn("Displaygram could not sync a saved post yet:", error);
          scheduleRetry(highestAttemptCount);
          break;
        }
      }
    } catch (error) {
      console.warn("Displaygram offline queue could not be checked:", error);
      scheduleRetry(highestAttemptCount);
    } finally {
      running = false;
    }
  };

  const onOnline = () => void run();
  const onNativeNetwork = (event: Event) => {
    const status = (event as CustomEvent<{ connected?: boolean }>).detail;
    if (status?.connected) void run();
  };

  window.addEventListener("online", onOnline);
  window.addEventListener(NATIVE_APP_RESUMED_EVENT, onOnline);
  window.addEventListener(NATIVE_NETWORK_STATUS_EVENT, onNativeNetwork);
  void run();

  const stop = () => {
    stopped = true;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    window.removeEventListener("online", onOnline);
    window.removeEventListener(NATIVE_APP_RESUMED_EVENT, onOnline);
    window.removeEventListener(NATIVE_NETWORK_STATUS_EVENT, onNativeNetwork);
    if (stopActiveSync === stop) stopActiveSync = null;
  };
  stopActiveSync = stop;
  return stop;
};
