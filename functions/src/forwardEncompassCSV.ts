function forwardEncompassCSV() {
  const threads = GmailApp.search(
    'to:account-import@displaygram.com has:attachment newer_than:1d'
  );

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const msg of messages) {
      const attachments = msg.getAttachments();
      if (attachments.length !== 1) continue;

      const file = attachments[0];
      if (!file.getName().endsWith(".csv")) continue;

      const payload = {
        filename: file.getName(),
        source: "encompass",
        receivedAt: new Date().toISOString(),
        csv: Utilities.base64Encode(file.getBytes()),
      };

      UrlFetchApp.fetch(
        "https://us-central1-displaygram.cloudfunctions.net/ingestEncompassImport",
        {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          headers: {
            "X-Ingest-Secret": "REPLACE_WITH_SECRET",
          },
        }
      );
    }

    thread.markRead();
  }
}
