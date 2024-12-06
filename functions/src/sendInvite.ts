import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

interface InviteData {
  email: string;
  inviter: string;
  inviteLink: string;
}

export const sendInvite = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<InviteData>
  ): Promise<{ success: boolean }> => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required to send an invite."
      );
    }

    const data = request.data;

    // Validate input data
    if (!data.email || !data.inviter || !data.inviteLink) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with 'email', 'inviter', and 'inviteLink'."
      );
    }

    // Configure the email transport using the default SMTP transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail,
        pass: gmailPassword,
      },
    });

    const mailOptions = {
      from: "support@displaygram.com",
      to: data.email,
      subject: "You have been invited to join DisplayGram!",
      text: `Hi! You've been invited to join DisplayGram by ${data.inviter}.
       Click here to accept the invitation: ${data.inviteLink}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("There was an error while sending the email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Unable to send the invite email."
      );
    }
  }
);
