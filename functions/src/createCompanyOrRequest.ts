import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/** Normalize company name for lookups */
const normalizeCompanyInput = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

/** Find existing company by normalized name */
const findMatchingCompany = async (normalizedName: string) => {
  const snap = await db
    .collection("companies")
    .where("normalizedName", "==", normalizedName)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

/** Create a provisional (unverified) company */
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

/** Main callable */
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

    const accessRequestDoc = {
      workEmail,
      firstName,
      lastName,
      phone,
      notes,
      userType: userTypeHint,
      companyName: normalizedName,
      companyId: existing ? existing.id : undefined,
      status: "pending-approval",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (existing) {
      // Company already exists
      await db.collection("accessRequests").add(accessRequestDoc);

      // Notify admin about the new join request
      await db.collection("mail").add({
        to: "support@displaygram.com",
        from: "support@displaygram.com",
        replyTo: "support@displaygram.com",
        message: {
          subject: `🆕 Access Request for Existing Company (${normalizedName})`,
          text: `${firstName} ${lastName} (${workEmail}) requested access as a ${userTypeHint} 
          to join ${companyName}.`,
          html: `
            <div style="font-family: sans-serif; font-size: 15px; color: #333;">
              <p><strong>${firstName} ${lastName}</strong> (${workEmail}) requested access as 
              a <strong>${userTypeHint}</strong> to join <strong>${companyName}</strong>.</p>
            </div>
          `,
        },
      });

      // Confirmation email to requester
      await db.collection("mail").add({
        to: workEmail,
        from: "support@displaygram.com",
        replyTo: "support@displaygram.com",
        message: {
          subject: "✅ Displaygram access request received",
          text: `Hi ${firstName}, thanks for requesting access to Displaygram as a ${userTypeHint}.
We’ll review your company (${companyName}) and notify you once approved.`,
          html: `
            <div style="font-family: sans-serif; font-size: 15px; color: #333;">
              <p>Hi ${firstName},</p>
              <p>Thanks for requesting access to <strong>Displaygram</strong> as a <strong>${userTypeHint}
              </strong>.</p>
              <p>We’ll review your company <strong>${companyName}</strong> and notify you once approved.</p>
            </div>
          `,
        },
      });

      return { ok: true };
    }

    // No existing company — create provisional
    const newCompany = await createNewCompany({
      companyName: normalizedName,
      companyType: userTypeHint,
      verified: false,
      accessStatus: "off",
    });

    await db.collection("accessRequests").add({
      ...accessRequestDoc,
      companyId: newCompany.id,
    });

    // Confirmation email to requester
    await db.collection("mail").add({
      to: workEmail,
      from: "support@displaygram.com",
      replyTo: "support@displaygram.com",
      message: {
        subject: "✅ Displaygram access request received",
        text: `Hi ${firstName}, thanks for requesting access to Displaygram as a ${userTypeHint}.
We’ll review your company (${companyName}) and notify you once approved.`,
        html: `
          <div style="font-family: sans-serif; font-size: 15px; color: #333;">
            <p>Hi ${firstName},</p>
            <p>Thanks for requesting access to <strong>Displaygram</strong> as a <strong>${userTypeHint}</strong>.</p>
            <p>We’ll review your company <strong>${companyName}</strong> and notify you once approved.</p>
          </div>
        `,
      },
    });

    // Notification email to admin
    await db.collection("mail").add({
      to: "support@displaygram.com",
      from: "support@displaygram.com",
      replyTo: "support@displaygram.com",
      message: {
        subject: `🆕 New Access Request (${normalizedName})`,
        text: `${firstName} ${lastName} (${workEmail}) requested access as a ${userTypeHint}. 
        A provisional company was created.`,
        html: `
          <div style="font-family: sans-serif; font-size: 15px; color: #333;">
            <p><strong>${firstName} ${lastName}</strong> (${workEmail}) requested access as a <strong>
            ${userTypeHint}</strong>.</p>
            <p>A new provisional company (<strong>${companyName}</strong>) was created and marked pending review.</p>
          </div>
        `,
      },
    });

    return { ok: true };
  } catch (err: any) {
    console.error("createCompanyOrRequest error:", err);
    throw new Error(err.message || "Failed to process access request");
  }
});
