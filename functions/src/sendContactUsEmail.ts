// sendContactUsEmail.ts
// sendContactEmail.ts
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
  (data: ContactData, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
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
      from: data.email, // This sets the 'Reply-To' to the user's email
      to: gmailEmail, // Your Gmail where you want to receive the messages
      subject: `New Contact Message from ${data.name}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\n
      Phone: ${data.phone || "Not provided"}\nMessage: ${data.message}`,
    };

    return transporter
      .sendMail(mailOptions)
      .then(() => ({success: true}))
      .catch((error) => {
        console.error("Failed to send email:", error);
        return {success: false};
      });
  }
);
