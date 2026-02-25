import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";
import { enforcePlanLimitsInternal } from "./billing/enforePlanLimitsInternal";

const PUBLIC_BASE_URL = defineString("PUBLIC_BASE_URL");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

type Inviter = {
  uid: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  companyId: string;
};

type CreateInvitePayload = {
  email: string;
  role?: "employee" | "admin" | "super-admin" | "developer";
  baseUrl?: string;
};

export const createInviteAndEmail = onCall<CreateInvitePayload>(async (req) => {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Auth required.");

  // 🔹 Load inviter
  const inviterSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (!inviterSnap.exists)
    throw new HttpsError("permission-denied", "Inviter not found.");

  const inviter = inviterSnap.data() as Inviter;
  const allowed = new Set(["admin", "super-admin", "developer"]);
  if (!inviter.role || !allowed.has(inviter.role))
    throw new HttpsError("permission-denied", "Only admins can invite.");

  const companyId = inviter.companyId;
  if (!companyId)
    throw new HttpsError("failed-precondition", "Missing companyId.");

  const emailRaw = (req.data?.email ?? "").trim();
  if (!emailRaw) throw new HttpsError("invalid-argument", "Email is required.");

  // 🔐 Recompute latest usage snapshot
  await recomputeCompanyCountsInternal(companyId);

  // 🔐 Enforce plan limit BEFORE creating invite
  await enforcePlanLimitsInternal(companyId, "addUser");

  const emailLower = emailRaw.toLowerCase();
  const role = (req.data?.role ?? "employee") as CreateInvitePayload["role"];

  let baseUrl = (req.data?.baseUrl || "").trim();
  if (!baseUrl || baseUrl.includes("localhost")) {
    baseUrl = PUBLIC_BASE_URL.value();
  }

  // Basic validation
  try {
    const u = new URL(baseUrl);
    if (!u.protocol.startsWith("http")) throw new Error("bad protocol");
  } catch {
    throw new HttpsError("invalid-argument", "Invalid baseUrl.");
  }

  // 🔹 Create IDs + link
  const inviteRef = db.collection(`companies/${companyId}/invites`).doc();
  const inviteId = inviteRef.id;
  const inviteLink = `${baseUrl}/accept-invite/${companyId}/${inviteId}`;

  // 🔹 Deduping (mutex)
  const mutexRef = db.doc(`invitesMutex/${emailLower}_${companyId}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const companySnap = await db.doc(`companies/${companyId}`).get();
  const companyName = companySnap.exists
    ? companySnap.get("companyName")
    : null;

  // 🔹 Transaction to create invite + mutex
  await db.runTransaction(async (tx) => {
    const m = await tx.get(mutexRef);
    if (m.exists && m.get("status") === "pending") {
      throw new HttpsError(
        "already-exists",
        "An invite is already pending for this email."
      );
    }

    tx.set(mutexRef, {
      emailLower,
      companyId,
      status: "pending",
      inviteId,
      updatedAt: now,
    });

    tx.set(inviteRef, {
      inviteId,
      companyId,
      companyName,
      inviterUid: req.auth?.uid,
      inviterName:
        `${inviter.firstName ?? ""} ${inviter.lastName ?? ""}`.trim(),
      inviterEmail: inviter.email ?? null,
      inviteeEmail: emailRaw,
      inviteeEmailLower: emailLower,
      role,
      status: "pending",
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      link: inviteLink,
    });
  });

  // 🔁 Refresh usage snapshot after invite creation
  await recomputeCompanyCountsInternal(companyId);

  // 🔹 Send email
  await db.collection("mail").add({
    to: emailLower,
    category: "transactional",
    from: "support@displaygram.com",
    replyTo: inviter.email ?? undefined,
    message: {
      subject: "You’ve been invited to join Displaygram",
      /* prettier-ignore */
      text: `
Hi there,

You've been invited to join your team on Displaygram by ${
  inviter.firstName ?? ""
} ${inviter.lastName ?? ""}.

Click below to accept your invite:
${inviteLink}

If you weren’t expecting this email, you can ignore it.

— The Displaygram Team
`,
      html: `
  <div style="font-family:sans-serif;font-size:15px;color:#333;">
    <p>Hi there,</p>
    <p>
      You've been invited to join your team on <strong>Displaygram</strong> by
      <strong>${inviter.firstName ?? ""} ${inviter.lastName ?? ""}</strong>.
    </p>
    <p>
      <a href="${inviteLink}" style="background:#3f51b5;color:white;padding:10px 16px;
      border-radius:4px;text-decoration:none;">Accept Your Invite</a>
    </p>
    <p>If you weren’t expecting this email, you can safely ignore it.</p>
    <p>— The Displaygram Team</p>
  </div>`,
    },

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, inviteId };
});
