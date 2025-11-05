// functions/src/createCompanyOrRequest.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
const normalizeCompanyInput = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

const findMatchingCompany = async (normalizedName: string) => {
  const snap = await db
    .collection("companies")
    .where("normalizedName", "==", normalizedName)
    .limit(1)
    .get();
  if (snap.empty) {
    return null;
  }
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

const createNewCompany = async (data: {
  companyName: string;
  companyType: string;
  verified?: boolean;
  accessStatus?: string;
}) => {
  const ref = await db.collection("companies").add({
    companyName: data.companyName,
    normalizedName: normalizeCompanyInput(data.companyName),
    companyType: data.companyType,
    verified: data.verified ?? false,
    accessStatus: data.accessStatus ?? "off",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
};

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Gen2 Callable function: createCompanyOrRequest
 * Called via httpsCallable() from the frontend
 */
export const createCompanyOrRequest = onCall(async (request) => {
  try {
    const data = request.data || {};
    const {
      workEmail,
      firstName,
      lastName,
      phone,
      notes,
      userTypeHint,
      companyName,
    } = data;

    if (!workEmail || !companyName || !firstName || !lastName) {
      throw new Error("Missing required fields.");
    }

    const normalizedName = normalizeCompanyInput(companyName);
    const existing = await findMatchingCompany(normalizedName);

    if (existing) {
      // Company already exists — add pending request
      await db.collection("accessRequests").add({
        workEmail,
        firstName,
        lastName,
        phone,
        notes,
        userType: userTypeHint,
        companyName: normalizedName,
        companyId: existing.id,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notify admin
      await db.collection("mail").add({
        to: "support@displaygram.com",
        subject: `🆕 New Access Request (${normalizedName})`,
        text: `${firstName} ${lastName} (${workEmail}) requested access to ${normalizedName} (${userTypeHint}).`,
      });

      return { ok: true };
    }

    // No existing company — create provisional one
    const newCompany = await createNewCompany({
      companyName: normalizedName,
      companyType: userTypeHint,
      verified: false,
      accessStatus: "off",
    });

    await db.collection("accessRequests").add({
      workEmail,
      firstName,
      lastName,
      phone,
      notes,
      userType: userTypeHint,
      companyName: normalizedName,
      companyId: newCompany.id,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify requester + admin
    await db.collection("mail").add({
      to: workEmail,
      subject: "✅ Displaygram access request received",
      text: `Hi ${firstName}, thanks for requesting access to Displaygram as a ${userTypeHint}.
       We'll review your company (${normalizedName}) and notify you once approved.`,
    });

    await db.collection("mail").add({
      to: "support@displaygram.com",
      subject: `🆕 New Access Request (${normalizedName})`,
      text: `${firstName} ${lastName} (${workEmail}) requested access as a ${userTypeHint}.
       A provisional company was created.`,
    });

    return { ok: true };
  } catch (err: any) {
    console.error("createCompanyOrRequest error:", err);
    throw new Error(err.message || "Failed to process access request");
  }
});
