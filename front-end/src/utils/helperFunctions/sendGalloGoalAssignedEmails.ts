import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { EnrichedGalloAccountType, UserType, FireStoreGalloGoalDocType } from "../types";

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

  // optional safety: only prod
  if (savedGoal.goalDetails.goalEnv !== "prod") return;

  // collect route nums from selected accounts
  const routeNums = new Set<string>();
  for (const acc of selectedAccounts) {
    for (const rn of acc.salesRouteNums || []) {
      if (rn && rn !== "N/A") routeNums.add(String(rn));
    }
  }

  const recipients = companyUsers
  .filter((u) => u.email && notifyUserIds.includes(u.uid))
  .map((u) => ({
    uid: u.uid,
    email: u.email!,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
  }));


  // de-dupe by uid
  const unique = Array.from(new Map(recipients.map((r) => [r.uid, r])).values());

  for (const r of unique) {
    await addDoc(collection(db, "mail"), {
      to: r.email,
      from: "support@displaygram.com",
      category: "transactional",
      message: {
        subject: `🍷 New Gallo Goal Assigned: ${savedGoal.goalDetails.goal}`,
        text: `You have been assigned a new Gallo goal.\n\nProgram: ${savedGoal.programDetails.programTitle}\nGoal: ${savedGoal.goalDetails.goal}`,
        html: `
          <div style="font-family:sans-serif;font-size:15px;color:#333;">
            <p>You have been assigned a new <strong>Gallo</strong> goal:</p>
            <h3>${savedGoal.goalDetails.goal}</h3>
            <p><strong>Program:</strong> ${savedGoal.programDetails.programTitle}</p>
            <p>${savedGoal.programDetails.programDescription || ""}</p>
            <p>
              <strong>Start:</strong> ${savedGoal.programDetails.programStartDate}<br/>
              <strong>End:</strong> ${savedGoal.programDetails.programEndDate}
            </p>
          </div>
        `,
      },
      goalId: savedGoal.goalDetails.goalId, // doc id = goalId in your current schema
      companyId: savedGoal.companyId,
      createdAt: serverTimestamp(),
    });
  }
};
