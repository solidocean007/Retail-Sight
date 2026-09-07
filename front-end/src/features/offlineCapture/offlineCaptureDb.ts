import type {
  OfflineCaptureImageRecord,
  OfflineCaptureRecord,
} from "./types";

const DATABASE_NAME = "displaygramOfflineCaptureDB";
const DATABASE_VERSION = 1;
const CAPTURES_STORE = "captures";
const IMAGES_STORE = "captureImages";

export const OFFLINE_CAPTURE_CHANGED_EVENT =
  "displaygram:offline-capture-changed";

const notifyOfflineCaptureChanged = () => {
  window.dispatchEvent(new Event(OFFLINE_CAPTURE_CHANGED_EVENT));
};

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionComplete = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

export const openOfflineCaptureDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(CAPTURES_STORE)) {
        const captures = database.createObjectStore(CAPTURES_STORE, {
          keyPath: "captureId",
        });
        captures.createIndex("byUserId", "userId", { unique: false });
        captures.createIndex("byState", "state", { unique: false });
        captures.createIndex("byUpdatedAt", "updatedAt", { unique: false });
      }

      if (!database.objectStoreNames.contains(IMAGES_STORE)) {
        database.createObjectStore(IMAGES_STORE, { keyPath: "captureId" });
      }
    };
  });

export const saveOfflineCapture = async (
  capture: OfflineCaptureRecord,
  webImage?: Blob,
): Promise<void> => {
  const database = await openOfflineCaptureDatabase();
  const stores = webImage
    ? [CAPTURES_STORE, IMAGES_STORE]
    : [CAPTURES_STORE];
  const transaction = database.transaction(stores, "readwrite");

  transaction.objectStore(CAPTURES_STORE).put(capture);
  if (webImage) {
    const imageRecord: OfflineCaptureImageRecord = {
      captureId: capture.captureId,
      blob: webImage,
    };
    transaction.objectStore(IMAGES_STORE).put(imageRecord);
  }

  try {
    await transactionComplete(transaction);
    notifyOfflineCaptureChanged();
  } finally {
    database.close();
  }
};

export const getOfflineCapture = async (
  captureId: string,
): Promise<OfflineCaptureRecord | undefined> => {
  const database = await openOfflineCaptureDatabase();
  const transaction = database.transaction(CAPTURES_STORE, "readonly");

  try {
    return await requestResult<OfflineCaptureRecord | undefined>(
      transaction.objectStore(CAPTURES_STORE).get(captureId),
    );
  } finally {
    database.close();
  }
};

export const getOfflineCaptureImage = async (
  captureId: string,
): Promise<Blob | undefined> => {
  const database = await openOfflineCaptureDatabase();
  const transaction = database.transaction(IMAGES_STORE, "readonly");

  try {
    const record = await requestResult<OfflineCaptureImageRecord | undefined>(
      transaction.objectStore(IMAGES_STORE).get(captureId),
    );
    return record?.blob;
  } finally {
    database.close();
  }
};

export const listOfflineCapturesForUser = async (
  userId: string,
): Promise<OfflineCaptureRecord[]> => {
  const database = await openOfflineCaptureDatabase();
  const transaction = database.transaction(CAPTURES_STORE, "readonly");
  const index = transaction.objectStore(CAPTURES_STORE).index("byUserId");

  try {
    const captures = await requestResult<OfflineCaptureRecord[]>(
      index.getAll(IDBKeyRange.only(userId)),
    );
    return captures.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    database.close();
  }
};

export const countUnsyncedCapturesForUser = async (
  userId: string,
): Promise<number> => {
  const captures = await listOfflineCapturesForUser(userId);
  return captures.filter((capture) => capture.state !== "synced").length;
};

export const updateOfflineCapture = async (
  captureId: string,
  userId: string,
  changes: Partial<
    Omit<
      OfflineCaptureRecord,
      "captureId" | "userId" | "companyId" | "schemaVersion" | "image"
    >
  >,
): Promise<OfflineCaptureRecord> => {
  const existing = await getOfflineCapture(captureId);
  if (!existing || existing.userId !== userId) {
    throw new Error("Offline capture not found for this user.");
  }

  const updated: OfflineCaptureRecord = {
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  await saveOfflineCapture(updated);
  return updated;
};

export const deleteOfflineCaptureImage = async (
  captureId: string,
  userId: string,
): Promise<void> => {
  const existing = await getOfflineCapture(captureId);
  if (!existing || existing.userId !== userId) return;

  const database = await openOfflineCaptureDatabase();
  const transaction = database.transaction(IMAGES_STORE, "readwrite");
  transaction.objectStore(IMAGES_STORE).delete(captureId);

  try {
    await transactionComplete(transaction);
    notifyOfflineCaptureChanged();
  } finally {
    database.close();
  }
};

export const deleteOfflineCaptureRecords = async (
  captureId: string,
  userId: string,
): Promise<void> => {
  const existing = await getOfflineCapture(captureId);
  if (!existing || existing.userId !== userId) return;

  const database = await openOfflineCaptureDatabase();
  const transaction = database.transaction(
    [CAPTURES_STORE, IMAGES_STORE],
    "readwrite",
  );
  transaction.objectStore(CAPTURES_STORE).delete(captureId);
  transaction.objectStore(IMAGES_STORE).delete(captureId);

  try {
    await transactionComplete(transaction);
    notifyOfflineCaptureChanged();
  } finally {
    database.close();
  }
};
