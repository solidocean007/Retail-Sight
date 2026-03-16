import { onCall } from "firebase-functions/v2/https";
import { google } from "googleapis";

export const readEncompassEmails = onCall(async () => {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  const gmail = google.gmail({ version: "v1", auth });

  // Only today's emails
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const query = `from:noreply@encompass8.com after:${Math.floor(today.getTime() / 1000)}`;

  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
  });

  const messages = res.data.messages || [];

  const quickLinks: string[] = [];

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
    });

    const parts = full.data.payload?.parts || [];

    let body = "";

    for (const part of parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString();
      }
    }

    const match = body.match(/https:\/\/[^\s"]+QuickLink[^\s"]+/);

    if (match) quickLinks.push(match[0]);
  }

  console.log("Found QuickLinks:", quickLinks);

  return { quickLinks };
});
