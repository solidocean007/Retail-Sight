import { onCall } from "firebase-functions/v2/https";
import vision from "@google-cloud/vision";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const client = new vision.ImageAnnotatorClient();

export const detectBrands = onCall(async (req) => {
  const { imageUrl } = req.data;
  if (!imageUrl) {
    throw new Error("Missing imageUrl");
  }

  const [logoRes] = await client.logoDetection(imageUrl);
  const [labelRes] = await client.labelDetection(imageUrl);
  const [textRes] = await client.textDetection(imageUrl);

  const logos =
    logoRes.logoAnnotations?.map((l) => l.description?.toLowerCase()) || [];
  const labels =
    labelRes.labelAnnotations?.map((l) => l.description?.toLowerCase()) || [];
  const text =
    textRes.fullTextAnnotation?.text?.toLowerCase().split(/\s+/) || [];

  const rawCandidates = Array.from(new Set([...logos, ...labels, ...text]))
    .filter(Boolean)
    .slice(0, 30); // limit for bandwidth

  console.log("🔍 Vision candidates:", rawCandidates.slice(0, 10));
  return { rawCandidates };
});
