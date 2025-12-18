import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase"; // adjust if your path differs
import { UserType } from "./types";

type AuditActor = { uid: string; email?: string | null };

export async function updateSupervisor(args: {
  companyId: string;
  actor: AuditActor;
  user: UserType;
  newSupervisorUid: string; // "" means unassigned
  supervisorsByUid: Record<string, { uid: string; firstName?: string; lastName?: string; email?: string }>;
}) {
  const { companyId, actor, user, newSupervisorUid, supervisorsByUid } = args;

  const prev = String(user.reportsTo ?? "");
  const next = String(newSupervisorUid ?? "");

  // no-op
  if (prev === next) return;

  // 1) update user doc
  await updateDoc(doc(db, "users", user.uid), {
    reportsTo: next,
    updatedAt: serverTimestamp(),
  });

  // 2) audit log
  const prevSup = prev ? supervisorsByUid[prev] : undefined;
  const nextSup = next ? supervisorsByUid[next] : undefined;

  await addDoc(collection(db, `companies/${companyId}/auditLogs`), {
    type: "reportsTo_change",
    actorUid: actor.uid,
    actorEmail: actor.email ?? null,

    targetUid: user.uid,
    targetEmail: user.email ?? null,
    targetName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),

    fromSupervisorUid: prev || null,
    fromSupervisorName: prevSup
      ? `${prevSup.firstName ?? ""} ${prevSup.lastName ?? ""}`.trim()
      : null,
    fromSupervisorEmail: prevSup?.email ?? null,

    toSupervisorUid: next || null,
    toSupervisorName: nextSup
      ? `${nextSup.firstName ?? ""} ${nextSup.lastName ?? ""}`.trim()
      : null,
    toSupervisorEmail: nextSup?.email ?? null,

    createdAt: serverTimestamp(),
  });
}
