import * as functions from 'firebase-functions'; // Parsing error: Argument for '--moduleResolution' option must be: 'node', 'classic', 'node16', 'nodenext'.eslint
import * as nodemailer from 'nodemailer';

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

export const sendInvite = functions.https.onCall((data : any, context: any) => {
    // Make sure to configure the email transport using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'gmail', // If you're using Gmail
        auth: {
          user: gmailEmail,
          pass: gmailPassword
        }
    });

    const mailOptions = {
        from: 'support@displaygram.com',
        to: data.email,
        subject: 'You have been invited to join DisplayGram!',
        text: `Hi there! You've been invited to join DisplayGram by ${data.inviter}. Click here to accept the invitation: ${data.inviteLink}`
        // You can also use `html` key to send HTML email
    };

    // Send email and handle the promise
    return transporter.sendMail(mailOptions)
        .then(() => {
            return { success: true };
        })
        .catch((error : unknown) => {
            console.error('There was an error while sending the email:', error);
            return { success: false };
        });
});
