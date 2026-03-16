import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onAccountImportCreated = onDocumentCreated(
  "accountImports/{importId}",
  async (event) => {
    const importData = event.data?.data();
    if (!importData) return;

    const { companyId, totalChanges } = importData;

    if (!companyId) {
      console.log("Import missing companyId");
      return;
    }

    const usersSnap = {
      docs: [
        await db.collection("users").doc("TbL2z246iBbshTSIMskByZNa2bQ2").get(),
      ],
    };

    for (const doc of usersSnap.docs) {
      const uid = doc.id;

      //   await db
      //     .collection("users")
      //     .doc(uid)
      //     .collection("notifications")
      //     .add({
      //       type: "account-import",
      //       message: `${totalChanges} account changes detected`,
      //       link: "/admin/account-imports",
      //       createdAt: admin.firestore.FieldValue.serverTimestamp(),
      //       read: false,
      //     });
      // }

      await db
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .add({
          type: "account-import",
          message: `${totalChanges} account changes detected`,
          link: "https://displaygram.com/dashboard",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
    }

    const emails = usersSnap.docs.map((d) => d.data()?.email).filter(Boolean);

    if (!emails.length) {
      console.log("No admin emails found");
      return;
    }

    await db.collection("mail").add({
      to: emails,
      message: {
        subject: "Displaygram Account Sync Pending",
        text: `${totalChanges} account changes were detected and require review.`,
        html: `
          <p><strong>${totalChanges} account changes</strong> were detected.</p>
          <p>Review them in Displaygram.</p>
          <p> Pending changes will automatically be applied after 12 hours if no action is taken. </p>
        `,
      },
    });

    console.log("Admin notification email queued");
  }
);
