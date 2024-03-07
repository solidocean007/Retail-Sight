// generateShareLink.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export const generateShareLink = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Generate a secure access token
  const accessToken = uuidv4();

  // Assume data.postId is the ID of the post to share
  const postId = data.postId;
  const link = `https://displaygram.com/?postId=${postId}&accessToken=${accessToken}`;

  // Assuming you've set up Firebase Dynamic Links correctly
  // Note: The actual method to create a short dynamic link may vary based on your Firebase setup and SDK versions
  // This is a conceptual example; refer to Firebase documentation for the exact method
  let dynamicLink;
  try {
    dynamicLink = await admin.dynamicLinks().createShortDynamicLink({ // Property 'dynamicLinks' does not exist on type 'typeof import("c:/Users/19105/OneDrive/Documents/retail-display-project/functions/node_modules/firebase-admin/lib/default-namespace")'.
      link: link,
      domainUriPrefix: "https://displaygram.page.link", // Ensure this is your correct Dynamic Link domain
    });
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to create a short link.', error);
  }

  // Save the accessToken and its associated postId to Firestore for validation
  await admin.firestore().collection('sharedPosts').doc(accessToken).set({
    postId: postId,
    // Additional metadata like expiration
    expiresAt: admin.firestore.FieldValue.serverTimestamp(), // Example for setting an expiration timestamp
  });

  return { shortLink: dynamicLink.shortLink };
});
// this is an example of a regular link: https://displaygram.com/?postId=su9YnLOyVqIfBjotvaJs