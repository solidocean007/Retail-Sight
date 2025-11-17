// functions/src/notifications/goalNotification.ts
import {
  onDocumentCreated,
  // onDocumentUpdated,
} from "firebase-functions/v2/firestore";
// import { sendNotification, admin } from "./sendNotification";
import { sendNotification } from "./sendNotification";

// Example: when a goal is created or assigned, notify users.
// Tweak collection path & fields to match your schema.

export const goalCreatedNotification = onDocumentCreated(
  "companyGoals/{goalId}",
  async (event) => {
    const goal = event.data?.data() as any;
    if (!goal) return;

    const companyId: string | undefined = goal.companyId;
    const assignedUserIds: string[] = goal.assignedUserIds || [];

    if (!companyId || assignedUserIds.length === 0) return;

    await sendNotification({
      type: "goal-created",
      message: `You have a new goal: ${goal.title || "New goal"}`,
      recipientUserIds: assignedUserIds,
      recipientCompanyIds: [companyId],
      sentByUid: null, // system
    });
  }
);
