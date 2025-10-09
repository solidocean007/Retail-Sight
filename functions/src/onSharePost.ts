import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Trigger: when a supplier shares a post internally (new /shares doc).
 * Updates the parent post’s sharedSummary and logs an audit record.
 */
export const onSharePost = onDocumentCreated(
  "posts/{postId}/shares/{shareId}",
  async (event) => {
    const { postId } = event.params;
    const shareData = event.data?.data();
    if (!shareData) {
      return;
    }

    await db
      .collection("posts")
      .doc(postId)
      .update({
        "sharedSummary.lastSharedAt": FieldValue.serverTimestamp(),
        "sharedSummary.totalShares": FieldValue.increment(1),
      });

    // Optional: write audit log
    await db.collection("postSharesAudit").add({
      postId,
      sharedBy: shareData.sharedByCompanyId,
      sharedWithCompanies: [shareData.targetCompanyId],
      timestamp: FieldValue.serverTimestamp(),
      action: "highlight",
    });
  }
);
