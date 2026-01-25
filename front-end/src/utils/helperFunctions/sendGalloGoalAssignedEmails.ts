import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  EnrichedGalloAccountType,
  UserType,
  FireStoreGalloGoalDocType,
} from "../types";

type DateLike = string | Date | { toDate: () => Date } | null | undefined;

function formatDate(v?: DateLike): string | null {
  if (!v) return null;

  const d =
    typeof (v as any)?.toDate === "function"
      ? (v as any).toDate()
      : v instanceof Date
        ? v
        : typeof v === "string"
          ? new Date(v)
          : null;

  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : null;
}

export const sendGalloGoalAssignedEmails = async ({
  savedGoal,
  selectedAccounts,
  companyUsers,
  notifyUserIds,
}: {
  savedGoal: FireStoreGalloGoalDocType & { id?: string };
  selectedAccounts: EnrichedGalloAccountType[];
  companyUsers: UserType[];
  notifyUserIds: string[];
}) => {
  if (savedGoal.goalDetails.goalEnv !== "prod") return;

  const displayOn = formatDate(savedGoal.displayDate);
  const startsOn = formatDate(savedGoal.programDetails?.programStartDate);
  const endsOn = formatDate(savedGoal.programDetails?.programEndDate);

  const notifySet = new Set(notifyUserIds);

  const recipients = companyUsers
    .filter((u) => u.email && notifySet.has(u.uid))
    .map((u) => ({
      uid: u.uid,
      email: u.email!,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
    }));

  const unique = Array.from(
    new Map(recipients.map((r) => [r.uid, r])).values(),
  );

  await Promise.all(
    unique.map((r) =>
      addDoc(collection(db, "mail"), {
        to: r.email,
        from: "support@displaygram.com",
        category: "transactional",
        message: {
          subject: `🍷 New Gallo Goal Assigned: ${savedGoal.goalDetails.goal}`,
          text: `You have been assigned a new Gallo goal.\n\nProgram: ${savedGoal.programDetails.programTitle}\nGoal: ${savedGoal.goalDetails.goal}`,
          html: `
<div style="font-family:sans-serif;font-size:15px;color:#333;line-height:1.5">
  <p>You have been assigned a new <strong>Gallo</strong> goal.</p>

  <h3 style="margin-bottom:4px;">${savedGoal.goalDetails.goal}</h3>
  <p style="margin-top:0;">
    <strong>Program:</strong> ${savedGoal.programDetails.programTitle}
  </p>

  ${
    savedGoal.programDetails.programDescription
      ? `<p>${savedGoal.programDetails.programDescription}</p>`
      : ""
  }

  <hr style="margin:16px 0;" />

  <p><strong>Timing</strong></p>
  <ul>
    ${displayOn ? `<li><strong>Visible in Displaygram:</strong> ${displayOn}</li>` : ""}
    ${startsOn ? `<li><strong>Goal starts:</strong> ${startsOn}</li>` : ""}
    ${endsOn ? `<li><strong>Goal ends:</strong> ${endsOn}</li>` : ""}
  </ul>

  <p style="color:#666;font-size:13px;">
    This goal is scheduled in advance.
    It will appear in Displaygram on <strong>${displayOn ?? "a future date"}</strong>
    and becomes active on <strong>${startsOn ?? "its start date"}</strong>.
    You won’t be able to submit until it becomes active.
  </p>
</div>
`,
        },
        goalId: savedGoal.goalDetails.goalId,
        companyId: savedGoal.companyId,
        createdAt: serverTimestamp(),
      }),
    ),
  );
};
