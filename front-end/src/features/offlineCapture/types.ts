export const OFFLINE_CAPTURE_SCHEMA_VERSION = 1 as const;

export type OfflineCaptureState =
  | "draft"
  | "queued"
  | "uploading"
  | "finalizing"
  | "synced"
  | "failed";

export type CaptureImageStorage = "indexeddb" | "native-filesystem";

export interface OfflineCaptureRecord {
  captureId: string;
  userId: string;
  companyId: string;
  localImageUri: string;
  capturedAt: string;
  updatedAt: string;
  accountSnapshot: {
    id: string;
    displayLabel: string;
  } | null;
  goalSnapshot: {
    id: string;
    displayLabel: string;
  } | null;
  postPayload: Record<string, unknown>;
  state: OfflineCaptureState;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  serverPostId: string | null;
  schemaVersion: typeof OFFLINE_CAPTURE_SCHEMA_VERSION;
  image: {
    storage: CaptureImageStorage;
    fileName: string;
    mimeType: string;
    size: number;
  };
}

export interface OfflineCaptureImageRecord {
  captureId: string;
  blob: Blob;
}
