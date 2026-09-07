import type { PostInputType } from "../../utils/types";
import {
  deleteOfflineCaptureImage,
  deleteOfflineCaptureRecords,
  getOfflineCapture,
  saveOfflineCapture,
  updateOfflineCapture,
} from "./offlineCaptureDb";
import {
  deleteStoredCaptureImage,
  storeCaptureImage,
} from "./captureImageStorage";
import {
  OFFLINE_CAPTURE_SCHEMA_VERSION,
  type OfflineCaptureRecord,
  type OfflineCaptureState,
} from "./types";

export const OFFLINE_CAPTURE_SYNCED_EVENT =
  "displaygram:offline-capture-synced";

const createCaptureId = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${crypto.getRandomValues(new Uint32Array(4)).join("-")}`;
};

export const serializePostForOfflineCapture = (
  post: PostInputType,
): Record<string, unknown> => {
  const { imageUrl: _imageUrl, originalImageUrl: _originalImageUrl, ...rest } =
    post;
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
};

export const createOfflineCaptureDraft = async ({
  file,
  userId,
  companyId,
  post,
}: {
  file: File;
  userId: string;
  companyId: string;
  post: PostInputType;
}): Promise<OfflineCaptureRecord> => {
  const captureId = createCaptureId();
  const storedImage = await storeCaptureImage(captureId, file);
  const now = new Date().toISOString();
  const capture: OfflineCaptureRecord = {
    captureId,
    userId,
    companyId,
    localImageUri: storedImage.localImageUri,
    capturedAt: now,
    updatedAt: now,
    accountSnapshot: null,
    goalSnapshot: null,
    postPayload: serializePostForOfflineCapture(post),
    state: "draft",
    attemptCount: 0,
    lastAttemptAt: null,
    lastErrorCode: null,
    serverPostId: null,
    schemaVersion: OFFLINE_CAPTURE_SCHEMA_VERSION,
    image: {
      storage: storedImage.storage,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    },
  };

  try {
    await saveOfflineCapture(capture, storedImage.webImage);
  } catch (error) {
    await deleteStoredCaptureImage(captureId, storedImage.storage);
    throw error;
  }

  void navigator.storage?.persist?.().catch(() => false);
  return capture;
};

export const setOfflineCaptureSubmissionState = async ({
  captureId,
  userId,
  post,
  state,
  errorCode = null,
}: {
  captureId: string;
  userId: string;
  post: PostInputType;
  state: OfflineCaptureState;
  errorCode?: string | null;
}): Promise<OfflineCaptureRecord> => {
  const now = new Date().toISOString();
  const existing = await getOfflineCapture(captureId);
  if (!existing || existing.userId !== userId) {
    throw new Error("Offline capture not found for this user.");
  }

  return updateOfflineCapture(captureId, userId, {
    postPayload: serializePostForOfflineCapture(post),
    accountSnapshot: post.account
      ? {
          id: post.account.accountNumber,
          displayLabel: post.account.accountName,
        }
      : null,
    goalSnapshot: post.companyGoalId
      ? {
          id: post.companyGoalId,
          displayLabel: post.companyGoalTitle ?? "Selected goal",
        }
      : null,
    state,
    attemptCount:
      state === "uploading"
        ? existing.attemptCount + 1
        : existing.attemptCount,
    lastAttemptAt:
      state === "uploading" ? now : existing.lastAttemptAt,
    lastErrorCode: errorCode,
  });
};

export const markOfflineCaptureSynced = async (
  captureId: string,
  userId: string,
  serverPostId: string,
): Promise<void> => {
  const capture = await updateOfflineCapture(captureId, userId, {
    state: "synced",
    serverPostId,
    lastErrorCode: null,
  });

  await deleteStoredCaptureImage(captureId, capture.image.storage);
  await deleteOfflineCaptureImage(captureId, userId);
  window.dispatchEvent(
    new CustomEvent(OFFLINE_CAPTURE_SYNCED_EVENT, {
      detail: { captureId, serverPostId },
    }),
  );
};

export const discardOfflineCaptureDraft = async (
  captureId: string,
  userId: string,
): Promise<void> => {
  const capture = await getOfflineCapture(captureId);
  if (!capture || capture.userId !== userId || capture.state === "synced") {
    return;
  }

  await deleteStoredCaptureImage(captureId, capture.image.storage);
  await deleteOfflineCaptureRecords(captureId, userId);
};
