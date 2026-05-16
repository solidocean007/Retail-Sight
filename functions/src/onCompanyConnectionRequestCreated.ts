// functions/src/connections/onCompanyConnectionRequestCreated.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const APP_URL = "https://displaygram.com";

const cleanStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const getAdminRecipientsForCompany = async (companyId: string) => {
  const usersSnap = await db
    .collection("users")
    .where("companyId", "==", companyId)
    .where("status", "in", ["active", "pending"])
    .get();

  return usersSnap.docs
    .map((docSnap) => {
      const user = docSnap.data();

      const allowedRoles = new Set(["admin", "super-admin", "developer"]);

      if (!allowedRoles.has(user.role)) return null;
      if (!user.email) return null;

      return {
        email: String(user.email).trim().toLowerCase(),
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      };
    })
    .filter((recipient): recipient is { email: string; name: string } =>
      Boolean(recipient?.email)
    );
};

export const onCompanyConnectionRequestCreated = onDocumentCreated(
  {
    document: "companyConnections/{connectionId}",
    region: "us-central1",
  },
  async (event) => {
    const connectionId = event.params.connectionId;
    const connection = event.data?.data();

    if (!connection) return;

    if (connection.status !== "pending") return;

    const requestFromCompanyName =
      connection.requestFromCompanyName || "Another company";

    const requestToCompanyId = connection.requestToCompanyId;

    if (!requestToCompanyId) {
      console.warn(
        "[onCompanyConnectionRequestCreated] Missing requestToCompanyId",
        connectionId
      );
      return;
    }

    const recipients = await getAdminRecipientsForCompany(requestToCompanyId);

    if (!recipients.length) {
      console.warn(
        "[onCompanyConnectionRequestCreated] No admin recipients found",
        requestToCompanyId
      );
      return;
    }

    const pendingBrandNames = cleanStringArray(connection.pendingBrandNames);
    const brandText = pendingBrandNames.length
      ? pendingBrandNames.join(", ")
      : "No specific brands proposed yet";

    const dashboardUrl = `${APP_URL}/dashboard?mode=ConnectionsMode`;

    const subject = `${requestFromCompanyName} requested to connect on Displaygram`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2>New connection request</h2>

        <p>
          <strong>${requestFromCompanyName}</strong> requested to connect with your company on Displaygram.
        </p>

        <p>
          <strong>Proposed brands:</strong><br />
          ${brandText}
        </p>

        <p>
          Review this request in your Displaygram dashboard.
        </p>

        <p>
          <a href="${dashboardUrl}" style="display:inline-block;padding:10px
           16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
            Review Connection Request
          </a>
        </p>

        <p style="font-size:12px;color:#6b7280;">
          You can approve or reject this request from Dashboard → Connections.
        </p>
      </div>
    `;

    const text = [
      "New connection request",
      "",
      `${requestFromCompanyName} requested to connect with your company on Displaygram.`,
      "",
      `Proposed brands: ${brandText}`,
      "",
      `Review this request: ${dashboardUrl}`,
    ].join("\n");

    const batch = db.batch();

    recipients.forEach((recipient) => {
      const mailRef = db.collection("mail").doc();

      batch.set(mailRef, {
        to: recipient.email,
        message: {
          subject,
          text,
          html,
        },
        connectionId,
        type: "connection-request",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }
);
