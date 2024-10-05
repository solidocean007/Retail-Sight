import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as archiver from "archiver";

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

type ExportDummyDataParams = {
  id: string;
  content: string;
};

export const exportDummyData = functions.https.onCall(
  async (request: functions.https.CallableRequest<ExportDummyDataParams>) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      console.error("Unauthenticated access attempt");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    console.log("Authenticated user:", request.auth.uid);

    // Example data to be zipped
    const postsData = [
      { id: "post1", content: "Content of post 1" },
      { id: "post2", content: "Content of post 2" },
      { id: "post3", content: "Content of post 3" },
    ];

    console.log("Data to be zipped:", postsData);

    // Prepare the ZIP file
    const tempFilePath = path.join(os.tmpdir(), "test_posts.zip");
    console.log("Temporary file path:", tempFilePath);

    const output = fs.createWriteStream(tempFilePath);
    const zip = archiver("zip", { zlib: { level: 9 } });

    // Stream the zip to the output file
    zip.pipe(output);

    return new Promise((resolve, reject) => {
      output.on("close", () => {
        console.log(
          `Zip file created at ${tempFilePath}, size: ${zip.pointer()} bytes`
        );
      });

      // Append each post data as a file to the zip
      postsData.forEach((post) => {
        const fileName = `${post.id}.json`;
        const fileContent = JSON.stringify(post, null, 2);
        console.log(`Appending file: ${fileName}`);
        zip.append(fileContent, { name: fileName });
      });

      // Finalize the archive (this will cause the output stream to end)
      zip.finalize();

      output.on("finish", () => {
        console.log(
          "Zip file creation finished, starting upload to Firebase Storage"
        );

        const bucket = admin.storage().bucket();
        const zipFilePath = "exports/test_posts.zip";

        bucket
          .upload(tempFilePath, { destination: zipFilePath })
          .then(() => {
            console.log("Zip file uploaded successfully");
            return bucket.file(zipFilePath).getSignedUrl({
              action: "read",
              expires: Date.now() + 1000 * 60 * 60, // 1 hour
            });
          })
          .then(([url]) => {
            console.log("Signed URL generated:", url);
            resolve({ url });
          })
          .catch((error) => {
            console.error(
              "Error during zip file upload or signed URL creation:",
              error
            );
            reject(
              new functions.https.HttpsError(
                "internal",
                "Unable to export dummy data."
              )
            );
          });
      });

      zip.on("error", (error) => {
        console.error("Error during zip file creation:", error);
        reject(
          new functions.https.HttpsError(
            "internal",
            "Unable to create zip file."
          )
        );
      });
    });
  }
);
