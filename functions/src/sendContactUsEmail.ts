import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";
import * as admin from "firebase-admin";

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

interface ContactData {
  name: string;
  email: string;
  message: string;
  phone?: string;
}

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const sendContactUsEmail = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<ContactData>
  ): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    const data = request.data;

    // Validate input data
    if (!data.name || !data.email || !data.message) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Name, email, and message are required fields."
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail,
        pass: gmailPassword,
      },
    });

    const mailOptions = {
      from: data.email, // 'Reply-To' to the user's email
      to: gmailEmail, // Your Gmail where you want to receive the messages
      subject: `New Contact Message from ${data.name}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${
        data.phone || "Not provided"
      }\nMessage: ${data.message}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new functions.https.HttpsError("internal", "Failed to send email.");
    }
  }
);
