import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();

const ACCOUNT_IMPORT_SETTINGS_DOC = "accountImports";

export const onAccountImportCreated = onDocumentCreated(
  "accountImports/{importId}",
  async (event) => {
    const importRef = event.data?.ref;
    const importData = event.data?.data();

    if (!importRef || !importData) return;

    const {
      companyId,
      totalChanges,
      changes,
      status,
      notificationEmailSent,
      source,
    } = importData;

    // Guard against fake/manual/incomplete docs
    if (!companyId) {
      console.log("[onAccountImportCreated] Import missing companyId");
      return;
    }

    if (status !== "pending") {
      console.log("[onAccountImportCreated] Import is not pending", {
        status,
      });
      return;
    }

    if (notificationEmailSent === true) {
      console.log("[onAccountImportCreated] Notification already sent");
      return;
    }

    if (source === "manual-test") {
      console.log("[onAccountImportCreated] Skipping manual-test import");
      return;
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      console.log("[onAccountImportCreated] Import has no changes");
      return;
    }

    const safeTotalChanges =
      typeof totalChanges === "number" && totalChanges > 0
        ? totalChanges
        : changes.length;

    if (safeTotalChanges <= 0) {
      console.log("[onAccountImportCreated] Import has zero total changes");
      return;
    }

    // 1) Preferred: company/settings/accountImports notificationEmails
    const settingsSnap = await db
      .collection("companies")
      .doc(companyId)
      .collection("settings")
      .doc(ACCOUNT_IMPORT_SETTINGS_DOC)
      .get();

    const settings = settingsSnap.exists ? settingsSnap.data() : null;

    const notifyOnImport = settings?.notifyOnImport !== false;

    if (!notifyOnImport) {
      console.log("[onAccountImportCreated] Notifications disabled", {
        companyId,
      });
      return;
    }

    const configuredEmails = Array.isArray(settings?.notificationEmails)
      ? settings.notificationEmails
          .map((email: unknown) =>
            typeof email === "string" ? email.trim().toLowerCase() : ""
          )
          .filter((email: string) => email.includes("@"))
      : [];

    let emails = Array.from(new Set(configuredEmails));

    // 2) Fallback: company admin users
    if (emails.length === 0) {
      const usersSnap = await db
        .collection("users")
        .where("companyId", "==", companyId)
        .where("role", "in", ["admin", "super-admin"])
        .get();

      emails = Array.from(
        new Set(
          usersSnap.docs
            .map((doc) => doc.data()?.email)
            .filter((email): email is string => Boolean(email))
            .map((email) => email.trim().toLowerCase())
        )
      );

      // Optional in-app notifications for fallback users
      const batch = db.batch();

      usersSnap.docs.forEach((doc) => {
        const notificationRef = db
          .collection("users")
          .doc(doc.id)
          .collection("notifications")
          .doc();

        batch.set(notificationRef, {
          type: "account-import",
          message: `${safeTotalChanges} account changes detected`,
          link: "https://displaygram.com/dashboard",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          companyId,
          accountImportId: event.params.importId,
        });
      });

      await batch.commit();
    }

    if (!emails.length) {
      console.log("[onAccountImportCreated] No notification emails found", {
        companyId,
      });
      return;
    }

    await db.collection("mail").add({
      to: emails,
      message: {
        subject: "Displaygram Account Sync Pending",
        text: `${safeTotalChanges} account changes were detected and require review. Pending changes will automatically be 
        applied after 12 hours if no action is taken.`,
        html: `
          <p><strong>${safeTotalChanges} account changes</strong> were detected.</p>
          <p>Review them in Displaygram.</p>
          <p>Pending changes will automatically be applied after 12 hours if no action is taken.</p>
        `,
      },
    });

    await importRef.update({
      notificationEmailSent: true,
      notificationEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      notificationRecipients: emails,
    });

    console.log("[onAccountImportCreated] Notification email queued", {
      companyId,
      importId: event.params.importId,
      recipients: emails.length,
    });
  }
);
