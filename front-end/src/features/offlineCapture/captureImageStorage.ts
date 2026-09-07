import { Directory, Filesystem } from "@capacitor/filesystem";
import { isNativePlatform } from "../../utils/platform";
import { getOfflineCaptureImage } from "./offlineCaptureDb";
import type {
  CaptureImageStorage,
  OfflineCaptureRecord,
} from "./types";

export interface StoredCaptureImage {
  storage: CaptureImageStorage;
  localImageUri: string;
  webImage?: Blob;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to encode capture image."));
        return;
      }
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });

const safeExtension = (file: File): string => {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
};

export const storeCaptureImage = async (
  captureId: string,
  file: File,
): Promise<StoredCaptureImage> => {
  if (!isNativePlatform()) {
    return {
      storage: "indexeddb",
      localImageUri: `indexeddb://captureImages/${captureId}`,
      webImage: file,
    };
  }

  const path = `offline-captures/${captureId}/original.${safeExtension(file)}`;
  const result = await Filesystem.writeFile({
    path,
    data: await blobToBase64(file),
    directory: Directory.LibraryNoCloud,
    recursive: true,
  });

  return {
    storage: "native-filesystem",
    localImageUri: result.uri,
  };
};

export const deleteStoredCaptureImage = async (
  captureId: string,
  storage: CaptureImageStorage,
): Promise<void> => {
  if (storage !== "native-filesystem") return;

  try {
    await Filesystem.rmdir({
      path: `offline-captures/${captureId}`,
      directory: Directory.LibraryNoCloud,
      recursive: true,
    });
  } catch (error) {
    console.warn("Unable to remove native offline capture image:", error);
  }
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
};

export const loadStoredCaptureImage = async (
  capture: OfflineCaptureRecord,
): Promise<Blob> => {
  if (capture.image.storage === "indexeddb") {
    const image = await getOfflineCaptureImage(capture.captureId);
    if (!image) throw new Error("The saved photo is missing from this device.");
    return image;
  }

  const result = await Filesystem.readFile({
    path: capture.localImageUri,
  });
  if (typeof result.data !== "string") {
    throw new Error("The saved photo could not be read from this device.");
  }

  return base64ToBlob(result.data, capture.image.mimeType);
};
