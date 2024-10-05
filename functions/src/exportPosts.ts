// exportPosts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as archiver from "archiver";
import { Parser } from "json2csv";

export interface PostType {
  // category: CategoryType | "";
  // channel: ChannelType | "";
  id: string;
  description?: string;
  imageUrl?: string;
  selectedStore?: string;
  storeNumber?: string;
  storeAddress: string;
  city?: string; // Added city
  state?: string; // Added state
  visibility?: "public" | "company" | "supplier" | "private";
  displayDate: string;
  timestamp: string;
  totalCaseCount: number;
  postUserName: string | undefined;
  postUserId: string | undefined;
  postUserCompany: string | undefined;
  postUserCompanyId: string | undefined;
  postUserEmail: string | undefined; // Added email
  supplier?: string;
  brands: string[];
  likes?: string[];
  hashtags: string[];
  starTags: string[];
  commentCount: number;
}

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

type ExportPostsParams = {
  collectionId: string;
};

export const exportPosts = functions.https.onCall(
  async (data: functions.https.CallableRequest<ExportPostsParams>) => {
    // Ensure the user is authenticated
    if (!data.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    const { collectionId } = data.data;
    if (!collectionId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Collection ID is required."
      );
    }

    // Initialize the CSV parser
    const json2csvParser = new Parser();

    // Prepare the ZIP file
    const tempFilePath = path.join(os.tmpdir(), `${collectionId}.zip`);
    const output = fs.createWriteStream(tempFilePath);
    const zip = archiver("zip", { zlib: { level: 9 } });

    zip.pipe(output);

    // Fetch posts
    const posts = await fetchPostsForCollection(collectionId);

    for (const post of posts) {
      const postDir = `${post.id}`;
      const postCSV = json2csvParser.parse(post);

      // Append CSV to the zip
      zip.append(postCSV, { name: `${postDir}/data.csv` });

      // Check if an image URL exists and fetch the image
      if (post.imageUrl) {
        try {
          const imageData = await fetchImageData(post.imageUrl);
          // Append the image data to the zip
          zip.append(imageData.buffer, {
            name: `${postDir}/${imageData.name}`,
          });
        } catch (error) {
          // Handle the error (e.g., skip the image or log the error)
          console.error(`Failed to fetch image for post ${post.id}:`, error);
        }
      }
    }

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      zip.on("error", reject);
      zip.finalize();
    });

    // Upload ZIP to Firebase Storage
    const bucket = admin.storage().bucket();
    const zipFilePath = `exports/${collectionId}.zip`;
    await bucket.upload(tempFilePath, { destination: zipFilePath });

    // Generate a signed URL for the ZIP file
    const file = bucket.file(zipFilePath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60, // URL valid for 1 hour
    });

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    return { url };
  }
);

/**
 * Fetches posts associated with a given collection ID from Firestore.
 * @param {string} collectionId -
 * @return {Promise<PostType[]>}
 */
async function fetchPostsForCollection(
  collectionId: string
): Promise<PostType[]> {
  const db = admin.firestore();
  // First, fetch the collection document to get the array of post IDs
  const collectionRef = db.collection("collections").doc(collectionId);
  const collectionSnapshot = await collectionRef.get();

  if (!collectionSnapshot.exists) {
    console.log(`No collection found with ID: ${collectionId}`);
    return [];
  }

  const collectionData = collectionSnapshot.data();
  const postIds = collectionData?.posts || [];
  console.log(
    `Found ${postIds.length} post IDs. Starting to fetch posts in batches.`
  );

  // Initialize an array to hold all the fetched posts
  let allPosts: PostType[] = [];

  // Chunk the postIds array and fetch posts in batches
  for (let i = 0; i < postIds.length; i += 10) {
    const chunk = postIds.slice(i, i + 10);
    const postsSnapshot = await db
      .collection("posts")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    const posts: PostType[] = postsSnapshot.docs.map((doc) => {
      return {
        ...doc.data(),
        id: doc.id, // Ensure that 'id' is being set correctly
      } as PostType;
    });

    allPosts = allPosts.concat(posts);
  }
  return allPosts;
}
/**
 * Fetches the image data from Firebase Storage given the full URL to the file.
 *
 * @param {string} fileUrl - The full URL of the image in Firebase Storage.
 * @return {Promise<{buffer: Buffer, name: string}>}
 */
async function fetchImageData(
  fileUrl: string
): Promise<{ buffer: Buffer; name: string }> {
  const storage = admin.storage();
  const bucket = storage.bucket();

  // Extract the file path from the URL
  const matches = fileUrl.match(/\/o\/(.+?)\?alt=media/);
  if (!matches || matches.length < 2) {
    throw new Error(`Invalid file URL: ${fileUrl}`);
  }
  const filePath = decodeURIComponent(matches[1]);

  // Use the file path to access the file
  const file = bucket.file(filePath);

  try {
    // Download the file as a Buffer
    const buffer = await file.download();
    // Use just the filename for the ZIP
    const name = path.basename(filePath);
    return { buffer: buffer[0], name };
  } catch (error) {
    console.error(`Error fetching image for ${fileUrl}:`, error);
    throw new functions.https.HttpsError(
      "internal",
      `Error fetching image for ${fileUrl}`
    );
  }
}
