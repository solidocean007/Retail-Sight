// exportPosts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as archiver from "archiver";

if (admin.apps.length === 0) {
  admin.initializeApp();
}


/**
 * Exports posts specified by their IDs as a zip file.
 *
 * @param {express.Request} req - The HTTP request object.
 * @param {express.Response} res - The HTTP response object.
 */
export const exportPosts = functions.
  https.onRequest(async (req: express.Request, res: express.Response) => {
    const postIds = req.body.postIds as string[];

    const zip = archiver("zip", {zlib: {level: 9}});
    res.attachment("posts_export.zip");
    zip.pipe(res);

    for (const postId of postIds) {
      const postData = await fetchPostData(postId);
      if (!postData || !postData.imagePath) continue;

      const imagePath = await fetchPostImage(postId, postData.imagePath);

      zip.append(JSON.stringify(postData), {name: `${postId}/metadata.json`});
      zip.append(imagePath.stream, {name: `${postId}/${imagePath.name}`});
    }

    zip.on("error", (err) => {
      console.error("Error creating zip:", err);
      res.status(500).send("Error creating zip file");
    });

    zip.finalize();
  });

/**
 * Fetches data for a given post from Firestore.
 *
 * @param {string} postId - The ID of the post to fetch.
 * @return {Promise<object|null>} The post data if found, otherwise null.
 */
async function fetchPostData(postId: string) {
  const postRef = admin.firestore().doc(`posts/${postId}`);
  const postSnap = await postRef.get();
  return postSnap.exists ? postSnap.data() : null;
}

/**
 * Retrieves the image stream and name for a given post from Firebase Storage.
 *
 * @param {string} postId - The ID of the post whose image is to be fetched.
 * @param {string} imagePath - path to the image.
 * @return {Promise<{stream: ReadableStream, name: string}>}file name.
 */
async function fetchPostImage(postId: string, imagePath: string) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(imagePath);

  return {stream: file.createReadStream(), name: file.name};
}


