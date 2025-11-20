// functions/src/notifications/connectionNotification.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendNotification } from "./sendNotification";

// Example: new connection request between companies

export const connectionRequestNotification = onDocumentCreated(
  "companyConnections/{connectionId}",
  async (event) => {
    const connection = event.data?.data() as any;
    if (!connection) return;

    const targetCompanyId: string | undefined = connection.targetCompanyId;
    const requesterCompanyId: string | undefined =
      connection.requesterCompanyId;

    if (!targetCompanyId || !requesterCompanyId) return;

    // TODO: lookup target company admins from "users" collection
    // and build an array of recipientUserIds.
    // For now this is just a pattern/example.

    // const adminUids: string[] = [...]
    const adminUids: string[] = [];

    if (adminUids.length === 0) return;

    await sendNotification({
      type: "connection-request",
      message: `New connection request from ${connection.requesterName || "a distributor"}`,
      recipientUserIds: adminUids,
      recipientCompanyIds: [targetCompanyId],
      sentByUid: null, // system or requester company
    });
  }
);
