import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as archiver from "archiver";
import { Parser } from "json2csv";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

interface PostExportType {
  id: string;
  description?: string;
  imageUrl?: string;
  storeAddress?: string;
  city?: string;
  state?: string;
  displayDate: string;
  totalCaseCount: number;
  createdByName?: string;
  createdByEmail?: string;
  company?: string;
  hashtags?: string;
  starTags?: string;
  brands?: string;
}

export const exportPosts = functions.https.onCall(
  async (data, context) => {
    console.log("🔥 exportPosts triggered");

    if (!context?.auth) { // Property 'auth' does not exist on type 'CallableResponse<unknown>'
      throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { collectionId } = data; // Property 'collectionId' does not exist on type 'CallableRequest<any>'
    if (!collectionId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing collectionId.");
    }

    const tempFilePath = path.join(os.tmpdir(), `${collectionId}.zip`);
    const output = fs.createWriteStream(tempFilePath);
    const zip = archiver("zip", { zlib: { level: 9 } });
    zip.pipe(output);

    const posts = await fetchPostsForCollection(collectionId);
    const json2csvParser = new Parser();

    console.log(`📦 Archiving ${posts.length} posts`);

    for (const post of posts) {
      console.log(`🔧 Processing post: ${post.id}`);

      const flatPost: PostExportType = {
        id: post.id,
        description: post.description ?? "",
        imageUrl: post.imageUrl ?? "",
        storeAddress: post.account?.accountAddress ?? "",
        city: post.city ?? "",
        state: post.state ?? "",
        displayDate: post.displayDate ?? "",
        totalCaseCount: post.totalCaseCount ?? 0,
        createdByName: `${post.createdBy?.firstName ?? ""} ${post.createdBy?.lastName ?? ""}`.trim(),
        createdByEmail: post.createdBy?.email ?? "",
        company: post.createdBy?.company ?? "",
        hashtags: (post.hashtags ?? []).join(", "),
        starTags: (post.starTags ?? []).join(", "),
        brands: (post.brands ?? []).join(", "),
      };

      const postCSV = json2csvParser.parse(flatPost);
      zip.append(postCSV, { name: `${post.id}/data.csv` });

      if (post.imageUrl) {
        try {
          const imageData = await fetchImageData(post.imageUrl);
          zip.append(imageData.buffer, {
            name: `${post.id}/${imageData.name}`,
          });
        } catch (err: any) {
          console.warn(`⚠️ Skipped image for ${post.id}:`, err.message);
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      output.on("close", () => {
        console.log("✅ ZIP finalized");
        resolve();
      });
      zip.on("error", (err) => {
        console.error("❌ Archiving error:", err);
        reject(err);
      });
      zip.finalize();
    });

    const bucket = admin.storage().bucket();
    const zipPath = `exports/${collectionId}.zip`;
    await bucket.upload(tempFilePath, { destination: zipPath });

    const file = bucket.file(zipPath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    fs.unlinkSync(tempFilePath);
    return { url };
  }
);

async function fetchPostsForCollection(collectionId: string) {
  const db = admin.firestore();
  const ref = db.collection("collections").doc(collectionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Collection ${collectionId} not found.`);

  const postIds: string[] = snap.data()?.posts ?? [];
  const allPosts: any[] = [];

  for (let i = 0; i < postIds.length; i += 10) {
    const chunk = postIds.slice(i, i + 10);
    const batch = await db
      .collection("posts")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    allPosts.push(...batch.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  }

  return allPosts;
}

async function fetchImageData(fileUrl: string) {
  const storage = admin.storage();
  const bucket = storage.bucket();
  const matches = fileUrl.match(/\/o\/(.+?)\?alt=media/);
  if (!matches?.[1]) throw new Error(`Invalid image URL: ${fileUrl}`);

  const filePath = decodeURIComponent(matches[1]);
  const file = bucket.file(filePath);
  const buffer = await file.download();

  return {
    buffer: buffer[0],
    name: path.basename(filePath),
  };
}

