import { createHash } from "crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const MIN_FORM_DWELL_MS = 1_200;
const URL_PATTERN = /(?:https?:\/\/|www\.)/gi;

type CompanyType = "distributor" | "supplier";

type AccessRequestInput = {
  workEmail?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  notes?: unknown;
  userTypeHint?: unknown;
  companyName?: unknown;
  website?: unknown;
  formStartedAt?: unknown;
  inviteId?: unknown;
  invitedByCompanyId?: unknown;
  inferredCompanyType?: unknown;
};

const normalizeCompanyInput = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

const requiredString = (value: unknown, label: string, maxLength: number) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${label} is required.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be ${maxLength} characters or fewer.`
    );
  }
  return trimmed;
};

const optionalString = (value: unknown, label: string, maxLength: number) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${label} is invalid.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be ${maxLength} characters or fewer.`
    );
  }
  return trimmed;
};

const normalizeEmail = (value: unknown) => {
  const email = requiredString(value, "Work email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid work email.");
  }
  return email;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character.charCodeAt(0) === 34) return "&quot;";
    if (character === "'") return "&#039;";
    return character;
  });

const findMatchingCompany = async (normalizedName: string) => {
  const snap = await db
    .collection("companies")
    .where("normalizedName", "==", normalizedName)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

const getClientAddress = (request: { rawRequest: { ip?: string } }) =>
  request.rawRequest.ip || "unknown";

const enforceRateLimit = async (clientAddress: string) => {
  const now = Date.now();
  const clientHash = createHash("sha256")
    .update(`request-access:${clientAddress}`)
    .digest("hex");
  const rateLimitRef = db.collection("accessRequestRateLimits").doc(clientHash);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const stored = snapshot.data();
    const windowStartedAt = stored?.windowStartedAt?.toMillis?.() ?? 0;
    const withinWindow = now - windowStartedAt < RATE_LIMIT_WINDOW_MS;
    const currentCount = withinWindow ? Number(stored?.count || 0) : 0;

    if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many access requests from this network."
      );
    }

    transaction.set(
      rateLimitRef,
      {
        count: currentCount + 1,
        windowStartedAt: admin.firestore.Timestamp.fromMillis(
          withinWindow ? windowStartedAt : now
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          now + RATE_LIMIT_WINDOW_MS * 2
        ),
      },
      { merge: true }
    );
  });
};

const looksAutomated = (data: AccessRequestInput) => {
  const honeypot = typeof data.website === "string" ? data.website.trim() : "";
  if (honeypot) return true;

  const formStartedAt =
    typeof data.formStartedAt === "number" ? data.formStartedAt : null;
  if (formStartedAt && Date.now() - formStartedAt < MIN_FORM_DWELL_MS) {
    return true;
  }

  const identityFields = [data.firstName, data.lastName, data.companyName]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  if (URL_PATTERN.test(identityFields)) return true;
  URL_PATTERN.lastIndex = 0;

  const allText = [data.firstName, data.lastName, data.companyName, data.notes]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  const urlCount = allText.match(URL_PATTERN)?.length ?? 0;
  URL_PATTERN.lastIndex = 0;
  return urlCount >= 1;
};

const isDuplicatePendingRequest = async (normalizedEmail: string) => {
  const snapshot = await db
    .collection("accessRequests")
    .where("normalizedEmail", "==", normalizedEmail)
    .limit(5)
    .get();

  return snapshot.docs.some((document) =>
    ["pending-approval", "approved-pending-user"].includes(
      document.data().status
    )
  );
};

const validateInvite = async (inviteId: string, workEmail: string) => {
  const snapshot = await db.collection("pendingInvites").doc(inviteId).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "This invitation is no longer active.");
  }

  const invite = snapshot.data() || {};
  const inviteEmail = String(invite.email || "")
    .trim()
    .toLowerCase();
  if (
    inviteEmail !== workEmail ||
    !["pending", "email-queued"].includes(invite.status)
  ) {
    throw new HttpsError(
      "permission-denied",
      "This invitation does not match the requested email."
    );
  }

  return invite;
};

export const createCompanyOrRequest = onCall(async (request) => {
  try {
    const data = (request.data || {}) as AccessRequestInput;

    // Quietly accept obvious bot submissions so automated tools get no useful
    // feedback and no Firestore documents or emails are created.
    if (looksAutomated(data)) {
      return { ok: true };
    }

    const workEmail = normalizeEmail(data.workEmail);
    const firstName = requiredString(data.firstName, "First name", 60);
    const lastName = requiredString(data.lastName, "Last name", 60);
    const companyName = requiredString(data.companyName, "Company name", 120);
    const phone = optionalString(data.phone, "Phone", 32);
    const notes = optionalString(data.notes, "Notes", 800);

    if (
      !(["distributor", "supplier"] as unknown[]).includes(data.userTypeHint)
    ) {
      throw new HttpsError("invalid-argument", "Select a valid company type.");
    }
    const userTypeHint = data.userTypeHint as CompanyType;

    const inviteId = optionalString(data.inviteId, "Invite ID", 160);
    const invite = inviteId ? await validateInvite(inviteId, workEmail) : null;

    if (await isDuplicatePendingRequest(workEmail)) {
      return { ok: true };
    }

    if (!invite) {
      await enforceRateLimit(getClientAddress(request));
    }

    const normalizedName = normalizeCompanyInput(companyName);
    const existing = await findMatchingCompany(normalizedName);

    const accessRequestDoc = {
      workEmail,
      normalizedEmail: workEmail,
      firstName,
      lastName,
      phone,
      notes,
      userType: userTypeHint,
      userTypeHint,
      companyName,
      normalizedName,
      companyId: existing?.id ?? null,
      status: "pending-approval",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      inviteId: inviteId || null,
      invitedByCompanyId: invite?.fromCompanyId || null,
      inferredCompanyType:
        invite?.fromCompanyType === "supplier"
          ? "distributor"
          : invite?.fromCompanyType === "distributor"
            ? "supplier"
            : null,
      submissionMeta: {
        appCheckVerified: Boolean(request.app),
        formVersion: 2,
      },
    };

    await db.collection("accessRequests").add(accessRequestDoc);

    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeCompanyName = escapeHtml(companyName);
    const safeEmail = escapeHtml(workEmail);

    await db.collection("mail").add({
      to: workEmail,
      category: "transactional",
      from: "support@displaygram.com",
      replyTo: "support@displaygram.com",
      message: {
        subject: "Displaygram access request received",
        text:
          `Hi ${firstName}, thanks for requesting access to Displaygram.\n` +
          `We’ll review ${companyName} and notify you once approved.`,
        html: `
          <div style="font-family: sans-serif; font-size: 15px; color: #333;">
            <p>Hi ${safeFirstName},</p>
            <p>Thanks for requesting access to <strong>Displaygram</strong>.</p>
            <p>We’ll review <strong>${safeCompanyName}</strong> and notify you once approved.</p>
          </div>
        `,
      },
    });

    await db.collection("mail").add({
      to: "support@displaygram.com",
      category: "transactional",
      from: "support@displaygram.com",
      replyTo: workEmail,
      message: {
        subject: `New Displaygram access request (${companyName})`,
        text:
          `${firstName} ${lastName} (${workEmail}) requested access as ` +
          `a ${userTypeHint}.`,
        html: `
          <div style="font-family: sans-serif; font-size: 15px; color: #333;">
            <p><strong>${safeFirstName} ${safeLastName}</strong>
              (${safeEmail}) requested access as a
              <strong>${userTypeHint}</strong>.</p>
            <p>Company: <strong>${safeCompanyName}</strong>.</p>
            <p>No company workspace has been created yet.</p>
          </div>
        `,
      },
    });

    return { ok: true };
  } catch (error: unknown) {
    console.error("createCompanyOrRequest error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to process access request.");
  }
});
