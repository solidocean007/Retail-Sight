import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();

const db = admin.firestore();

/**
 * Trigger: new pending invite for a new user + new company.
 * Writes a rich HTML email job to Firestore mail collection.
 */
export const onPendingNewUserAndCompanyInviteCreate = onDocumentCreated(
  "pendingInvites/{inviteId}",
  async (event) => {
    const inviteId = event.params.inviteId;
    const data = event.data?.data();

    if (!data) return;

    const { email, fromCompanyId, createdAt } = data;

    // Fetch initiating company
    const fromCompanySnap = await db
      .collection("companies")
      .doc(fromCompanyId)
      .get();

    const fromCompany = fromCompanySnap.data();
    const companyName = fromCompany?.companyName || "A Displaygram Company";

    const draftsSnap = await db
      .collection("companyConnectionDrafts")
      .where("targetEmail", "==", email.toLowerCase())
      .where("status", "==", "pending-user-creation")
      .get();

    let brands: string[] = [];

    draftsSnap.forEach((doc) => {
      const draft = doc.data();
      if (Array.isArray(draft.pendingBrands)) {
        draft.pendingBrands.forEach((b: any) => {
          if (typeof b === "string") {
            brands.push(b);
          } else if (b?.brand) {
            brands.push(b.brand);
          }
        });
      }
    });

    // remove duplicates
    brands = [...new Set(brands)];

    if (!fromCompanyId) {
      console.error("Missing fromCompanyId on invite");
      return;
    }

    // Logo hosted in Firebase Storage
    const logoUrl = "https://displaygram.com/displaygram-logo.png";

    const onboardingUrl = `https://displaygram.com/onboard-company/${fromCompanyId}/${inviteId}`;

    const subject = `${companyName} invited you to join Displaygram`;

    // ============================================================
    // 🎨 BEAUTIFUL BRANDED EMAIL TEMPLATE (GRADIENT + DARK MODE)
    // ============================================================
    const html = `
    <html>
      <body style="margin:0; padding:0; background:#0b1120; font-family:Arial, sans-serif;">

        <!-- OUTER BACKGROUND (dark mode friendly) -->
        <table width="100%" cellpadding="0" cellspacing="0" 
               style="background:#0b1120; padding:40px 0;">
          <tr>
            <td align="center">

              <!-- MAIN CARD -->
              <table width="600" cellpadding="0" cellspacing="0"
                style="background:#ffffff; border-radius:14px; overflow:hidden;
                       box-shadow:0 4px 16px rgba(0,0,0,0.35);">

                <!-- GRADIENT HEADER -->
                <tr>
                  <td style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    padding: 32px 20px;
                    text-align:center;
                  ">
                    <img src="${logoUrl}"
                      alt="Displaygram"
                      style="width:160px; height:auto; margin-bottom:12px;" />

                    <h1 style="
                      margin:0;
                      font-size:24px;
                      color:white;
                      font-weight:600;
                    ">
                      You're Invited to Join Displaygram
                    </h1>
                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="padding:30px; color:#374151; font-size:16px; line-height:1.6;">

                    <p>
                      <strong style="color:#111827;">${companyName}</strong>
                      has invited you to join Displaygram and create your company profile.
                    </p>

                    ${
                      brands.length > 0
                        ? `
  <div style="margin:24px 0;">
    <p style="margin-bottom:10px;">
      <strong>Proposed Shared Brands:</strong>
    </p>

    <ul style="
      padding-left:20px;
      margin:0;
      color:#374151;
      font-size:15px;
    ">
      ${brands
        .map(
          (b) => `
            <li style="
  display:inline-block;
  background:#e0e7ff;
  color:#1e40af;
  padding:6px 10px;
  border-radius:6px;
  margin:4px 4px 0 0;
  font-size:13px;
">
  ${b}
</li>
          `
        )
        .join("")}
    </ul>
  </div>
`
                        : `
  <p>
    They have invited you to connect and collaborate on Displaygram.
  </p>
`
                    }

                    <!-- CTA BUTTON -->
                    <div style="text-align:center; margin:32px 0;">
                      <a href="${onboardingUrl}"
                        style="
                          background:#3b82f6;
                          color:white;
                          padding:14px 26px;
                          text-decoration:none;
                          font-size:16px;
                          font-weight:600;
                          border-radius:8px;
                          display:inline-block;
                        ">
                        Accept Invitation & Join
                      </a>
                    </div>

                    <p>
                      After joining, you'll complete your company setup and approve
                      the pending shared-brand connection.
                    </p>

                    <hr style="border:none; border-top:1px solid #e5e7eb; margin:32px 0;" />

                    <p style="font-size:13px; color:#6b7280;">
                      Sent by Displaygram • ${new Date(createdAt).toLocaleString()}
                    </p>

                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background:#f3f4f6; padding:18px; text-align:center;">
                    <p style="margin:0; font-size:12px; color:#6b7280;">
                      © ${new Date().getFullYear()} Displaygram
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;

    // WRITE EMAIL JOB — this triggers your existing email system
    await db.collection("mail").add({
      to: email,
      category: "transactional",
      message: {
        subject,
        html,
      },
      inviteId,
      fromCompanyId,
      type: "new-company-invite",
      queuedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update invite status
    await db.collection("pendingInvites").doc(inviteId).update({
      status: "email-queued",
      emailQueued: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `📨 Displaygram Invite Email Queued → ${email} (inviteId ${inviteId})`
    );
  }
);
